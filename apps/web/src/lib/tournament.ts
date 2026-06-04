import type { AdminIssue, UpdateResult } from "@/lib/admin-season";
import type { RawLeaderboardRow } from "@/lib/leaderboard";
import type {
  Golfer,
  TournamentRound,
  TournamentRoundResult,
} from "@/lib/data/league-data";

export const tournamentStatusOptions = [
  "planned",
  "completed",
  "locked",
] as const;

export type TournamentCreate = {
  name: string;
  course_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: (typeof tournamentStatusOptions)[number];
  rounds: [
    {
      round_number: 1;
      play_date: string | null;
      course_id: string | null;
      holes: 18;
    },
    {
      round_number: 2;
      play_date: string | null;
      course_id: string | null;
      holes: 18;
    },
  ];
};

export type TournamentResultUpsert = {
  golfer_id: string;
  handicap_snapshot: number | null;
  net_score: number | null;
  putts: number | null;
};

export type TournamentStandingRow = {
  golferId: string;
  golferName: string;
  place: number;
  tournamentPoints: number;
  totalNetScore: number;
  totalPutts: number;
  finalRoundNetScore: number;
  finalRoundPutts: number;
};

export type ChampionResult = {
  title: string;
  winners: Array<{
    golferId: string;
    golferName: string;
    detail: string;
  }>;
};

const tournamentPointsByPlace = [12, 9, 8, 7, 6, 5, 4];

function issue(field: string, message: string): AdminIssue {
  return { field, message };
}

function result<T>(values: T, issues: AdminIssue[]): UpdateResult<T> {
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, values };
}

function cleanRequiredText(field: string, label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed || ["-", "n/a", "na", "unk"].includes(trimmed.toLowerCase())) {
    return { value: null, issue: issue(field, `${label} needs a real value.`) };
  }

  return { value: trimmed, issue: null };
}

function cleanOptionalText(field: string, label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: null, issue: null };
  }

  if (["-", "n/a", "na", "unk"].includes(trimmed.toLowerCase())) {
    return {
      value: null,
      issue: issue(field, `${label} should be blank instead of a placeholder.`),
    };
  }

  return { value: trimmed, issue: null };
}

function cleanOptionalDate(field: string, label: string, value: string) {
  const cleaned = cleanOptionalText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return cleaned;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned.value)) {
    return { value: null, issue: issue(field, `${label} must use YYYY-MM-DD.`) };
  }

  return cleaned;
}

function cleanOptionalNumber(
  field: string,
  label: string,
  value: string,
  options: { integer?: boolean; min?: number } = {},
) {
  const cleaned = cleanOptionalText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return { value: null, issue: cleaned.issue };
  }

  const parsed = Number(cleaned.value);

  if (!Number.isFinite(parsed)) {
    return { value: null, issue: issue(field, `${label} must be numeric.`) };
  }

  if (options.integer && !Number.isInteger(parsed)) {
    return {
      value: null,
      issue: issue(field, `${label} must be a whole number.`),
    };
  }

  if (typeof options.min === "number" && parsed < options.min) {
    return {
      value: null,
      issue: issue(field, `${label} must be at least ${options.min}.`),
    };
  }

  return {
    value: options.integer ? parsed : Math.round(parsed * 10) / 10,
    issue: null,
  };
}

function optionValue<T extends readonly string[]>(
  field: string,
  label: string,
  value: string,
  options: T,
) {
  if (options.includes(value)) {
    return { value: value as T[number], issue: null };
  }

  return {
    value: null,
    issue: issue(field, `${label} is not a supported option.`),
  };
}

export function buildTournamentCreate(input: {
  name: string;
  course_id: string;
  starts_on: string;
  ends_on: string;
  status: string;
  round_1_play_date: string;
  round_2_play_date: string;
}): UpdateResult<TournamentCreate> {
  const name = cleanRequiredText("name", "Tournament name", input.name);
  const courseId = cleanOptionalText("course_id", "Course", input.course_id);
  const startsOn = cleanOptionalDate(
    "starts_on",
    "Tournament start date",
    input.starts_on,
  );
  const endsOn = cleanOptionalDate(
    "ends_on",
    "Tournament end date",
    input.ends_on,
  );
  const round1 = cleanOptionalDate(
    "round_1_play_date",
    "Round 1 date",
    input.round_1_play_date,
  );
  const round2 = cleanOptionalDate(
    "round_2_play_date",
    "Round 2 date",
    input.round_2_play_date,
  );
  const status = optionValue(
    "status",
    "Tournament status",
    input.status,
    tournamentStatusOptions,
  );
  const issues = [
    name.issue,
    courseId.issue,
    startsOn.issue,
    endsOn.issue,
    round1.issue,
    round2.issue,
    status.issue,
  ].filter((item): item is AdminIssue => item !== null);

  if (startsOn.value && endsOn.value && endsOn.value < startsOn.value) {
    issues.push(
      issue("ends_on", "Tournament end date must be on or after the start date."),
    );
  }

  return result(
    {
      name: name.value ?? "",
      course_id: courseId.value,
      starts_on: startsOn.value,
      ends_on: endsOn.value,
      status: status.value ?? "planned",
      rounds: [
        {
          round_number: 1,
          play_date: round1.value,
          course_id: courseId.value,
          holes: 18,
        },
        {
          round_number: 2,
          play_date: round2.value,
          course_id: courseId.value,
          holes: 18,
        },
      ],
    },
    issues,
  );
}

export function buildTournamentResultUpserts(
  rows: Array<{
    golfer_id: string;
    handicap_snapshot: string;
    net_score: string;
    putts: string;
  }>,
): UpdateResult<TournamentResultUpsert[]> {
  const values: TournamentResultUpsert[] = [];
  const issues: AdminIssue[] = [];
  const golferIds = new Set<string>();

  for (const row of rows) {
    if (golferIds.has(row.golfer_id)) {
      issues.push(issue("golfer_id", `Golfer ${row.golfer_id} is duplicated.`));
    }

    golferIds.add(row.golfer_id);

    const handicap = cleanOptionalNumber(
      "handicap_snapshot",
      "Handicap snapshot",
      row.handicap_snapshot,
      { min: 0 },
    );
    const net = cleanOptionalNumber("net_score", "Net score", row.net_score, {
      integer: true,
      min: 1,
    });
    const putts = cleanOptionalNumber("putts", "Putts", row.putts, {
      integer: true,
      min: 0,
    });

    if (handicap.issue) {
      issues.push(handicap.issue);
    }

    if (net.issue) {
      issues.push(net.issue);
    }

    if (putts.issue) {
      issues.push(putts.issue);
    }

    values.push({
      golfer_id: row.golfer_id,
      handicap_snapshot:
        typeof handicap.value === "number" ? handicap.value : null,
      net_score: typeof net.value === "number" ? net.value : null,
      putts: typeof putts.value === "number" ? putts.value : null,
    });
  }

  return result(values, issues);
}

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function compareNumber(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: "asc" | "desc",
) {
  const leftValue = isUsableNumber(left) ? left : null;
  const rightValue = isUsableNumber(right) ? right : null;

  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function pointsForPlace(place: number) {
  return tournamentPointsByPlace[place - 1] ?? 2;
}

function standingTieCompare(
  left: Pick<
    TournamentStandingRow,
    "totalNetScore" | "totalPutts" | "finalRoundNetScore" | "finalRoundPutts"
  >,
  right: Pick<
    TournamentStandingRow,
    "totalNetScore" | "totalPutts" | "finalRoundNetScore" | "finalRoundPutts"
  >,
) {
  return (
    compareNumber(left.totalNetScore, right.totalNetScore, "asc") ||
    compareNumber(left.totalPutts, right.totalPutts, "asc") ||
    compareNumber(left.finalRoundNetScore, right.finalRoundNetScore, "asc") ||
    compareNumber(left.finalRoundPutts, right.finalRoundPutts, "asc")
  );
}

export function calculateTournamentStandings(input: {
  golfers: Golfer[];
  rounds: TournamentRound[];
  results: TournamentRoundResult[];
}): TournamentStandingRow[] {
  const round1 = input.rounds.find((round) => round.round_number === 1);
  const round2 = input.rounds.find((round) => round.round_number === 2);

  if (!round1 || !round2) {
    return [];
  }

  const golferNames = new Map(
    input.golfers.map((golfer) => [golfer.id, golfer.display_name]),
  );
  const round1ByGolfer = new Map(
    input.results
      .filter((result) => result.tournament_round_id === round1.id)
      .map((result) => [result.golfer_id, result]),
  );
  const round2ByGolfer = new Map(
    input.results
      .filter((result) => result.tournament_round_id === round2.id)
      .map((result) => [result.golfer_id, result]),
  );
  const rows: TournamentStandingRow[] = [];

  for (const golfer of input.golfers) {
    const first = round1ByGolfer.get(golfer.id);
    const final = round2ByGolfer.get(golfer.id);

    if (
      !first ||
      !final ||
      !isUsableNumber(first.net_score) ||
      !isUsableNumber(final.net_score) ||
      !isUsableNumber(first.putts) ||
      !isUsableNumber(final.putts)
    ) {
      continue;
    }

    rows.push({
      golferId: golfer.id,
      golferName: golferNames.get(golfer.id) ?? "Unknown golfer",
      place: 0,
      tournamentPoints: 0,
      totalNetScore: first.net_score + final.net_score,
      totalPutts: first.putts + final.putts,
      finalRoundNetScore: final.net_score,
      finalRoundPutts: final.putts,
    });
  }

  const sorted = rows.sort((left, right) => {
    const score = standingTieCompare(left, right);

    return score || left.golferName.localeCompare(right.golferName);
  });

  let previousPlace = 0;

  return sorted.map((row, index) => {
    const previous = sorted[index - 1];
    const place =
      previous && standingTieCompare(row, previous) === 0
        ? previousPlace
        : index + 1;

    previousPlace = place;

    return {
      ...row,
      place,
      tournamentPoints: pointsForPlace(place),
    };
  });
}

export function calculateTournamentChampion(
  standings: TournamentStandingRow[],
): ChampionResult {
  const winners = standings
    .filter((row) => row.place === 1)
    .map((row) => ({
      golferId: row.golferId,
      golferName: row.golferName,
      detail: `${row.totalNetScore} net · ${row.totalPutts} putts · ${row.tournamentPoints} tournament pts`,
    }));

  return {
    title: "Tournament Champion",
    winners,
  };
}

export function calculatePointsChampion(
  leaderboardRows: RawLeaderboardRow[],
): ChampionResult {
  if (leaderboardRows.length === 0) {
    return { title: "Points Champion", winners: [] };
  }

  const sorted = [...leaderboardRows].sort((left, right) => {
    const score =
      compareNumber(left.officialPoints, right.officialPoints, "desc") ||
      compareNumber(left.rawPoints, right.rawPoints, "desc") ||
      compareNumber(left.matchWins, right.matchWins, "desc") ||
      compareNumber(left.lowestNet, right.lowestNet, "asc");

    return score || left.golferName.localeCompare(right.golferName);
  });
  const best = sorted[0];
  const winners = sorted
    .filter(
      (row) =>
        compareNumber(row.officialPoints, best.officialPoints, "desc") === 0 &&
        compareNumber(row.rawPoints, best.rawPoints, "desc") === 0 &&
        compareNumber(row.matchWins, best.matchWins, "desc") === 0 &&
        compareNumber(row.lowestNet, best.lowestNet, "asc") === 0,
    )
    .map((row) => ({
      golferId: row.golferId,
      golferName: row.golferName,
      detail: `${row.officialPoints} official pts · ${row.rawPoints} raw pts · ${row.matchWins} wins`,
    }));

  return {
    title: "Points Champion",
    winners,
  };
}
