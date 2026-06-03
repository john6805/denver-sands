import type { PlannedMatchFormat } from "@/lib/match-format-planner";
import {
  buildStrokeAllocationPlan,
  type CourseHoleRating,
  type MatchFormat,
  type StrokeAllocation,
} from "@/lib/stroke-allocation";

export type MatchGeneratorGolfer = {
  golferId: string;
  handicapSnapshot: number | null;
  halfHandicap: number | null;
};

export type PairingHistory = {
  golferIds: [string, string];
  twoVTwoPartnerStreak?: number;
  recentGroupmateCount?: number;
};

export type GeneratedParticipant = MatchGeneratorGolfer & {
  sideId: string;
};

export type GeneratedSide = {
  id: string;
  sideNumber: number;
  sideHalfHandicap: number | null;
  participants: GeneratedParticipant[];
};

export type GeneratedMatch = {
  id: string;
  teeTimeId: string | null;
  format: MatchFormat;
  status: "draft";
  sides: GeneratedSide[];
  strokeAllocations: StrokeAllocation[];
};

export type GeneratedMatchPlan =
  | {
      ok: true;
      randomSeed: string;
      generatedAt: string;
      rerollCount: number;
      unavoidableConflict: boolean;
      matches: GeneratedMatch[];
      warnings: string[];
    }
  | {
      ok: false;
      randomSeed: string;
      generatedAt: string;
      rerollCount: number;
      matches: [];
      issues: string[];
    };

export type GeneratedMatchPersistenceRows = {
  weeklyMatches: Array<{
    id: string;
    weekly_event_id: string;
    tee_time_id: string | null;
    format: MatchFormat;
    status: "draft";
    random_seed: string;
    generated_at: string;
    unavoidable_conflict: boolean;
  }>;
  weeklyMatchSides: Array<{
    id: string;
    match_id: string;
    side_number: number;
    side_half_handicap: number | null;
  }>;
  weeklyMatchParticipants: Array<{
    match_id: string;
    match_side_id: string;
    golfer_id: string;
    handicap_snapshot: number | null;
    half_handicap_snapshot: number | null;
  }>;
  strokeAllocations: Array<{
    match_id: string;
    receiving_side_id: string;
    against_side_id: string | null;
    hole_number: number;
    strokes: number;
  }>;
};

type Candidate = {
  matches: GeneratedMatch[];
  hardConflictCount: number;
  softConflictScore: number;
};

function hashSeed(value: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffled<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function pairKey(golferIds: [string, string]) {
  return [...golferIds].sort().join("::");
}

function groupPairs(golferIds: string[]) {
  const pairs: Array<[string, string]> = [];

  for (let left = 0; left < golferIds.length; left += 1) {
    for (let right = left + 1; right < golferIds.length; right += 1) {
      pairs.push([golferIds[left], golferIds[right]]);
    }
  }

  return pairs;
}

function historyMaps(history: PairingHistory[]) {
  return {
    hardPartnerStreaks: new Map(
      history.map((item) => [
        pairKey(item.golferIds),
        item.twoVTwoPartnerStreak ?? 0,
      ]),
    ),
    softGroupmateCounts: new Map(
      history.map((item) => [
        pairKey(item.golferIds),
        item.recentGroupmateCount ?? 0,
      ]),
    ),
  };
}

function sideHalfHandicap(participants: MatchGeneratorGolfer[]) {
  if (participants.length !== 1) {
    return null;
  }

  return participants[0].halfHandicap;
}

function buildSides(input: {
  matchId: string;
  format: MatchFormat;
  golfers: MatchGeneratorGolfer[];
}) {
  const groups =
    input.format === "two_v_two"
      ? [input.golfers.slice(0, 2), input.golfers.slice(2, 4)]
      : input.golfers.map((golfer) => [golfer]);

  return groups.map((participants, index): GeneratedSide => {
    const sideId = `${input.matchId}-side-${index + 1}`;

    return {
      id: sideId,
      sideNumber: index + 1,
      sideHalfHandicap: sideHalfHandicap(participants),
      participants: participants.map((participant) => ({
        ...participant,
        sideId,
      })),
    };
  });
}

function buildStrokeAllocations(input: {
  format: MatchFormat;
  sides: GeneratedSide[];
  courseHoles: CourseHoleRating[] | undefined;
}) {
  if (!input.courseHoles) {
    return [];
  }

  const plan = buildStrokeAllocationPlan({
    format: input.format,
    sides: input.sides.map((side) => ({
      sideId: side.id,
      sideNumber: side.sideNumber,
      halfHandicap: side.sideHalfHandicap,
    })),
    courseHoles: input.courseHoles,
  });

  return plan.ok ? plan.allocations : [];
}

function candidateForSeed(input: {
  seed: string;
  formats: PlannedMatchFormat[];
  golfers: MatchGeneratorGolfer[];
  teeTimeIds: string[];
  history: PairingHistory[];
  courseHoles?: CourseHoleRating[];
}): Candidate {
  const shuffledGolfers = shuffled(input.golfers, input.seed);
  const { hardPartnerStreaks, softGroupmateCounts } = historyMaps(input.history);
  let cursor = 0;
  let hardConflictCount = 0;
  let softConflictScore = 0;
  const matches = input.formats.map((formatPlan, index): GeneratedMatch => {
    const matchId = `draft-match-${index + 1}`;
    const matchGolfers = shuffledGolfers.slice(
      cursor,
      cursor + formatPlan.golferCount,
    );
    cursor += formatPlan.golferCount;
    const sides = buildSides({
      matchId,
      format: formatPlan.format,
      golfers: matchGolfers,
    });

    for (const side of sides) {
      const golferIds = side.participants.map((participant) => participant.golferId);

      for (const pair of groupPairs(golferIds)) {
        if (
          formatPlan.format === "two_v_two" &&
          (hardPartnerStreaks.get(pairKey(pair)) ?? 0) >= 2
        ) {
          hardConflictCount += 1;
        }
      }
    }

    for (const pair of groupPairs(matchGolfers.map((golfer) => golfer.golferId))) {
      softConflictScore += softGroupmateCounts.get(pairKey(pair)) ?? 0;
    }

    return {
      id: matchId,
      teeTimeId: input.teeTimeIds[index] ?? null,
      format: formatPlan.format,
      status: "draft",
      sides,
      strokeAllocations: buildStrokeAllocations({
        format: formatPlan.format,
        sides,
        courseHoles: input.courseHoles,
      }),
    };
  });

  return {
    matches,
    hardConflictCount,
    softConflictScore,
  };
}

function compareCandidates(left: Candidate, right: Candidate) {
  if (left.hardConflictCount !== right.hardConflictCount) {
    return left.hardConflictCount - right.hardConflictCount;
  }

  return left.softConflictScore - right.softConflictScore;
}

function validateGeneratorInput(input: {
  formats: PlannedMatchFormat[];
  golfers: MatchGeneratorGolfer[];
}) {
  const issues: string[] = [];
  const requiredGolfers = input.formats.reduce(
    (total, format) => total + format.golferCount,
    0,
  );
  const golferIds = new Set<string>();

  if (requiredGolfers !== input.golfers.length) {
    issues.push(
      `Format plan requires ${requiredGolfers} golfers, but ${input.golfers.length} were provided.`,
    );
  }

  for (const golfer of input.golfers) {
    if (!golfer.golferId) {
      issues.push("Each generated golfer needs an id.");
    }

    if (golferIds.has(golfer.golferId)) {
      issues.push(`Golfer ${golfer.golferId} is duplicated.`);
    }

    golferIds.add(golfer.golferId);
  }

  return Array.from(new Set(issues));
}

export function generateRandomMatchPlan(input: {
  randomSeed: string;
  generatedAt: string;
  formats: PlannedMatchFormat[];
  golfers: MatchGeneratorGolfer[];
  teeTimeIds?: string[];
  pairingHistory?: PairingHistory[];
  courseHoles?: CourseHoleRating[];
  rerollCount?: number;
  attempts?: number;
}): GeneratedMatchPlan {
  const rerollCount = input.rerollCount ?? 0;
  const issues = validateGeneratorInput({
    formats: input.formats,
    golfers: input.golfers,
  });

  if (issues.length > 0) {
    return {
      ok: false,
      randomSeed: input.randomSeed,
      generatedAt: input.generatedAt,
      rerollCount,
      matches: [],
      issues,
    };
  }

  const attemptCount = input.attempts ?? 80;
  const candidates = Array.from({ length: attemptCount }, (_, index) =>
    candidateForSeed({
      seed: `${input.randomSeed}:${rerollCount}:${index}`,
      formats: input.formats,
      golfers: input.golfers,
      teeTimeIds: input.teeTimeIds ?? [],
      history: input.pairingHistory ?? [],
      courseHoles: input.courseHoles,
    }),
  ).sort(compareCandidates);
  const selected = candidates[0];
  const cleanCandidate = candidates.find(
    (candidate) => candidate.hardConflictCount === 0,
  );
  const unavoidableConflict = !cleanCandidate && selected.hardConflictCount > 0;

  return {
    ok: true,
    randomSeed: input.randomSeed,
    generatedAt: input.generatedAt,
    rerollCount,
    unavoidableConflict,
    matches: selected.matches,
    warnings: unavoidableConflict
      ? [
          "A third-consecutive 2v2 partnership could not be avoided with the available golfers and format mix.",
        ]
      : [],
  };
}

export function buildGeneratedMatchPersistenceRows(input: {
  weeklyEventId: string;
  plan: Extract<GeneratedMatchPlan, { ok: true }>;
}): GeneratedMatchPersistenceRows {
  return {
    weeklyMatches: input.plan.matches.map((match) => ({
      id: match.id,
      weekly_event_id: input.weeklyEventId,
      tee_time_id: match.teeTimeId,
      format: match.format,
      status: match.status,
      random_seed: input.plan.randomSeed,
      generated_at: input.plan.generatedAt,
      unavoidable_conflict: input.plan.unavoidableConflict,
    })),
    weeklyMatchSides: input.plan.matches.flatMap((match) =>
      match.sides.map((side) => ({
        id: side.id,
        match_id: match.id,
        side_number: side.sideNumber,
        side_half_handicap: side.sideHalfHandicap,
      })),
    ),
    weeklyMatchParticipants: input.plan.matches.flatMap((match) =>
      match.sides.flatMap((side) =>
        side.participants.map((participant) => ({
          match_id: match.id,
          match_side_id: side.id,
          golfer_id: participant.golferId,
          handicap_snapshot: participant.handicapSnapshot,
          half_handicap_snapshot: participant.halfHandicap,
        })),
      ),
    ),
    strokeAllocations: input.plan.matches.flatMap((match) =>
      match.strokeAllocations.map((allocation) => ({
        match_id: match.id,
        ...allocation,
      })),
    ),
  };
}
