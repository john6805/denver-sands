"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Shuffle } from "lucide-react";

import { getMatchGeneratorData } from "@/app/actions/match-generator";
import { Button } from "@/components/ui/button";
import { buildMatchFormatPlan } from "@/lib/match-format-planner";
import {
  generateRandomMatchPlan,
  type GeneratedMatch,
  type GeneratedMatchPlan,
} from "@/lib/match-generator";
import { useActionData } from "@/lib/use-action-data";
import type { AttendanceStatus } from "@/lib/scoring";
import type { MatchGeneratorData } from "@/lib/data/league-data";

function formatName(format: GeneratedMatch["format"]) {
  switch (format) {
    case "one_v_one":
      return "1v1";
    case "one_v_one_v_one":
      return "1v1v1";
    case "two_v_two":
      return "2v2";
  }
}

function formatHandicap(value: number | null) {
  return value === null ? "-" : value.toString();
}

function defaultWeekId(data: MatchGeneratorData | null) {
  return (
    data?.weeklyEvents.find((event) => event.status === "planned")?.id ??
    data?.weeklyEvents.find((event) => event.status === "open")?.id ??
    data?.weeklyEvents[0]?.id ??
    ""
  );
}

function buildDraftPlan(
  data: MatchGeneratorData,
  selectedWeekId: string,
  rerollCount: number,
) {
  const selectedWeek =
    data.weeklyEvents.find((event) => event.id === selectedWeekId) ??
    data.weeklyEvents[0];

  if (!selectedWeek) {
    return {
      selectedWeek: null,
      eligibleGolferIds: [],
      plan: null,
      error: "Create a weekly event before generating matches.",
    };
  }

  const teeTimes = data.teeTimes.filter(
    (teeTime) => teeTime.weekly_event_id === selectedWeek.id,
  );
  const rsvps = data.rsvps.filter(
    (rsvp) => rsvp.weekly_event_id === selectedWeek.id,
  );
  const rsvpStatusByGolfer = new Map(
    rsvps.map((rsvp) => [rsvp.golfer_id, rsvp.status]),
  );
  const activeRoster = data.golfers
    .filter((golfer) => golfer.active)
    .filter((golfer) =>
      data.seasonGolfers.some((seasonGolfer) => seasonGolfer.golfer_id === golfer.id),
    );
  const formatPlan = buildMatchFormatPlan({
    golfers: activeRoster.map((golfer) => ({
      golferId: golfer.id,
      status: (rsvpStatusByGolfer.get(golfer.id) ?? "unknown") as AttendanceStatus,
    })),
    teeTimeCount: teeTimes.length || undefined,
  });

  if (!formatPlan.ok) {
    return {
      selectedWeek,
      eligibleGolferIds: formatPlan.eligibleGolferIds,
      plan: null,
      error: formatPlan.error,
    };
  }

  const snapshotByGolfer = new Map(
    data.snapshots
      .filter((snapshot) => snapshot.effective_week_id === selectedWeek.id)
      .map((snapshot) => [snapshot.golfer_id, snapshot]),
  );
  const seasonGolferByGolfer = new Map(
    data.seasonGolfers.map((seasonGolfer) => [seasonGolfer.golfer_id, seasonGolfer]),
  );
  const courseHoles = selectedWeek.course_id
    ? data.courseHoles
        .filter((hole) => hole.course_id === selectedWeek.course_id)
        .map((hole) => ({
          hole_number: hole.hole_number,
          handicap_rank: hole.handicap_rank,
        }))
    : undefined;
  const plan = generateRandomMatchPlan({
    randomSeed: `${selectedWeek.id}:${selectedWeek.play_date}`,
    generatedAt: new Date().toISOString(),
    formats: formatPlan.formats,
    golfers: formatPlan.eligibleGolferIds.map((golferId) => {
      const snapshot = snapshotByGolfer.get(golferId);
      const currentHandicap =
        seasonGolferByGolfer.get(golferId)?.current_handicap ?? null;

      return {
        golferId,
        handicapSnapshot: snapshot?.handicap ?? currentHandicap,
        halfHandicap:
          snapshot?.half_handicap ??
          (currentHandicap === null ? null : Math.ceil(currentHandicap / 2)),
      };
    }),
    teeTimeIds: teeTimes.map((teeTime) => teeTime.id),
    courseHoles,
    rerollCount,
  });

  return {
    selectedWeek,
    eligibleGolferIds: formatPlan.eligibleGolferIds,
    plan,
    error: null,
    warnings: formatPlan.warnings,
  };
}

export function MatchGeneratorView() {
  const { data, loading, error, reload } = useActionData(getMatchGeneratorData);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [rerollCount, setRerollCount] = useState(0);
  const selectedWeekValue = selectedWeekId || defaultWeekId(data);
  const golferNames = useMemo(() => {
    return new Map(data?.golfers.map((golfer) => [golfer.id, golfer.display_name]));
  }, [data?.golfers]);
  const courseNames = useMemo(() => {
    return new Map(data?.courses.map((course) => [course.id, course.name]));
  }, [data?.courses]);
  const draft = useMemo(() => {
    if (!data) {
      return null;
    }

    return buildDraftPlan(data, selectedWeekValue, rerollCount);
  }, [data, rerollCount, selectedWeekValue]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading match generator
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Weekly Match Generator</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Match generator data is not available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const selectedWeek = draft?.selectedWeek;
  const selectedCourseName = selectedWeek?.course_id
    ? courseNames.get(selectedWeek.course_id)
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {data.season.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Weekly Match Generator
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Generate draft groups from confirmed golfers, weekly tee times, and
            the current handicap snapshot.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Week</span>
            <select
              className="h-9 min-w-52 rounded-md border bg-background px-2 text-sm shadow-xs"
              value={selectedWeekValue}
              onChange={(event) => {
                setSelectedWeekId(event.target.value);
                setRerollCount(0);
              }}
            >
              {data.weeklyEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.week_code} - {event.play_date}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={reload}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={() => setRerollCount((current) => current + 1)}>
            <Shuffle aria-hidden="true" />
            Reroll
          </Button>
        </div>
      </header>

      {selectedWeek ? (
        <section className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-muted px-2 py-1 text-xs">
            {selectedWeek.week_code}
          </span>
          <span className="text-sm text-muted-foreground">
            {selectedWeek.play_date}
          </span>
          <span className="rounded-full bg-muted px-2 py-1 text-xs">
            {selectedWeek.status}
          </span>
          {selectedCourseName ? (
            <span className="text-sm text-muted-foreground">
              {selectedCourseName}
            </span>
          ) : null}
        </section>
      ) : null}

      {draft?.error ? (
        <section className="rounded-lg border border-dashed p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Generation blocked</h2>
              <p className="mt-1 text-sm text-muted-foreground">{draft.error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {draft?.plan?.ok ? (
        <GeneratedMatches
          plan={draft.plan}
          golferNames={golferNames}
          warnings={draft.warnings ?? []}
        />
      ) : null}

      {draft?.plan && !draft.plan.ok ? (
        <section className="rounded-lg border border-dashed p-6">
          <h2 className="font-semibold">Draft issues</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {draft.plan.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function GeneratedMatches({
  plan,
  golferNames,
  warnings,
}: {
  plan: Extract<GeneratedMatchPlan, { ok: true }>;
  golferNames: Map<string, string>;
  warnings: string[];
}) {
  return (
    <section className="space-y-4">
      {[...warnings, ...plan.warnings].map((warning) => (
        <p key={warning} className="rounded-md border px-3 py-2 text-sm">
          {warning}
        </p>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        {plan.matches.map((match, index) => (
          <article key={match.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Match {index + 1}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatName(match.format)}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                draft
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {match.sides.map((side) => (
                <div key={side.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">Side {side.sideNumber}</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {side.participants.map((participant) => (
                      <p key={participant.golferId}>
                        {golferNames.get(participant.golferId) ?? "Unknown golfer"}
                        <span className="ml-2">
                          HC {formatHandicap(participant.handicapSnapshot)}
                        </span>
                        <span className="ml-2">
                          Half {formatHandicap(participant.halfHandicap)}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {match.strokeAllocations.length > 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">
                {match.strokeAllocations.length} stroke allocation rows generated
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
