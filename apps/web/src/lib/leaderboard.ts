import {
  calculateWeeklyPointBreakdowns,
  resolveNetScore,
  type AttendanceStatus,
  type MatchResult,
  type WeeklyScoringInput,
} from "@/lib/scoring";

export type LeaderboardWeek = {
  id: string;
  status: string;
};

export type LeaderboardGolfer = {
  id: string;
  displayName: string;
  active?: boolean;
};

export type LeaderboardResultInput = {
  id: string;
  weeklyEventId: string;
  golferId: string;
  attendanceStatus: AttendanceStatus;
  matchResult: MatchResult;
  handicapSnapshot: number | null;
  grossScore: number | null;
  netScore: number | null;
  putts: number | null;
  beerCount?: number | null;
};

export type RawLeaderboardRow = {
  rank: number;
  officialRank: number;
  golferId: string;
  golferName: string;
  rawPoints: number;
  officialPoints: number;
  pointsBehind: number;
  officialPointsBehind: number;
  droppedWeekCount: number;
  droppedPoints: number;
  droppedWeeks: DroppedLeaderboardWeek[];
  matchWins: number;
  noShowCount: number;
  blankWeekCount: number;
  completedWeekCount: number;
  lowestGross: number | null;
  lowestNet: number | null;
  lowestPutts: number | null;
  beerTotal: number;
  pointsPlusBeer: number;
};

export type DroppedLeaderboardWeek = {
  weekId: string;
  totalPoints: number;
};

type WeeklyLeaderboardTotal = {
  weekId: string;
  totalPoints: number;
  dropEligible: boolean;
};

const completedWeekStatuses = new Set(["completed", "locked"]);
const officialDropAttendanceStatuses = new Set<AttendanceStatus>([
  "confirmed",
  "played",
  "no_show",
]);

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNoShow(status: AttendanceStatus) {
  return status === "no_show";
}

function leaderboardPosition(
  rows: Array<Pick<RawLeaderboardRow, "rawPoints">>,
  index: number,
) {
  if (index === 0) {
    return 1;
  }

  if (rows[index].rawPoints === rows[index - 1].rawPoints) {
    return leaderboardPosition(rows, index - 1);
  }

  return index + 1;
}

function officialLeaderboardPosition(
  rows: Array<Pick<RawLeaderboardRow, "officialPoints">>,
  index: number,
) {
  if (index === 0) {
    return 1;
  }

  if (rows[index].officialPoints === rows[index - 1].officialPoints) {
    return officialLeaderboardPosition(rows, index - 1);
  }

  return index + 1;
}

function droppedWeeksFor(
  weeklyTotals: WeeklyLeaderboardTotal[],
  dropLowestWeekCount: number,
) {
  if (dropLowestWeekCount <= 0) {
    return [];
  }

  return weeklyTotals
    .filter((week) => week.dropEligible)
    .sort((left, right) => {
      if (left.totalPoints !== right.totalPoints) {
        return left.totalPoints - right.totalPoints;
      }

      return left.weekId.localeCompare(right.weekId);
    })
    .slice(0, dropLowestWeekCount)
    .map(({ weekId, totalPoints }) => ({ weekId, totalPoints }));
}

export function isCompletedLeaderboardWeek(week: LeaderboardWeek) {
  return completedWeekStatuses.has(week.status);
}

export function calculateRawLeaderboard(input: {
  golfers: LeaderboardGolfer[];
  weeks: LeaderboardWeek[];
  results: LeaderboardResultInput[];
  dropLowestWeekCount?: number;
}): RawLeaderboardRow[] {
  const dropLowestWeekCount = Math.max(
    0,
    Math.trunc(input.dropLowestWeekCount ?? 2),
  );
  const completedWeekIds = new Set(
    input.weeks.filter(isCompletedLeaderboardWeek).map((week) => week.id),
  );
  const golferNames = new Map(
    input.golfers.map((golfer) => [golfer.id, golfer.displayName]),
  );
  const resultsByWeek = new Map<string, LeaderboardResultInput[]>();

  for (const result of input.results) {
    if (!completedWeekIds.has(result.weeklyEventId)) {
      continue;
    }

    const existing = resultsByWeek.get(result.weeklyEventId) ?? [];
    existing.push(result);
    resultsByWeek.set(result.weeklyEventId, existing);
  }

  const totals = new Map<string, Omit<RawLeaderboardRow, "rank" | "pointsBehind">>();

  for (const golfer of input.golfers) {
    totals.set(golfer.id, {
      officialRank: 1,
      golferId: golfer.id,
      golferName: golfer.displayName,
      rawPoints: 0,
      officialPoints: 0,
      officialPointsBehind: 0,
      droppedWeekCount: 0,
      droppedPoints: 0,
      droppedWeeks: [],
      matchWins: 0,
      noShowCount: 0,
      blankWeekCount: 0,
      completedWeekCount: 0,
      lowestGross: null,
      lowestNet: null,
      lowestPutts: null,
      beerTotal: 0,
      pointsPlusBeer: 0,
    });
  }
  const weeklyTotalsByGolfer = new Map<string, WeeklyLeaderboardTotal[]>();

  for (const [weekId, weekResults] of resultsByWeek.entries()) {
    const scoringRows: WeeklyScoringInput[] = weekResults.map((result) => ({
      id: result.id,
      golferId: result.golferId,
      golferName: golferNames.get(result.golferId) ?? "Unknown golfer",
      attendanceStatus: result.attendanceStatus,
      matchResult: result.matchResult,
      handicapSnapshot: result.handicapSnapshot,
      grossScore: result.grossScore,
      netScore: result.netScore,
      putts: result.putts,
    }));
    const breakdowns = calculateWeeklyPointBreakdowns(scoringRows);
    const resultByGolfer = new Map(
      weekResults.map((result) => [result.golferId, result]),
    );

    for (const breakdown of breakdowns) {
      const row = totals.get(breakdown.golferId);
      const result = resultByGolfer.get(breakdown.golferId);

      if (!row || !result) {
        continue;
      }

      row.rawPoints += breakdown.totalPoints;
      const weeklyTotals = weeklyTotalsByGolfer.get(breakdown.golferId) ?? [];
      weeklyTotals.push({
        weekId,
        totalPoints: breakdown.totalPoints,
        dropEligible: officialDropAttendanceStatuses.has(
          breakdown.attendanceStatus,
        ),
      });
      weeklyTotalsByGolfer.set(breakdown.golferId, weeklyTotals);
      row.completedWeekCount += 1;
      row.matchWins += result.matchResult === "won" ? 1 : 0;
      row.noShowCount += isNoShow(result.attendanceStatus) ? 1 : 0;
      row.blankWeekCount += result.attendanceStatus === "unknown" ? 1 : 0;
      row.beerTotal += result.beerCount ?? 0;

      if (isUsableNumber(result.grossScore)) {
        row.lowestGross =
          row.lowestGross === null
            ? result.grossScore
            : Math.min(row.lowestGross, result.grossScore);
      }

      const net = resolveNetScore({
        enteredNetScore: result.netScore,
        grossScore: result.grossScore,
        handicap: result.handicapSnapshot,
      }).scoringNetScore;

      if (isUsableNumber(net)) {
        row.lowestNet = row.lowestNet === null ? net : Math.min(row.lowestNet, net);
      }

      if (isUsableNumber(result.putts)) {
        row.lowestPutts =
          row.lowestPutts === null
            ? result.putts
            : Math.min(row.lowestPutts, result.putts);
      }
    }

  }

  const sorted = Array.from(totals.values())
    .map((row) => ({
      ...row,
      ...officialTotalsFor(row.golferId, row.rawPoints),
      pointsPlusBeer: row.rawPoints + row.beerTotal,
    }))
    .sort((left, right) => {
      if (right.rawPoints !== left.rawPoints) {
        return right.rawPoints - left.rawPoints;
      }

      return left.golferName.localeCompare(right.golferName);
    });
  const leaderPoints = sorted[0]?.rawPoints ?? 0;
  const officialSorted = [...sorted].sort((left, right) => {
    if (right.officialPoints !== left.officialPoints) {
      return right.officialPoints - left.officialPoints;
    }

    return left.golferName.localeCompare(right.golferName);
  });
  const officialLeaderPoints = officialSorted[0]?.officialPoints ?? 0;
  const officialRankByGolfer = new Map(
    officialSorted.map((row, index) => [
      row.golferId,
      officialLeaderboardPosition(officialSorted, index),
    ]),
  );

  return sorted.map((row, index) => ({
    ...row,
    rank: leaderboardPosition(sorted, index),
    pointsBehind: leaderPoints - row.rawPoints,
    officialRank: officialRankByGolfer.get(row.golferId) ?? 1,
    officialPointsBehind: officialLeaderPoints - row.officialPoints,
  }));

  function officialTotalsFor(golferId: string, rawPoints: number) {
    const droppedWeeks = droppedWeeksFor(
      weeklyTotalsByGolfer.get(golferId) ?? [],
      dropLowestWeekCount,
    );
    const droppedPoints = droppedWeeks.reduce(
      (total, week) => total + week.totalPoints,
      0,
    );

    return {
      officialPoints: rawPoints - droppedPoints,
      droppedWeekCount: droppedWeeks.length,
      droppedPoints,
      droppedWeeks,
    };
  }
}
