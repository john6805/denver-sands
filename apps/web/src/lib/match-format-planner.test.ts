import { describe, expect, it } from "vitest";

import {
  buildMatchFormatPlan,
  shouldIncludeGolferForGeneration,
} from "@/lib/match-format-planner";
import type { AttendanceStatus } from "@/lib/scoring";

function confirmedGolfers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    golferId: `golfer-${index + 1}`,
    status: "confirmed" as const,
  }));
}

function formatsFor(count: number) {
  const plan = buildMatchFormatPlan({ golfers: confirmedGolfers(count) });

  return plan.ok ? plan.formats.map((item) => item.format) : plan.error;
}

describe("match format planner", () => {
  it("returns a clear error for fewer than 2 confirmed golfers", () => {
    expect(formatsFor(0)).toBe(
      "At least 2 confirmed golfers are required to generate matches.",
    );
    expect(formatsFor(1)).toBe(
      "At least 2 confirmed golfers are required to generate matches.",
    );
  });

  it.each([
    [2, ["one_v_one"]],
    [3, ["one_v_one_v_one"]],
    [4, ["two_v_two"]],
    [5, ["one_v_one_v_one", "one_v_one"]],
    [6, ["two_v_two", "one_v_one"]],
    [7, ["two_v_two", "one_v_one_v_one"]],
    [8, ["two_v_two", "two_v_two"]],
    [9, ["one_v_one_v_one", "one_v_one_v_one", "one_v_one_v_one"]],
    [10, ["two_v_two", "two_v_two", "one_v_one"]],
  ])("plans the documented format mix for %i golfers", (count, expected) => {
    expect(formatsFor(count)).toEqual(expected);
  });

  it("plans 11 golfers with 2v2 preference plus a 1v1v1 fallback", () => {
    expect(formatsFor(11)).toEqual([
      "two_v_two",
      "two_v_two",
      "one_v_one_v_one",
    ]);
  });

  it("filters out statuses that are not eligible for generation", () => {
    const plan = buildMatchFormatPlan({
      golfers: [
        { golferId: "confirmed", status: "confirmed" },
        { golferId: "played", status: "played" },
        { golferId: "unknown", status: "unknown" },
        { golferId: "declined", status: "declined" },
        { golferId: "withdrawn", status: "withdrawn" },
        { golferId: "no-show", status: "no_show" },
      ],
    });

    expect(plan).toEqual({
      ok: true,
      eligibleGolferIds: ["confirmed", "played"],
      formats: [{ format: "one_v_one", golferCount: 2 }],
      warnings: [],
    });
  });

  it.each([
    ["unknown", false],
    ["confirmed", true],
    ["declined", false],
    ["withdrawn", false],
    ["no_show", false],
    ["played", true],
  ] satisfies Array<[AttendanceStatus, boolean]>)(
    "reports whether %s is generation eligible",
    (status, expected) => {
      expect(shouldIncludeGolferForGeneration(status)).toBe(expected);
    },
  );

  it("warns when a documented small-count mix needs more tee times than available", () => {
    const plan = buildMatchFormatPlan({
      golfers: confirmedGolfers(9),
      teeTimeCount: 2,
    });

    expect(plan).toEqual({
      ok: true,
      eligibleGolferIds: confirmedGolfers(9).map((golfer) => golfer.golferId),
      formats: [
        { format: "one_v_one_v_one", golferCount: 3 },
        { format: "one_v_one_v_one", golferCount: 3 },
        { format: "one_v_one_v_one", golferCount: 3 },
      ],
      warnings: [
        "Recommended format mix needs 3 tee times, but only 2 are available.",
      ],
    });
  });

  it("returns an error when 11+ golfers cannot fit available tee-time capacity", () => {
    const plan = buildMatchFormatPlan({
      golfers: confirmedGolfers(11),
      teeTimeCount: 2,
    });

    expect(plan).toEqual({
      ok: false,
      eligibleGolferIds: confirmedGolfers(11).map((golfer) => golfer.golferId),
      formats: [],
      error:
        "No match format mix fits 11 golfers with the available tee-time capacity.",
    });
  });
});
