import { describe, expect, it } from "vitest";

import { buildHandicapSnapshotPlan } from "@/lib/handicap-snapshots";

const baseInput = {
  seasonId: "season-2026",
  weeklyEventId: "week-04",
  rsvps: [
    { golferId: "zach", status: "confirmed" as const },
    { golferId: "joe", status: "confirmed" as const },
    { golferId: "jared", status: "unknown" as const },
  ],
  rosterGolfers: [
    {
      golferId: "zach",
      golferName: "Zach",
      currentHandicap: 21,
      active: true,
    },
    {
      golferId: "joe",
      golferName: "Joe",
      currentHandicap: 17.9,
      active: true,
    },
    {
      golferId: "jared",
      golferName: "Jared",
      currentHandicap: 28,
      active: true,
    },
  ],
};

describe("handicap snapshot engine", () => {
  it("creates snapshot inserts for confirmed golfers", () => {
    const plan = buildHandicapSnapshotPlan({
      ...baseInput,
      existingSnapshots: [],
    });

    expect(plan.canSnapshot).toBe(true);
    expect(plan.blockedGolfers).toEqual([]);
    expect(plan.inserts).toEqual([
      {
        season_id: "season-2026",
        golfer_id: "joe",
        effective_week_id: "week-04",
        handicap: 17.9,
        half_handicap: 9,
        source: "admin",
      },
      {
        season_id: "season-2026",
        golfer_id: "zach",
        effective_week_id: "week-04",
        handicap: 21,
        half_handicap: 11,
        source: "admin",
      },
    ]);
  });

  it("preserves existing historical snapshots after current handicap edits", () => {
    const plan = buildHandicapSnapshotPlan({
      ...baseInput,
      rosterGolfers: [
        {
          golferId: "zach",
          golferName: "Zach",
          currentHandicap: 19,
          active: true,
        },
        {
          golferId: "joe",
          golferName: "Joe",
          currentHandicap: 16,
          active: true,
        },
      ],
      existingSnapshots: [
        {
          golferId: "zach",
          handicap: 21,
          halfHandicap: 11,
        },
      ],
    });

    expect(plan.rows.find((row) => row.golferId === "zach")).toMatchObject({
      currentHandicap: 19,
      snapshotHandicap: 21,
      halfHandicap: 11,
      status: "snapshotted",
    });
    expect(plan.inserts).toEqual([
      {
        season_id: "season-2026",
        golfer_id: "joe",
        effective_week_id: "week-04",
        handicap: 16,
        half_handicap: 8,
        source: "admin",
      },
    ]);
  });

  it("blocks snapshot preparation when a confirmed golfer is missing a handicap", () => {
    const plan = buildHandicapSnapshotPlan({
      ...baseInput,
      rosterGolfers: [
        {
          golferId: "zach",
          golferName: "Zach",
          currentHandicap: null,
          active: true,
        },
        {
          golferId: "joe",
          golferName: "Joe",
          currentHandicap: 17.9,
          active: true,
        },
      ],
      existingSnapshots: [],
    });

    expect(plan.canSnapshot).toBe(false);
    expect(plan.blockedGolfers).toEqual([
      {
        golferId: "zach",
        golferName: "Zach",
        currentHandicap: null,
        snapshotHandicap: null,
        halfHandicap: null,
        status: "missing_handicap",
      },
    ]);
    expect(plan.inserts).toEqual([
      {
        season_id: "season-2026",
        golfer_id: "joe",
        effective_week_id: "week-04",
        handicap: 17.9,
        half_handicap: 9,
        source: "admin",
      },
    ]);
  });

  it("ignores unknown, declined, withdrawn, and no-show golfers", () => {
    const plan = buildHandicapSnapshotPlan({
      ...baseInput,
      rsvps: [
        { golferId: "zach", status: "unknown" },
        { golferId: "joe", status: "declined" },
        { golferId: "jared", status: "no_show" },
      ],
      existingSnapshots: [],
    });

    expect(plan.rows).toEqual([]);
    expect(plan.inserts).toEqual([]);
    expect(plan.canSnapshot).toBe(true);
  });
});
