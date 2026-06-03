"use client";

import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  LandPlot,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import {
  buildCourseHoleUpdates,
  buildCourseUpdate,
  buildGolferCreate,
  buildGolferUpdates,
  buildSeasonCreate,
  buildSeasonUpdate,
  buildWeeklyEventCreate,
  buildTeeTimeUpdate,
  buildWeeklyEventUpdate,
  seasonStatusOptions,
  weekStatusOptions,
  type AdminIssue,
} from "@/lib/admin-season";
import {
  createCourse,
  createRosterGolfer,
  createSeason,
  createTeeTime,
  createWeeklyEvent,
  deleteTeeTime,
  getAdminData,
  updateCourse,
  updateCourseHoles,
  updateRosterGolfer,
  updateSeason,
  updateTeeTime,
  updateWeeklyEvent,
} from "@/app/actions/admin-season";
import { Button } from "@/components/ui/button";
import { useActionData } from "@/lib/use-action-data";
import type {
  AdminData,
  Course,
  CourseHole,
  Golfer,
  SaveResponse,
  Season,
  SeasonGolfer,
  TeeTime,
  WeeklyEvent,
} from "@/lib/data/league-data";

type SaveAction = () => PromiseLike<SaveResponse>;

function issueText(issues: AdminIssue[]) {
  return issues.map((item) => item.message).join(" ");
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function AdminSeasonSetup() {
  const { data, loading, error, reload } = useActionData<AdminData>(getAdminData);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(
    key: string,
    action: SaveAction,
  ) {
    setSaving(key);
    setMessage(null);

    const response = await action();

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Saved. Refreshing setup data.");
      await reload();
    }

    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading season setup
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-dashed p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-1 size-5 text-destructive"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-2xl font-semibold">Season Setup Admin</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {error ?? "Seed or create a season before editing setup data."}
              </p>
            </div>
          </div>
        </section>
        <NewSeasonSection saving={saving} onSave={save} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Season Setup
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Verify seeded season details, roster handicaps, course readiness,
            weekly schedule, and tee times before scoring work begins.
          </p>
        </div>
        {message ? (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {message}
          </div>
        ) : null}
      </header>

      <SeasonSection
        season={data.season}
        saving={saving}
        onSave={save}
      />
      <RosterSection
        season={data.season}
        golfers={data.golfers}
        seasonGolfers={data.seasonGolfers}
        saving={saving}
        onSave={save}
      />
      <CoursesSection
        courses={data.courses}
        courseHoles={data.courseHoles}
        saving={saving}
        onSave={save}
      />
      <ScheduleSection
        season={data.season}
        courses={data.courses}
        weeklyEvents={data.weeklyEvents}
        teeTimes={data.teeTimes}
        saving={saving}
        onSave={save}
      />
    </div>
  );
}

function FieldError({ issues }: { issues: AdminIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return <p className="text-xs text-destructive">{issueText(issues)}</p>;
}

function inputClassName() {
  return "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs";
}

function selectClassName() {
  return "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs";
}

function currentYearInput() {
  return new Date().getFullYear().toString();
}

function currentDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function NewSeasonSection({
  saving,
  onSave,
}: {
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(currentYearInput);
  const [startsOn, setStartsOn] = useState(currentDateInput);
  const [endsOn, setEndsOn] = useState("");
  const [status, setStatus] = useState("draft");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const create = buildSeasonCreate({
      name,
      year,
      starts_on: startsOn,
      ends_on: endsOn,
      status,
    });

    if (!create.ok) {
      setIssues(create.issues);
      return;
    }

    setIssues([]);
    await onSave("new-season", () => createSeason(create.values));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Create Season</h2>
      </div>
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.4fr_0.6fr_1fr_1fr_1fr_auto] md:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={inputClassName()}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Year</span>
          <input
            className={inputClassName()}
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Start date</span>
          <input
            className={inputClassName()}
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">End date</span>
          <input
            className={inputClassName()}
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            className={selectClassName()}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {seasonStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={saving === "new-season"}>
          <Plus aria-hidden="true" />
          Create
        </Button>
        <div className="md:col-span-6">
          <FieldError issues={issues} />
        </div>
      </div>
    </section>
  );
}

function SeasonSection({
  season,
  saving,
  onSave,
}: {
  season: Season;
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const [name, setName] = useState(season.name);
  const [status, setStatus] = useState(season.status);
  const [endsOn, setEndsOn] = useState(season.ends_on ?? "");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const update = buildSeasonUpdate({ name, status, ends_on: endsOn });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave("season", () => updateSeason(season.id, update.values));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Season Details</h2>
      </div>
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={inputClassName()}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            className={selectClassName()}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {seasonStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">End date</span>
          <input
            className={inputClassName()}
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
        <Button onClick={submit} disabled={saving === "season"}>
          <Save aria-hidden="true" />
          Save
        </Button>
        <div className="md:col-span-4">
          <FieldError issues={issues} />
          <p className="text-xs text-muted-foreground">
            Starts {season.starts_on}; end date may stay blank until the season
            is finalized.
          </p>
        </div>
      </div>
    </section>
  );
}

function RosterSection({
  season,
  golfers,
  seasonGolfers,
  saving,
  onSave,
}: {
  season: Season;
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const roster = golfers
    .map((golfer) => ({
      golfer,
      seasonGolfer: seasonGolfers.find((item) => item.golfer_id === golfer.id),
    }))
    .filter((row) => row.seasonGolfer);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Golfer Roster</h2>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Golfer</th>
              <th className="px-3 py-2 font-medium">Current handicap</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <NewRosterRow
              season={season}
              saving={saving}
              onSave={onSave}
            />
            {roster.map(({ golfer, seasonGolfer }) => (
              <RosterRow
                key={golfer.id}
                golfer={golfer}
                seasonGolfer={seasonGolfer as SeasonGolfer}
                saving={saving}
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NewRosterRow({
  season,
  saving,
  onSave,
}: {
  season: Season;
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [active, setActive] = useState(true);
  const [handicap, setHandicap] = useState("");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const create = buildGolferCreate({
      display_name: displayName,
      active,
      current_handicap: handicap,
    });

    if (!create.ok) {
      setIssues(create.issues);
      return;
    }

    setIssues([]);
    await onSave("new-roster", () => createRosterGolfer(season, create.values));

    setDisplayName("");
    setHandicap("");
    setActive(true);
  }

  return (
    <tr className="border-t bg-muted/30 align-top">
      <td className="px-3 py-2">
        <input
          className={inputClassName()}
          placeholder="New golfer"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={inputClassName()}
          inputMode="decimal"
          placeholder="Handicap"
          value={handicap}
          onChange={(event) => setHandicap(event.target.value)}
        />
        <FieldError issues={issues} />
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === "new-roster"}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </td>
    </tr>
  );
}

function RosterRow({
  golfer,
  seasonGolfer,
  saving,
  onSave,
}: {
  golfer: Golfer;
  seasonGolfer: SeasonGolfer;
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const key = `roster-${golfer.id}`;
  const [active, setActive] = useState(golfer.active);
  const [handicap, setHandicap] = useState(
    seasonGolfer.current_handicap?.toString() ?? "",
  );
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const update = buildGolferUpdates({
      active,
      current_handicap: handicap,
    });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(key, () =>
      updateRosterGolfer(golfer.id, seasonGolfer.id, update.values),
    );
  }

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2 font-medium">{golfer.display_name}</td>
      <td className="px-3 py-2">
        <input
          className={inputClassName()}
          inputMode="decimal"
          value={handicap}
          onChange={(event) => setHandicap(event.target.value)}
        />
        <FieldError issues={issues} />
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === key}
        >
          <Save aria-hidden="true" />
          Save
        </Button>
      </td>
    </tr>
  );
}

function CoursesSection({
  courses,
  courseHoles,
  saving,
  onSave,
}: {
  courses: Course[];
  courseHoles: CourseHole[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <LandPlot className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Courses</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <NewCourseRow saving={saving} onSave={onSave} />
        {courses.map((course) => (
          <CourseRow
            key={course.id}
            course={course}
            courseHoles={courseHoles.filter((hole) => hole.course_id === course.id)}
            saving={saving}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function NewCourseRow({
  saving,
  onSave,
}: {
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [active, setActive] = useState(true);
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const create = buildCourseUpdate({
      name,
      booking_url: bookingUrl,
      active,
    });

    if (!create.ok) {
      setIssues(create.issues);
      return;
    }

    setIssues([]);
    await onSave("new-course", () => createCourse(create.values));
    setName("");
    setBookingUrl("");
    setActive(true);
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <span className="rounded-full bg-muted px-2 py-1 text-xs">
        New course
      </span>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Course name</span>
        <input
          className={inputClassName()}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Booking URL</span>
        <input
          className={inputClassName()}
          value={bookingUrl}
          onChange={(event) => setBookingUrl(event.target.value)}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === "new-course"}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      <FieldError issues={issues} />
    </div>
  );
}

function CourseRow({
  course,
  courseHoles,
  saving,
  onSave,
}: {
  course: Course;
  courseHoles: CourseHole[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const key = `course-${course.id}`;
  const [name, setName] = useState(course.name);
  const [bookingUrl, setBookingUrl] = useState(course.booking_url ?? "");
  const [active, setActive] = useState(course.active);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const readiness = courseReadiness(courseHoles);

  async function submit() {
    const update = buildCourseUpdate({
      name,
      booking_url: bookingUrl,
      active,
    });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(key, () => updateCourse(course.id, update.values));
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={
            readiness.ready
              ? "rounded-full bg-muted px-2 py-1 text-xs"
              : "rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
          }
        >
          {readiness.label}
        </span>
        {course.booking_url ? (
          <a
            className="inline-flex items-center gap-1 text-xs underline"
            href={course.booking_url}
            target="_blank"
            rel="noreferrer"
          >
            Booking
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Course name</span>
        <input
          className={inputClassName()}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Booking URL</span>
        <input
          className={inputClassName()}
          value={bookingUrl}
          onChange={(event) => setBookingUrl(event.target.value)}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === key}
        >
          <Save aria-hidden="true" />
          Save
        </Button>
      </div>
      <FieldError issues={issues} />
      <CourseHoleEditor
        course={course}
        courseHoles={courseHoles}
        saving={saving}
        onSave={onSave}
      />
    </div>
  );
}

function courseReadiness(courseHoles: CourseHole[]) {
  const holes = new Set(courseHoles.map((hole) => hole.hole_number));
  const ranks = new Set(courseHoles.map((hole) => hole.handicap_rank));
  const ready = holes.size === 18 && ranks.size === 18;

  return {
    ready,
    label: ready
      ? "Stroke allocation ready"
      : `${holes.size}/18 holes and ${ranks.size}/18 ranks entered`,
  };
}

export function CourseHoleEditor({
  course,
  courseHoles,
  saving,
  onSave,
}: {
  course: Course;
  courseHoles: CourseHole[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const key = `course-holes-${course.id}`;
  const holeMap = new Map(
    courseHoles.map((hole) => [hole.hole_number, hole]),
  );
  const [rows, setRows] = useState(() =>
    Array.from({ length: 18 }, (_, index) => {
      const holeNumber = index + 1;
      const hole = holeMap.get(holeNumber);

      return {
        hole_number: holeNumber,
        par: hole?.par?.toString() ?? "",
        handicap_rank: hole?.handicap_rank?.toString() ?? "",
      };
    }),
  );
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  function updateRow(
    holeNumber: number,
    field: "par" | "handicap_rank",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.hole_number === holeNumber ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function submit() {
    const update = buildCourseHoleUpdates(rows);

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(key, () => updateCourseHoles(course.id, update.values));
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Hole handicap ratings</h3>
          <p className="text-xs text-muted-foreground">
            Handicap ranks 1-18 are required before match generation can use
            this course.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={saving === key}
        >
          <Save aria-hidden="true" />
          Save holes
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {rows.map((row) => (
          <div
            key={row.hole_number}
            className="grid grid-cols-[auto_1fr_1fr] items-center gap-1 rounded-md border p-2 text-xs"
          >
            <span className="font-semibold">#{row.hole_number}</span>
            <label className="space-y-1">
              <span className="sr-only">Hole {row.hole_number} par</span>
              <input
                className="h-8 w-full rounded-md border bg-background px-2"
                inputMode="numeric"
                placeholder="Par"
                value={row.par}
                onChange={(event) =>
                  updateRow(row.hole_number, "par", event.target.value)
                }
              />
            </label>
            <label className="space-y-1">
              <span className="sr-only">
                Hole {row.hole_number} handicap rank
              </span>
              <input
                className="h-8 w-full rounded-md border bg-background px-2"
                inputMode="numeric"
                placeholder="Rank"
                value={row.handicap_rank}
                onChange={(event) =>
                  updateRow(row.hole_number, "handicap_rank", event.target.value)
                }
              />
            </label>
          </div>
        ))}
      </div>
      <FieldError issues={issues} />
    </div>
  );
}

function ScheduleSection({
  season,
  courses,
  weeklyEvents,
  teeTimes,
  saving,
  onSave,
}: {
  season: Season;
  courses: Course[];
  weeklyEvents: WeeklyEvent[];
  teeTimes: TeeTime[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Weekly Schedule And Tee Times</h2>
      </div>
      <div className="space-y-3">
        <NewScheduleRow
          season={season}
          courses={courses}
          saving={saving}
          onSave={onSave}
        />
        {weeklyEvents.map((event) => (
          <ScheduleRow
            key={event.id}
            event={event}
            courses={courses}
            teeTimes={teeTimes.filter((time) => time.weekly_event_id === event.id)}
            saving={saving}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function NewScheduleRow({
  season,
  courses,
  saving,
  onSave,
}: {
  season: Season;
  courses: Course[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const [weekCode, setWeekCode] = useState("");
  const [playDate, setPlayDate] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState("planned");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const create = buildWeeklyEventCreate({
      week_code: weekCode,
      play_date: playDate,
      course_id: courseId,
      status,
    });

    if (!create.ok) {
      setIssues(create.issues);
      return;
    }

    setIssues([]);
    await onSave("new-week", () =>
      createWeeklyEvent(season.id, create.values),
    );
    setWeekCode("");
    setPlayDate("");
    setCourseId("");
    setStatus("planned");
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="grid gap-3 lg:grid-cols-[0.7fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Week code</span>
          <input
            className={inputClassName()}
            placeholder="W22"
            value={weekCode}
            onChange={(event) => setWeekCode(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Play date</span>
          <input
            className={inputClassName()}
            type="date"
            value={playDate}
            onChange={(event) => setPlayDate(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Course</span>
          <select
            className={selectClassName()}
            value={courseId}
            onChange={(item) => setCourseId(item.target.value)}
          >
            <option value="">No course yet</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Week status</span>
          <select
            className={selectClassName()}
            value={status}
            onChange={(item) => setStatus(item.target.value)}
          >
            {weekStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={saving === "new-week"}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="mt-2">
        <FieldError issues={issues} />
      </div>
    </div>
  );
}

function ScheduleRow({
  event,
  courses,
  teeTimes,
  saving,
  onSave,
}: {
  event: WeeklyEvent;
  courses: Course[];
  teeTimes: TeeTime[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const key = `event-${event.id}`;
  const [courseId, setCourseId] = useState(event.course_id ?? "");
  const [status, setStatus] = useState(event.status);
  const [newTime, setNewTime] = useState("");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const update = buildWeeklyEventUpdate({
      course_id: courseId,
      status,
    });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(key, () => updateWeeklyEvent(event.id, update.values));
  }

  async function addTeeTime() {
    const update = buildTeeTimeUpdate({ starts_at: newTime });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(`new-time-${event.id}`, () =>
      createTeeTime(event.id, teeTimes.length + 1, update.values),
    );
    setNewTime("");
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="grid gap-3 lg:grid-cols-[0.7fr_1fr_1fr_auto] lg:items-end">
        <div>
          <p className="font-semibold">{event.week_code}</p>
          <p className="text-sm text-muted-foreground">{event.play_date}</p>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Course</span>
          <select
            className={selectClassName()}
            value={courseId}
            onChange={(item) => setCourseId(item.target.value)}
          >
            <option value="">No course yet</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Week status</span>
          <select
            className={selectClassName()}
            value={status}
            onChange={(item) => setStatus(item.target.value)}
          >
            {weekStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={saving === key}>
          <Save aria-hidden="true" />
          Save
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {teeTimes.length === 0 ? (
          <span className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground">
            No tee times scheduled
          </span>
        ) : null}
        {teeTimes.map((teeTime) => (
          <TeeTimePill
            key={teeTime.id}
            teeTime={teeTime}
            saving={saving}
            onSave={onSave}
          />
        ))}
      </div>
      <div className="mt-3 flex max-w-sm gap-2">
        <input
          className={inputClassName()}
          type="time"
          value={newTime}
          onChange={(event) => setNewTime(event.target.value)}
          aria-label={`New tee time for ${event.week_code}`}
        />
        <Button
          variant="outline"
          onClick={addTeeTime}
          disabled={saving === `new-time-${event.id}`}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="mt-2">
        <FieldError issues={issues} />
      </div>
    </div>
  );
}

function TeeTimePill({
  teeTime,
  saving,
  onSave,
}: {
  teeTime: TeeTime;
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const key = `tee-time-${teeTime.id}`;
  const [startsAt, setStartsAt] = useState(formatTime(teeTime.starts_at));

  async function submit() {
    const update = buildTeeTimeUpdate({ starts_at: startsAt });

    if (!update.ok) {
      return;
    }

    await onSave(key, () =>
      updateTeeTime(teeTime.id, update.values),
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
      <input
        className="w-24 bg-transparent text-sm"
        type="time"
        value={startsAt}
        onChange={(event) => setStartsAt(event.target.value)}
        onBlur={submit}
      />
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Delete tee time"
        disabled={saving === key}
        onClick={() =>
          onSave(key, () => deleteTeeTime(teeTime.id))
        }
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </span>
  );
}
