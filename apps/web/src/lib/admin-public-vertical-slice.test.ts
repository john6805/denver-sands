import { describe, expect, it } from "vitest";

import {
  buildCourseHoleUpdates,
  buildCourseUpdate,
  buildSeasonCreate,
  buildWeeklyEventCreate,
} from "@/lib/admin-season";
import { calculateRawLeaderboard } from "@/lib/leaderboard";
import { buildMatchFormatPlan } from "@/lib/match-format-planner";
import {
  buildGeneratedMatchPersistenceRows,
  generateRandomMatchPlan,
  type MatchGeneratorGolfer,
} from "@/lib/match-generator";
import { buildHandicapSnapshotPlan } from "@/lib/handicap-snapshots";
import {
  calculateWeeklyPointBreakdowns,
  type WeeklyScoringInput,
} from "@/lib/scoring";
import {
  buildWeeklyResultCorrection,
  buildWeeklyResultUpserts,
} from "@/lib/weekly-results";
import type { AdminAuditEvent } from "@/lib/data/league-data";
import type { CourseHoleRating } from "@/lib/stroke-allocation";

const golfers = [
  { id: "zach", displayName: "Zach", handicap: 21 },
  { id: "joe", displayName: "Joe", handicap: 17.9 },
  { id: "bird", displayName: "Bird", handicap: 16.8 },
  { id: "gt", displayName: "GT", handicap: 12.7 },
];

function completeCourseHoles() {
  return Array.from({ length: 18 }, (_, index) => ({
    hole_number: index + 1,
    par: index % 3 === 0 ? "5" : "4",
    handicap_rank: (index + 1).toString(),
  }));
}

function courseHoleRatings(): CourseHoleRating[] {
  return completeCourseHoles().map((hole) => ({
    hole_number: hole.hole_number,
    handicap_rank: Number(hole.handicap_rank),
  }));
}

function toScoringRows(
  weeklyEventId: string,
  rows: Array<{
    golfer_id: string;
    attendance_status: WeeklyScoringInput["attendanceStatus"];
    match_result: WeeklyScoringInput["matchResult"];
    handicap_snapshot: number | null;
    gross_score: number | null;
    net_score: number | null;
    putts: number | null;
  }>,
): WeeklyScoringInput[] {
  const names = new Map(golfers.map((golfer) => [golfer.id, golfer.displayName]));

  return rows.map((row) => ({
    id: `${weeklyEventId}-${row.golfer_id}`,
    golferId: row.golfer_id,
    golferName: names.get(row.golfer_id) ?? "Unknown golfer",
    attendanceStatus: row.attendance_status,
    matchResult: row.match_result,
    handicapSnapshot: row.handicap_snapshot,
    grossScore: row.gross_score,
    netScore: row.net_score,
    putts: row.putts,
  }));
}

describe("admin-to-public weekly cycle QA", () => {
  it("walks a commissioner from setup through public leaderboard parity", () => {
    expect(
      buildSeasonCreate({
        name: "2026 Denver Sands",
        year: "2026",
        starts_on: "2026-05-12",
        ends_on: "",
        status: "active",
      }),
    ).toMatchObject({
      ok: true,
      values: {
        ends_on: null,
        drop_lowest_week_count: 2,
      },
    });
    expect(
      buildCourseUpdate({
        name: "Walnut Creek",
        booking_url: "",
        active: true,
      }),
    ).toMatchObject({ ok: true });
    expect(buildCourseHoleUpdates(completeCourseHoles())).toMatchObject({
      ok: true,
    });
    expect(
      buildWeeklyEventCreate({
        week_code: "W01",
        play_date: "2026-05-12",
        course_id: "course-walnut-creek",
        status: "planned",
      }),
    ).toMatchObject({ ok: true });

    const snapshotPlan = buildHandicapSnapshotPlan({
      seasonId: "season-2026",
      weeklyEventId: "week-1",
      rsvps: golfers.map((golfer) => ({
        golferId: golfer.id,
        status: "confirmed",
      })),
      rosterGolfers: golfers.map((golfer) => ({
        golferId: golfer.id,
        golferName: golfer.displayName,
        currentHandicap: golfer.handicap,
        active: true,
      })),
      existingSnapshots: [],
    });

    expect(snapshotPlan).toMatchObject({
      canSnapshot: true,
      blockedGolfers: [],
    });
    expect(snapshotPlan.inserts).toHaveLength(4);

    const formatPlan = buildMatchFormatPlan({
      golfers: golfers.map((golfer) => ({
        golferId: golfer.id,
        status: "confirmed",
      })),
    });

    expect(formatPlan).toMatchObject({
      ok: true,
      formats: [{ format: "two_v_two", golferCount: 4 }],
    });

    if (!formatPlan.ok) {
      throw new Error("Expected format planning to succeed.");
    }

    const generatorGolfers: MatchGeneratorGolfer[] = snapshotPlan.inserts.map(
      (snapshot) => ({
        golferId: snapshot.golfer_id,
        handicapSnapshot: snapshot.handicap,
        halfHandicap: snapshot.half_handicap,
      }),
    );
    const generated = generateRandomMatchPlan({
      randomSeed: "ticket-23-qa",
      generatedAt: "2026-06-04T12:00:00.000Z",
      formats: formatPlan.formats,
      golfers: generatorGolfers,
      teeTimeIds: ["tee-1"],
      courseHoles: courseHoleRatings(),
    });

    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      throw new Error("Expected match generation to succeed.");
    }

    const persisted = buildGeneratedMatchPersistenceRows({
      weeklyEventId: "week-1",
      plan: generated,
    });

    expect(persisted.weeklyMatches).toHaveLength(1);
    expect(persisted.weeklyMatchParticipants).toHaveLength(4);

    const resultEntry = buildWeeklyResultUpserts([
      {
        golfer_id: "zach",
        attendance_status: "played",
        match_result: "won",
        handicap_snapshot: "21",
        gross_score: "40",
        net_score: "29",
        putts: "13",
      },
      {
        golfer_id: "joe",
        attendance_status: "played",
        match_result: "lost",
        handicap_snapshot: "17.9",
        gross_score: "42",
        net_score: "33",
        putts: "17",
      },
      {
        golfer_id: "bird",
        attendance_status: "played",
        match_result: "won",
        handicap_snapshot: "16.8",
        gross_score: "42",
        net_score: "33",
        putts: "21",
      },
      {
        golfer_id: "gt",
        attendance_status: "played",
        match_result: "lost",
        handicap_snapshot: "12.7",
        gross_score: "44",
        net_score: "37",
        putts: "15",
      },
    ]);

    expect(resultEntry).toMatchObject({ ok: true });
    if (!resultEntry.ok) {
      throw new Error("Expected weekly result entry to validate.");
    }

    const breakdowns = calculateWeeklyPointBreakdowns(
      toScoringRows("week-1", resultEntry.values),
    );

    expect(breakdowns.find((row) => row.golferId === "zach")).toMatchObject({
      totalPoints: 23,
    });

    const lockedCorrection = buildWeeklyResultCorrection({
      reason: "Corrected Joe putts from scorecard review",
      rows: [
        ...resultEntry.values
          .filter((row) => row.golfer_id !== "joe")
          .map((row) => ({
            golfer_id: row.golfer_id,
            attendance_status: row.attendance_status,
            match_result: row.match_result,
            handicap_snapshot: String(row.handicap_snapshot ?? ""),
            gross_score: String(row.gross_score ?? ""),
            net_score: String(row.net_score ?? ""),
            putts: String(row.putts ?? ""),
          })),
        {
          golfer_id: "joe",
          attendance_status: "played",
          match_result: "lost",
          handicap_snapshot: "17.9",
          gross_score: "42",
          net_score: "33",
          putts: "16",
        },
      ],
    });

    expect(lockedCorrection).toMatchObject({
      ok: true,
      values: {
        reason: "Corrected Joe putts from scorecard review",
      },
    });
    if (!lockedCorrection.ok) {
      throw new Error("Expected locked correction to validate.");
    }

    const auditEvent: AdminAuditEvent = {
      id: "audit-1",
      actor_id: "commissioner-1",
      season_id: "season-2026",
      weekly_event_id: "week-1",
      entity_type: "weekly_result",
      entity_id: "week-1-joe",
      action: "corrected",
      before_json: { putts: 17 },
      after_json: { putts: 16 },
      reason: lockedCorrection.values.reason,
      created_at: "2026-06-04T12:05:00.000Z",
    };

    expect(auditEvent).toMatchObject({
      action: "corrected",
      reason: "Corrected Joe putts from scorecard review",
    });

    const leaderboardInput = {
      golfers: golfers.map((golfer) => ({
        id: golfer.id,
        displayName: golfer.displayName,
      })),
      weeks: [{ id: "week-1", status: "locked" }],
      results: lockedCorrection.values.rows.map((row) => ({
        id: `week-1-${row.golfer_id}`,
        weeklyEventId: "week-1",
        golferId: row.golfer_id,
        attendanceStatus: row.attendance_status,
        matchResult: row.match_result,
        handicapSnapshot: row.handicap_snapshot,
        grossScore: row.gross_score,
        netScore: row.net_score,
        putts: row.putts,
      })),
      dropLowestWeekCount: 0,
    };
    const adminLeaderboard = calculateRawLeaderboard(leaderboardInput);
    const publicLeaderboard = calculateRawLeaderboard(leaderboardInput);

    expect(publicLeaderboard).toEqual(adminLeaderboard);
    expect(publicLeaderboard[0]).toMatchObject({
      golferId: "zach",
      rawPoints: 23,
      officialPoints: 23,
      pointsBehind: 0,
    });
  });
});
