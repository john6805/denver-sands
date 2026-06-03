import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20260525090000_core_database_schema.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

function tableDefinition(tableName: string) {
  const match = migrationSql.match(
    new RegExp(`create table ${tableName} \\(([\\s\\S]*?)\\n\\);`, "i"),
  );

  if (!match) {
    throw new Error(`Missing table ${tableName}`);
  }

  return match[1];
}

describe("core database schema migration", () => {
  it("defines the required enum domains", () => {
    const enumNames = [
      "attendance_status",
      "match_result",
      "match_format",
      "week_status",
      "season_status",
      "match_status",
      "tournament_status",
      "award_type",
      "audit_action",
    ];

    for (const enumName of enumNames) {
      expect(migrationSql).toContain(`create type ${enumName} as enum`);
    }
  });

  it("creates every table needed for workbook preservation and league operations", () => {
    const tableNames = [
      "seasons",
      "golfers",
      "season_golfers",
      "courses",
      "course_holes",
      "weekly_events",
      "golfer_handicap_snapshots",
      "weekly_tee_times",
      "weekly_rsvps",
      "weekly_matches",
      "weekly_match_sides",
      "weekly_match_participants",
      "stroke_allocations",
      "weekly_results",
      "tournaments",
      "tournament_rounds",
      "tournament_round_results",
      "tournament_results",
      "awards",
      "award_results",
      "admin_audit_events",
    ];

    for (const tableName of tableNames) {
      expect(migrationSql).toContain(`create table ${tableName}`);
    }
  });

  it("keeps season end dates nullable while constraining obvious bad dates", () => {
    const seasons = tableDefinition("seasons");

    expect(seasons).toContain("ends_on date,");
    expect(seasons).toContain(
      "constraint seasons_date_order_check check (ends_on is null or ends_on >= starts_on)",
    );
  });

  it("stores weekly raw facts without authoritative workbook point columns", () => {
    const weeklyResults = tableDefinition("weekly_results");

    expect(weeklyResults).toContain("attendance_status attendance_status");
    expect(weeklyResults).toContain("match_result match_result");
    expect(weeklyResults).toContain("handicap_snapshot numeric");
    expect(weeklyResults).toContain("gross_score integer");
    expect(weeklyResults).toContain("net_score integer");
    expect(weeklyResults).toContain("putts integer");
    expect(weeklyResults).toContain("locked_at timestamptz");
    expect(weeklyResults).toContain("override_reason text");

    expect(weeklyResults).not.toMatch(/attendance_points|match_points/);
    expect(weeklyResults).not.toMatch(/gross_points|net_points|putt_points/);
    expect(weeklyResults).not.toMatch(/weekly_points|total_points/);
  });

  it("pins duplicate-prevention constraints for first-version weekly operations", () => {
    const expectedConstraints = [
      "constraint season_golfers_unique unique (season_id, golfer_id)",
      "constraint course_holes_course_hole_unique unique (course_id, hole_number)",
      "constraint course_holes_course_handicap_rank_unique unique (course_id, handicap_rank)",
      "constraint weekly_events_season_week_code_unique unique (season_id, week_code)",
      "constraint weekly_events_season_play_date_unique unique (season_id, play_date)",
      "constraint weekly_tee_times_event_starts_at_unique unique (weekly_event_id, starts_at)",
      "constraint weekly_tee_times_event_sort_order_unique unique (weekly_event_id, sort_order)",
      "constraint weekly_rsvps_event_golfer_unique unique (weekly_event_id, golfer_id)",
      "constraint weekly_match_sides_match_side_unique unique (match_id, side_number)",
      "constraint weekly_match_participants_side_golfer_unique unique",
      "constraint weekly_match_participants_match_golfer_unique unique (match_id, golfer_id)",
      "constraint weekly_results_event_golfer_unique unique (weekly_event_id, golfer_id)",
    ];

    for (const expectedConstraint of expectedConstraints) {
      expect(migrationSql).toContain(expectedConstraint);
    }
  });

  it("adds practical match relationship validation for publishable matchups", () => {
    expect(migrationSql).toContain(
      "create or replace function validate_weekly_match_cardinality",
    );
    expect(migrationSql).toContain("target_status = 'draft'");
    expect(migrationSql).toContain("when 'two_v_two' then 2");
    expect(migrationSql).toContain("when 'one_v_one_v_one' then 3");
    expect(migrationSql).toContain(
      "constraint weekly_match_participants_side_fk foreign key (match_id, match_side_id)",
    );
    expect(migrationSql).toContain(
      "constraint stroke_allocations_distinct_sides_check",
    );
  });

  it("stores full and half handicap snapshots for weekly generation", () => {
    const handicapSnapshots = tableDefinition("golfer_handicap_snapshots");

    expect(handicapSnapshots).toContain("handicap numeric");
    expect(handicapSnapshots).toContain("half_handicap integer");
    expect(handicapSnapshots).toContain(
      "constraint golfer_handicap_snapshots_unique unique",
    );
  });

  it("supports audited locked-week corrections", () => {
    const auditEvents = tableDefinition("admin_audit_events");

    expect(auditEvents).toContain("action audit_action");
    expect(auditEvents).toContain("before_json jsonb");
    expect(auditEvents).toContain("after_json jsonb");
    expect(auditEvents).toContain("reason text");
    expect(auditEvents).toContain(
      "action not in ('override', 'corrected') or nullif(btrim(reason), '') is not null",
    );
  });
});
