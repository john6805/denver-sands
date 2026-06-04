import { describe, expect, it } from "vitest";

import { calculateRawLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardResultInput, LeaderboardWeek } from "@/lib/leaderboard";

const golfers = [
  { id: "zach", displayName: "Zach" },
  { id: "joe", displayName: "Joe" },
  { id: "jared", displayName: "Jared" },
];

const weeks: LeaderboardWeek[] = [
  { id: "w1", status: "completed" },
  { id: "w2", status: "locked" },
  { id: "w3", status: "planned" },
  { id: "w4", status: "canceled" },
];

function result(
  overrides: Partial<LeaderboardResultInput> & Pick<LeaderboardResultInput, "golferId" | "weeklyEventId">,
): LeaderboardResultInput {
  return {
    id: `${overrides.weeklyEventId}-${overrides.golferId}`,
    attendanceStatus: "played",
    matchResult: "lost",
    handicapSnapshot: 10,
    grossScore: 50,
    netScore: 45,
    putts: 18,
    ...overrides,
  };
}

describe("raw leaderboard", () => {
  it("aggregates raw points, points behind, match wins, and low stats", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: [
        result({
          weeklyEventId: "w1",
          golferId: "zach",
          matchResult: "won",
          handicapSnapshot: 21,
          grossScore: 40,
          netScore: 29,
          putts: 13,
        }),
        result({
          weeklyEventId: "w1",
          golferId: "joe",
          matchResult: "tied",
          handicapSnapshot: 17.9,
          grossScore: 42,
          netScore: 33,
          putts: 17,
        }),
        result({
          weeklyEventId: "w1",
          golferId: "jared",
          attendanceStatus: "no_show",
          matchResult: "not_applicable",
          handicapSnapshot: null,
          grossScore: null,
          netScore: null,
          putts: null,
        }),
        result({
          weeklyEventId: "w2",
          golferId: "zach",
          matchResult: "lost",
          grossScore: 45,
          netScore: 40,
          putts: 15,
        }),
        result({
          weeklyEventId: "w2",
          golferId: "joe",
          matchResult: "won",
          grossScore: 41,
          netScore: 36,
          putts: 14,
        }),
      ],
    });

    expect(rows[0]).toMatchObject({
      rank: 1,
      golferId: "joe",
      rawPoints: 39,
      pointsBehind: 0,
      matchWins: 1,
      lowestGross: 41,
      lowestNet: 33,
      lowestPutts: 14,
    });
    expect(rows[1]).toMatchObject({
      golferId: "zach",
      rawPoints: 37,
      pointsBehind: 2,
      matchWins: 1,
      lowestGross: 40,
      lowestNet: 29,
      lowestPutts: 13,
    });
    expect(rows[2]).toMatchObject({
      golferId: "jared",
      rawPoints: 0,
      noShowCount: 1,
      lowestGross: null,
      lowestNet: null,
      lowestPutts: null,
    });
  });

  it("excludes planned weeks from completed stats and raw points", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: [
        result({
          weeklyEventId: "w3",
          golferId: "jared",
          matchResult: "won",
          grossScore: 1,
          netScore: 1,
          putts: 1,
        }),
      ],
    });

    expect(rows.find((row) => row.golferId === "jared")).toMatchObject({
      rawPoints: 0,
      completedWeekCount: 0,
      lowestGross: null,
    });
  });

  it("counts unknown rows in completed weeks as blanks without treating missing scores as zeroes", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: [
        result({
          weeklyEventId: "w1",
          golferId: "joe",
          attendanceStatus: "unknown",
          matchResult: "not_applicable",
          handicapSnapshot: null,
          grossScore: null,
          netScore: null,
          putts: null,
        }),
      ],
    });

    expect(rows.find((row) => row.golferId === "joe")).toMatchObject({
      rawPoints: 0,
      blankWeekCount: 1,
      lowestGross: null,
      lowestNet: null,
      lowestPutts: null,
    });
  });

  it("handles tied leaderboard positions consistently", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: [
        result({ weeklyEventId: "w1", golferId: "zach", matchResult: "lost" }),
        result({ weeklyEventId: "w1", golferId: "joe", matchResult: "lost" }),
      ],
    });

    expect(rows.slice(0, 2).map((row) => row.rank)).toEqual([1, 1]);
  });

  it("keeps beer points as a social-only metric", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      results: [
        result({
          weeklyEventId: "w1",
          golferId: "zach",
          beerCount: 3,
        }),
      ],
    });

    expect(rows.find((row) => row.golferId === "zach")).toMatchObject({
      rawPoints: 18,
      beerTotal: 3,
      pointsPlusBeer: 21,
    });
  });

  it("drops each golfer's lowest eligible completed weeks for official standings", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      dropLowestWeekCount: 2,
      results: [
        result({ weeklyEventId: "w1", golferId: "zach" }),
        result({
          weeklyEventId: "w2",
          golferId: "zach",
          attendanceStatus: "confirmed",
          grossScore: null,
          netScore: null,
          putts: null,
        }),
        result({
          weeklyEventId: "w1",
          golferId: "joe",
          attendanceStatus: "no_show",
          matchResult: "not_applicable",
          handicapSnapshot: null,
          grossScore: null,
          netScore: null,
          putts: null,
        }),
        result({ weeklyEventId: "w2", golferId: "joe" }),
      ],
    });

    expect(rows.find((row) => row.golferId === "zach")).toMatchObject({
      rawPoints: 21,
      officialPoints: 0,
      droppedWeekCount: 2,
      droppedPoints: 21,
    });
    expect(rows.find((row) => row.golferId === "joe")).toMatchObject({
      rawPoints: 18,
      officialPoints: 0,
      droppedWeekCount: 2,
      droppedPoints: 18,
    });
  });

  it("excludes planned, canceled, and unknown rows from drop-week eligibility", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      dropLowestWeekCount: 2,
      results: [
        result({
          weeklyEventId: "w1",
          golferId: "zach",
          attendanceStatus: "unknown",
          matchResult: "not_applicable",
          handicapSnapshot: null,
          grossScore: null,
          netScore: null,
          putts: null,
        }),
        result({ weeklyEventId: "w3", golferId: "zach" }),
        result({ weeklyEventId: "w4", golferId: "zach" }),
      ],
    });

    expect(rows.find((row) => row.golferId === "zach")).toMatchObject({
      rawPoints: 0,
      officialPoints: 0,
      droppedWeekCount: 0,
      droppedPoints: 0,
    });
  });

  it("includes completed no-show weeks as eligible low weeks", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      dropLowestWeekCount: 1,
      results: [
        result({
          weeklyEventId: "w1",
          golferId: "zach",
          attendanceStatus: "no_show",
          matchResult: "not_applicable",
          handicapSnapshot: null,
          grossScore: null,
          netScore: null,
          putts: null,
        }),
        result({ weeklyEventId: "w2", golferId: "zach" }),
      ],
    });

    expect(rows.find((row) => row.golferId === "zach")).toMatchObject({
      rawPoints: 18,
      officialPoints: 18,
      droppedWeekCount: 1,
      droppedPoints: 0,
      droppedWeeks: [{ weekId: "w1", totalPoints: 0 }],
    });
  });

  it("handles golfers with fewer than or equal to the configured drop count", () => {
    const rows = calculateRawLeaderboard({
      golfers,
      weeks,
      dropLowestWeekCount: 2,
      results: [
        result({ weeklyEventId: "w1", golferId: "zach" }),
        result({ weeklyEventId: "w2", golferId: "zach" }),
      ],
    });

    expect(rows.find((row) => row.golferId === "zach")).toMatchObject({
      rawPoints: 36,
      officialPoints: 0,
      droppedWeekCount: 2,
      droppedPoints: 36,
    });
  });
});
