"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  calculateWeeklyPointBreakdowns,
  type WeeklyPointBreakdown,
  type WeeklyScoringInput,
} from "@/lib/scoring";
import { getBreakdownData } from "@/app/actions/league-data";
import type { BreakdownData, WeeklyEventSummary } from "@/lib/data/league-data";

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

function useBreakdownData() {
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await getBreakdownData();
    setData(response.data);
    setError(response.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { data, loading, error, reload: load };
}

export function WeeklyPointBreakdownView() {
  const { data, loading, error, reload } = useBreakdownData();
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
