import {
  attendanceStatuses,
  matchResults,
  type AttendanceStatus,
  type MatchResult,
} from "@/lib/scoring";
import type { AdminIssue, UpdateResult } from "@/lib/admin-season";

export type WeeklyResultUpsert = {
  golfer_id: string;
  attendance_status: AttendanceStatus;
  match_result: MatchResult;
  handicap_snapshot: number | null;
  gross_score: number | null;
  net_score: number | null;
  putts: number | null;
};

export type WeeklyResultCorrection = {
  rows: WeeklyResultUpsert[];
  reason: string;
};

function issue(field: string, message: string): AdminIssue {
  return { field, message };
}

function result<T>(values: T, issues: AdminIssue[]): UpdateResult<T> {
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, values };
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

function optionalNumber(
  field: string,
  label: string,
  value: string,
  options: {
    integer?: boolean;
    min?: number;
  } = {},
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: null, issue: null };
  }

  const parsed = Number(trimmed);

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

function scoreValuesAllowed(status: AttendanceStatus) {
  return status === "played";
}

export function buildWeeklyResultUpsert(input: {
  golfer_id: string;
  attendance_status: string;
  match_result: string;
  handicap_snapshot: string;
  gross_score: string;
  net_score: string;
  putts: string;
}): UpdateResult<WeeklyResultUpsert> {
  const attendance = optionValue(
    "attendance_status",
    "Attendance status",
    input.attendance_status,
    attendanceStatuses,
  );
  const match = optionValue(
    "match_result",
    "Match result",
    input.match_result,
    matchResults,
  );
  const handicap = optionalNumber(
    "handicap_snapshot",
    "Handicap snapshot",
    input.handicap_snapshot,
    { min: 0 },
  );
  const gross = optionalNumber("gross_score", "Gross score", input.gross_score, {
    integer: true,
    min: 1,
  });
  const net = optionalNumber("net_score", "Net score", input.net_score, {
    integer: true,
    min: 1,
  });
  const putts = optionalNumber("putts", "Putts", input.putts, {
    integer: true,
    min: 0,
  });
  const issues = [
    attendance.issue,
    match.issue,
    handicap.issue,
    gross.issue,
    net.issue,
    putts.issue,
  ].filter((item): item is AdminIssue => item !== null);
  const attendanceStatus = attendance.value ?? "unknown";
  const hasScoreValues =
    gross.value !== null || net.value !== null || putts.value !== null;

  if (!scoreValuesAllowed(attendanceStatus) && hasScoreValues) {
    issues.push(
      issue(
        "attendance_status",
        "Gross, net, and putts can only be entered when attendance is played.",
      ),
    );
  }

  return result(
    {
      golfer_id: input.golfer_id,
      attendance_status: attendanceStatus,
      match_result:
        attendanceStatus === "played" || attendanceStatus === "confirmed"
          ? match.value ?? "not_applicable"
          : "not_applicable",
      handicap_snapshot:
        typeof handicap.value === "number" ? handicap.value : null,
      gross_score:
        scoreValuesAllowed(attendanceStatus) && typeof gross.value === "number"
          ? gross.value
          : null,
      net_score:
        scoreValuesAllowed(attendanceStatus) && typeof net.value === "number"
          ? net.value
          : null,
      putts:
        scoreValuesAllowed(attendanceStatus) && typeof putts.value === "number"
          ? putts.value
          : null,
    },
    issues,
  );
}

export function buildWeeklyResultUpserts(
  rows: Array<Parameters<typeof buildWeeklyResultUpsert>[0]>,
): UpdateResult<WeeklyResultUpsert[]> {
  const values: WeeklyResultUpsert[] = [];
  const issues: AdminIssue[] = [];
  const golferIds = new Set<string>();

  for (const row of rows) {
    if (golferIds.has(row.golfer_id)) {
      issues.push(issue("golfer_id", `Golfer ${row.golfer_id} is duplicated.`));
    }

    golferIds.add(row.golfer_id);
    const built = buildWeeklyResultUpsert(row);

    if (built.ok) {
      values.push(built.values);
    } else {
      issues.push(...built.issues);
    }
  }

  return result(values, issues);
}

export function buildWeeklyResultCorrection(input: {
  rows: Array<Parameters<typeof buildWeeklyResultUpsert>[0]>;
  reason: string;
}): UpdateResult<WeeklyResultCorrection> {
  const rows = buildWeeklyResultUpserts(input.rows);
  const reason = input.reason.trim();
  const issues = rows.ok ? [] : [...rows.issues];

  if (!reason) {
    issues.push(
      issue("reason", "A correction reason is required for locked weeks."),
    );
  }

  return result(
    {
      rows: rows.ok ? rows.values : [],
      reason,
    },
    issues,
  );
}
