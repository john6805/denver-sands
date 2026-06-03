"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import {
  buildHandicapSnapshotPlan,
  type ExistingHandicapSnapshot,
  type SnapshotRosterGolfer,
  type SnapshotRsvp,
} from "@/lib/handicap-snapshots";
import {
  createHandicapSnapshots,
  getSnapshotData,
  updateSeasonGolferHandicap,
} from "@/app/actions/league-data";
import { Button } from "@/components/ui/button";
import type {
  SaveResponse,
  SeasonGolfer,
  SnapshotData,
} from "@/lib/data/league-data";

type SaveAction = () => PromiseLike<SaveResponse>;

function inputClassName() {
  return "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs";
}

function selectClassName() {
  return "h-9 min-w-52 rounded-md border bg-background px-2 text-sm shadow-xs";
}

function useSnapshotData() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await getSnapshotData();
    setData(response.data);
    setError(response.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { data, loading, error, reload: load };
}

export function HandicapSnapshotReview() {
  const { data, loading, error, reload } = useSnapshotData();
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const defaultWeek =
    data?.weeklyEvents.find((event) => event.status === "open") ??
    data?.weeklyEvents.find((event) => event.status === "planned") ??
    data?.weeklyEvents[0];
  const selectedWeek =
    data?.weeklyEvents.find((event) => event.id === selectedWeekId) ??
    defaultWeek;
  const selectedWeekValue = selectedWeek?.id ?? "";

  const golferNames = new Map(
    data?.golfers.map((golfer) => [golfer.id, golfer.display_name]),
  );
  const rosterGolfers: SnapshotRosterGolfer[] =
    data?.seasonGolfers.map((seasonGolfer) => {
      const golfer = data.golfers.find(
        (item) => item.id === seasonGolfer.golfer_id,
      );

      return {
        golferId: seasonGolfer.golfer_id,
        golferName:
          golfer?.display_name ??
          golferNames.get(seasonGolfer.golfer_id) ??
          "Unknown golfer",
        currentHandicap: seasonGolfer.current_handicap,
        active: golfer?.active ?? true,
      };
    }) ?? [];
  const existingSnapshots: ExistingHandicapSnapshot[] =
    data?.snapshots
      .filter((snapshot) => snapshot.effective_week_id === selectedWeek?.id)
      .map((snapshot) => ({
        golferId: snapshot.golfer_id,
        handicap: snapshot.handicap,
        halfHandicap: snapshot.half_handicap,
      })) ?? [];
  const rsvps: SnapshotRsvp[] =
    data?.rsvps
      .filter((rsvp) => rsvp.weekly_event_id === selectedWeek?.id)
      .map((rsvp) => ({
        golferId: rsvp.golfer_id,
        status: rsvp.status,
      })) ?? [];
  const plan =
    data && selectedWeek
      ? buildHandicapSnapshotPlan({
          seasonId: data.season.id,
          weeklyEventId: selectedWeek.id,
          rsvps,
          rosterGolfers,
          existingSnapshots,
        })
      : null;

  async function save(key: string, action: SaveAction) {
    setSaving(key);
    setMessage(null);

    const response = await action();

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Saved. Refreshing handicap snapshots.");
      await reload();
    }

    setSaving(null);
  }

  async function prepareSnapshots() {
    if (!plan) {
      return;
    }

    if (!plan.canSnapshot) {
      setMessage("Add current handicaps for confirmed golfers before snapshotting.");
      return;
    }

    if (plan.inserts.length === 0) {
      setMessage("All confirmed golfers for this week are already snapshotted.");
      return;
    }

    await save("snapshots", () => createHandicapSnapshots(plan.inserts));
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading handicap snapshots
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Handicap Snapshots</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Handicap snapshot data is not available."}
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
            Handicap Snapshots
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review current handicaps for confirmed golfers and snapshot the
            full and half-handicap values used for a weekly event.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Week</span>
            <select
              className={selectClassName()}
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
          <Button onClick={prepareSnapshots} disabled={saving === "snapshots"}>
            <Save aria-hidden="true" />
            Snapshot confirmed
          </Button>
        </div>
      </header>

      {message ? (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {message}
        </div>
      ) : null}

      {plan ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Golfer</th>
                <th className="px-3 py-2 font-medium">Current handicap</th>
                <th className="px-3 py-2 text-right font-medium">Snapshot</th>
                <th className="px-3 py-2 text-right font-medium">Half</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    No confirmed golfers for this week yet.
                  </td>
                </tr>
              ) : (
                plan.rows.map((row) => (
                  <HandicapSnapshotRow
                    key={row.golferId}
                    seasonGolfers={data.seasonGolfers}
                    golferId={row.golferId}
                    golferName={row.golferName}
                    currentHandicap={row.currentHandicap}
                    snapshotHandicap={row.snapshotHandicap}
                    halfHandicap={row.halfHandicap}
                    status={row.status}
                    saving={saving}
                    onSave={save}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function HandicapSnapshotRow({
  seasonGolfers,
  golferId,
  golferName,
  currentHandicap,
  snapshotHandicap,
  halfHandicap,
  status,
  saving,
  onSave,
}: {
  seasonGolfers: SeasonGolfer[];
  golferId: string;
  golferName: string;
  currentHandicap: number | null;
  snapshotHandicap: number | null;
  halfHandicap: number | null;
  status: string;
  saving: string | null;
  onSave: (key: string, action: SaveAction) => Promise<void>;
}) {
  const key = `handicap-${golferId}`;
  const [handicap, setHandicap] = useState(currentHandicap?.toString() ?? "");
  const seasonGolfer = seasonGolfers.find((item) => item.golfer_id === golferId);

  async function submit() {
    const parsed = handicap.trim() ? Number(handicap) : null;

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      return;
    }

    if (!seasonGolfer) {
      return;
    }

    await onSave(key, () =>
      updateSeasonGolferHandicap(seasonGolfer.id, parsed),
    );
  }

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2 font-medium">{golferName}</td>
      <td className="px-3 py-2">
        <input
          className={inputClassName()}
          inputMode="decimal"
          value={handicap}
          onChange={(event) => setHandicap(event.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-right">{snapshotHandicap ?? "-"}</td>
      <td className="px-3 py-2 text-right">{halfHandicap ?? "-"}</td>
      <td className="px-3 py-2">
        <span
          className={
            status === "missing_handicap"
              ? "rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
              : "rounded-full bg-muted px-2 py-1 text-xs"
          }
        >
          {status}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === key || !seasonGolfer}
        >
          <Save aria-hidden="true" />
          Save
        </Button>
      </td>
    </tr>
  );
}
