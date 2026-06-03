import { describe, expect, it } from "vitest";

import {
  calculateAttendancePoints,
  calculateFallbackNetScore,
  calculateHalfHandicap,
  calculateMatchPoints,
  calculateWeeklyPointBreakdowns,
  type WeeklyScoringInput,
} from "@/lib/scoring";

const w01Rows: WeeklyScoringInput[] = [
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
    id: "john",
    golferId: "john",
    golferName: "John",
    attendanceStatus: "confirmed",
    matchResult: "tied",
    handicapSnapshot: 28,
    grossScore: 60,
    netScore: 46,
    putts: 18,
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
  {
    id: "bird",
    golferId: "bird",
    golferName: "Bird",
    attendanceStatus: "confirmed",
    matchResult: "won",
    handicapSnapshot: 16.8,
    grossScore: 42,
    netScore: 33,
    putts: 21,
  },
  {
    id: "bryan",
    golferId: "bryan",
    golferName: "Bryan",
    attendanceStatus: "confirmed",
    matchResult: "tied",
    handicapSnapshot: 13.9,
    grossScore: 42,
    netScore: 35,
    putts: 18,
  },
  {
    id: "gt",
    golferId: "gt",
    golferName: "GT",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 12.7,
    grossScore: 44,
    netScore: 37,
    putts: 15,
  },
  {
    id: "joey",
    golferId: "joey",
    golferName: "Joey",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 10.9,
    grossScore: 44,
    netScore: 38,
    putts: 18,
  },
  {
    id: "hunter",
    golferId: "hunter",
    golferName: "Hunter",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 28,
    grossScore: 55,
    netScore: 41,
    putts: 18,
  },
  {
    id: "brandt",
    golferId: "brandt",
    golferName: "Brandt",
    attendanceStatus: "confirmed",
    matchResult: "lost",
    handicapSnapshot: 9.1,
    grossScore: 51,
    netScore: 46,
    putts: 16,
  },
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
];

describe("scoring engine core points", () => {
  it("calculates half handicaps from workbook examples", () => {
    expect(calculateHalfHandicap(9.1)).toBe(5);
    expect(calculateHalfHandicap(10.9)).toBe(6);
    expect(calculateHalfHandicap(13.9)).toBe(7);
    expect(calculateHalfHandicap(16.8)).toBe(9);
    expect(calculateHalfHandicap(17.9)).toBe(9);
    expect(calculateHalfHandicap(21)).toBe(11);
    expect(calculateHalfHandicap(28)).toBe(14);
  });

  it("returns no half handicap for missing or invalid inputs", () => {
    expect(calculateHalfHandicap(null)).toBeNull();
    expect(calculateHalfHandicap(Number.NaN)).toBeNull();
    expect(calculateHalfHandicap(-1)).toBeNull();
  });

  it("calculates workbook fallback net scores", () => {
    expect(calculateFallbackNetScore({ grossScore: 40, handicap: 21 })).toBe(29);
    expect(calculateFallbackNetScore({ grossScore: 42, handicap: 17.9 })).toBe(33);
    expect(calculateFallbackNetScore({ grossScore: 42, handicap: 16.8 })).toBe(33);
    expect(calculateFallbackNetScore({ grossScore: 42, handicap: 13.9 })).toBe(35);
    expect(calculateFallbackNetScore({ grossScore: 60, handicap: 28 })).toBe(46);
  });

  it("does not turn missing net inputs into zeroes", () => {
    expect(
      calculateFallbackNetScore({ grossScore: null, handicap: 21 }),
    ).toBeNull();
    expect(
      calculateFallbackNetScore({ grossScore: 40, handicap: null }),
    ).toBeNull();
  });

  it("calculates attendance and match points", () => {
    expect(calculateAttendancePoints("confirmed")).toBe(3);
    expect(calculateAttendancePoints("played")).toBe(3);
    expect(calculateAttendancePoints("unknown")).toBe(0);
    expect(calculateAttendancePoints("no_show")).toBe(0);

    expect(calculateMatchPoints("won")).toBe(5);
    expect(calculateMatchPoints("tied")).toBe(2);
    expect(calculateMatchPoints("lost")).toBe(0);
    expect(calculateMatchPoints("not_applicable")).toBe(0);
  });
});

describe("weekly rank points engine", () => {
  it("uses dense ranking for gross, net, and putts", () => {
    const breakdowns = calculateWeeklyPointBreakdowns(w01Rows);
    const byName = new Map(
      breakdowns.map((breakdown) => [breakdown.golferName, breakdown]),
    );

    expect(byName.get("Zach")).toMatchObject({
      gross: { rank: 1, points: 6 },
      net: { rank: 1, points: 5 },
      putt: { rank: 1, points: 4 },
    });
    expect(byName.get("Joe")).toMatchObject({
      gross: { rank: 2, points: 4 },
      net: { rank: 2, points: 4 },
      putt: { rank: 4, points: 1 },
    });
    expect(byName.get("Bird")).toMatchObject({
      gross: { rank: 2, points: 4 },
      net: { rank: 2, points: 4 },
      putt: { rank: 6, points: 0 },
    });
    expect(byName.get("Bryan")).toMatchObject({
      gross: { rank: 2, points: 4 },
      net: { rank: 3, points: 3 },
      putt: { rank: 5, points: 0 },
    });
    expect(byName.get("GT")).toMatchObject({
      gross: { rank: 3, points: 3 },
      net: { rank: 4, points: 2 },
      putt: { rank: 2, points: 3 },
    });
  });

  it("excludes no-shows and unknown rows from rank points", () => {
    const breakdowns = calculateWeeklyPointBreakdowns([
      ...w01Rows,
      {
        id: "future",
        golferId: "future",
        golferName: "Future",
        attendanceStatus: "unknown",
        matchResult: "not_applicable",
        handicapSnapshot: 1,
        grossScore: 30,
        netScore: 29,
        putts: 9,
      },
    ]);
    const future = breakdowns.find((row) => row.golferName === "Future");
    const jared = breakdowns.find((row) => row.golferName === "Jared");

    expect(future).toMatchObject({
      gross: { rank: null, points: 0 },
      net: { rank: null, points: 0 },
      putt: { rank: null, points: 0 },
      totalPoints: 0,
    });
    expect(jared).toMatchObject({
      gross: { rank: null, points: 0 },
      net: { rank: null, points: 0 },
      putt: { rank: null, points: 0 },
      totalPoints: 0,
    });
  });

  it("uses fallback net only when entered net score is missing", () => {
    const breakdowns = calculateWeeklyPointBreakdowns([
      {
        id: "entered",
        golferId: "entered",
        golferName: "Entered",
        attendanceStatus: "played",
        matchResult: "lost",
        handicapSnapshot: 10,
        grossScore: 50,
        netScore: 44,
        putts: 18,
      },
      {
        id: "fallback",
        golferId: "fallback",
        golferName: "Fallback",
        attendanceStatus: "played",
        matchResult: "lost",
        handicapSnapshot: 10,
        grossScore: 50,
        netScore: null,
        putts: 18,
      },
    ]);

    expect(breakdowns[0]).toMatchObject({
      scoringNetScore: 44,
      fallbackNetScore: 45,
      netScoreSource: "entered",
    });
    expect(breakdowns[1]).toMatchObject({
      scoringNetScore: 45,
      fallbackNetScore: 45,
      netScoreSource: "fallback",
    });
  });

});
