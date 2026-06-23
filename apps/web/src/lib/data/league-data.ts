import type { AttendanceStatus, MatchResult } from "@/lib/scoring";

export type ActionResult<T> = {
  data: T | null;
  error: string | null;
};

export type SaveResponse = {
  error: { message: string } | null;
};

export type Season = {
  id: string;
  name: string;
  year: number;
  starts_on: string;
  ends_on: string | null;
  status: string;
  drop_lowest_week_count: number;
};

export type SeasonSummary = Pick<
  Season,
  "id" | "name" | "year" | "drop_lowest_week_count"
>;

export type Golfer = {
  id: string;
  display_name: string;
  active: boolean;
};

export type GolferSummary = Pick<Golfer, "id" | "display_name">;

export type SeasonGolfer = {
  id: string;
  season_id: string;
  golfer_id: string;
  current_handicap: number | null;
};

export type Course = {
  id: string;
  name: string;
  booking_url: string | null;
  active: boolean;
};

export type CourseHole = {
  course_id: string;
  hole_number: number;
  par: number | null;
  handicap_rank: number;
};

export type WeeklyEvent = {
  id: string;
  season_id: string;
  week_code: string;
  play_date: string;
  course_id: string | null;
  status: string;
};

export type WeeklyEventSummary = Pick<
  WeeklyEvent,
  "id" | "week_code" | "play_date" | "status"
>;

export type TeeTime = {
  id: string;
  weekly_event_id: string;
  starts_at: string;
  sort_order: number;
};

export type WeeklyRsvp = {
  weekly_event_id: string;
  golfer_id: string;
  status: AttendanceStatus;
};

export type HandicapSnapshot = {
  effective_week_id: string;
  golfer_id: string;
  handicap: number;
  half_handicap: number;
};

export type Tournament = {
  id: string;
  season_id: string;
  course_id: string | null;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
};

export type TournamentRound = {
  id: string;
  tournament_id: string;
  round_number: number;
  play_date: string | null;
  holes: number;
  course_id: string | null;
};

export type TournamentRoundResult = {
  id: string;
  tournament_round_id: string;
  golfer_id: string;
  handicap_snapshot: number | null;
  net_score: number | null;
  putts: number | null;
};

export type AdminAuditEvent = {
  id: string;
  actor_id: string | null;
  season_id: string | null;
  weekly_event_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json: unknown;
  after_json: unknown;
  reason: string | null;
  created_at: string;
};

export type WeeklyResult = {
  id: string;
  weekly_event_id: string;
  golfer_id: string;
  attendance_status: AttendanceStatus;
  match_result: MatchResult;
  handicap_snapshot: number | null;
  gross_score: number | null;
  net_score: number | null;
  putts: number | null;
  locked_at: string | null;
  override_reason: string | null;
};

export type AdminData = {
  season: Season;
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  courses: Course[];
  courseHoles: CourseHole[];
  weeklyEvents: WeeklyEvent[];
  teeTimes: TeeTime[];
};

export type SnapshotData = {
  season: SeasonSummary;
  weeklyEvents: WeeklyEventSummary[];
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  rsvps: WeeklyRsvp[];
  snapshots: HandicapSnapshot[];
};

export type BreakdownData = {
  season: SeasonSummary;
  weeklyEvents: WeeklyEventSummary[];
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  weeklyResults: WeeklyResult[];
};

export type LeaderboardData = BreakdownData;

export type TournamentData = {
  season: SeasonSummary;
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  courses: Course[];
  weeklyEvents: WeeklyEventSummary[];
  weeklyResults: WeeklyResult[];
  tournaments: Tournament[];
  tournamentRounds: TournamentRound[];
  tournamentRoundResults: TournamentRoundResult[];
};

export type AuditTrailData = {
  seasons: SeasonSummary[];
  weeklyEvents: WeeklyEventSummary[];
  auditEvents: AdminAuditEvent[];
};

export type MatchGeneratorData = {
  season: Season;
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  courses: Course[];
  courseHoles: CourseHole[];
  weeklyEvents: WeeklyEvent[];
  teeTimes: TeeTime[];
  rsvps: WeeklyRsvp[];
  snapshots: HandicapSnapshot[];
};
