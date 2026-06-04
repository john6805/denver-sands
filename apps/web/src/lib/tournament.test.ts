import { describe, expect, it } from "vitest";

import {
  calculatePointsChampion,
  calculateTournamentChampion,
  calculateTournamentStandings,
  buildTournamentCreate,
  buildTournamentResultUpserts,
} from "@/lib/tournament";
import type {
  TournamentRound,
  TournamentRoundResult,
} from "@/lib/data/league-data";

describe("tournament payload builders", () => {
  it("builds a two-round 18-hole tournament create payload", () => {
    const built = buildTournamentCreate({
      name: "End-of-Season Tournament",
      course_id: "course-1",
      starts_on: "2026-09-12",
      ends_on: "2026-09-13",
      status: "planned",
      round_1_play_date: "2026-09-12",
      round_2_play_date: "2026-09-13",
    });

    expect(built).toEqual({
      ok: true,
      values: expect.objectContaining({
        name: "End-of-Season Tournament",
        course_id: "course-1",
        starts_on: "2026-09-12",
        ends_on: "2026-09-13",
        status: "planned",
        rounds: [
          {
            round_number: 1,
            play_date: "2026-09-12",
            course_id: "course-1",
            holes: 18,
          },
          {
            round_number: 2,
            play_date: "2026-09-13",
            course_id: "course-1",
            holes: 18,
          },
        ],
      }),
    });
  });

  it("validates tournament dates and statuses", () => {
    const built = buildTournamentCreate({
      name: "-",
      course_id: "",
      starts_on: "2026-09-13",
      ends_on: "2026-09-12",
      status: "draft",
      round_1_play_date: "09/12/2026",
      round_2_play_date: "",
    });

    expect(built.ok).toBe(false);
    expect(built.ok ? [] : built.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "name",
        "status",
        "round_1_play_date",
        "ends_on",
      ]),
    );
  });

  it("builds tournament result upserts with optional values", () => {
    const built = buildTournamentResultUpserts([
      {
        golfer_id: "zach",
        handicap_snapshot: "21.4",
        net_score: "72",
        putts: "34",
      },
      {
        golfer_id: "joe",
        handicap_snapshot: "",
        net_score: "",
        putts: "",
      },
    ]);

    expect(built).toEqual({
      ok: true,
      values: [
        {
          golfer_id: "zach",
          handicap_snapshot: 21.4,
          net_score: 72,
          putts: 34,
        },
        {
          golfer_id: "joe",
          handicap_snapshot: null,
          net_score: null,
          putts: null,
        },
      ],
    });
  });

  it("rejects invalid tournament result values and duplicate golfers", () => {
    const built = buildTournamentResultUpserts([
      {
        golfer_id: "zach",
        handicap_snapshot: "-1",
        net_score: "72.5",
        putts: "-2",
      },
      {
        golfer_id: "zach",
        handicap_snapshot: "",
        net_score: "",
        putts: "",
      },
    ]);

    expect(built.ok).toBe(false);
    expect(built.ok ? [] : built.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "golfer_id",
        "handicap_snapshot",
        "net_score",
        "putts",
      ]),
    );
  });
});

const golfers = [
  { id: "zach", display_name: "Zach", active: true },
  { id: "joe", display_name: "Joe", active: true },
  { id: "jared", display_name: "Jared", active: true },
  { id: "bird", display_name: "Bird", active: true },
];

const rounds: TournamentRound[] = [
  {
    id: "round-1",
    tournament_id: "tournament-1",
    round_number: 1,
    play_date: "2026-09-12",
    holes: 18,
    course_id: "course-1",
  },
  {
    id: "round-2",
    tournament_id: "tournament-1",
    round_number: 2,
    play_date: "2026-09-13",
    holes: 18,
    course_id: "course-1",
  },
];

function tournamentResult(
  overrides: Partial<TournamentRoundResult> &
    Pick<TournamentRoundResult, "tournament_round_id" | "golfer_id">,
): TournamentRoundResult {
  return {
    id: `${overrides.tournament_round_id}-${overrides.golfer_id}`,
    handicap_snapshot: 10,
    net_score: 75,
    putts: 35,
    ...overrides,
  };
}

describe("tournament standings and champions", () => {
  it("ranks placement by two-round total net score and assigns points", () => {
    const standings = calculateTournamentStandings({
      golfers,
      rounds,
      results: [
        tournamentResult({
          tournament_round_id: "round-1",
          golfer_id: "zach",
          net_score: 70,
          putts: 33,
        }),
        tournamentResult({
          tournament_round_id: "round-2",
          golfer_id: "zach",
          net_score: 72,
          putts: 34,
        }),
        tournamentResult({
          tournament_round_id: "round-1",
          golfer_id: "joe",
          net_score: 73,
          putts: 30,
        }),
        tournamentResult({
          tournament_round_id: "round-2",
          golfer_id: "joe",
          net_score: 73,
          putts: 30,
        }),
      ],
    });

    expect(standings.map((row) => row.golferId)).toEqual(["zach", "joe"]);
    expect(standings[0]).toMatchObject({
      place: 1,
      totalNetScore: 142,
      totalPutts: 67,
      tournamentPoints: 12,
    });
    expect(standings[1]).toMatchObject({
      place: 2,
      tournamentPoints: 9,
    });
  });

  it("uses tournament tie-breakers before sharing place", () => {
    const standings = calculateTournamentStandings({
      golfers,
      rounds,
      results: [
        tournamentResult({
          tournament_round_id: "round-1",
          golfer_id: "zach",
          net_score: 72,
          putts: 35,
        }),
        tournamentResult({
          tournament_round_id: "round-2",
          golfer_id: "zach",
          net_score: 72,
          putts: 35,
        }),
        tournamentResult({
          tournament_round_id: "round-1",
          golfer_id: "joe",
          net_score: 70,
          putts: 36,
        }),
        tournamentResult({
          tournament_round_id: "round-2",
          golfer_id: "joe",
          net_score: 74,
          putts: 36,
        }),
        tournamentResult({
          tournament_round_id: "round-1",
          golfer_id: "jared",
          net_score: 70,
          putts: 35,
        }),
        tournamentResult({
          tournament_round_id: "round-2",
          golfer_id: "jared",
          net_score: 74,
          putts: 35,
        }),
      ],
    });

    expect(standings.map((row) => row.golferId)).toEqual([
      "zach",
      "jared",
      "joe",
    ]);
  });

  it("shares place and points when all tournament tie-breakers remain tied", () => {
    const standings = calculateTournamentStandings({
      golfers,
      rounds,
      results: [
        tournamentResult({ tournament_round_id: "round-1", golfer_id: "zach" }),
        tournamentResult({ tournament_round_id: "round-2", golfer_id: "zach" }),
        tournamentResult({ tournament_round_id: "round-1", golfer_id: "joe" }),
        tournamentResult({ tournament_round_id: "round-2", golfer_id: "joe" }),
      ],
    });

    expect(standings.map((row) => row.place)).toEqual([1, 1]);
    expect(standings.map((row) => row.tournamentPoints)).toEqual([12, 12]);
    expect(calculateTournamentChampion(standings).winners).toHaveLength(2);
  });

  it("assigns 2 tournament points for eighth place and beyond", () => {
    const manyGolfers = Array.from({ length: 8 }, (_, index) => ({
      id: `golfer-${index + 1}`,
      display_name: `Golfer ${index + 1}`,
      active: true,
    }));
    const results = manyGolfers.flatMap((golfer, index) => [
      tournamentResult({
        tournament_round_id: "round-1",
        golfer_id: golfer.id,
        net_score: 70 + index,
      }),
      tournamentResult({
        tournament_round_id: "round-2",
        golfer_id: golfer.id,
        net_score: 70 + index,
      }),
    ]);
    const standings = calculateTournamentStandings({
      golfers: manyGolfers,
      rounds,
      results,
    });

    expect(standings[7]).toMatchObject({
      place: 8,
      tournamentPoints: 2,
    });
  });

  it("calculates Points Champion from official points without tournament points", () => {
    const champion = calculatePointsChampion([
      {
        golferId: "zach",
        golferName: "Zach",
        officialPoints: 40,
        rawPoints: 45,
        matchWins: 3,
        lowestNet: 30,
      },
      {
        golferId: "joe",
        golferName: "Joe",
        officialPoints: 40,
        rawPoints: 47,
        matchWins: 1,
        lowestNet: 29,
      },
    ] as never);

    expect(champion.winners).toEqual([
      expect.objectContaining({ golferId: "joe" }),
    ]);
  });
});
