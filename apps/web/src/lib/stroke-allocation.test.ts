import { describe, expect, it } from "vitest";

import {
  allocateStrokesToHoles,
  buildStrokeAllocationInserts,
  buildStrokeAllocationPlan,
  type CourseHoleRating,
} from "@/lib/stroke-allocation";

function completeCourseHoles(): CourseHoleRating[] {
  return [
    { hole_number: 1, handicap_rank: 9 },
    { hole_number: 2, handicap_rank: 1 },
    { hole_number: 3, handicap_rank: 7 },
    { hole_number: 4, handicap_rank: 3 },
    { hole_number: 5, handicap_rank: 5 },
    { hole_number: 6, handicap_rank: 11 },
    { hole_number: 7, handicap_rank: 13 },
    { hole_number: 8, handicap_rank: 15 },
    { hole_number: 9, handicap_rank: 17 },
    { hole_number: 10, handicap_rank: 2 },
    { hole_number: 11, handicap_rank: 4 },
    { hole_number: 12, handicap_rank: 6 },
    { hole_number: 13, handicap_rank: 8 },
    { hole_number: 14, handicap_rank: 10 },
    { hole_number: 15, handicap_rank: 12 },
    { hole_number: 16, handicap_rank: 14 },
    { hole_number: 17, handicap_rank: 16 },
    { hole_number: 18, handicap_rank: 18 },
  ];
}

describe("stroke allocation", () => {
  it("allocates 1v1 strokes to the higher half-handicap side", () => {
    const plan = buildStrokeAllocationPlan({
      format: "one_v_one",
      sides: [
        { sideId: "low", sideNumber: 1, halfHandicap: 4 },
        { sideId: "high", sideNumber: 2, halfHandicap: 7 },
      ],
      courseHoles: completeCourseHoles(),
    });

    expect(plan).toEqual({
      ok: true,
      allocations: [
        {
          receiving_side_id: "high",
          against_side_id: "low",
          hole_number: 2,
          strokes: 1,
        },
        {
          receiving_side_id: "high",
          against_side_id: "low",
          hole_number: 4,
          strokes: 1,
        },
        {
          receiving_side_id: "high",
          against_side_id: "low",
          hole_number: 5,
          strokes: 1,
        },
      ],
      notes: [],
    });
  });

  it("allocates extra strokes by cycling through the same difficulty order", () => {
    const plan = allocateStrokesToHoles({
      strokeCount: 11,
      courseHoles: completeCourseHoles(),
    });

    expect(plan).toEqual({
      ok: true,
      allocations: [
        { hole_number: 2, strokes: 2 },
        { hole_number: 4, strokes: 2 },
        { hole_number: 5, strokes: 1 },
        { hole_number: 3, strokes: 1 },
        { hole_number: 1, strokes: 1 },
        { hole_number: 6, strokes: 1 },
        { hole_number: 7, strokes: 1 },
        { hole_number: 8, strokes: 1 },
        { hole_number: 9, strokes: 1 },
      ],
    });
  });

  it("calculates 1v1v1 pairwise allocations from low, middle, and high handicaps", () => {
    const plan = buildStrokeAllocationPlan({
      format: "one_v_one_v_one",
      sides: [
        { sideId: "bryan", sideNumber: 1, halfHandicap: 7 },
        { sideId: "joe", sideNumber: 2, halfHandicap: 9 },
        { sideId: "john", sideNumber: 3, halfHandicap: 14 },
      ],
      courseHoles: completeCourseHoles(),
    });

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(
        plan.allocations.filter(
          (allocation) =>
            allocation.receiving_side_id === "joe" &&
            allocation.against_side_id === "bryan",
        ),
      ).toHaveLength(2);
      expect(
        plan.allocations.filter(
          (allocation) =>
            allocation.receiving_side_id === "john" &&
            allocation.against_side_id === "bryan",
        ),
      ).toHaveLength(7);
      expect(
        plan.allocations.filter(
          (allocation) =>
            allocation.receiving_side_id === "john" &&
            allocation.against_side_id === "joe",
        ),
      ).toHaveLength(5);
    }
  });

  it("blocks allocation when course hole handicap data is incomplete", () => {
    const plan = buildStrokeAllocationPlan({
      format: "one_v_one",
      sides: [
        { sideId: "low", sideNumber: 1, halfHandicap: 4 },
        { sideId: "high", sideNumber: 2, halfHandicap: 7 },
      ],
      courseHoles: completeCourseHoles().slice(0, 17),
    });

    expect(plan).toEqual({
      ok: false,
      allocations: [],
      issues: [
        "Course needs all 18 hole handicap ratings before stroke allocation.",
      ],
    });
  });

  it("blocks allocation when a side is missing a half-handicap", () => {
    const plan = buildStrokeAllocationPlan({
      format: "one_v_one",
      sides: [
        { sideId: "low", sideNumber: 1, halfHandicap: 4 },
        { sideId: "missing", sideNumber: 2, halfHandicap: null },
      ],
      courseHoles: completeCourseHoles(),
    });

    expect(plan).toEqual({
      ok: false,
      allocations: [],
      issues: ["Side 2 is missing a valid half-handicap."],
    });
  });

  it("does not calculate official 2v2 team stroke allocations in the first version", () => {
    const plan = buildStrokeAllocationPlan({
      format: "two_v_two",
      sides: [
        { sideId: "team-1", sideNumber: 1, halfHandicap: 12 },
        { sideId: "team-2", sideNumber: 2, halfHandicap: 9 },
      ],
      courseHoles: completeCourseHoles(),
    });

    expect(plan).toEqual({
      ok: true,
      allocations: [],
      notes: [
        "2v2 first-version behavior displays player half-handicaps only; official team stroke allocation is not calculated.",
      ],
    });
  });

  it("builds rows shaped for stroke_allocations inserts", () => {
    expect(
      buildStrokeAllocationInserts({
        matchId: "match-1",
        allocations: [
          {
            receiving_side_id: "high",
            against_side_id: "low",
            hole_number: 2,
            strokes: 1,
          },
        ],
      }),
    ).toEqual([
      {
        match_id: "match-1",
        receiving_side_id: "high",
        against_side_id: "low",
        hole_number: 2,
        strokes: 1,
      },
    ]);
  });
});
