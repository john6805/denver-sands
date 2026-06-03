import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const seedPath = path.resolve(__dirname, "../../../../supabase/seed.sql");
const seedSql = readFileSync(seedPath, "utf8");

describe("workbook seed data", () => {
  it("uses conflict handling for rerunnable phase 1 seed tables", () => {
    const expectedConflictTargets = [
      "on conflict (year) do update",
      "on conflict (name) do update",
      "on conflict (display_name) do update",
      "on conflict (season_id, golfer_id) do update",
      "on conflict (season_id, week_code) do update",
      "on conflict (weekly_event_id, starts_at) do update",
      "on conflict (weekly_event_id, golfer_id) do update",
      "on conflict (match_id, side_number) do update",
      "on conflict (match_id, golfer_id) do update",
    ];

    for (const expectedConflictTarget of expectedConflictTargets) {
      expect(seedSql).toContain(expectedConflictTarget);
    }
  });

  it("seeds the active 2026 season with a nullable end date", () => {
    expect(seedSql).toContain("'2026 Denver Sands'");
    expect(seedSql).toContain("2026,");
    expect(seedSql).toContain("'2026-05-12'");
    expect(seedSql).toContain("null,");
    expect(seedSql).toContain("'active'");
  });

  it("normalizes course names from the workbook", () => {
    expect(seedSql).toContain("('Walnut Creek'");
    expect(seedSql).toContain("('Indian Tree'");
    expect(seedSql).not.toContain("Walnut Creet");
    expect(seedSql).not.toContain("IndianTree");
  });

  it("seeds the active roster while excluding Cal", () => {
    const activeGolfers = [
      "Zach",
      "Joe",
      "Bird",
      "Bryan",
      "GT",
      "Joey",
      "Hunter",
      "John",
      "Brandt",
      "Jared",
      "Stefan",
    ];

    for (const golfer of activeGolfers) {
      expect(seedSql).toContain(`('${golfer}', true)`);
    }

    expect(seedSql).not.toContain("('Cal'");
  });

  it("keeps Stefan editable with a seeded handicap of 10", () => {
    expect(seedSql).toContain("('Stefan', 10.0::numeric)");
  });

  it("uses schedule data for W01 and W02 instead of workbook placeholder dates", () => {
    expect(seedSql).toContain(
      "('W01', '2026-05-12'::date, 'Overland', 'completed'::week_status)",
    );
    expect(seedSql).toContain(
      "('W02', '2026-05-19'::date, 'Broken Tee', 'planned'::week_status)",
    );
  });

  it("maps weekly point data raw facts without authoritative point columns", () => {
    expect(seedSql).toContain(
      "('Zach', 'confirmed'::attendance_status, 'won'::match_result, 21.0::numeric, 40, 29, 13)",
    );
    expect(seedSql).toContain(
      "('John', 'confirmed'::attendance_status, 'tied'::match_result, 28.0::numeric, 60, 46, 18)",
    );
    expect(seedSql).toContain(
      "('Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer)",
    );

    expect(seedSql).not.toMatch(/showing_up_points|gross_points|total_points/i);
  });

  it("preserves W02 unknown rows as planned unplayed placeholders", () => {
    expect(seedSql).toContain("with w02_results(display_name) as");
    expect(seedSql).toContain("'unknown'");
    expect(seedSql).toContain("gross_score = null");
    expect(seedSql).toContain("net_score = null");
    expect(seedSql).toContain("putts = null");
  });

  it("backfills the 0512 historical match groups", () => {
    expect(seedSql).toContain("workbook-0512-import-1740");
    expect(seedSql).toContain("workbook-0512-import-1750");
    expect(seedSql).toContain("workbook-0512-import-1800");
    expect(seedSql).toContain(
      "('workbook-0512-import-1740', 1, 'Bryan', 7, 'tied'::match_result)",
    );
    expect(seedSql).toContain(
      "('workbook-0512-import-1800', 2, 'Zach', 11, 'won'::match_result)",
    );
  });
});
