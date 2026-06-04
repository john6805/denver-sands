import {
  calculateRawLeaderboard,
  isCompletedLeaderboardWeek,
  type LeaderboardGolfer,
  type LeaderboardResultInput,
  type LeaderboardWeek,
  type RawLeaderboardRow,
} from "@/lib/leaderboard";
import { resolveNetScore } from "@/lib/scoring";

export type AwardMetricId =
  | "mvp"
  | "going-low"
  | "stroke-king"
  | "least-wins"
  | "highest-net"
  | "highest-putts";

export type AwardMetric = {
  id: AwardMetricId;
  title: string;
  category: "award" | "sanction";
  valueLabel: string;
  winners: AwardWinner[];
};

export type AwardWinner = {
  golferId: string;
  golferName: string;
  value: number;
  weekId: string | null;
  detail: string;
};

type CompletedResult = LeaderboardResultInput & {
  golferName: string;
  netScoreForMetric: number | null;
};

type MatchSummary = {
  golferId: string;
  golferName: string;
  wins: number;
  matchesPlayed: number;
  winPercentage: number;
  officialPoints: number;
  rawPoints: number;
};

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

function winnersBy<T>(
  rows: T[],
  compare: (left: T, right: T) => number,
) {
  if (rows.length === 0) {
    return [];
  }

  const sorted = [...rows].sort(compare);
  const best = sorted[0];

  return sorted.filter((row) => compare(row, best) === 0);
}

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function completedResults(input: {
  golfers: LeaderboardGolfer[];
  weeks: LeaderboardWeek[];
  results: LeaderboardResultInput[];
}) {
  const completedWeekIds = new Set(
    input.weeks.filter(isCompletedLeaderboardWeek).map((week) => week.id),
  );
  const golferNames = new Map(
    input.golfers.map((golfer) => [golfer.id, golfer.displayName]),
  );

  return input.results
    .filter((result) => completedWeekIds.has(result.weeklyEventId))
    .map((result): CompletedResult => ({
      ...result,
      golferName: golferNames.get(result.golferId) ?? "Unknown golfer",
      netScoreForMetric: resolveNetScore({
        enteredNetScore: result.netScore,
        grossScore: result.grossScore,
        handicap: result.handicapSnapshot,
      }).scoringNetScore,
    }));
}

function matchSummaries(input: {
  golfers: LeaderboardGolfer[];
  leaderboardRows: RawLeaderboardRow[];
  results: CompletedResult[];
}) {
  const rows = new Map<string, MatchSummary>();
  const leaderboardByGolfer = new Map(
    input.leaderboardRows.map((row) => [row.golferId, row]),
  );

  for (const golfer of input.golfers) {
    const leaderboardRow = leaderboardByGolfer.get(golfer.id);

    rows.set(golfer.id, {
      golferId: golfer.id,
      golferName: golfer.displayName,
      wins: leaderboardRow?.matchWins ?? 0,
      matchesPlayed: 0,
      winPercentage: 0,
      officialPoints: leaderboardRow?.officialPoints ?? 0,
      rawPoints: leaderboardRow?.rawPoints ?? 0,
    });
  }

  for (const result of input.results) {
    if (!["won", "tied", "lost"].includes(result.matchResult)) {
      continue;
    }

    const row = rows.get(result.golferId);

    if (!row) {
      continue;
    }

    row.matchesPlayed += 1;
  }

  for (const row of rows.values()) {
    row.winPercentage =
      row.matchesPlayed === 0 ? 0 : row.wins / row.matchesPlayed;
  }

  return Array.from(rows.values());
}

function resultDetail(result: CompletedResult) {
  return [
    `Week ${result.weeklyEventId}`,
    `gross ${result.grossScore ?? "-"}`,
    `net ${result.netScoreForMetric ?? "-"}`,
    `putts ${result.putts ?? "-"}`,
  ].join(" · ");
}

function awardFromResults(input: {
  id: AwardMetricId;
  title: string;
  category: "award" | "sanction";
  valueLabel: string;
  results: CompletedResult[];
  value: (result: CompletedResult) => number | null;
  compare: (left: CompletedResult, right: CompletedResult) => number;
}) {
  const candidates = input.results.filter((result) =>
    isUsableNumber(input.value(result)),
  );

  return {
    id: input.id,
    title: input.title,
    category: input.category,
    valueLabel: input.valueLabel,
    winners: winnersBy(candidates, input.compare).map((result) => ({
      golferId: result.golferId,
      golferName: result.golferName,
      value: input.value(result) ?? 0,
      weekId: result.weeklyEventId,
      detail: resultDetail(result),
    })),
  };
}

function awardFromMatches(input: {
  id: AwardMetricId;
  title: string;
  category: "award" | "sanction";
  valueLabel: string;
  rows: MatchSummary[];
  compare: (left: MatchSummary, right: MatchSummary) => number;
}) {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    valueLabel: input.valueLabel,
    winners: winnersBy(input.rows, input.compare).map((row) => ({
      golferId: row.golferId,
      golferName: row.golferName,
      value: row.wins,
      weekId: null,
      detail: `${row.wins} wins · ${formatPercent(row.winPercentage)} win rate · ${row.officialPoints} official pts`,
    })),
  };
}

export function calculateAwardMetrics(input: {
  golfers: LeaderboardGolfer[];
  weeks: LeaderboardWeek[];
  results: LeaderboardResultInput[];
  dropLowestWeekCount?: number;
}): AwardMetric[] {
  const leaderboardRows = calculateRawLeaderboard(input);
  const results = completedResults(input);
  const matches = matchSummaries({
    golfers: input.golfers,
    leaderboardRows,
    results,
  });

  return [
    awardFromMatches({
      id: "mvp",
      title: "MVP",
      category: "award",
      valueLabel: "Match wins",
      rows: matches,
      compare: (left, right) =>
        compareNumber(left.wins, right.wins, "desc") ||
        compareNumber(left.winPercentage, right.winPercentage, "desc") ||
        compareNumber(left.officialPoints, right.officialPoints, "desc") ||
        compareNumber(left.rawPoints, right.rawPoints, "desc"),
    }),
    awardFromResults({
      id: "going-low",
      title: "Going Low",
      category: "award",
      valueLabel: "Lowest net",
      results,
      value: (result) => result.netScoreForMetric,
      compare: (left, right) =>
        compareNumber(left.netScoreForMetric, right.netScoreForMetric, "asc") ||
        compareNumber(left.putts, right.putts, "asc") ||
        compareNumber(left.grossScore, right.grossScore, "asc"),
    }),
    awardFromResults({
      id: "stroke-king",
      title: "Stroke King",
      category: "award",
      valueLabel: "Lowest putts",
      results,
      value: (result) => result.putts,
      compare: (left, right) =>
        compareNumber(left.putts, right.putts, "asc") ||
        compareNumber(left.netScoreForMetric, right.netScoreForMetric, "asc") ||
        compareNumber(left.grossScore, right.grossScore, "asc"),
    }),
    awardFromMatches({
      id: "least-wins",
      title: "Stephen Glansberg Award",
      category: "sanction",
      valueLabel: "Match wins",
      rows: matches,
      compare: (left, right) =>
        compareNumber(left.wins, right.wins, "asc") ||
        compareNumber(left.winPercentage, right.winPercentage, "asc") ||
        compareNumber(left.matchesPlayed, right.matchesPlayed, "desc") ||
        compareNumber(left.officialPoints, right.officialPoints, "asc"),
    }),
    awardFromResults({
      id: "highest-net",
      title: "Wiz Khalifa Award",
      category: "sanction",
      valueLabel: "Highest net",
      results,
      value: (result) => result.netScoreForMetric,
      compare: (left, right) =>
        compareNumber(left.netScoreForMetric, right.netScoreForMetric, "desc") ||
        compareNumber(left.putts, right.putts, "desc") ||
        compareNumber(left.grossScore, right.grossScore, "desc"),
    }),
    awardFromResults({
      id: "highest-putts",
      title: "3putt King Award",
      category: "sanction",
      valueLabel: "Highest putts",
      results,
      value: (result) => result.putts,
      compare: (left, right) =>
        compareNumber(left.putts, right.putts, "desc") ||
        compareNumber(left.netScoreForMetric, right.netScoreForMetric, "desc") ||
        compareNumber(left.grossScore, right.grossScore, "desc"),
    }),
  ];
}
