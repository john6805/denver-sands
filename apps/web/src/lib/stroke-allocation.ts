export type MatchFormat = "one_v_one" | "one_v_one_v_one" | "two_v_two";

export type CourseHoleRating = {
  hole_number: number;
  handicap_rank: number;
};

export type MatchSideStrokeInput = {
  sideId: string;
  sideNumber: number;
  halfHandicap: number | null;
};

export type StrokeAllocation = {
  receiving_side_id: string;
  against_side_id: string | null;
  hole_number: number;
  strokes: number;
};

export type StrokeAllocationInsert = StrokeAllocation & {
  match_id: string;
};

export type StrokeAllocationPlan =
  | {
      ok: true;
      allocations: StrokeAllocation[];
      notes: string[];
    }
  | {
      ok: false;
      allocations: [];
      issues: string[];
    };

const defaultPlayedHoleNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function usableInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value);
}

function validateCourseHoles(
  courseHoles: CourseHoleRating[],
  playedHoleNumbers: number[],
) {
  const issues: string[] = [];
  const holeNumbers = new Set<number>();
  const ranks = new Set<number>();

  for (const hole of courseHoles) {
    if (!usableInteger(hole.hole_number) || hole.hole_number < 1 || hole.hole_number > 18) {
      issues.push("Course hole numbers must be whole numbers from 1 through 18.");
      continue;
    }

    if (
      !usableInteger(hole.handicap_rank) ||
      hole.handicap_rank < 1 ||
      hole.handicap_rank > 18
    ) {
      issues.push("Course handicap ranks must be whole numbers from 1 through 18.");
      continue;
    }

    if (holeNumbers.has(hole.hole_number)) {
      issues.push(`Course hole ${hole.hole_number} is duplicated.`);
    }

    if (ranks.has(hole.handicap_rank)) {
      issues.push(`Course handicap rank ${hole.handicap_rank} is duplicated.`);
    }

    holeNumbers.add(hole.hole_number);
    ranks.add(hole.handicap_rank);
  }

  if (holeNumbers.size !== 18 || ranks.size !== 18) {
    issues.push("Course needs all 18 hole handicap ratings before stroke allocation.");
  }

  for (const holeNumber of playedHoleNumbers) {
    if (!holeNumbers.has(holeNumber)) {
      issues.push(`Played hole ${holeNumber} is missing a handicap rank.`);
    }
  }

  return Array.from(new Set(issues));
}

function validatePlayedHoleNumbers(playedHoleNumbers: number[]) {
  const issues: string[] = [];
  const seen = new Set<number>();

  if (playedHoleNumbers.length === 0) {
    return ["At least one played hole is required for stroke allocation."];
  }

  for (const holeNumber of playedHoleNumbers) {
    if (!usableInteger(holeNumber) || holeNumber < 1 || holeNumber > 18) {
      issues.push("Played holes must be whole numbers from 1 through 18.");
      continue;
    }

    if (seen.has(holeNumber)) {
      issues.push(`Played hole ${holeNumber} is duplicated.`);
    }

    seen.add(holeNumber);
  }

  return Array.from(new Set(issues));
}

function validateSides(
  format: MatchFormat,
  sides: MatchSideStrokeInput[],
) {
  const expectedSides = format === "one_v_one_v_one" ? 3 : 2;
  const issues: string[] = [];
  const sideIds = new Set<string>();
  const sideNumbers = new Set<number>();

  if (sides.length !== expectedSides) {
    issues.push(`${format} requires ${expectedSides} sides for stroke allocation.`);
  }

  for (const side of sides) {
    if (!side.sideId) {
      issues.push("Each match side needs an id.");
    }

    if (sideIds.has(side.sideId)) {
      issues.push(`Match side ${side.sideId} is duplicated.`);
    }

    if (sideNumbers.has(side.sideNumber)) {
      issues.push(`Match side number ${side.sideNumber} is duplicated.`);
    }

    if (
      !usableInteger(side.halfHandicap) ||
      (side.halfHandicap as number) < 0
    ) {
      issues.push(`Side ${side.sideNumber} is missing a valid half-handicap.`);
    }

    sideIds.add(side.sideId);
    sideNumbers.add(side.sideNumber);
  }

  return Array.from(new Set(issues));
}

function holesByDifficulty(
  courseHoles: CourseHoleRating[],
  playedHoleNumbers: number[],
) {
  const played = new Set(playedHoleNumbers);

  return courseHoles
    .filter((hole) => played.has(hole.hole_number))
    .sort((left, right) => {
      if (left.handicap_rank !== right.handicap_rank) {
        return left.handicap_rank - right.handicap_rank;
      }

      return left.hole_number - right.hole_number;
    });
}

export function allocateStrokesToHoles(input: {
  strokeCount: number;
  courseHoles: CourseHoleRating[];
  playedHoleNumbers?: number[];
}) {
  const playedHoleNumbers = input.playedHoleNumbers ?? defaultPlayedHoleNumbers;
  const issues = [
    ...validatePlayedHoleNumbers(playedHoleNumbers),
    ...validateCourseHoles(input.courseHoles, playedHoleNumbers),
  ];

  if (!usableInteger(input.strokeCount) || input.strokeCount < 0) {
    issues.push("Stroke count must be a whole number zero or greater.");
  }

  if (issues.length > 0) {
    return { ok: false as const, allocations: [], issues: Array.from(new Set(issues)) };
  }

  if (input.strokeCount === 0) {
    return { ok: true as const, allocations: [] };
  }

  const orderedHoles = holesByDifficulty(input.courseHoles, playedHoleNumbers);
  const strokesByHole = new Map<number, number>();

  for (let index = 0; index < input.strokeCount; index += 1) {
    const hole = orderedHoles[index % orderedHoles.length];
    strokesByHole.set(hole.hole_number, (strokesByHole.get(hole.hole_number) ?? 0) + 1);
  }

  return {
    ok: true as const,
    allocations: orderedHoles
      .filter((hole) => strokesByHole.has(hole.hole_number))
      .map((hole) => ({
        hole_number: hole.hole_number,
        strokes: strokesByHole.get(hole.hole_number) as number,
      })),
  };
}

function buildPairwiseAllocations(input: {
  receivingSideId: string;
  againstSideId: string;
  strokeCount: number;
  courseHoles: CourseHoleRating[];
  playedHoleNumbers: number[];
}): StrokeAllocation[] {
  const holePlan = allocateStrokesToHoles({
    strokeCount: input.strokeCount,
    courseHoles: input.courseHoles,
    playedHoleNumbers: input.playedHoleNumbers,
  });

  if (!holePlan.ok) {
    return [];
  }

  return holePlan.allocations.map((allocation) => ({
    receiving_side_id: input.receivingSideId,
    against_side_id: input.againstSideId,
    hole_number: allocation.hole_number,
    strokes: allocation.strokes,
  }));
}

export function buildStrokeAllocationPlan(input: {
  format: MatchFormat;
  sides: MatchSideStrokeInput[];
  courseHoles: CourseHoleRating[];
  playedHoleNumbers?: number[];
}): StrokeAllocationPlan {
  const playedHoleNumbers = input.playedHoleNumbers ?? defaultPlayedHoleNumbers;
  const issues = [
    ...validatePlayedHoleNumbers(playedHoleNumbers),
    ...validateCourseHoles(input.courseHoles, playedHoleNumbers),
    ...(input.format === "two_v_two"
      ? []
      : validateSides(input.format, input.sides)),
  ];

  if (issues.length > 0) {
    return {
      ok: false,
      allocations: [],
      issues: Array.from(new Set(issues)),
    };
  }

  if (input.format === "two_v_two") {
    return {
      ok: true,
      allocations: [],
      notes: [
        "2v2 first-version behavior displays player half-handicaps only; official team stroke allocation is not calculated.",
      ],
    };
  }

  if (input.format === "one_v_one") {
    const [left, right] = input.sides;
    const difference = Math.abs((left.halfHandicap as number) - (right.halfHandicap as number));

    if (difference === 0) {
      return { ok: true, allocations: [], notes: [] };
    }

    const receivingSide =
      (left.halfHandicap as number) > (right.halfHandicap as number)
        ? left
        : right;
    const againstSide = receivingSide.sideId === left.sideId ? right : left;

    return {
      ok: true,
      allocations: buildPairwiseAllocations({
        receivingSideId: receivingSide.sideId,
        againstSideId: againstSide.sideId,
        strokeCount: difference,
        courseHoles: input.courseHoles,
        playedHoleNumbers,
      }),
      notes: [],
    };
  }

  const orderedSides = [...input.sides].sort((left, right) => {
    if ((left.halfHandicap as number) !== (right.halfHandicap as number)) {
      return (left.halfHandicap as number) - (right.halfHandicap as number);
    }

    return left.sideNumber - right.sideNumber;
  });
  const [low, middle, high] = orderedSides;
  const pairings = [
    { receivingSide: middle, againstSide: low },
    { receivingSide: high, againstSide: low },
    { receivingSide: high, againstSide: middle },
  ];

  return {
    ok: true,
    allocations: pairings.flatMap(({ receivingSide, againstSide }) =>
      buildPairwiseAllocations({
        receivingSideId: receivingSide.sideId,
        againstSideId: againstSide.sideId,
        strokeCount:
          (receivingSide.halfHandicap as number) -
          (againstSide.halfHandicap as number),
        courseHoles: input.courseHoles,
        playedHoleNumbers,
      }),
    ),
    notes: [],
  };
}

export function buildStrokeAllocationInserts(input: {
  matchId: string;
  allocations: StrokeAllocation[];
}): StrokeAllocationInsert[] {
  return input.allocations.map((allocation) => ({
    match_id: input.matchId,
    ...allocation,
  }));
}
