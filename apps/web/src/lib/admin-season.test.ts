import { describe, expect, it } from "vitest";

import {
  buildCourseUpdate,
  buildGolferUpdates,
  buildSeasonUpdate,
  buildTeeTimeUpdate,
  buildWeeklyEventUpdate,
} from "@/lib/admin-season";

describe("admin season setup validation", () => {
  it("allows season end dates to stay blank", () => {
    const update = buildSeasonUpdate({
      name: "2026 Denver Sands",
      status: "active",
      ends_on: "",
    });

    expect(update).toEqual({
      ok: true,
      values: {
        name: "2026 Denver Sands",
        status: "active",
        ends_on: null,
      },
    });
  });

  it("rejects spreadsheet placeholders in editable season fields", () => {
    const update = buildSeasonUpdate({
      name: "-",
      status: "active",
      ends_on: "n/a",
    });

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.field)).toEqual([
        "name",
        "ends_on",
      ]);
    }
  });

  it("builds separate golfer and season-golfer updates", () => {
    const update = buildGolferUpdates({
      active: false,
      current_handicap: "10.04",
    });

    expect(update).toEqual({
      ok: true,
      values: {
        golfer: { active: false },
        seasonGolfer: { current_handicap: 10 },
      },
    });
  });

  it("rejects blank numeric placeholders for handicaps", () => {
    const update = buildGolferUpdates({
      active: true,
      current_handicap: "unk",
    });

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues[0]).toMatchObject({ field: "current_handicap" });
    }
  });

  it("allows course booking URLs to be blank but not placeholder text", () => {
    expect(
      buildCourseUpdate({
        name: "Overland",
        booking_url: "",
        active: true,
      }),
    ).toEqual({
      ok: true,
      values: {
        name: "Overland",
        booking_url: null,
        active: true,
      },
    });

    const placeholder = buildCourseUpdate({
      name: "Overland",
      booking_url: "-",
      active: true,
    });

    expect(placeholder.ok).toBe(false);
  });

  it("allows weekly events to remain planned with blank course fields", () => {
    const update = buildWeeklyEventUpdate({
      course_id: "",
      status: "planned",
    });

    expect(update).toEqual({
      ok: true,
      values: {
        course_id: null,
        status: "planned",
      },
    });
  });

  it("normalizes editable tee times to HH:MM", () => {
    expect(buildTeeTimeUpdate({ starts_at: "17:40:00" })).toEqual({
      ok: true,
      values: { starts_at: "17:40" },
    });
  });
});
