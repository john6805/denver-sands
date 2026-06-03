"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  Loader2,
  Lock,
  RefreshCw,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  attendanceStatuses,
  calculateWeeklyPointBreakdowns,
  matchResults,
  type WeeklyPointBreakdown,
  type WeeklyScoringInput,
} from "@/lib/scoring";
import {
  correctWeeklyResults,
  getBreakdownData,
  lockWeeklyEvent,
  saveWeeklyResults,
} from "@/app/actions/weekly-results";
import {
  buildWeeklyResultCorrection,
  buildWeeklyResultUpserts,
} from "@/lib/weekly-results";
import type { AdminIssue } from "@/lib/admin-season";
import { useActionData } from "@/lib/use-action-data";
import type {
  Golfer,
  SeasonGolfer,
  WeeklyEventSummary,
  WeeklyResult,
} from "@/lib/data/league-data";

function formatValue(value: number | null) {
  return value === null ? "-" : value.toString();
}

function formatRank(value: number | null) {
  return value === null ? "-" : `#${value}`;
}

function statusBadgeClassName(status: string) {
  if (status === "completed" || status === "locked") {
    return "rounded-full bg-muted px-2 py-1 text-xs";
  }

  return "rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-900";
}

export function WeeklyPointBreakdownView() {
  const { data, loading, error, reload } = useActionData(getBreakdownData);
  const [selectedWeekId, setSelectedWeekId] = useState("");

  const defaultWeek =
    data?.weeklyEvents.find((event) => event.status === "completed") ??
    data?.weeklyEvents[0];
  const selectedWeek =
    data?.weeklyEvents.find((event) => event.id === selectedWeekId) ??
    defaultWeek;
  const selectedWeekValue = selectedWeek?.id ?? "";
  const golferNames = useMemo(() => {
    return new Map(data?.golfers.map((golfer) => [golfer.id, golfer.display_name]));
  }, [data?.golfers]);
  const breakdowns = useMemo(() => {
    if (!data || !selectedWeek) {
      return [];
    }

    const rows: WeeklyScoringInput[] = data.weeklyResults
      .filter((result) => result.weekly_event_id === selectedWeek.id)
      .map((result) => ({
        id: result.id,
        golferId: result.golfer_id,
        golferName: golferNames.get(result.golfer_id) ?? "Unknown golfer",
        attendanceStatus: result.attendance_status,
        matchResult: result.match_result,
        handicapSnapshot: result.handicap_snapshot,
        grossScore: result.gross_score,
        netScore: result.net_score,
        putts: result.putts,
      }))
      .sort((left, right) => left.golferName.localeCompare(right.golferName));

    return calculateWeeklyPointBreakdowns(rows);
  }, [data, golferNames, selectedWeek]);
  const roster = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.golfers
      .map((golfer) => ({
        golfer,
        seasonGolfer: data.seasonGolfers.find(
          (item) => item.golfer_id === golfer.id,
        ),
      }))
      .filter((row): row is { golfer: Golfer; seasonGolfer: SeasonGolfer } =>
        Boolean(row.seasonGolfer && row.golfer.active),
      );
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading scoring breakdown
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Weekly Point Breakdown</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Scoring data is not available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {data.season.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Weekly Point Breakdown
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Dynamic scoring from raw weekly result inputs. Point values are
            calculated from attendance, match result, gross, net, and putts.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Week</span>
            <select
              className="h-9 min-w-52 rounded-md border bg-background px-2 text-sm shadow-xs"
              value={selectedWeekValue}
              onChange={(event) => setSelectedWeekId(event.target.value)}
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
        </div>
      </header>

      {selectedWeek ? <WeekStatusSummary week={selectedWeek} /> : null}

      {selectedWeek ? (
        <WeeklyResultEntryTable
          week={selectedWeek}
          roster={roster}
          weeklyResults={data.weeklyResults.filter(
            (result) => result.weekly_event_id === selectedWeek.id,
          )}
          onSaved={reload}
        />
      ) : null}

      {breakdowns.length === 0 ? (
        <section className="rounded-lg border border-dashed p-6">
          <div className="flex items-start gap-3">
            <Calculator className="mt-1 size-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">No results for this week</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Seed or enter weekly result rows before scoring can be shown.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <BreakdownTable breakdowns={breakdowns} />
      )}
    </div>
  );
}

function issueText(issues: AdminIssue[]) {
  return issues.map((item) => item.message).join(" ");
}

function inputClassName() {
  return "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs";
}

function selectClassName() {
  return "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs";
}

type ResultEntryRow = {
  golferId: string;
  golferName: string;
  attendanceStatus: string;
  matchResult: string;
  handicapSnapshot: string;
  grossScore: string;
  netScore: string;
  putts: string;
};

type WeeklyResultEntryTableProps = {
  week: WeeklyEventSummary;
  roster: Array<{ golfer: Golfer; seasonGolfer: SeasonGolfer }>;
  weeklyResults: WeeklyResult[];
  onSaved?: () => Promise<void> | void;
};

function rowsFromData(input: {
  roster: Array<{ golfer: Golfer; seasonGolfer: SeasonGolfer }>;
  weeklyResults: WeeklyResult[];
}) {
  const resultByGolfer = new Map(
    input.weeklyResults.map((result) => [result.golfer_id, result]),
  );

  return input.roster.map(({ golfer, seasonGolfer }) => {
    const result = resultByGolfer.get(golfer.id);

    return {
      golferId: golfer.id,
      golferName: golfer.display_name,
      attendanceStatus: result?.attendance_status ?? "unknown",
      matchResult: result?.match_result ?? "not_applicable",
      handicapSnapshot:
        result?.handicap_snapshot?.toString() ??
        seasonGolfer.current_handicap?.toString() ??
        "",
      grossScore: result?.gross_score?.toString() ?? "",
      netScore: result?.net_score?.toString() ?? "",
      putts: result?.putts?.toString() ?? "",
    };
  });
}

export function WeeklyResultEntryTable({
  week,
  roster,
  weeklyResults,
  onSaved,
}: WeeklyResultEntryTableProps) {
  const stateKey = [
    week.id,
    roster
      .map(({ golfer, seasonGolfer }) =>
        [golfer.id, seasonGolfer.current_handicap ?? ""].join(":"),
      )
      .join("|"),
    weeklyResults
      .map((result) =>
        [
          result.id,
          result.attendance_status,
          result.match_result,
          result.handicap_snapshot ?? "",
          result.gross_score ?? "",
          result.net_score ?? "",
          result.putts ?? "",
          result.locked_at ?? "",
          result.override_reason ?? "",
        ].join(":"),
      )
      .join("|"),
  ].join("::");

  return (
    <WeeklyResultEntryFields
      key={stateKey}
      week={week}
      roster={roster}
      weeklyResults={weeklyResults}
      onSaved={onSaved}
    />
  );
}

function WeeklyResultEntryFields({
  week,
  roster,
  weeklyResults,
  onSaved,
}: WeeklyResultEntryTableProps) {
  const [rows, setRows] = useState<ResultEntryRow[]>(() =>
    rowsFromData({ roster, weeklyResults }),
  );
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  function updateRow(
    golferId: string,
    field: keyof Omit<ResultEntryRow, "golferId" | "golferName">,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.golferId !== golferId) {
          return row;
        }

        const next = { ...row, [field]: value };

        if (field === "attendanceStatus" && value !== "played") {
          return {
            ...next,
            matchResult: value === "confirmed" ? next.matchResult : "not_applicable",
            grossScore: "",
            netScore: "",
            putts: "",
          };
        }

        return next;
      }),
    );
  }

  async function submit() {
    if (week.status === "locked") {
      setIssues([
        {
          field: "week",
          message: "Locked weeks require the correction flow.",
        },
      ]);
      return;
    }

    const built = buildWeeklyResultUpserts(
      rows.map((row) => ({
        golfer_id: row.golferId,
        attendance_status: row.attendanceStatus,
        match_result: row.matchResult,
        handicap_snapshot: row.handicapSnapshot,
        gross_score: row.grossScore,
        net_score: row.netScore,
        putts: row.putts,
      })),
    );

    if (!built.ok) {
      setIssues(built.issues);
      return;
    }

    setSaving(true);
    setIssues([]);
    setMessage(null);
    const response = await saveWeeklyResults(week.id, built.values);

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Saved weekly results. Breakdown refreshed.");
      await onSaved?.();
    }

    setSaving(false);
  }

  async function submitCorrection() {
    const built = buildWeeklyResultCorrection({
      reason: correctionReason,
      rows: rows.map((row) => ({
        golfer_id: row.golferId,
        attendance_status: row.attendanceStatus,
        match_result: row.matchResult,
        handicap_snapshot: row.handicapSnapshot,
        gross_score: row.grossScore,
        net_score: row.netScore,
        putts: row.putts,
      })),
    });

    if (!built.ok) {
      setIssues(built.issues);
      return;
    }

    setSaving(true);
    setIssues([]);
    setMessage(null);
    const response = await correctWeeklyResults(
      week.id,
      built.values.rows,
      built.values.reason,
    );

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Saved locked-week correction. Breakdown refreshed.");
      await onSaved?.();
    }

    setSaving(false);
  }

  async function lockWeek() {
    setSaving(true);
    setIssues([]);
    setMessage(null);
    const response = await lockWeeklyEvent(week.id);

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Week locked. Future edits require a correction reason.");
      await onSaved?.();
    }

    setSaving(false);
  }

  if (roster.length === 0) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <h2 className="font-semibold">No active roster golfers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add golfers to the season roster before entering weekly results.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Result Entry</h2>
          <p className="text-sm text-muted-foreground">
            Save raw attendance, match result, handicap, gross, net, and putts
            for each golfer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {week.status === "completed" ? (
            <Button variant="outline" onClick={lockWeek} disabled={saving}>
              <Lock aria-hidden="true" />
              Lock week
            </Button>
          ) : null}
          {week.status === "locked" ? (
            <Button onClick={submitCorrection} disabled={saving}>
              <Save aria-hidden="true" />
              Save correction
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              <Save aria-hidden="true" />
              Save results
            </Button>
          )}
        </div>
      </div>
      {week.status === "locked" ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div>
            <p className="text-sm font-medium">Locked week correction</p>
            <p className="text-xs text-muted-foreground">
              Normal edits are blocked. Corrections require a reason and create
              an audit event.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Correction reason</span>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs"
              value={correctionReason}
              onChange={(event) => setCorrectionReason(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      {message ? (
        <p className="rounded-md border px-3 py-2 text-sm">{message}</p>
      ) : null}
      {issues.length > 0 ? (
        <p className="text-sm text-destructive">{issueText(issues)}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Golfer</th>
              <th className="px-3 py-2 font-medium">Attendance</th>
              <th className="px-3 py-2 font-medium">Match result</th>
              <th className="px-3 py-2 font-medium">Handicap</th>
              <th className="px-3 py-2 font-medium">Gross</th>
              <th className="px-3 py-2 font-medium">Net</th>
              <th className="px-3 py-2 font-medium">Putts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const scoresDisabled = row.attendanceStatus !== "played";

              return (
                <tr key={row.golferId} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{row.golferName}</td>
                  <td className="px-3 py-2">
                    <select
                      className={selectClassName()}
                      value={row.attendanceStatus}
                      onChange={(event) =>
                        updateRow(
                          row.golferId,
                          "attendanceStatus",
                          event.target.value,
                        )
                      }
                    >
                      {attendanceStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={selectClassName()}
                      value={row.matchResult}
                      disabled={
                        row.attendanceStatus !== "played" &&
                        row.attendanceStatus !== "confirmed"
                      }
                      onChange={(event) =>
                        updateRow(row.golferId, "matchResult", event.target.value)
                      }
                    >
                      {matchResults.map((result) => (
                        <option key={result} value={result}>
                          {result}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputClassName()}
                      inputMode="decimal"
                      value={row.handicapSnapshot}
                      onChange={(event) =>
                        updateRow(
                          row.golferId,
                          "handicapSnapshot",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputClassName()}
                      inputMode="numeric"
                      disabled={scoresDisabled}
                      value={row.grossScore}
                      onChange={(event) =>
                        updateRow(row.golferId, "grossScore", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputClassName()}
                      inputMode="numeric"
                      disabled={scoresDisabled}
                      value={row.netScore}
                      onChange={(event) =>
                        updateRow(row.golferId, "netScore", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputClassName()}
                      inputMode="numeric"
                      disabled={scoresDisabled}
                      value={row.putts}
                      onChange={(event) =>
                        updateRow(row.golferId, "putts", event.target.value)
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function WeekStatusSummary({ week }: { week: WeeklyEventSummary }) {
  return (
    <section className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-muted px-2 py-1 text-xs">
        {week.week_code}
      </span>
      <span className="text-sm text-muted-foreground">{week.play_date}</span>
      <span className={statusBadgeClassName(week.status)}>{week.status}</span>
      {week.status !== "completed" && week.status !== "locked" ? (
        <span className="text-sm text-muted-foreground">
          Planned or open weeks are visible, but they should not be treated as
          completed zero-point weeks.
        </span>
      ) : null}
    </section>
  );
}

export function BreakdownTable({
  breakdowns,
}: {
  breakdowns: WeeklyPointBreakdown[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1120px] text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Golfer</th>
            <th className="px-3 py-2 font-medium">Attendance</th>
            <th className="px-3 py-2 text-right font-medium">Match</th>
            <th className="px-3 py-2 text-right font-medium">HC</th>
            <th className="px-3 py-2 text-right font-medium">Half</th>
            <th className="px-3 py-2 text-right font-medium">Gross</th>
            <th className="px-3 py-2 text-right font-medium">Net</th>
            <th className="px-3 py-2 text-right font-medium">Fallback</th>
            <th className="px-3 py-2 text-right font-medium">Putts</th>
            <th className="px-3 py-2 text-right font-medium">Attend</th>
            <th className="px-3 py-2 text-right font-medium">Match</th>
            <th className="px-3 py-2 text-right font-medium">Gross pts</th>
            <th className="px-3 py-2 text-right font-medium">Net pts</th>
            <th className="px-3 py-2 text-right font-medium">Putt pts</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((breakdown) => (
            <tr key={breakdown.id} className="border-t align-top">
              <td className="px-3 py-2 font-medium">{breakdown.golferName}</td>
              <td className="px-3 py-2">{breakdown.attendanceStatus}</td>
              <td className="px-3 py-2 text-right">{breakdown.matchResult}</td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.handicapSnapshot)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.halfHandicap)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.grossScore)}
                <span className="block text-xs text-muted-foreground">
                  {formatRank(breakdown.gross.rank)}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.scoringNetScore)}
                <span className="block text-xs text-muted-foreground">
                  {breakdown.netScoreSource}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.fallbackNetScore)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(breakdown.putts)}
                <span className="block text-xs text-muted-foreground">
                  {formatRank(breakdown.putt.rank)}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {breakdown.attendancePoints}
              </td>
              <td className="px-3 py-2 text-right">{breakdown.matchPoints}</td>
              <td className="px-3 py-2 text-right">
                {breakdown.gross.points}
              </td>
              <td className="px-3 py-2 text-right">{breakdown.net.points}</td>
              <td className="px-3 py-2 text-right">{breakdown.putt.points}</td>
              <td className="px-3 py-2 text-right font-semibold">
                {breakdown.totalPoints}
              </td>
              <td className="px-3 py-2">
                {breakdown.missingInputs.length > 0 ? (
                  <span className="text-xs text-destructive">
                    Missing {breakdown.missingInputs.join(", ")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Ready</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
