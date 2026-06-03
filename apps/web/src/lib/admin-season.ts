export const seasonStatusOptions = ["draft", "active", "finalized"] as const;
export const weekStatusOptions = [
  "planned",
  "open",
  "matchups_published",
  "completed",
  "locked",
  "canceled",
] as const;

const placeholderValues = new Set(["-", "n/a", "na", "unk"]);

export type AdminIssue = {
  field: string;
  message: string;
};

export type UpdateResult<T> =
  | {
      ok: true;
      values: T;
    }
  | {
      ok: false;
      issues: AdminIssue[];
    };

export type SeasonUpdate = {
  name: string;
  status: (typeof seasonStatusOptions)[number];
  ends_on: string | null;
};

export type SeasonCreate = SeasonUpdate & {
  year: number;
  starts_on: string;
  weekly_play_day: number;
  drop_lowest_week_count: number;
};

export type SeasonGolferUpdate = {
  current_handicap: number | null;
};

export type GolferUpdate = {
  active: boolean;
};

export type GolferCreate = GolferUpdate & {
  display_name: string;
  current_handicap: number | null;
};

export type CourseUpdate = {
  name: string;
  booking_url: string | null;
  active: boolean;
};

export type CourseHoleUpdate = {
  hole_number: number;
  par: number | null;
  handicap_rank: number;
};

export type WeeklyEventUpdate = {
  course_id: string | null;
  status: (typeof weekStatusOptions)[number];
};

export type WeeklyEventCreate = WeeklyEventUpdate & {
  week_code: string;
  play_date: string;
};

export type TeeTimeUpdate = {
  starts_at: string;
};

function issue(field: string, message: string): AdminIssue {
  return { field, message };
}

function isPlaceholder(value: string) {
  return placeholderValues.has(value.trim().toLowerCase());
}

function cleanRequiredText(field: string, label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed || isPlaceholder(trimmed)) {
    return {
      value: null,
      issue: issue(field, `${label} needs a real value.`),
    };
  }

  return { value: trimmed, issue: null };
}

function cleanOptionalText(field: string, label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: null, issue: null };
  }

  if (isPlaceholder(trimmed)) {
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
    return {
      value: null,
      issue: issue(field, `${label} must use YYYY-MM-DD.`),
    };
  }

  return cleaned;
}

function cleanRequiredDate(field: string, label: string, value: string) {
  const cleaned = cleanRequiredText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return cleaned;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned.value)) {
    return {
      value: null,
      issue: issue(field, `${label} must use YYYY-MM-DD.`),
    };
  }

  return cleaned;
}

function cleanOptionalUrl(field: string, label: string, value: string) {
  const cleaned = cleanOptionalText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return cleaned;
  }

  try {
    const url = new URL(cleaned.value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported protocol");
    }

    return { value: url.toString(), issue: null };
  } catch {
    return {
      value: null,
      issue: issue(field, `${label} must be a valid http(s) URL or blank.`),
    };
  }
}

function cleanOptionalNumber(field: string, label: string, value: string) {
  const cleaned = cleanOptionalText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return cleaned;
  }

  const parsed = Number(cleaned.value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      value: null,
      issue: issue(field, `${label} must be zero or greater, or blank.`),
    };
  }

  return { value: Math.round(parsed * 10) / 10, issue: null };
}

function cleanRequiredInteger(
  field: string,
  label: string,
  value: string,
  options: {
    min?: number;
    max?: number;
  } = {},
) {
  const cleaned = cleanRequiredText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return { value: null, issue: cleaned.issue };
  }

  const parsed = Number(cleaned.value);

  if (!Number.isInteger(parsed)) {
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

  if (typeof options.max === "number" && parsed > options.max) {
    return {
      value: null,
      issue: issue(field, `${label} must be no more than ${options.max}.`),
    };
  }

  return { value: parsed, issue: null };
}

function cleanOptionalInteger(
  field: string,
  label: string,
  value: string,
  options: {
    min?: number;
    max?: number;
  } = {},
) {
  const cleaned = cleanOptionalText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return { value: null, issue: cleaned.issue };
  }

  const parsed = Number(cleaned.value);

  if (!Number.isInteger(parsed)) {
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

  if (typeof options.max === "number" && parsed > options.max) {
    return {
      value: null,
      issue: issue(field, `${label} must be no more than ${options.max}.`),
    };
  }

  return { value: parsed, issue: null };
}

function cleanRequiredTime(field: string, label: string, value: string) {
  const cleaned = cleanRequiredText(field, label, value);

  if (cleaned.issue || !cleaned.value) {
    return cleaned;
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(cleaned.value)) {
    return {
      value: null,
      issue: issue(field, `${label} must use HH:MM.`),
    };
  }

  return { value: cleaned.value.slice(0, 5), issue: null };
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

function result<T>(values: T, issues: AdminIssue[]): UpdateResult<T> {
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, values };
}

export function buildSeasonUpdate(input: {
  name: string;
  status: string;
  ends_on: string;
}): UpdateResult<SeasonUpdate> {
  const name = cleanRequiredText("name", "Season name", input.name);
  const status = optionValue(
    "status",
    "Season status",
    input.status,
    seasonStatusOptions,
  );
  const endsOn = cleanOptionalDate("ends_on", "Season end date", input.ends_on);
  const issues = [name.issue, status.issue, endsOn.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result(
    {
      name: name.value ?? "",
      status: status.value ?? "draft",
      ends_on: endsOn.value,
    },
    issues,
  );
}

export function buildSeasonCreate(input: {
  name: string;
  year: string;
  starts_on: string;
  ends_on: string;
  status: string;
  weekly_play_day?: string;
  drop_lowest_week_count?: string;
}): UpdateResult<SeasonCreate> {
  const base = buildSeasonUpdate({
    name: input.name,
    status: input.status,
    ends_on: input.ends_on,
  });
  const year = cleanRequiredInteger("year", "Season year", input.year, {
    min: 200_0,
  });
  const startsOn = cleanRequiredDate(
    "starts_on",
    "Season start date",
    input.starts_on,
  );
  const weeklyPlayDay = cleanRequiredInteger(
    "weekly_play_day",
    "Weekly play day",
    input.weekly_play_day ?? "2",
    { min: 1, max: 7 },
  );
  const dropLowestWeekCount = cleanRequiredInteger(
    "drop_lowest_week_count",
    "Drop week count",
    input.drop_lowest_week_count ?? "2",
    { min: 0 },
  );
  const issues = [
    ...(base.ok ? [] : base.issues),
    year.issue,
    startsOn.issue,
    weeklyPlayDay.issue,
    dropLowestWeekCount.issue,
  ].filter((item): item is AdminIssue => item !== null);

  return result(
    {
      name: base.ok ? base.values.name : "",
      year: year.value ?? 0,
      starts_on: startsOn.value ?? "",
      ends_on: base.ok ? base.values.ends_on : null,
      status: base.ok ? base.values.status : "draft",
      weekly_play_day: weeklyPlayDay.value ?? 2,
      drop_lowest_week_count: dropLowestWeekCount.value ?? 2,
    },
    issues,
  );
}

export function buildGolferUpdates(input: {
  active: boolean;
  current_handicap: string;
}): UpdateResult<{
  golfer: GolferUpdate;
  seasonGolfer: SeasonGolferUpdate;
}> {
  const handicap = cleanOptionalNumber(
    "current_handicap",
    "Current handicap",
    input.current_handicap,
  );
  const issues = [handicap.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result(
    {
      golfer: { active: input.active },
      seasonGolfer: {
        current_handicap:
          typeof handicap.value === "number" ? handicap.value : null,
      },
    },
    issues,
  );
}

export function buildGolferCreate(input: {
  display_name: string;
  active: boolean;
  current_handicap: string;
}): UpdateResult<GolferCreate> {
  const displayName = cleanRequiredText(
    "display_name",
    "Golfer name",
    input.display_name,
  );
  const updates = buildGolferUpdates({
    active: input.active,
    current_handicap: input.current_handicap,
  });
  const issues = [
    displayName.issue,
    ...(updates.ok ? [] : updates.issues),
  ].filter((item): item is AdminIssue => item !== null);

  return result(
    {
      display_name: displayName.value ?? "",
      active: updates.ok ? updates.values.golfer.active : input.active,
      current_handicap: updates.ok
        ? updates.values.seasonGolfer.current_handicap
        : null,
    },
    issues,
  );
}

export function buildCourseUpdate(input: {
  name: string;
  booking_url: string;
  active: boolean;
}): UpdateResult<CourseUpdate> {
  const name = cleanRequiredText("name", "Course name", input.name);
  const bookingUrl = cleanOptionalUrl(
    "booking_url",
    "Booking URL",
    input.booking_url,
  );
  const issues = [name.issue, bookingUrl.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result(
    {
      name: name.value ?? "",
      booking_url: bookingUrl.value,
      active: input.active,
    },
    issues,
  );
}

export function buildCourseHoleUpdates(input: Array<{
  hole_number: number;
  par: string;
  handicap_rank: string;
}>): UpdateResult<CourseHoleUpdate[]> {
  const issues: AdminIssue[] = [];
  const updates: CourseHoleUpdate[] = [];
  const rankCounts = new Map<number, number>();
  const holeNumbers = new Set<number>();

  for (const row of input) {
    const holeField = `hole_${row.hole_number}`;
    const holeNumber =
      Number.isInteger(row.hole_number) &&
      row.hole_number >= 1 &&
      row.hole_number <= 18
        ? row.hole_number
        : null;

    if (holeNumber === null) {
      issues.push(issue(holeField, "Hole number must be between 1 and 18."));
      continue;
    }

    if (holeNumbers.has(holeNumber)) {
      issues.push(issue(holeField, `Hole ${holeNumber} is duplicated.`));
    }

    holeNumbers.add(holeNumber);

    const par = cleanOptionalInteger(
      `${holeField}_par`,
      `Hole ${holeNumber} par`,
      row.par,
      { min: 3, max: 6 },
    );
    const rank = cleanRequiredInteger(
      `${holeField}_handicap_rank`,
      `Hole ${holeNumber} handicap rank`,
      row.handicap_rank,
      { min: 1, max: 18 },
    );

    if (par.issue) {
      issues.push(par.issue);
    }

    if (rank.issue) {
      issues.push(rank.issue);
    }

    if (typeof rank.value === "number") {
      rankCounts.set(rank.value, (rankCounts.get(rank.value) ?? 0) + 1);
    }

    updates.push({
      hole_number: holeNumber,
      par: par.value,
      handicap_rank: rank.value ?? 0,
    });
  }

  for (const rank of Array.from(rankCounts.keys()).sort((a, b) => a - b)) {
    if ((rankCounts.get(rank) ?? 0) > 1) {
      issues.push(
        issue("handicap_rank", `Handicap rank ${rank} can only be used once.`),
      );
    }
  }

  if (input.length !== 18 || holeNumbers.size !== 18) {
    issues.push(issue("course_holes", "Enter hole data for all 18 holes."));
  }

  for (let rank = 1; rank <= 18; rank += 1) {
    if (!rankCounts.has(rank)) {
      issues.push(
        issue("handicap_rank", `Handicap rank ${rank} is required.`),
      );
    }
  }

  return result(updates, issues);
}

export function buildWeeklyEventUpdate(input: {
  course_id: string;
  status: string;
}): UpdateResult<WeeklyEventUpdate> {
  const courseId = cleanOptionalText("course_id", "Course", input.course_id);
  const status = optionValue(
    "status",
    "Week status",
    input.status,
    weekStatusOptions,
  );
  const issues = [courseId.issue, status.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result(
    {
      course_id: courseId.value,
      status: status.value ?? "planned",
    },
    issues,
  );
}

export function buildWeeklyEventCreate(input: {
  week_code: string;
  play_date: string;
  course_id: string;
  status: string;
}): UpdateResult<WeeklyEventCreate> {
  const weekCode = cleanRequiredText("week_code", "Week code", input.week_code);
  const playDate = cleanRequiredDate(
    "play_date",
    "Play date",
    input.play_date,
  );
  const update = buildWeeklyEventUpdate({
    course_id: input.course_id,
    status: input.status,
  });
  const issues = [
    weekCode.issue,
    playDate.issue,
    ...(update.ok ? [] : update.issues),
  ].filter((item): item is AdminIssue => item !== null);

  return result(
    {
      week_code: weekCode.value ?? "",
      play_date: playDate.value ?? "",
      course_id: update.ok ? update.values.course_id : null,
      status: update.ok ? update.values.status : "planned",
    },
    issues,
  );
}

export function buildTeeTimeUpdate(input: {
  starts_at: string;
}): UpdateResult<TeeTimeUpdate> {
  const startsAt = cleanRequiredTime("starts_at", "Tee time", input.starts_at);
  const issues = [startsAt.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result({ starts_at: startsAt.value ?? "" }, issues);
}
