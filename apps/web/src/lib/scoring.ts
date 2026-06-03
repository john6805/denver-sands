export const attendanceStatuses = [
  "unknown",
  "confirmed",
  "declined",
  "withdrawn",
  "no_show",
  "played",
] as const;

export const matchResults = [
  "won",
  "tied",
  "lost",
  "not_applicable",
] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type MatchResult = (typeof matchResults)[number];

export type WeeklyScoringInput = {
  id: string;
  golferId: string;
  golferName: string;
  attendanceStatus: AttendanceStatus;
  matchResult: MatchResult;
  handicapSnapshot: number | null;
  grossScore: number | null;
  netScore: number | null;
  putts: number | null;
};

export type RankBreakdown = {
  rank: number | null;
  points: number;
};

export type WeeklyPointBreakdown = WeeklyScoringInput & {
  halfHandicap: number | null;
  fallbackNetScore: number | null;
  scoringNetScore: number | null;
  netScoreSource: "entered" | "fallback" | "missing";
  attendancePoints: number;
  matchPoints: number;
  gross: RankBreakdown;
  net: RankBreakdown;
  putt: RankBreakdown;
  totalPoints: number;
  missingInputs: string[];
};

const officialAttendanceStatuses = new Set<AttendanceStatus>([
  "confirmed",
  "played",
]);
const excludedRankStatuses = new Set<AttendanceStatus>([
  "unknown",
  "declined",
  "withdrawn",
  "no_show",
]);

const grossPointsByRank = [6, 4, 3, 2, 1];
const netPointsByRank = [5, 4, 3, 2, 1];
const puttPointsByRank = [4, 3, 2, 1];

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pointsForRank(rank: number | null, pointsByRank: number[]) {
  if (rank === null) {
    return 0;
  }

  return pointsByRank[rank - 1] ?? 0;
}

function rankEligible(row: WeeklyScoringInput) {
  return !excludedRankStatuses.has(row.attendanceStatus);
}

export function calculateHalfHandicap(handicap: number | null | undefined) {
  const numericHandicap = isUsableNumber(handicap) ? handicap : null;

  if (numericHandicap === null || numericHandicap < 0) {
    return null;
  }

  return Math.ceil(numericHandicap / 2);
}

export function calculateFallbackNetScore(input: {
  grossScore: number | null | undefined;
  handicap: number | null | undefined;
}) {
  const grossScore = isUsableNumber(input.grossScore)
    ? input.grossScore
    : null;
  const halfHandicap = calculateHalfHandicap(input.handicap);

  if (grossScore === null || halfHandicap === null) {
    return null;
  }

  return grossScore - halfHandicap;
}

export function resolveNetScore(input: {
  enteredNetScore: number | null | undefined;
  grossScore: number | null | undefined;
  handicap: number | null | undefined;
}) {
  const enteredNetScore = isUsableNumber(input.enteredNetScore)
    ? input.enteredNetScore
    : null;
  const fallbackNetScore = calculateFallbackNetScore({
    grossScore: input.grossScore,
    handicap: input.handicap,
  });

  if (enteredNetScore !== null) {
    return {
      fallbackNetScore,
      scoringNetScore: enteredNetScore,
      source: "entered" as const,
    };
  }

  if (fallbackNetScore !== null) {
    return {
      fallbackNetScore,
      scoringNetScore: fallbackNetScore,
      source: "fallback" as const,
    };
  }

  return {
    fallbackNetScore,
    scoringNetScore: null,
    source: "missing" as const,
  };
}

export function calculateAttendancePoints(status: AttendanceStatus) {
  return officialAttendanceStatuses.has(status) ? 3 : 0;
}

export function calculateMatchPoints(result: MatchResult) {
  switch (result) {
    case "won":
      return 5;
    case "tied":
      return 2;
    case "lost":
    case "not_applicable":
      return 0;
  }
}

export function calculateDenseRanks<T>(
  rows: T[],
  valueForRow: (row: T) => number | null,
) {
  const distinctValues = Array.from(
    new Set(
      rows
        .map(valueForRow)
        .filter((value): value is number => isUsableNumber(value)),
    ),
  ).sort((left, right) => left - right);

  const valueRanks = new Map(
    distinctValues.map((value, index) => [value, index + 1]),
  );

  return rows.map((row) => {
    const value = valueForRow(row);

    if (!isUsableNumber(value)) {
      return null;
    }

    return valueRanks.get(value) ?? null;
  });
}

export function calculateWeeklyPointBreakdowns(
  rows: WeeklyScoringInput[],
): WeeklyPointBreakdown[] {
  const netResolvedRows = rows.map((row) => ({
    row,
    net: resolveNetScore({
      enteredNetScore: row.netScore,
      grossScore: row.grossScore,
      handicap: row.handicapSnapshot,
    }),
  }));

  const grossRanks = calculateDenseRanks(rows, (row) =>
    rankEligible(row) ? row.grossScore : null,
  );
  const netRanks = calculateDenseRanks(netResolvedRows, ({ row, net }) =>
    rankEligible(row) ? net.scoringNetScore : null,
  );
  const puttRanks = calculateDenseRanks(rows, (row) =>
    rankEligible(row) ? row.putts : null,
  );

  return netResolvedRows.map(({ row, net }, index) => {
    const halfHandicap = calculateHalfHandicap(row.handicapSnapshot);
    const attendancePoints = calculateAttendancePoints(row.attendanceStatus);
    const matchPoints = calculateMatchPoints(row.matchResult);
    const grossRank = grossRanks[index] ?? null;
    const netRank = netRanks[index] ?? null;
    const puttRank = puttRanks[index] ?? null;
    const grossPoints = pointsForRank(grossRank, grossPointsByRank);
    const netPoints = pointsForRank(netRank, netPointsByRank);
    const puttPoints = pointsForRank(puttRank, puttPointsByRank);
    const missingInputs = missingScoringInputs(row, net.scoringNetScore);

    return {
      ...row,
      halfHandicap,
      fallbackNetScore: net.fallbackNetScore,
      scoringNetScore: net.scoringNetScore,
      netScoreSource: net.source,
      attendancePoints,
      matchPoints,
      gross: {
        rank: grossRank,
        points: grossPoints,
      },
      net: {
        rank: netRank,
        points: netPoints,
      },
      putt: {
        rank: puttRank,
        points: puttPoints,
      },
      totalPoints:
        attendancePoints + matchPoints + grossPoints + netPoints + puttPoints,
      missingInputs,
    };
  });
}

function missingScoringInputs(
  row: WeeklyScoringInput,
  scoringNetScore: number | null,
) {
  if (!rankEligible(row)) {
    return [];
  }

  const missing: string[] = [];

  if (!isUsableNumber(row.handicapSnapshot)) {
    missing.push("handicap");
  }

  if (!isUsableNumber(row.grossScore)) {
    missing.push("gross");
  }

  if (!isUsableNumber(scoringNetScore)) {
    missing.push("net");
  }

  if (!isUsableNumber(row.putts)) {
    missing.push("putts");
  }

  return missing;
}
