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

export type SeasonGolferUpdate = {
  current_handicap: number | null;
};

export type GolferUpdate = {
  active: boolean;
};

export type CourseUpdate = {
  name: string;
  booking_url: string | null;
  active: boolean;
};

export type WeeklyEventUpdate = {
  course_id: string | null;
  status: (typeof weekStatusOptions)[number];
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

export function buildTeeTimeUpdate(input: {
  starts_at: string;
}): UpdateResult<TeeTimeUpdate> {
  const startsAt = cleanRequiredTime("starts_at", "Tee time", input.starts_at);
  const issues = [startsAt.issue].filter(
    (item): item is AdminIssue => item !== null,
  );

  return result({ starts_at: startsAt.value ?? "" }, issues);
}
