import { describe, expect, it } from "vitest";

import { calculateAwardMetrics } from "@/lib/awards";
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
];

function result(
  overrides: Partial<LeaderboardResultInput> &
    Pick<LeaderboardResultInput, "golferId" | "weeklyEventId">,
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

function metric(id: ReturnType<typeof calculateAwardMetrics>[number]["id"]) {
  const metrics = calculateAwardMetrics({
    golfers,
    weeks,
    results: [
      result({
        weeklyEventId: "w1",
        golferId: "zach",
        matchResult: "won",
        grossScore: 41,
        netScore: 32,
        putts: 14,
      }),
      result({
        weeklyEventId: "w1",
        golferId: "joe",
        matchResult: "lost",
        grossScore: 42,
        netScore: 32,
        putts: 13,
      }),
      result({
        weeklyEventId: "w2",
        golferId: "zach",
        matchResult: "lost",
        grossScore: 55,
        netScore: 49,
        putts: 24,
      }),
      result({
        weeklyEventId: "w2",
        golferId: "joe",
        matchResult: "won",
        grossScore: 60,
        netScore: 49,
        putts: 25,
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
        weeklyEventId: "w3",
        golferId: "jared",
        matchResult: "won",
        grossScore: 1,
        netScore: 1,
        putts: 1,
      }),
    ],
  });

  const found = metrics.find((item) => item.id === id);

  if (!found) {
    throw new Error(`Missing metric ${id}`);
  }

  return found;
}

describe("award and sanction metrics", () => {
  it("calculates MVP from wins with documented tie-breakers", () => {
    expect(metric("mvp").winners).toEqual([
      expect.objectContaining({
        golferId: "zach",
        value: 1,
      }),
    ]);
  });

  it("uses lower putts as the Going Low tie-breaker", () => {
    expect(metric("going-low").winners).toEqual([
      expect.objectContaining({
        golferId: "joe",
        value: 32,
        weekId: "w1",
      }),
    ]);
  });

  it("uses lower net as the Stroke King tie-breaker", () => {
    expect(metric("stroke-king").winners).toEqual([
      expect.objectContaining({
        golferId: "joe",
        value: 13,
        weekId: "w1",
      }),
    ]);
  });

  it("calculates least team match wins sanction", () => {
    expect(metric("least-wins").winners).toEqual([
      expect.objectContaining({
        golferId: "jared",
        value: 0,
      }),
    ]);
  });

  it("uses higher putts as the highest-net sanction tie-breaker", () => {
    expect(metric("highest-net").winners).toEqual([
      expect.objectContaining({
        golferId: "joe",
        value: 49,
        weekId: "w2",
      }),
    ]);
  });

  it("uses higher net as the highest-putts sanction tie-breaker", () => {
    expect(metric("highest-putts").winners).toEqual([
      expect.objectContaining({
        golferId: "joe",
        value: 25,
        weekId: "w2",
      }),
    ]);
  });

  it("shares awards when all tie-breakers remain tied", () => {
    const metrics = calculateAwardMetrics({
      golfers: golfers.slice(0, 2),
      weeks,
      results: [
        result({ weeklyEventId: "w1", golferId: "zach", matchResult: "won" }),
        result({ weeklyEventId: "w1", golferId: "joe", matchResult: "won" }),
      ],
    });

    expect(metrics.find((item) => item.id === "mvp")?.winners).toHaveLength(2);
  });

  it("excludes planned weeks from regular-season award metrics", () => {
    const metrics = calculateAwardMetrics({
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

    expect(metrics.find((item) => item.id === "going-low")?.winners).toEqual([]);
    expect(metrics.find((item) => item.id === "mvp")?.winners).not.toContainEqual(
      expect.objectContaining({ golferId: "jared", value: 1 }),
    );
  });
});
