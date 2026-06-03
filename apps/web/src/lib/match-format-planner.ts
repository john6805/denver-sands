import type { AttendanceStatus } from "@/lib/scoring";
import type { MatchFormat } from "@/lib/stroke-allocation";

export type MatchFormatPlanInput = {
  golfers: Array<{
    golferId: string;
    status: AttendanceStatus;
  }>;
  teeTimeCount?: number;
};

export type PlannedMatchFormat = {
  format: MatchFormat;
  golferCount: number;
};

export type MatchFormatPlan =
  | {
      ok: true;
      eligibleGolferIds: string[];
      formats: PlannedMatchFormat[];
      warnings: string[];
    }
  | {
      ok: false;
      eligibleGolferIds: string[];
      formats: [];
      error: string;
    };

const generationEligibleStatuses = new Set<AttendanceStatus>([
  "confirmed",
  "played",
]);

const fixedFormatMixes = new Map<number, MatchFormat[]>([
  [2, ["one_v_one"]],
  [3, ["one_v_one_v_one"]],
  [4, ["two_v_two"]],
  [5, ["one_v_one_v_one", "one_v_one"]],
  [6, ["two_v_two", "one_v_one"]],
  [7, ["two_v_two", "one_v_one_v_one"]],
  [8, ["two_v_two", "two_v_two"]],
  [9, ["one_v_one_v_one", "one_v_one_v_one", "one_v_one_v_one"]],
  [10, ["two_v_two", "two_v_two", "one_v_one"]],
]);

function golferCountForFormat(format: MatchFormat) {
  switch (format) {
    case "two_v_two":
      return 4;
    case "one_v_one_v_one":
      return 3;
    case "one_v_one":
      return 2;
  }
}

function formatMixToPlan(formats: MatchFormat[]) {
  return formats.map((format) => ({
    format,
    golferCount: golferCountForFormat(format),
  }));
}

function eligibleGolferIds(golfers: MatchFormatPlanInput["golfers"]) {
  return golfers
    .filter((golfer) => generationEligibleStatuses.has(golfer.status))
    .map((golfer) => golfer.golferId);
}

function candidateScore(formats: MatchFormat[]) {
  const twoVTwoCount = formats.filter((format) => format === "two_v_two").length;
  const oneVOneCount = formats.filter((format) => format === "one_v_one").length;
  const groupCount = formats.length;

  return {
    twoVTwoCount,
    oneVOneCount,
    groupCount,
  };
}

function compareCandidates(left: MatchFormat[], right: MatchFormat[]) {
  const leftScore = candidateScore(left);
  const rightScore = candidateScore(right);

  if (leftScore.twoVTwoCount !== rightScore.twoVTwoCount) {
    return rightScore.twoVTwoCount - leftScore.twoVTwoCount;
  }

  if (leftScore.oneVOneCount !== rightScore.oneVOneCount) {
    return leftScore.oneVOneCount - rightScore.oneVOneCount;
  }

  return leftScore.groupCount - rightScore.groupCount;
}

function planLargeFormatMix(golferCount: number, teeTimeCount?: number) {
  const candidates: MatchFormat[][] = [];

  for (let twoVTwo = 0; twoVTwo <= Math.floor(golferCount / 4); twoVTwo += 1) {
    for (
      let oneVOneVOne = 0;
      oneVOneVOne <= Math.floor(golferCount / 3);
      oneVOneVOne += 1
    ) {
      for (let oneVOne = 0; oneVOne <= Math.floor(golferCount / 2); oneVOne += 1) {
        const totalGolfers = twoVTwo * 4 + oneVOneVOne * 3 + oneVOne * 2;
        const totalGroups = twoVTwo + oneVOneVOne + oneVOne;

        if (totalGolfers !== golferCount) {
          continue;
        }

        if (typeof teeTimeCount === "number" && totalGroups > teeTimeCount) {
          continue;
        }

        candidates.push([
          ...Array.from<MatchFormat>({ length: twoVTwo }).fill("two_v_two"),
          ...Array.from<MatchFormat>({ length: oneVOneVOne }).fill(
            "one_v_one_v_one",
          ),
          ...Array.from<MatchFormat>({ length: oneVOne }).fill("one_v_one"),
        ]);
      }
    }
  }

  return candidates.sort(compareCandidates)[0] ?? null;
}

export function shouldIncludeGolferForGeneration(status: AttendanceStatus) {
  return generationEligibleStatuses.has(status);
}

export function buildMatchFormatPlan(input: MatchFormatPlanInput): MatchFormatPlan {
  const eligibleIds = eligibleGolferIds(input.golfers);
  const golferCount = eligibleIds.length;

  if (golferCount < 2) {
    return {
      ok: false,
      eligibleGolferIds: eligibleIds,
      formats: [],
      error: "At least 2 confirmed golfers are required to generate matches.",
    };
  }

  const fixedMix = fixedFormatMixes.get(golferCount);

  if (fixedMix) {
    const warnings =
      typeof input.teeTimeCount === "number" && fixedMix.length > input.teeTimeCount
        ? [
            `Recommended format mix needs ${fixedMix.length} tee times, but only ${input.teeTimeCount} are available.`,
          ]
        : [];

    return {
      ok: true,
      eligibleGolferIds: eligibleIds,
      formats: formatMixToPlan(fixedMix),
      warnings,
    };
  }

  const largeMix = planLargeFormatMix(golferCount, input.teeTimeCount);

  if (!largeMix) {
    return {
      ok: false,
      eligibleGolferIds: eligibleIds,
      formats: [],
      error: `No match format mix fits ${golferCount} golfers with the available tee-time capacity.`,
    };
  }

  return {
    ok: true,
    eligibleGolferIds: eligibleIds,
    formats: formatMixToPlan(largeMix),
    warnings: [],
  };
}
