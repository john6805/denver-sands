"use client";

import { useMemo } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { getLeaderboardData } from "@/app/actions/leaderboard";
import {
  calculateAwardMetrics,
  type AwardMetric,
} from "@/lib/awards";
import { useActionData } from "@/lib/use-action-data";

function winnersText(metric: AwardMetric) {
  if (metric.winners.length === 0) {
    return "No eligible result yet";
  }

  return metric.winners.map((winner) => winner.golferName).join(", ");
}

function valueText(metric: AwardMetric) {
  if (metric.winners.length === 0) {
    return "-";
  }

  return metric.winners.map((winner) => winner.value.toString()).join(", ");
}

export function AwardsSanctionsPreview() {
  const { data, loading, error } = useActionData(getLeaderboardData);
  const metrics = useMemo(() => {
    if (!data) {
      return [];
    }

    return calculateAwardMetrics({
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
      dropLowestWeekCount: data.season.drop_lowest_week_count,
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading awards preview
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Awards and Sanctions</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Award data is not available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b pb-6">
        <p className="text-sm font-medium text-muted-foreground">
          {data.season.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Awards and Sanctions
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Regular-season preview from completed and locked weekly results.
          Tournament results and payout amounts are intentionally excluded.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Metric</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Leader</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{metric.title}</td>
                <td className="px-3 py-2 capitalize">{metric.category}</td>
                <td className="px-3 py-2">{winnersText(metric)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="block">{valueText(metric)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {metric.valueLabel}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {metric.winners.length > 0 ? (
                    metric.winners.map((winner) => (
                      <span key={`${metric.id}-${winner.golferId}-${winner.weekId}`} className="block">
                        {winner.detail}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
