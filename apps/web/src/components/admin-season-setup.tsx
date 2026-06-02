"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  buildCourseUpdate,
  buildGolferUpdates,
  buildSeasonUpdate,
  buildTeeTimeUpdate,
  buildWeeklyEventUpdate,
  seasonStatusOptions,
  weekStatusOptions,
  type AdminIssue,
} from "@/lib/admin-season";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Season = {
  id: string;
  name: string;
  year: number;
  starts_on: string;
  ends_on: string | null;
  status: string;
};

type Golfer = {
  id: string;
  display_name: string;
  active: boolean;
};

type SeasonGolfer = {
  id: string;
  season_id: string;
  golfer_id: string;
  current_handicap: number | null;
};

type Course = {
  id: string;
  name: string;
  booking_url: string | null;
  active: boolean;
};

type CourseHole = {
  course_id: string;
  hole_number: number;
};

type WeeklyEvent = {
  id: string;
  season_id: string;
  week_code: string;
  play_date: string;
  course_id: string | null;
  status: string;
};

type TeeTime = {
  id: string;
  weekly_event_id: string;
  starts_at: string;
  sort_order: number;
};

type AdminData = {
  season: Season;
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  courses: Course[];
  courseHoles: CourseHole[];
  weeklyEvents: WeeklyEvent[];
  teeTimes: TeeTime[];
};

type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;
type SaveResponse = { error: { message: string } | null };
type SaveAction = () => PromiseLike<SaveResponse>;

function issueText(issues: AdminIssue[]) {
  return issues.map((item) => item.message).join(" ");
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function useAdminData(client: SupabaseClient) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setLoading(false);
      setError("Add Supabase environment variables to edit season setup data.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: seasons, error: seasonsError } = await client
      .from("seasons")
      .select("id,name,year,starts_on,ends_on,status")
      .order("year", { ascending: false })
      .limit(1);

    if (seasonsError || !seasons?.[0]) {
      setError(seasonsError?.message ?? "Seed a season before editing setup.");
      setLoading(false);
      return;
    }

    const season = seasons[0] as Season;
    const [
      golfersResponse,
      seasonGolfersResponse,
      coursesResponse,
      courseHolesResponse,
      weeklyEventsResponse,
      teeTimesResponse,
    ] = await Promise.all([
      client.from("golfers").select("id,display_name,active").order("display_name"),
      client
        .from("season_golfers")
        .select("id,season_id,golfer_id,current_handicap")
        .eq("season_id", season.id),
      client.from("courses").select("id,name,booking_url,active").order("name"),
      client.from("course_holes").select("course_id,hole_number"),
      client
        .from("weekly_events")
        .select("id,season_id,week_code,play_date,course_id,status")
        .eq("season_id", season.id)
        .order("play_date"),
      client
        .from("weekly_tee_times")
        .select("id,weekly_event_id,starts_at,sort_order")
        .order("sort_order"),
    ]);

    const firstError = [
      golfersResponse.error,
      seasonGolfersResponse.error,
      coursesResponse.error,
      courseHolesResponse.error,
      weeklyEventsResponse.error,
      teeTimesResponse.error,
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setData({
      season,
      golfers: (golfersResponse.data ?? []) as Golfer[],
      seasonGolfers: (seasonGolfersResponse.data ?? []) as SeasonGolfer[],
      courses: (coursesResponse.data ?? []) as Course[],
      courseHoles: (courseHolesResponse.data ?? []) as CourseHole[],
      weeklyEvents: (weeklyEventsResponse.data ?? []) as WeeklyEvent[],
      teeTimes: (teeTimesResponse.data ?? []) as TeeTime[],
    });
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return { data, loading, error, reload: load };
}

export function AdminSeasonSetup() {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const { data, loading, error, reload } = useAdminData(client);
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

  if (error || !data || !client) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Season Setup Admin</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Supabase is not configured for this browser session."}
            </p>
          </div>
        </div>
      </section>
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
        client={client}
        season={data.season}
        saving={saving}
        onSave={save}
      />
      <RosterSection
        client={client}
        golfers={data.golfers}
        seasonGolfers={data.seasonGolfers}
        saving={saving}
        onSave={save}
      />
      <CoursesSection
        client={client}
        courses={data.courses}
        courseHoles={data.courseHoles}
        saving={saving}
        onSave={save}
      />
      <ScheduleSection
        client={client}
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

function SeasonSection({
  client,
  season,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
    await onSave("season", () =>
      client
        .from("seasons")
        .update({ ...update.values, updated_at: new Date().toISOString() })
        .eq("id", season.id),
    );
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
  client,
  golfers,
  seasonGolfers,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
            {roster.map(({ golfer, seasonGolfer }) => (
              <RosterRow
                key={golfer.id}
                client={client}
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

function RosterRow({
  client,
  golfer,
  seasonGolfer,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
    await onSave(key, async () => {
      const golferResponse = await client
        .from("golfers")
        .update({ ...update.values.golfer, updated_at: new Date().toISOString() })
        .eq("id", golfer.id);

      if (golferResponse.error) {
        return golferResponse;
      }

      return client
        .from("season_golfers")
        .update({
          ...update.values.seasonGolfer,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seasonGolfer.id);
    });
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
  client,
  courses,
  courseHoles,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
  courses: Course[];
  courseHoles: CourseHole[];
  saving: string | null;
  onSave: (
    key: string,
    action: SaveAction,
  ) => Promise<void>;
}) {
  const holeCounts = new Map<string, number>();

  for (const hole of courseHoles) {
    holeCounts.set(hole.course_id, (holeCounts.get(hole.course_id) ?? 0) + 1);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <LandPlot className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Courses</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {courses.map((course) => (
          <CourseRow
            key={course.id}
            client={client}
            course={course}
            holeCount={holeCounts.get(course.id) ?? 0}
            saving={saving}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function CourseRow({
  client,
  course,
  holeCount,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
  course: Course;
  holeCount: number;
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
    await onSave(key, () =>
      client
        .from("courses")
        .update({ ...update.values, updated_at: new Date().toISOString() })
        .eq("id", course.id),
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={
            holeCount === 18
              ? "rounded-full bg-muted px-2 py-1 text-xs"
              : "rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
          }
        >
          {holeCount === 18
            ? "18 holes ready"
            : `${holeCount}/18 course holes entered`}
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
    </div>
  );
}

function ScheduleSection({
  client,
  courses,
  weeklyEvents,
  teeTimes,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
        {weeklyEvents.map((event) => (
          <ScheduleRow
            key={event.id}
            client={client}
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

function ScheduleRow({
  client,
  event,
  courses,
  teeTimes,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
    await onSave(key, () =>
      client
        .from("weekly_events")
        .update({ ...update.values, updated_at: new Date().toISOString() })
        .eq("id", event.id),
    );
  }

  async function addTeeTime() {
    const update = buildTeeTimeUpdate({ starts_at: newTime });

    if (!update.ok) {
      setIssues(update.issues);
      return;
    }

    setIssues([]);
    await onSave(`new-time-${event.id}`, () =>
      client.from("weekly_tee_times").insert({
        weekly_event_id: event.id,
        starts_at: update.values.starts_at,
        sort_order: teeTimes.length + 1,
      }),
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
            client={client}
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
  client,
  teeTime,
  saving,
  onSave,
}: {
  client: NonNullable<SupabaseClient>;
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
      client
        .from("weekly_tee_times")
        .update({ ...update.values, updated_at: new Date().toISOString() })
        .eq("id", teeTime.id),
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
          onSave(key, () =>
            client.from("weekly_tee_times").delete().eq("id", teeTime.id),
          )
        }
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </span>
  );
}
