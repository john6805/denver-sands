"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  AdminData,
  BreakdownData,
  Course,
  CourseHole,
  Golfer,
  GolferSummary,
  HandicapSnapshot,
  SaveResponse,
  Season,
  SeasonGolfer,
  SeasonSummary,
  SnapshotData,
  TeeTime,
  WeeklyEvent,
  WeeklyEventSummary,
  WeeklyResult,
  WeeklyRsvp,
} from "@/lib/data/league-data";
import type {
  CourseHoleUpdate,
  CourseUpdate,
  GolferCreate,
  GolferUpdate,
  SeasonCreate,
  SeasonGolferUpdate,
  SeasonUpdate,
  TeeTimeUpdate,
  WeeklyEventCreate,
  WeeklyEventUpdate,
} from "@/lib/admin-season";
import type { HandicapSnapshotInsert } from "@/lib/handicap-snapshots";

function missingConfigError() {
  return "Supabase is not configured for the Next.js server.";
}

function saveError(message: string): SaveResponse {
  return { error: { message } };
}

function saveOk(): SaveResponse {
  return { error: null };
}

function actionError<T>(message: string): ActionResult<T> {
  return { data: null, error: message };
}

function actionOk<T>(data: T): ActionResult<T> {
  return { data, error: null };
}

export async function getAdminData(): Promise<ActionResult<AdminData>> {
  const client = createSupabaseServerClient();

  if (!client) {
    return actionError(missingConfigError());
  }

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("id,name,year,starts_on,ends_on,status")
    .order("year", { ascending: false })
    .limit(1);

  if (seasonsError || !seasons?.[0]) {
    return actionError(seasonsError?.message ?? "Seed a season before editing setup.");
  }

  const season = seasons[0] as Season;
  const [
    golfersResponse,
    seasonGolfersResponse,
    coursesResponse,
    courseHolesResponse,
    weeklyEventsResponse,
    teeTimesResponse,
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
  ]);

  const firstError = [
    golfersResponse.error,
    seasonGolfersResponse.error,
    coursesResponse.error,
    courseHolesResponse.error,
    weeklyEventsResponse.error,
    teeTimesResponse.error,
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
    weeklyEvents: (weeklyEventsResponse.data ?? []) as WeeklyEvent[],
    teeTimes: (teeTimesResponse.data ?? []) as TeeTime[],
  });
}

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

export async function getBreakdownData(): Promise<ActionResult<BreakdownData>> {
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
  const [eventsResponse, golfersResponse] = await Promise.all([
    client
      .from("weekly_events")
      .select("id,week_code,play_date,status")
      .eq("season_id", season.id)
      .order("play_date"),
    client.from("golfers").select("id,display_name").order("display_name"),
  ]);

  const firstSetupError = eventsResponse.error ?? golfersResponse.error;

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
        "id,weekly_event_id,golfer_id,attendance_status,match_result,handicap_snapshot,gross_score,net_score,putts",
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
    golfers: (golfersResponse.data ?? []) as GolferSummary[],
    weeklyResults,
  });
}

export async function createSeason(values: SeasonCreate): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client.from("seasons").insert(values);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function updateSeason(
  id: string,
  values: SeasonUpdate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client
    .from("seasons")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function createRosterGolfer(
  season: Pick<Season, "id" | "starts_on">,
  values: GolferCreate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const golferResponse = await client
    .from("golfers")
    .insert({
      display_name: values.display_name,
      active: values.active,
    })
    .select("id")
    .single();

  if (golferResponse.error) {
    return saveError(golferResponse.error.message);
  }

  const rosterResponse = await client.from("season_golfers").insert({
    season_id: season.id,
    golfer_id: golferResponse.data.id,
    current_handicap: values.current_handicap,
    starting_handicap: values.current_handicap,
    joined_on: season.starts_on,
  });

  return rosterResponse.error ? saveError(rosterResponse.error.message) : saveOk();
}

export async function updateRosterGolfer(
  golferId: string,
  seasonGolferId: string,
  values: {
    golfer: GolferUpdate;
    seasonGolfer: SeasonGolferUpdate;
  },
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const golferResponse = await client
    .from("golfers")
    .update({ ...values.golfer, updated_at: new Date().toISOString() })
    .eq("id", golferId);

  if (golferResponse.error) {
    return saveError(golferResponse.error.message);
  }

  const rosterResponse = await client
    .from("season_golfers")
    .update({ ...values.seasonGolfer, updated_at: new Date().toISOString() })
    .eq("id", seasonGolferId);

  return rosterResponse.error ? saveError(rosterResponse.error.message) : saveOk();
}

export async function createCourse(values: CourseUpdate): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client.from("courses").insert(values);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function updateCourse(
  id: string,
  values: CourseUpdate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client
    .from("courses")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function updateCourseHoles(
  courseId: string,
  values: CourseHoleUpdate[],
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  if (values.length !== 18) {
    return saveError("Enter hole data for all 18 holes.");
  }

  const response = await client.from("course_holes").upsert(
    values.map((hole) => ({
      ...hole,
      course_id: courseId,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "course_id,hole_number" },
  );

  return response.error ? saveError(response.error.message) : saveOk();
}

export async function createWeeklyEvent(
  seasonId: string,
  values: WeeklyEventCreate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client.from("weekly_events").insert({
    ...values,
    season_id: seasonId,
  });
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function updateWeeklyEvent(
  id: string,
  values: WeeklyEventUpdate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client
    .from("weekly_events")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function createTeeTime(
  weeklyEventId: string,
  sortOrder: number,
  values: TeeTimeUpdate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client.from("weekly_tee_times").insert({
    weekly_event_id: weeklyEventId,
    starts_at: values.starts_at,
    sort_order: sortOrder,
  });
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function updateTeeTime(
  id: string,
  values: TeeTimeUpdate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client
    .from("weekly_tee_times")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
}

export async function deleteTeeTime(id: string): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const response = await client.from("weekly_tee_times").delete().eq("id", id);
  return response.error ? saveError(response.error.message) : saveOk();
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
