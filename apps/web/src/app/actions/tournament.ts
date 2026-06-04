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
  Course,
  Golfer,
  SaveResponse,
  SeasonGolfer,
  SeasonSummary,
  Tournament,
  TournamentData,
  TournamentRound,
  TournamentRoundResult,
  WeeklyEventSummary,
  WeeklyResult,
} from "@/lib/data/league-data";
import type {
  TournamentCreate,
  TournamentResultUpsert,
} from "@/lib/tournament";

export async function getTournamentData(): Promise<ActionResult<TournamentData>> {
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
  const [
    golfersResponse,
    seasonGolfersResponse,
    coursesResponse,
    weeklyEventsResponse,
    tournamentsResponse,
  ] = await Promise.all([
    client.from("golfers").select("id,display_name,active").order("display_name"),
    client
      .from("season_golfers")
      .select("id,season_id,golfer_id,current_handicap")
      .eq("season_id", season.id),
    client.from("courses").select("id,name,booking_url,active").order("name"),
    client
      .from("weekly_events")
      .select("id,week_code,play_date,status")
      .eq("season_id", season.id)
      .order("play_date"),
    client
      .from("tournaments")
      .select("id,season_id,course_id,name,starts_on,ends_on,status")
      .eq("season_id", season.id)
      .order("starts_on", { ascending: false, nullsFirst: false }),
  ]);

  const firstError = [
    golfersResponse.error,
    seasonGolfersResponse.error,
    coursesResponse.error,
    weeklyEventsResponse.error,
    tournamentsResponse.error,
  ].find(Boolean);

  if (firstError) {
    return actionError(firstError.message);
  }

  const tournaments = (tournamentsResponse.data ?? []) as Tournament[];
  const weeklyEvents = (weeklyEventsResponse.data ?? []) as WeeklyEventSummary[];
  const weeklyEventIds = weeklyEvents.map((event) => event.id);
  const tournamentIds = tournaments.map((tournament) => tournament.id);
  let weeklyResults: WeeklyResult[] = [];
  let tournamentRounds: TournamentRound[] = [];
  let tournamentRoundResults: TournamentRoundResult[] = [];

  if (weeklyEventIds.length > 0) {
    const weeklyResultsResponse = await client
      .from("weekly_results")
      .select(
        "id,weekly_event_id,golfer_id,attendance_status,match_result,handicap_snapshot,gross_score,net_score,putts,locked_at,override_reason",
      )
      .in("weekly_event_id", weeklyEventIds);

    if (weeklyResultsResponse.error) {
      return actionError(weeklyResultsResponse.error.message);
    }

    weeklyResults = (weeklyResultsResponse.data ?? []) as WeeklyResult[];
  }

  if (tournamentIds.length > 0) {
    const roundsResponse = await client
      .from("tournament_rounds")
      .select("id,tournament_id,round_number,play_date,holes,course_id")
      .in("tournament_id", tournamentIds)
      .order("round_number");

    if (roundsResponse.error) {
      return actionError(roundsResponse.error.message);
    }

    tournamentRounds = (roundsResponse.data ?? []) as TournamentRound[];

    const roundIds = tournamentRounds.map((round) => round.id);

    if (roundIds.length > 0) {
      const resultsResponse = await client
        .from("tournament_round_results")
        .select(
          "id,tournament_round_id,golfer_id,handicap_snapshot,net_score,putts",
        )
        .in("tournament_round_id", roundIds);

      if (resultsResponse.error) {
        return actionError(resultsResponse.error.message);
      }

      tournamentRoundResults = (resultsResponse.data ??
        []) as TournamentRoundResult[];
    }
  }

  return actionOk({
    season,
    golfers: (golfersResponse.data ?? []) as Golfer[],
    seasonGolfers: (seasonGolfersResponse.data ?? []) as SeasonGolfer[],
    courses: (coursesResponse.data ?? []) as Course[],
    weeklyEvents,
    weeklyResults,
    tournaments,
    tournamentRounds,
    tournamentRoundResults,
  });
}

export async function createTournament(
  seasonId: string,
  values: TournamentCreate,
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  const tournamentResponse = await client
    .from("tournaments")
    .insert({
      season_id: seasonId,
      course_id: values.course_id,
      name: values.name,
      starts_on: values.starts_on,
      ends_on: values.ends_on,
      status: values.status,
    })
    .select("id")
    .single();

  if (tournamentResponse.error) {
    return saveError(tournamentResponse.error.message);
  }

  const roundsResponse = await client.from("tournament_rounds").insert(
    values.rounds.map((round) => ({
      tournament_id: tournamentResponse.data.id,
      round_number: round.round_number,
      play_date: round.play_date,
      course_id: round.course_id,
      holes: round.holes,
    })),
  );

  return roundsResponse.error ? saveError(roundsResponse.error.message) : saveOk();
}

export async function saveTournamentRoundResults(
  tournamentRoundId: string,
  rows: TournamentResultUpsert[],
): Promise<SaveResponse> {
  const client = createSupabaseServerClient();

  if (!client) {
    return saveError(missingConfigError());
  }

  if (rows.length === 0) {
    return saveError("At least one tournament result row is required.");
  }

  const response = await client.from("tournament_round_results").upsert(
    rows.map((row) => ({
      ...row,
      tournament_round_id: tournamentRoundId,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "tournament_round_id,golfer_id" },
  );

  return response.error ? saveError(response.error.message) : saveOk();
}
