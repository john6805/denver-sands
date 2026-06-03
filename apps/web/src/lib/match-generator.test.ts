import { describe, expect, it } from "vitest";

import type { PlannedMatchFormat } from "@/lib/match-format-planner";
import {
  buildGeneratedMatchPersistenceRows,
  generateRandomMatchPlan,
  type MatchGeneratorGolfer,
} from "@/lib/match-generator";
import type { CourseHoleRating } from "@/lib/stroke-allocation";

function golfers(names: string[]): MatchGeneratorGolfer[] {
  return names.map((name, index) => ({
    golferId: name,
    handicapSnapshot: index + 10,
    halfHandicap: index + 5,
  }));
}

function courseHoles(): CourseHoleRating[] {
  return Array.from({ length: 18 }, (_, index) => ({
    hole_number: index + 1,
    handicap_rank: index + 1,
  }));
}

function sidePairs(plan: ReturnType<typeof generateRandomMatchPlan>) {
  if (!plan.ok) {
    return [];
  }

  return plan.matches.flatMap((match) =>
    match.sides
      .filter((side) => side.participants.length === 2)
      .map((side) =>
        side.participants
          .map((participant) => participant.golferId)
          .sort()
          .join("+"),
      ),
  );
}

describe("random match generator", () => {
  it("generates deterministic draft matchups for a fixed seed", () => {
    const formats: PlannedMatchFormat[] = [
      { format: "two_v_two", golferCount: 4 },
      { format: "one_v_one", golferCount: 2 },
    ];
    const input = {
      randomSeed: "week-4",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats,
      golfers: golfers(["a", "b", "c", "d", "e", "f"]),
      teeTimeIds: ["tee-1", "tee-2"],
    };

    expect(generateRandomMatchPlan(input)).toEqual(generateRandomMatchPlan(input));
  });

  it("rerolls draft matchups by changing the deterministic seed path", () => {
    const formats: PlannedMatchFormat[] = [
      { format: "one_v_one_v_one", golferCount: 3 },
      { format: "one_v_one_v_one", golferCount: 3 },
      { format: "one_v_one_v_one", golferCount: 3 },
    ];
    const input = {
      randomSeed: "week-1",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats,
      golfers: golfers(["a", "b", "c", "d", "e", "f", "g", "h", "i"]),
    };
    const first = generateRandomMatchPlan(input);
    const rerolled = generateRandomMatchPlan({ ...input, rerollCount: 1 });

    expect(first.ok).toBe(true);
    expect(rerolled.ok).toBe(true);
    if (first.ok && rerolled.ok) {
      expect(first.rerollCount).toBe(0);
      expect(rerolled.rerollCount).toBe(1);
      expect(first.matches).not.toEqual(rerolled.matches);
    }
  });

  it("avoids a third consecutive 2v2 partnership when a valid alternative exists", () => {
    const plan = generateRandomMatchPlan({
      randomSeed: "avoid-repeat",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats: [{ format: "two_v_two", golferCount: 4 }],
      golfers: golfers(["a", "b", "c", "d"]),
      pairingHistory: [
        {
          golferIds: ["a", "b"],
          twoVTwoPartnerStreak: 2,
        },
      ],
      attempts: 40,
    });

    expect(plan.ok).toBe(true);
    expect(plan.ok ? plan.unavoidableConflict : null).toBe(false);
    expect(sidePairs(plan)).not.toContain("a+b");
  });

  it("flags a third consecutive 2v2 partnership as unavoidable when every team is blocked", () => {
    const plan = generateRandomMatchPlan({
      randomSeed: "unavoidable-repeat",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats: [{ format: "two_v_two", golferCount: 4 }],
      golfers: golfers(["a", "b", "c", "d"]),
      pairingHistory: [
        { golferIds: ["a", "b"], twoVTwoPartnerStreak: 2 },
        { golferIds: ["a", "c"], twoVTwoPartnerStreak: 2 },
        { golferIds: ["a", "d"], twoVTwoPartnerStreak: 2 },
        { golferIds: ["b", "c"], twoVTwoPartnerStreak: 2 },
        { golferIds: ["b", "d"], twoVTwoPartnerStreak: 2 },
        { golferIds: ["c", "d"], twoVTwoPartnerStreak: 2 },
      ],
      attempts: 40,
    });

    expect(plan).toMatchObject({
      ok: true,
      unavoidableConflict: true,
      warnings: [
        "A third-consecutive 2v2 partnership could not be avoided with the available golfers and format mix.",
      ],
    });
  });

  it("uses soft scoring to reduce repeated 1v1 opponents and 1v1v1 groupmates", () => {
    const plan = generateRandomMatchPlan({
      randomSeed: "soft-repeat",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats: [
        { format: "one_v_one_v_one", golferCount: 3 },
        { format: "one_v_one_v_one", golferCount: 3 },
      ],
      golfers: golfers(["a", "b", "c", "d", "e", "f"]),
      pairingHistory: [
        { golferIds: ["a", "b"], recentGroupmateCount: 10 },
      ],
      attempts: 40,
    });

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      const groups = plan.matches.map((match) =>
        match.sides
          .flatMap((side) => side.participants.map((participant) => participant.golferId))
          .sort(),
      );

      expect(groups.some((group) => group.includes("a") && group.includes("b"))).toBe(false);
    }
  });

  it("includes handicap snapshots, stroke allocations, seed, timestamps, and tee times in persistence rows", () => {
    const plan = generateRandomMatchPlan({
      randomSeed: "persist-me",
      generatedAt: "2026-06-03T13:30:00.000Z",
      formats: [{ format: "one_v_one", golferCount: 2 }],
      golfers: golfers(["low", "high"]),
      teeTimeIds: ["tee-1"],
      courseHoles: courseHoles(),
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }

    const rows = buildGeneratedMatchPersistenceRows({
      weeklyEventId: "week-1",
      plan,
    });

    expect(rows.weeklyMatches).toEqual([
      {
        id: "draft-match-1",
        weekly_event_id: "week-1",
        tee_time_id: "tee-1",
        format: "one_v_one",
        status: "draft",
        random_seed: "persist-me",
        generated_at: "2026-06-03T13:30:00.000Z",
        unavoidable_conflict: false,
      },
    ]);
    expect(rows.weeklyMatchParticipants).toHaveLength(2);
    expect(rows.weeklyMatchParticipants[0]).toMatchObject({
      handicap_snapshot: expect.any(Number),
      half_handicap_snapshot: expect.any(Number),
    });
    expect(rows.strokeAllocations.length).toBeGreaterThan(0);
    expect(rows.strokeAllocations[0]).toMatchObject({
      match_id: "draft-match-1",
      receiving_side_id: expect.stringContaining("draft-match-1-side-"),
      against_side_id: expect.stringContaining("draft-match-1-side-"),
      hole_number: expect.any(Number),
      strokes: expect.any(Number),
    });
  });

  it("rejects mismatched format and golfer counts", () => {
    expect(
      generateRandomMatchPlan({
        randomSeed: "bad",
        generatedAt: "2026-06-03T13:30:00.000Z",
        formats: [{ format: "two_v_two", golferCount: 4 }],
        golfers: golfers(["a", "b"]),
      }),
    ).toEqual({
      ok: false,
      randomSeed: "bad",
      generatedAt: "2026-06-03T13:30:00.000Z",
      rerollCount: 0,
      matches: [],
      issues: ["Format plan requires 4 golfers, but 2 were provided."],
    });
  });
});
