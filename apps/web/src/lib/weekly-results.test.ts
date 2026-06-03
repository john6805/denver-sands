import { describe, expect, it } from "vitest";

import {
  buildWeeklyResultCorrection,
  buildWeeklyResultUpsert,
  buildWeeklyResultUpserts,
} from "@/lib/weekly-results";

describe("weekly result entry validation", () => {
  it("builds a played result row with numeric score inputs", () => {
    expect(
      buildWeeklyResultUpsert({
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "won",
        handicap_snapshot: "10.4",
        gross_score: "44",
        net_score: "39",
        putts: "16",
      }),
    ).toEqual({
      ok: true,
      values: {
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "won",
        handicap_snapshot: 10.4,
        gross_score: 44,
        net_score: 39,
        putts: 16,
      },
    });
  });

  it("allows entered net score to stay blank for fallback scoring", () => {
    expect(
      buildWeeklyResultUpsert({
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "lost",
        handicap_snapshot: "10",
        gross_score: "50",
        net_score: "",
        putts: "18",
      }),
    ).toEqual({
      ok: true,
      values: {
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "lost",
        handicap_snapshot: 10,
        gross_score: 50,
        net_score: null,
        putts: 18,
      },
    });
  });

  it("clears no-show scores and match results", () => {
    expect(
      buildWeeklyResultUpsert({
        golfer_id: "golfer-1",
        attendance_status: "no_show",
        match_result: "won",
        handicap_snapshot: "",
        gross_score: "",
        net_score: "",
        putts: "",
      }),
    ).toEqual({
      ok: true,
      values: {
        golfer_id: "golfer-1",
        attendance_status: "no_show",
        match_result: "not_applicable",
        handicap_snapshot: null,
        gross_score: null,
        net_score: null,
        putts: null,
      },
    });
  });

  it("rejects score values unless attendance is played", () => {
    const update = buildWeeklyResultUpsert({
      golfer_id: "golfer-1",
      attendance_status: "unknown",
      match_result: "not_applicable",
      handicap_snapshot: "",
      gross_score: "44",
      net_score: "",
      putts: "",
    });

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.message)).toContain(
        "Gross, net, and putts can only be entered when attendance is played.",
      );
    }
  });

  it("rejects invalid numeric score fields for played golfers", () => {
    const update = buildWeeklyResultUpsert({
      golfer_id: "golfer-1",
      attendance_status: "played",
      match_result: "won",
      handicap_snapshot: "n/a",
      gross_score: "44.5",
      net_score: "-1",
      putts: "lots",
    });

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues.map((issue) => issue.field)).toEqual([
        "handicap_snapshot",
        "gross_score",
        "net_score",
        "putts",
      ]);
    }
  });

  it("rejects duplicate golfer rows", () => {
    const update = buildWeeklyResultUpserts([
      {
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "won",
        handicap_snapshot: "",
        gross_score: "",
        net_score: "",
        putts: "",
      },
      {
        golfer_id: "golfer-1",
        attendance_status: "played",
        match_result: "lost",
        handicap_snapshot: "",
        gross_score: "",
        net_score: "",
        putts: "",
      },
    ]);

    expect(update.ok).toBe(false);
    if (!update.ok) {
      expect(update.issues[0]).toMatchObject({ field: "golfer_id" });
    }
  });

  it("requires a correction reason for locked-week edits", () => {
    const correction = buildWeeklyResultCorrection({
      reason: "  ",
      rows: [
        {
          golfer_id: "golfer-1",
          attendance_status: "played",
          match_result: "won",
          handicap_snapshot: "10",
          gross_score: "44",
          net_score: "39",
          putts: "16",
        },
      ],
    });

    expect(correction.ok).toBe(false);
    if (!correction.ok) {
      expect(correction.issues).toContainEqual({
        field: "reason",
        message: "A correction reason is required for locked weeks.",
      });
    }
  });

  it("builds a locked-week correction payload with a trimmed reason", () => {
    expect(
      buildWeeklyResultCorrection({
        reason: " Corrected net score ",
        rows: [
          {
            golfer_id: "golfer-1",
            attendance_status: "played",
            match_result: "won",
            handicap_snapshot: "10",
            gross_score: "44",
            net_score: "38",
            putts: "16",
          },
        ],
      }),
    ).toEqual({
      ok: true,
      values: {
        reason: "Corrected net score",
        rows: [
          {
            golfer_id: "golfer-1",
            attendance_status: "played",
            match_result: "won",
            handicap_snapshot: 10,
            gross_score: 44,
            net_score: 38,
            putts: 16,
          },
        ],
      },
    });
  });
});
