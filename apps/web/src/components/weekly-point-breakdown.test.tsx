import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/weekly-results", () => ({
  correctWeeklyResults: vi.fn(),
  getBreakdownData: vi.fn(),
  lockWeeklyEvent: vi.fn(),
  saveWeeklyResults: vi.fn(),
}));

import {
  BreakdownTable,
  WeeklyResultEntryTable,
  WeekStatusSummary,
} from "@/components/weekly-point-breakdown";
import {
  calculateWeeklyPointBreakdowns,
  type WeeklyScoringInput,
} from "@/lib/scoring";

function htmlForRows(rows: WeeklyScoringInput[]) {
  return renderToStaticMarkup(
    <BreakdownTable breakdowns={calculateWeeklyPointBreakdowns(rows)} />,
  );
}

describe("weekly point breakdown rendering", () => {
  it("renders a completed week with calculated totals", () => {
    const html = htmlForRows([
      {
        id: "zach",
        golferId: "zach",
        golferName: "Zach",
        attendanceStatus: "confirmed",
        matchResult: "won",
        handicapSnapshot: 21,
        grossScore: 40,
        netScore: 29,
        putts: 13,
      },
      {
        id: "joe",
        golferId: "joe",
        golferName: "Joe",
        attendanceStatus: "confirmed",
        matchResult: "tied",
        handicapSnapshot: 17.9,
        grossScore: 42,
        netScore: 33,
        putts: 17,
      },
    ]);

    expect(html).toContain("Zach");
    expect(html).toContain("Joe");
    expect(html).toContain("won");
    expect(html).toContain("entered");
    expect(html).toContain(">23<");
    expect(html).toContain(">16<");
    expect(html).not.toContain("Beers");
  });

  it("explains planned weeks without presenting them as completed zeroes", () => {
    const html = renderToStaticMarkup(
      <WeekStatusSummary
        week={{
          id: "week-2",
          week_code: "W02",
          play_date: "2026-05-19",
          status: "planned",
        }}
      />,
    );

    expect(html).toContain("W02");
    expect(html).toContain("planned");
    expect(html).toContain("should not be treated as completed zero-point weeks");
  });

  it("renders no-show rows as zero-point rows without missing-input flags", () => {
    const html = htmlForRows([
      {
        id: "jared",
        golferId: "jared",
        golferName: "Jared",
        attendanceStatus: "no_show",
        matchResult: "not_applicable",
        handicapSnapshot: null,
        grossScore: null,
        netScore: null,
        putts: null,
      },
    ]);

    expect(html).toContain("Jared");
    expect(html).toContain("no_show");
    expect(html).toContain("not_applicable");
    expect(html).toContain(">0<");
    expect(html).toContain("Ready");
    expect(html).not.toContain("Missing");
  });

  it("flags missing score inputs for played golfers", () => {
    const html = htmlForRows([
      {
        id: "missing",
        golferId: "missing",
        golferName: "Missing Score",
        attendanceStatus: "played",
        matchResult: "lost",
        handicapSnapshot: 12,
        grossScore: null,
        netScore: null,
        putts: null,
      },
    ]);

    expect(html).toContain("Missing Score");
    expect(html).toContain("Missing gross, net, putts");
  });

  it("shows fallback net distinctly when entered net is missing", () => {
    const html = htmlForRows([
      {
        id: "fallback",
        golferId: "fallback",
        golferName: "Fallback Net",
        attendanceStatus: "played",
        matchResult: "lost",
        handicapSnapshot: 10,
        grossScore: 50,
        netScore: null,
        putts: 18,
      },
    ]);

    expect(html).toContain("Fallback Net");
    expect(html).toContain("fallback");
    expect(html).toContain(">45<");
  });

  it("renders weekly result entry controls for roster golfers", () => {
    const html = renderToStaticMarkup(
      <WeeklyResultEntryTable
        week={{
          id: "week-1",
          week_code: "W01",
          play_date: "2026-05-12",
          status: "open",
        }}
        roster={[
          {
            golfer: {
              id: "zach",
              display_name: "Zach",
              active: true,
            },
            seasonGolfer: {
              id: "season-zach",
              season_id: "season-1",
              golfer_id: "zach",
              current_handicap: 21,
            },
          },
        ]}
        weeklyResults={[]}
      />,
    );

    expect(html).toContain("Result Entry");
    expect(html).toContain("Save results");
    expect(html).toContain("Zach");
    expect(html).toContain("played");
    expect(html).toContain("not_applicable");
    expect(html).toContain("value=\"21\"");
  });

  it("renders locked-week correction controls instead of normal save copy", () => {
    const html = renderToStaticMarkup(
      <WeeklyResultEntryTable
        week={{
          id: "week-1",
          week_code: "W01",
          play_date: "2026-05-12",
          status: "locked",
        }}
        roster={[
          {
            golfer: {
              id: "zach",
              display_name: "Zach",
              active: true,
            },
            seasonGolfer: {
              id: "season-zach",
              season_id: "season-1",
              golfer_id: "zach",
              current_handicap: 21,
            },
          },
        ]}
        weeklyResults={[]}
      />,
    );

    expect(html).toContain("Locked week correction");
    expect(html).toContain("Correction reason");
    expect(html).toContain("Save correction");
    expect(html).not.toContain("Save results");
  });
});
