"use server";

import {
  actionError,
  actionOk,
  missingConfigError,
  saveError,
  saveOk,
} from "@/app/actions/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HandicapSnapshotInsert } from "@/lib/handicap-snapshots";
import type {
  ActionResult,
  Golfer,
  HandicapSnapshot,
  SaveResponse,
  SeasonGolfer,
  SeasonSummary,
  SnapshotData,
  WeeklyEventSummary,
  WeeklyRsvp,
} from "@/lib/data/league-data";

export async function getSnapshotData(): Promise<ActionResult<SnapshotData>> {
  const client = createSupabaseServerClient();

  if (!client) {
    return actionError(missingConfigError());
  }

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("id,name,year")
    .order("year", { ascending: false })
    .limit(1);

  if (seasonsError || !seasons?.[0]) {
    return actionError(seasonsError?.message ?? "Create or seed a season first.");
  }

  const season = seasons[0] as SeasonSummary;
  const [
    eventsResponse,
    golfersResponse,
    seasonGolfersResponse,
    rsvpsResponse,
    snapshotsResponse,
  ] = await Promise.all([
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
    client.from("weekly_rsvps").select("weekly_event_id,golfer_id,status"),
    client
      .from("golfer_handicap_snapshots")
      .select("effective_week_id,golfer_id,handicap,half_handicap")
      .eq("season_id", season.id),
  ]);

  const firstError = [
    eventsResponse.error,
    golfersResponse.error,
    seasonGolfersResponse.error,
    rsvpsResponse.error,
    snapshotsResponse.error,
  ].find(Boolean);

  if (firstError) {
    return actionError(firstError.message);
  }

  return actionOk({
    season,
    weeklyEvents: (eventsResponse.data ?? []) as WeeklyEventSummary[],
    golfers: (golfersResponse.data ?? []) as Golfer[],
    seasonGolfers: (seasonGolfersResponse.data ?? []) as SeasonGolfer[],
    rsvps: (rsvpsResponse.data ?? []) as WeeklyRsvp[],
    snapshots: (snapshotsResponse.data ?? []) as HandicapSnapshot[],
  });
}

export async function updateSeasonGolferHandicap(
  id: string,
  currentHandicap: number | null,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client
    .from("season_golfers")
    .update({
      current_handicap: currentHandicap,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function createHandicapSnapshots(
  inserts: HandicapSnapshotInsert[],
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  if (inserts.length === 0) {
    return saveOk();
  }

  const response = await client.from("golfer_handicap_snapshots").insert(inserts);
  return response.error ? saveError(response.error.message) : saveOk();
}
