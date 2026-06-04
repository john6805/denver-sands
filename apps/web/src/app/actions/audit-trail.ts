"use server";

import {
  actionError,
  actionOk,
  missingConfigError,
} from "@/app/actions/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  AdminAuditEvent,
  AuditTrailData,
  SeasonSummary,
  WeeklyEventSummary,
} from "@/lib/data/league-data";

export async function getAuditTrailData(): Promise<ActionResult<AuditTrailData>> {
  const client = createSupabaseServerClient();

  if (!client) {
    return actionError(missingConfigError());
  }

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("id,name,year,drop_lowest_week_count")
    .order("year", { ascending: false });

  if (seasonsError) {
    return actionError(seasonsError.message);
  }

  const seasonRows = (seasons ?? []) as SeasonSummary[];
  const seasonIds = seasonRows.map((season) => season.id);
  let weeklyEvents: WeeklyEventSummary[] = [];
  let auditEvents: AdminAuditEvent[] = [];

  if (seasonIds.length > 0) {
    const [eventsResponse, auditResponse] = await Promise.all([
      client
        .from("weekly_events")
        .select("id,week_code,play_date,status")
        .in("season_id", seasonIds)
        .order("play_date"),
      client
        .from("admin_audit_events")
        .select(
          "id,actor_id,season_id,weekly_event_id,entity_type,entity_id,action,before_json,after_json,reason,created_at",
        )
        .in("season_id", seasonIds)
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

    const firstError = eventsResponse.error ?? auditResponse.error;

    if (firstError) {
      return actionError(firstError.message);
    }

    weeklyEvents = (eventsResponse.data ?? []) as WeeklyEventSummary[];
    auditEvents = (auditResponse.data ?? []) as AdminAuditEvent[];
  }

  return actionOk({
    seasons: seasonRows,
    weeklyEvents,
    auditEvents,
  });
}
