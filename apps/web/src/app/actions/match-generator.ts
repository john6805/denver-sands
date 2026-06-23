"use server";

import { actionError, actionOk, missingConfigError } from "@/app/actions/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Course,
  CourseHole,
  Golfer,
  HandicapSnapshot,
  MatchGeneratorData,
  Season,
  SeasonGolfer,
  TeeTime,
  WeeklyEvent,
  WeeklyRsvp,
} from "@/lib/data/league-data";
import type { ActionResult } from "@/lib/data/league-data";

export async function getMatchGeneratorData(): Promise<
  ActionResult<MatchGeneratorData>
> {
  const client = createSupabaseServerClient();

  if (!client) {
    return actionError(missingConfigError());
  }

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("id,name,year,starts_on,ends_on,status,drop_lowest_week_count")
    .order("year", { ascending: false })
    .limit(1);

  if (seasonsError || !seasons?.[0]) {
    return actionError(seasonsError?.message ?? "Seed a season before generating matches.");
  }

  const season = seasons[0] as Season;
  const [
    golfersResponse,
    seasonGolfersResponse,
    coursesResponse,
    courseHolesResponse,
    eventsResponse,
    teeTimesResponse,
    rsvpsResponse,
    snapshotsResponse,
  ] = await Promise.all([
    client.from("golfers").select("id,display_name,active").order("display_name"),
    client
      .from("season_golfers")
      .select("id,season_id,golfer_id,current_handicap")
      .eq("season_id", season.id),
    client.from("courses").select("id,name,booking_url,active").order("name"),
    client
      .from("course_holes")
      .select("course_id,hole_number,par,handicap_rank")
      .order("hole_number"),
    client
      .from("weekly_events")
      .select("id,season_id,week_code,play_date,course_id,status")
      .eq("season_id", season.id)
      .order("play_date"),
    client
      .from("weekly_tee_times")
      .select("id,weekly_event_id,starts_at,sort_order")
      .order("sort_order"),
    client.from("weekly_rsvps").select("weekly_event_id,golfer_id,status"),
    client
      .from("golfer_handicap_snapshots")
      .select("effective_week_id,golfer_id,handicap,half_handicap")
      .eq("season_id", season.id),
  ]);

  const firstError = [
    golfersResponse.error,
    seasonGolfersResponse.error,
    coursesResponse.error,
    courseHolesResponse.error,
    eventsResponse.error,
    teeTimesResponse.error,
    rsvpsResponse.error,
    snapshotsResponse.error,
  ].find(Boolean);

  if (firstError) {
    return actionError(firstError.message);
  }

  return actionOk({
    season,
    golfers: (golfersResponse.data ?? []) as Golfer[],
    seasonGolfers: (seasonGolfersResponse.data ?? []) as SeasonGolfer[],
    courses: (coursesResponse.data ?? []) as Course[],
    courseHoles: (courseHolesResponse.data ?? []) as CourseHole[],
    weeklyEvents: (eventsResponse.data ?? []) as WeeklyEvent[],
    teeTimes: (teeTimesResponse.data ?? []) as TeeTime[],
    rsvps: (rsvpsResponse.data ?? []) as WeeklyRsvp[],
    snapshots: (snapshotsResponse.data ?? []) as HandicapSnapshot[],
  });
}
