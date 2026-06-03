import { describe, expect, it } from "vitest";

import {
  buildCourseHoleUpdates,
  buildGolferCreate,
  buildCourseUpdate,
  buildSeasonCreate,
  buildGolferUpdates,
  buildSeasonUpdate,
  buildWeeklyEventCreate,
  buildTeeTimeUpdate,
  buildWeeklyEventUpdate,
} from "@/lib/admin-season";

function completeCourseHoles() {
  return Array.from({ length: 18 }, (_, index) => ({
    hole_number: index + 1,
    par: index % 2 === 0 ? "4" : "",
    handicap_rank: (index + 1).toString(),
  }));
}

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

  it("builds a create payload for a new season", () => {
    const create = buildSeasonCreate({
      name: "2027 Denver Sands",
      year: "2027",
      starts_on: "2027-05-11",
      ends_on: "",
      status: "draft",
    });

    expect(create).toEqual({
      ok: true,
      values: {
        name: "2027 Denver Sands",
        year: 2027,
        starts_on: "2027-05-11",
        ends_on: null,
        status: "draft",
        weekly_play_day: 2,
        drop_lowest_week_count: 2,
      },
    });
  });

  it("rejects invalid season create inputs", () => {
    const create = buildSeasonCreate({
      name: "n/a",
      year: "20x7",
      starts_on: "05/11/2027",
      ends_on: "",
      status: "active",
      weekly_play_day: "9",
      drop_lowest_week_count: "-1",
    });

    expect(create.ok).toBe(false);
    if (!create.ok) {
      expect(create.issues.map((issue) => issue.field)).toEqual([
        "name",
        "year",
        "starts_on",
        "weekly_play_day",
        "drop_lowest_week_count",
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

  it("builds a create payload for a new golfer", () => {
    const create = buildGolferCreate({
      display_name: "New Player",
      active: true,
      current_handicap: "14.26",
    });

    expect(create).toEqual({
      ok: true,
      values: {
        display_name: "New Player",
        active: true,
        current_handicap: 14.3,
      },
    });
  });

  it("rejects placeholder golfer names on create", () => {
    const create = buildGolferCreate({
      display_name: "-",
      active: true,
      current_handicap: "",
    });

    expect(create.ok).toBe(false);
    if (!create.ok) {
      expect(create.issues[0]).toMatchObject({ field: "display_name" });
    }
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

  it("uses the same validated payload for creating new courses", () => {
    expect(
      buildCourseUpdate({
        name: "New Course",
        booking_url: "https://example.com/tee-times",
        active: true,
      }),
    ).toEqual({
      ok: true,
      values: {
        name: "New Course",
        booking_url: "https://example.com/tee-times",
        active: true,
      },
    });
  });

  it("builds a complete course hole payload for stroke allocation readiness", () => {
    expect(buildCourseHoleUpdates(completeCourseHoles())).toEqual({
      ok: true,
      values: completeCourseHoles().map((hole) => ({
        hole_number: hole.hole_number,
        par: hole.par ? 4 : null,
        handicap_rank: Number(hole.handicap_rank),
      })),
    });
  });

  it("rejects incomplete course hole ratings", () => {
    const update = buildCourseHoleUpdates(completeCourseHoles().slice(0, 17));

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.field)).toContain(
        "course_holes",
      );
      expect(update.issues.map((issue) => issue.message)).toContain(
        "Handicap rank 18 is required.",
      );
    }
  });

  it("rejects duplicate course hole handicap ranks", () => {
    const rows = completeCourseHoles();
    rows[17] = { ...rows[17], handicap_rank: "1" };
    const update = buildCourseHoleUpdates(rows);

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.message)).toContain(
        "Handicap rank 1 can only be used once.",
      );
      expect(update.issues.map((issue) => issue.message)).toContain(
        "Handicap rank 18 is required.",
      );
    }
  });

  it("rejects out-of-range course hole par and handicap ranks", () => {
    const rows = completeCourseHoles();
    rows[0] = { ...rows[0], par: "7", handicap_rank: "19" };
    const update = buildCourseHoleUpdates(rows);

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.field)).toEqual(
        expect.arrayContaining(["hole_1_par", "hole_1_handicap_rank"]),
      );
    }
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

  it("builds a create payload for a weekly event", () => {
    const create = buildWeeklyEventCreate({
      week_code: "W22",
      play_date: "2026-10-06",
      course_id: "",
      status: "planned",
    });

    expect(create).toEqual({
      ok: true,
      values: {
        week_code: "W22",
        play_date: "2026-10-06",
        course_id: null,
        status: "planned",
      },
    });
  });

  it("rejects incomplete weekly event create inputs", () => {
    const create = buildWeeklyEventCreate({
      week_code: "unk",
      play_date: "",
      course_id: "",
      status: "not-real",
    });

    expect(create.ok).toBe(false);
    if (!create.ok) {
      expect(create.issues.map((issue) => issue.field)).toEqual([
        "week_code",
        "play_date",
        "status",
      ]);
    }
  });

  it("normalizes editable tee times to HH:MM", () => {
    expect(buildTeeTimeUpdate({ starts_at: "17:40:00" })).toEqual({
      ok: true,
      values: { starts_at: "17:40" },
    });
  });
});
