import { describe, expect, it } from "vitest";

import { calculateAwardMetrics } from "@/lib/awards";
import { calculateRawLeaderboard } from "@/lib/leaderboard";
import { buildMatchFormatPlan } from "@/lib/match-format-planner";
import {
  generateRandomMatchPlan,
  type MatchGeneratorGolfer,
} from "@/lib/match-generator";
import {
  calculatePointsChampion,
  calculateTournamentChampion,
  calculateTournamentStandings,
} from "@/lib/tournament";
import {
  calculateWeeklyPointBreakdowns,
  type WeeklyScoringInput,
} from "@/lib/scoring";
import { buildStrokeAllocationPlan } from "@/lib/stroke-allocation";
import type { LeaderboardResultInput, LeaderboardWeek } from "@/lib/leaderboard";
import type { CourseHoleRating } from "@/lib/stroke-allocation";
import type { TournamentRound, TournamentRoundResult } from "@/lib/data/league-data";

const golfers = [
  { id: "zach", displayName: "Zach" },
  { id: "john", displayName: "John" },
  { id: "joe", displayName: "Joe" },
  { id: "bird", displayName: "Bird" },
  { id: "bryan", displayName: "Bryan" },
  { id: "gt", displayName: "GT" },
  { id: "joey", displayName: "Joey" },
  { id: "hunter", displayName: "Hunter" },
  { id: "brandt", displayName: "Brandt" },
  { id: "jared", displayName: "Jared" },
];

const w01Rows: WeeklyScoringInput[] = [
  {
    id: "w1-zach",
    golferId: "zach",
    golferName: "Zach",
    attendanceStatus: "confirmed",
    matchResult: "won",
    handicapSnapshot: 21,
    grossScore: 40,
    netScore: 29,
    putts: 13,
  },
  {
    id: "w1-john",
    golferId: "john",
    golferName: "John",
    attendanceStatus: "confirmed",
    matchResult: "tied",
    handicapSnapshot: 28,
    grossScore: 60,
    netScore: 46,
    putts: 18,
  },
  {
    id: "w1-joe",
    golferId: "joe",
    golferName: "Joe",
    attendanceStatus: "confirmed",
    matchResult: "tied",
    handicapSnapshot: 17.9,
    grossScore: 42,
    netScore: 33,
    putts: 17,
  },
  {
    id: "w1-bird",
    golferId: "bird",
    golferName: "Bird",
    attendanceStatus: "confirmed",
    matchResult: "won",
    handicapSnapshot: 16.8,
    grossScore: 42,
    netScore: 33,
    putts: 21,
  },
  {
    id: "w1-bryan",
    golferId: "bryan",
    golferName: "Bryan",
    attendanceStatus: "confirmed",
    matchResult: "tied",
    handicapSnapshot: 13.9,
    grossScore: 42,
    netScore: 35,
    putts: 18,
  },
  {
    id: "w1-gt",
    golferId: "gt",
    golferName: "GT",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 12.7,
    grossScore: 44,
    netScore: 37,
    putts: 15,
  },
  {
    id: "w1-joey",
    golferId: "joey",
    golferName: "Joey",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 10.9,
    grossScore: 44,
    netScore: 38,
    putts: 18,
  },
  {
    id: "w1-hunter",
    golferId: "hunter",
    golferName: "Hunter",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 28,
    grossScore: 55,
    netScore: 41,
    putts: 18,
  },
  {
    id: "w1-brandt",
    golferId: "brandt",
    golferName: "Brandt",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 9.1,
    grossScore: 51,
    netScore: 46,
    putts: 16,
  },
  {
    id: "w1-jared",
    golferId: "jared",
    golferName: "Jared",
    attendanceStatus: "no_show",
    matchResult: "not_applicable",
    handicapSnapshot: null,
    grossScore: null,
    netScore: null,
    putts: null,
  },
];

const weeks: LeaderboardWeek[] = [
  { id: "w1", status: "completed" },
  { id: "w2", status: "completed" },
  { id: "w3", status: "planned" },
  { id: "w4", status: "canceled" },
];

function resultForWeek(
  weekId: string,
  row: WeeklyScoringInput,
): LeaderboardResultInput {
  return {
    id: `${weekId}-${row.golferId}`,
    weeklyEventId: weekId,
    golferId: row.golferId,
    attendanceStatus: row.attendanceStatus,
    matchResult: row.matchResult,
    handicapSnapshot: row.handicapSnapshot,
    grossScore: row.grossScore,
    netScore: row.netScore,
    putts: row.putts,
  };
}

const regressionResults: LeaderboardResultInput[] = [
  ...w01Rows.map((row) => resultForWeek("w1", row)),
  {
    id: "w2-zach",
    weeklyEventId: "w2",
    golferId: "zach",
    attendanceStatus: "played",
    matchResult: "lost",
    handicapSnapshot: 21,
    grossScore: 50,
    netScore: 39,
    putts: 18,
  },
  {
    id: "w2-joe",
    weeklyEventId: "w2",
    golferId: "joe",
    attendanceStatus: "played",
    matchResult: "won",
    handicapSnapshot: 17.9,
    grossScore: 43,
    netScore: 34,
    putts: 16,
  },
  {
    id: "w2-jared",
    weeklyEventId: "w2",
    golferId: "jared",
    attendanceStatus: "no_show",
    matchResult: "not_applicable",
    handicapSnapshot: null,
    grossScore: null,
    netScore: null,
    putts: null,
  },
  {
    id: "w3-jared",
    weeklyEventId: "w3",
    golferId: "jared",
    attendanceStatus: "unknown",
    matchResult: "not_applicable",
    handicapSnapshot: 1,
    grossScore: 1,
    netScore: 1,
    putts: 1,
  },
  {
    id: "w4-zach",
    weeklyEventId: "w4",
    golferId: "zach",
    attendanceStatus: "played",
    matchResult: "won",
    handicapSnapshot: 21,
    grossScore: 1,
    netScore: 1,
    putts: 1,
  },
];

function courseHoles(): CourseHoleRating[] {
  return Array.from({ length: 18 }, (_, index) => ({
    hole_number: index + 1,
    handicap_rank: index + 1,
  }));
}

function generatorGolfers(): MatchGeneratorGolfer[] {
  return w01Rows
    .filter((row) => row.attendanceStatus === "confirmed")
    .map((row) => ({
      golferId: row.golferId,
      handicapSnapshot: row.handicapSnapshot ?? 0,
      halfHandicap: Math.ceil((row.handicapSnapshot ?? 0) / 2),
    }));
}

const tournamentRounds: TournamentRound[] = [
  {
    id: "round-1",
    tournament_id: "tournament-1",
    round_number: 1,
    play_date: "2026-09-12",
    holes: 18,
    course_id: "course-1",
  },
  {
    id: "round-2",
    tournament_id: "tournament-1",
    round_number: 2,
    play_date: "2026-09-13",
    holes: 18,
    course_id: "course-1",
  },
];

function tournamentResult(
  roundId: string,
  golferId: string,
  netScore: number,
  putts: number,
): TournamentRoundResult {
  return {
    id: `${roundId}-${golferId}`,
    tournament_round_id: roundId,
    golfer_id: golferId,
    handicap_snapshot: 10,
    net_score: netScore,
    putts,
  };
}

describe("first-version regression harness", () => {
  it("protects W01 scoring, dense ranks, missing scores, and no-show behavior", () => {
    const breakdowns = calculateWeeklyPointBreakdowns(w01Rows);
    const byGolfer = new Map(
      breakdowns.map((breakdown) => [breakdown.golferId, breakdown]),
    );

    expect(byGolfer.get("zach")).toMatchObject({
      gross: { rank: 1, points: 6 },
      net: { rank: 1, points: 5 },
      putt: { rank: 1, points: 4 },
      totalPoints: 23,
    });
    expect(byGolfer.get("joe")).toMatchObject({
      gross: { rank: 2, points: 4 },
      net: { rank: 2, points: 4 },
      putt: { rank: 4, points: 1 },
      totalPoints: 14,
    });
    expect(byGolfer.get("jared")).toMatchObject({
      gross: { rank: null, points: 0 },
      net: { rank: null, points: 0 },
      putt: { rank: null, points: 0 },
      totalPoints: 0,
    });
  });

  it("protects leaderboard and drop-week behavior against planned/canceled leakage", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: regressionResults,
      dropLowestWeekCount: 2,
    });
    const zach = rows.find((row) => row.golferId === "zach");
    const jared = rows.find((row) => row.golferId === "jared");

    expect(zach).toMatchObject({
      rawPoints: 37,
      officialPoints: 0,
      lowestGross: 40,
      lowestNet: 29,
      lowestPutts: 13,
    });
    expect(jared).toMatchObject({
      rawPoints: 0,
      officialPoints: 0,
      noShowCount: 2,
      completedWeekCount: 2,
      lowestGross: null,
    });
    expect(zach?.rawPoints).not.toBeGreaterThan(37);
  });

  it("protects match planning, generation, and stroke allocation for W01-style attendance", () => {
    const plan = buildMatchFormatPlan({
      golfers: w01Rows.map((row) => ({
        golferId: row.golferId,
        status: row.attendanceStatus,
      })),
    });

    expect(plan).toMatchObject({
      ok: true,
      eligibleGolferIds: [
        "zach",
        "john",
        "joe",
        "bird",
        "bryan",
        "gt",
        "joey",
        "hunter",
        "brandt",
      ],
      formats: [
        { format: "one_v_one_v_one", golferCount: 3 },
        { format: "one_v_one_v_one", golferCount: 3 },
        { format: "one_v_one_v_one", golferCount: 3 },
      ],
    });

    if (!plan.ok) {
      throw new Error("Expected W01 format planning to succeed.");
    }

    const generated = generateRandomMatchPlan({
      randomSeed: "w01-regression",
      generatedAt: "2026-06-04T12:00:00.000Z",
      formats: plan.formats,
      golfers: generatorGolfers(),
      courseHoles: courseHoles(),
    });

    expect(generated.ok).toBe(true);
    if (generated.ok) {
      expect(generated.matches).toHaveLength(3);
      expect(generated.matches.every((match) => match.format === "one_v_one_v_one"))
        .toBe(true);
      expect(generated.matches.flatMap((match) => match.strokeAllocations).length)
        .toBeGreaterThan(0);
    }
  });

  it("protects award and sanction calculations from tournament and planned-week data", () => {
    const metrics = calculateAwardMetrics({
      golfers,
      weeks,
      results: regressionResults,
      dropLowestWeekCount: 2,
    });
    const goingLow = metrics.find((metric) => metric.id === "going-low");
    const strokeKing = metrics.find((metric) => metric.id === "stroke-king");

    expect(goingLow?.winners).toEqual([
      expect.objectContaining({
        golferId: "zach",
        value: 29,
        weekId: "w1",
      }),
    ]);
    expect(strokeKing?.winners).toEqual([
      expect.objectContaining({
        golferId: "zach",
        value: 13,
        weekId: "w1",
      }),
    ]);
    expect(goingLow?.winners).not.toContainEqual(
      expect.objectContaining({ golferId: "jared", value: 1 }),
    );
  });

  it("protects tournament standings, tournament points, and champion separation", () => {
    const standings = calculateTournamentStandings({
      golfers: golfers.map((golfer) => ({
        id: golfer.id,
        display_name: golfer.displayName,
        active: true,
      })),
      rounds: tournamentRounds,
      results: [
        tournamentResult("round-1", "zach", 74, 34),
        tournamentResult("round-2", "zach", 73, 35),
        tournamentResult("round-1", "joe", 72, 33),
        tournamentResult("round-2", "joe", 72, 34),
        tournamentResult("round-1", "jared", 82, 40),
        tournamentResult("round-2", "jared", 80, 39),
      ],
    });
    const leaderboardRows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: regressionResults,
      dropLowestWeekCount: 2,
    });
    const tournamentChampion = calculateTournamentChampion(standings);
    const pointsChampion = calculatePointsChampion(leaderboardRows);

    expect(standings[0]).toMatchObject({
      golferId: "joe",
      place: 1,
      tournamentPoints: 12,
      totalNetScore: 144,
    });
    expect(tournamentChampion.winners).toEqual([
      expect.objectContaining({ golferId: "joe" }),
    ]);
    expect(pointsChampion.winners).not.toContainEqual(
      expect.objectContaining({ detail: expect.stringContaining("tournament") }),
    );
  });

  it("protects explicit stroke allocation blocking for missing course data", () => {
    expect(
      buildStrokeAllocationPlan({
        format: "one_v_one",
        sides: [
          { sideId: "low", sideNumber: 1, halfHandicap: 4 },
          { sideId: "high", sideNumber: 2, halfHandicap: 7 },
        ],
        courseHoles: courseHoles().slice(0, 17),
      }),
    ).toEqual({
      ok: false,
      allocations: [],
      issues: [
        "Course needs all 18 hole handicap ratings before stroke allocation.",
      ],
    });
  });
});
