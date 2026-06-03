"use client";

import { useMemo } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { getLeaderboardData } from "@/app/actions/leaderboard";
import { Button } from "@/components/ui/button";
import {
  calculateRawLeaderboard,
  type RawLeaderboardRow,
} from "@/lib/leaderboard";
import { useActionData } from "@/lib/use-action-data";

function formatValue(value: number | null) {
  return value === null ? "-" : value.toString();
}

export function LeaderboardTable({ rows }: { rows: RawLeaderboardRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Golfer</th>
            <th className="px-3 py-2 text-right font-medium">Raw pts</th>
            <th className="px-3 py-2 text-right font-medium">Behind</th>
            <th className="px-3 py-2 text-right font-medium">Wins</th>
            <th className="px-3 py-2 text-right font-medium">No-shows</th>
            <th className="px-3 py-2 text-right font-medium">Blanks</th>
            <th className="px-3 py-2 text-right font-medium">Low gross</th>
            <th className="px-3 py-2 text-right font-medium">Low net</th>
            <th className="px-3 py-2 text-right font-medium">Low putts</th>
            <th className="px-3 py-2 text-right font-medium">Beer social</th>
            <th className="px-3 py-2 text-right font-medium">Pts + beer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.golferId} className="border-t">
              <td className="px-3 py-2">{row.rank}</td>
              <td className="px-3 py-2 font-medium">{row.golferName}</td>
              <td className="px-3 py-2 text-right">{row.rawPoints}</td>
              <td className="px-3 py-2 text-right">{row.pointsBehind}</td>
              <td className="px-3 py-2 text-right">{row.matchWins}</td>
              <td className="px-3 py-2 text-right">{row.noShowCount}</td>
              <td className="px-3 py-2 text-right">{row.blankWeekCount}</td>
              <td className="px-3 py-2 text-right">
                {formatValue(row.lowestGross)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(row.lowestNet)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatValue(row.lowestPutts)}
              </td>
              <td className="px-3 py-2 text-right">{row.beerTotal}</td>
              <td className="px-3 py-2 text-right">{row.pointsPlusBeer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RawLeaderboardView() {
  const { data, loading, error, reload } = useActionData(getLeaderboardData);
  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

    return calculateRawLeaderboard({
      golfers: data.golfers.map((golfer) => ({
        id: golfer.id,
        displayName: golfer.display_name,
        active: golfer.active,
      })),
      weeks: data.weeklyEvents.map((week) => ({
        id: week.id,
        status: week.status,
      })),
      results: data.weeklyResults.map((result) => ({
        id: result.id,
        weeklyEventId: result.weekly_event_id,
        golferId: result.golfer_id,
        attendanceStatus: result.attendance_status,
        matchResult: result.match_result,
        handicapSnapshot: result.handicap_snapshot,
        grossScore: result.gross_score,
        netScore: result.net_score,
        putts: result.putts,
      })),
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading leaderboard
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Raw Leaderboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Leaderboard data is not available."}
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
            Raw Leaderboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Raw season totals from completed and locked weeks. Drop-week
            official standings come next.
          </p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCw aria-hidden="true" />
          Refresh
        </Button>
      </header>

      <p className="text-sm text-muted-foreground">
        Beer totals are shown as a social-only metric and do not affect raw
        official points.
      </p>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
