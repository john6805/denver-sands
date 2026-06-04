"use server";

import {
  actionError,
  actionOk,
  missingConfigError,
  saveError,
  saveOk,
} from "@/app/actions/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  BreakdownData,
  Golfer,
  SaveResponse,
  SeasonGolfer,
  SeasonSummary,
  WeeklyEventSummary,
  WeeklyResult,
} from "@/lib/data/league-data";
import type { WeeklyResultUpsert } from "@/lib/weekly-results";

export async function getBreakdownData(): Promise<ActionResult<BreakdownData>> {
  const client = createSupabaseServerClient();

  if (!client) {
    return actionError(missingConfigError());
  }

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("id,name,year,drop_lowest_week_count")
    .order("year", { ascending: false })
    .limit(1);

  if (seasonsError || !seasons?.[0]) {
    return actionError(seasonsError?.message ?? "Create or seed a season first.");
  }

  const season = seasons[0] as SeasonSummary;
  const [eventsResponse, golfersResponse, seasonGolfersResponse] = await Promise.all([
    client
      .from("weekly_events")
      .select("id,week_code,play_date,status")
      .eq("season_id", season.id)
      .order("play_date"),
    client.from("golfers").select("id,display_name,active").order("display_name"),
    client
      .from("season_golfers")
      .select("id,season_id,golfer_id,current_handicap")
      .eq("season_id", season.id),
  ]);

  const firstSetupError =
    eventsResponse.error ?? golfersResponse.error ?? seasonGolfersResponse.error;

  if (firstSetupError) {
    return actionError(firstSetupError.message);
  }

  const weeklyEvents = (eventsResponse.data ?? []) as WeeklyEventSummary[];
  const eventIds = weeklyEvents.map((event) => event.id);
  let weeklyResults: WeeklyResult[] = [];

  if (eventIds.length > 0) {
    const resultsResponse = await client
      .from("weekly_results")
      .select(
        "id,weekly_event_id,golfer_id,attendance_status,match_result,handicap_snapshot,gross_score,net_score,putts,locked_at,override_reason",
      )
      .in("weekly_event_id", eventIds);

    if (resultsResponse.error) {
      return actionError(resultsResponse.error.message);
    }

    weeklyResults = (resultsResponse.data ?? []) as WeeklyResult[];
  }

  return actionOk({
    season,
    weeklyEvents,
    golfers: (golfersResponse.data ?? []) as Golfer[],
    seasonGolfers: (seasonGolfersResponse.data ?? []) as SeasonGolfer[],
    weeklyResults,
  });
}

export async function saveWeeklyResults(
  weeklyEventId: string,
  rows: WeeklyResultUpsert[],
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  if (rows.length === 0) {
    return saveError("At least one weekly result row is required.");
  }

  const { data: weeklyEvent, error: weeklyEventError } = await client
    .from("weekly_events")
    .select("id,status")
    .eq("id", weeklyEventId)
    .single();

  if (weeklyEventError) {
    return saveError(weeklyEventError.message);
  }

  if (weeklyEvent?.status === "locked") {
    return saveError("Locked weeks require the correction flow.");
  }

  const response = await client.from("weekly_results").upsert(
    rows.map((row) => ({
      ...row,
      weekly_event_id: weeklyEventId,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "weekly_event_id,golfer_id" },
  );

  if (response.error) {
    return saveError(response.error.message);
  }

  if (
    rows.some((row) =>
      ["played", "no_show"].includes(row.attendance_status),
    )
  ) {
    const weekResponse = await client
      .from("weekly_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", weeklyEventId)
      .in("status", ["planned", "open", "matchups_published"]);

    if (weekResponse.error) {
      return saveError(weekResponse.error.message);
    }
  }

  return saveOk();
}

export async function lockWeeklyEvent(
  weeklyEventId: string,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const { data: weeklyEvent, error: weeklyEventError } = await client
    .from("weekly_events")
    .select("id,season_id,status")
    .eq("id", weeklyEventId)
    .single();

  if (weeklyEventError || !weeklyEvent) {
    return saveError(weeklyEventError?.message ?? "Weekly event not found.");
  }

  if (weeklyEvent.status === "locked") {
    return saveOk();
  }

  if (weeklyEvent.status !== "completed") {
    return saveError("Only completed weeks can be locked.");
  }

  const lockedAt = new Date().toISOString();
  const resultsResponse = await client
    .from("weekly_results")
    .update({ locked_at: lockedAt, updated_at: lockedAt })
    .eq("weekly_event_id", weeklyEventId);

  if (resultsResponse.error) {
    return saveError(resultsResponse.error.message);
  }

  const weekResponse = await client
    .from("weekly_events")
    .update({ status: "locked", updated_at: lockedAt })
    .eq("id", weeklyEventId);

  if (weekResponse.error) {
    return saveError(weekResponse.error.message);
  }

  const auditResponse = await client.from("admin_audit_events").insert({
    season_id: weeklyEvent.season_id,
    weekly_event_id: weeklyEventId,
    entity_type: "weekly_event",
    entity_id: weeklyEventId,
    action: "locked",
    before_json: { status: weeklyEvent.status },
    after_json: { status: "locked", locked_at: lockedAt },
  });

  return auditResponse.error ? saveError(auditResponse.error.message) : saveOk();
}

export async function correctWeeklyResults(
  weeklyEventId: string,
  rows: WeeklyResultUpsert[],
  reason: string,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const cleanedReason = reason.trim();

  if (!cleanedReason) {
    return saveError("A correction reason is required for locked weeks.");
  }

  const { data: weeklyEvent, error: weeklyEventError } = await client
    .from("weekly_events")
    .select("id,season_id,status")
    .eq("id", weeklyEventId)
    .single();

  if (weeklyEventError || !weeklyEvent) {
    return saveError(weeklyEventError?.message ?? "Weekly event not found.");
  }

  if (weeklyEvent.status !== "locked") {
    return saveError("Corrections can only be saved for locked weeks.");
  }

  const beforeResponse = await client
    .from("weekly_results")
    .select(
      "id,weekly_event_id,golfer_id,attendance_status,match_result,handicap_snapshot,gross_score,net_score,putts,locked_at,override_reason",
    )
    .eq("weekly_event_id", weeklyEventId);

  if (beforeResponse.error) {
    return saveError(beforeResponse.error.message);
  }

  const updatedAt = new Date().toISOString();
  const upsertResponse = await client.from("weekly_results").upsert(
    rows.map((row) => ({
      ...row,
      weekly_event_id: weeklyEventId,
      locked_at: updatedAt,
      override_reason: cleanedReason,
      updated_at: updatedAt,
    })),
    { onConflict: "weekly_event_id,golfer_id" },
  );

  if (upsertResponse.error) {
    return saveError(upsertResponse.error.message);
  }

  const afterResponse = await client
    .from("weekly_results")
    .select(
      "id,weekly_event_id,golfer_id,attendance_status,match_result,handicap_snapshot,gross_score,net_score,putts,locked_at,override_reason",
    )
    .eq("weekly_event_id", weeklyEventId);

  if (afterResponse.error) {
    return saveError(afterResponse.error.message);
  }

  const auditResponse = await client.from("admin_audit_events").insert({
    season_id: weeklyEvent.season_id,
    weekly_event_id: weeklyEventId,
    entity_type: "weekly_results",
    entity_id: weeklyEventId,
    action: "corrected",
    before_json: beforeResponse.data ?? [],
    after_json: afterResponse.data ?? [],
    reason: cleanedReason,
  });

  return auditResponse.error ? saveError(auditResponse.error.message) : saveOk();
}
