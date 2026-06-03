create extension if not exists pgcrypto;

create type season_status as enum ('draft', 'active', 'finalized');
create type attendance_status as enum (
  'unknown',
  'confirmed',
  'declined',
  'withdrawn',
  'no_show',
  'played'
);
create type week_status as enum (
  'planned',
  'open',
  'matchups_published',
  'completed',
  'locked',
  'canceled'
);
create type match_format as enum (
  'two_v_two',
  'one_v_one',
  'one_v_one_v_one'
);
create type match_status as enum ('draft', 'published', 'completed');
create type match_result as enum ('won', 'tied', 'lost', 'not_applicable');
create type tournament_status as enum ('planned', 'completed', 'locked');
create type handicap_snapshot_source as enum ('admin', 'import', 'calculated');
create type award_type as enum (
  'mvp',
  'going_low',
  'stroke_king',
  'least_match_wins',
  'highest_net',
  'highest_putts',
  'tournament_champion',
  'points_champion'
);
create type audit_action as enum (
  'created',
  'updated',
  'generated',
  'rerolled',
  'published',
  'override',
  'locked',
  'corrected'
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  starts_on date not null,
  ends_on date,
  weekly_play_day integer not null default 2,
  drop_lowest_week_count integer not null default 2,
  status season_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_year_unique unique (year),
  constraint seasons_weekly_play_day_check check (weekly_play_day between 1 and 7),
  constraint seasons_drop_lowest_week_count_check check (drop_lowest_week_count >= 0),
  constraint seasons_date_order_check check (ends_on is null or ends_on >= starts_on)
);

create table golfers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  full_name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint golfers_display_name_unique unique (display_name),
  constraint golfers_email_unique unique (email)
);

create table season_golfers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  starting_handicap numeric(4, 1),
  current_handicap numeric(4, 1),
  joined_on date,
  left_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_golfers_unique unique (season_id, golfer_id),
  constraint season_golfers_starting_handicap_check check (
    starting_handicap is null or starting_handicap >= 0
  ),
  constraint season_golfers_current_handicap_check check (
    current_handicap is null or current_handicap >= 0
  ),
  constraint season_golfers_date_order_check check (
    left_on is null or joined_on is null or left_on >= joined_on
  )
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  booking_url text,
  rank text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_name_unique unique (name)
);

create table course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  hole_number integer not null,
  par integer,
  handicap_rank integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_holes_hole_number_check check (hole_number between 1 and 18),
  constraint course_holes_par_check check (par is null or par between 3 and 6),
  constraint course_holes_handicap_rank_check check (handicap_rank between 1 and 18),
  constraint course_holes_course_hole_unique unique (course_id, hole_number),
  constraint course_holes_course_handicap_rank_unique unique (course_id, handicap_rank)
);

create table weekly_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_code text not null,
  play_date date not null,
  course_id uuid references courses(id) on delete restrict,
  status week_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_events_season_week_code_unique unique (season_id, week_code),
  constraint weekly_events_season_play_date_unique unique (season_id, play_date)
);

create table golfer_handicap_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  effective_week_id uuid not null references weekly_events(id) on delete cascade,
  handicap numeric(4, 1) not null,
  half_handicap integer not null,
  source handicap_snapshot_source not null default 'admin',
  created_at timestamptz not null default now(),
  constraint golfer_handicap_snapshots_unique unique (
    season_id,
    golfer_id,
    effective_week_id
  ),
  constraint golfer_handicap_snapshots_handicap_check check (handicap >= 0),
  constraint golfer_handicap_snapshots_half_handicap_check check (
    half_handicap >= 0
  )
);

create table weekly_tee_times (
  id uuid primary key default gen_random_uuid(),
  weekly_event_id uuid not null references weekly_events(id) on delete cascade,
  starts_at time not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_tee_times_event_starts_at_unique unique (weekly_event_id, starts_at),
  constraint weekly_tee_times_event_sort_order_unique unique (weekly_event_id, sort_order),
  constraint weekly_tee_times_id_event_unique unique (id, weekly_event_id),
  constraint weekly_tee_times_sort_order_check check (sort_order > 0)
);

create table weekly_rsvps (
  id uuid primary key default gen_random_uuid(),
  weekly_event_id uuid not null references weekly_events(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  status attendance_status not null default 'unknown',
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint weekly_rsvps_event_golfer_unique unique (weekly_event_id, golfer_id)
);

create table weekly_matches (
  id uuid primary key default gen_random_uuid(),
  weekly_event_id uuid not null references weekly_events(id) on delete cascade,
  tee_time_id uuid,
  format match_format not null,
  status match_status not null default 'draft',
  random_seed text,
  generated_at timestamptz,
  published_at timestamptz,
  completed_at timestamptz,
  unavoidable_conflict boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_matches_tee_time_week_fk foreign key (tee_time_id, weekly_event_id)
    references weekly_tee_times(id, weekly_event_id)
);

create table weekly_match_sides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references weekly_matches(id) on delete cascade,
  side_number integer not null,
  side_half_handicap integer,
  result match_result not null default 'not_applicable',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_match_sides_match_side_unique unique (match_id, side_number),
  constraint weekly_match_sides_match_id_id_unique unique (match_id, id),
  constraint weekly_match_sides_side_number_check check (side_number between 1 and 3),
  constraint weekly_match_sides_side_half_handicap_check check (
    side_half_handicap is null or side_half_handicap >= 0
  )
);

create table weekly_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  match_side_id uuid not null,
  golfer_id uuid not null references golfers(id) on delete restrict,
  handicap_snapshot numeric(4, 1),
  half_handicap_snapshot integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_match_participants_side_fk foreign key (match_id, match_side_id)
    references weekly_match_sides(match_id, id) on delete cascade,
  constraint weekly_match_participants_side_golfer_unique unique (
    match_side_id,
    golfer_id
  ),
  constraint weekly_match_participants_match_golfer_unique unique (match_id, golfer_id),
  constraint weekly_match_participants_handicap_snapshot_check check (
    handicap_snapshot is null or handicap_snapshot >= 0
  ),
  constraint weekly_match_participants_half_handicap_snapshot_check check (
    half_handicap_snapshot is null or half_handicap_snapshot >= 0
  )
);

create table stroke_allocations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references weekly_matches(id) on delete cascade,
  receiving_side_id uuid not null,
  against_side_id uuid,
  hole_number integer not null,
  strokes integer not null default 1,
  created_at timestamptz not null default now(),
  constraint stroke_allocations_receiving_side_fk foreign key (
    match_id,
    receiving_side_id
  ) references weekly_match_sides(match_id, id) on delete cascade,
  constraint stroke_allocations_against_side_fk foreign key (
    match_id,
    against_side_id
  ) references weekly_match_sides(match_id, id) on delete cascade,
  constraint stroke_allocations_hole_number_check check (hole_number between 1 and 18),
  constraint stroke_allocations_strokes_check check (strokes > 0),
  constraint stroke_allocations_distinct_sides_check check (
    against_side_id is null or receiving_side_id <> against_side_id
  )
);

create table weekly_results (
  id uuid primary key default gen_random_uuid(),
  weekly_event_id uuid not null references weekly_events(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  attendance_status attendance_status not null default 'unknown',
  match_side_id uuid references weekly_match_sides(id) on delete set null,
  match_result match_result not null default 'not_applicable',
  handicap_snapshot numeric(4, 1),
  gross_score integer,
  net_score integer,
  putts integer,
  locked_at timestamptz,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_results_event_golfer_unique unique (weekly_event_id, golfer_id),
  constraint weekly_results_handicap_snapshot_check check (
    handicap_snapshot is null or handicap_snapshot >= 0
  ),
  constraint weekly_results_gross_score_check check (
    gross_score is null or gross_score > 0
  ),
  constraint weekly_results_net_score_check check (net_score is null or net_score > 0),
  constraint weekly_results_putts_check check (putts is null or putts >= 0),
  constraint weekly_results_no_show_scores_check check (
    attendance_status <> 'no_show'
    or (
      gross_score is null
      and net_score is null
      and putts is null
    )
  )
);

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  course_id uuid references courses(id) on delete restrict,
  name text not null,
  starts_on date,
  ends_on date,
  status tournament_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_season_name_unique unique (season_id, name),
  constraint tournaments_date_order_check check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  )
);

create table tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null,
  play_date date,
  holes integer not null default 18,
  course_id uuid references courses(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_rounds_unique unique (tournament_id, round_number),
  constraint tournament_rounds_round_number_check check (round_number in (1, 2)),
  constraint tournament_rounds_holes_check check (holes = 18)
);

create table tournament_round_results (
  id uuid primary key default gen_random_uuid(),
  tournament_round_id uuid not null references tournament_rounds(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  handicap_snapshot numeric(4, 1),
  net_score integer,
  putts integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_round_results_unique unique (
    tournament_round_id,
    golfer_id
  ),
  constraint tournament_round_results_handicap_snapshot_check check (
    handicap_snapshot is null or handicap_snapshot >= 0
  ),
  constraint tournament_round_results_net_score_check check (
    net_score is null or net_score > 0
  ),
  constraint tournament_round_results_putts_check check (putts is null or putts >= 0)
);

create table tournament_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  total_net_score integer,
  total_putts integer,
  place integer,
  tournament_points integer,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_results_unique unique (tournament_id, golfer_id),
  constraint tournament_results_total_net_score_check check (
    total_net_score is null or total_net_score > 0
  ),
  constraint tournament_results_total_putts_check check (
    total_putts is null or total_putts >= 0
  ),
  constraint tournament_results_place_check check (place is null or place > 0),
  constraint tournament_results_points_check check (
    tournament_points is null or tournament_points >= 0
  )
);

create table awards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  type award_type not null,
  label text not null,
  action_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint awards_season_type_unique unique (season_id, type)
);

create table award_results (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references awards(id) on delete cascade,
  golfer_id uuid not null references golfers(id) on delete restrict,
  metric_value numeric,
  rank integer,
  source_weekly_result_id uuid references weekly_results(id) on delete set null,
  source_tournament_result_id uuid references tournament_results(id) on delete set null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint award_results_award_golfer_unique unique (award_id, golfer_id),
  constraint award_results_rank_check check (rank is null or rank > 0)
);

create table admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  season_id uuid references seasons(id) on delete set null,
  weekly_event_id uuid references weekly_events(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action audit_action not null,
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint admin_audit_events_override_reason_check check (
    action not in ('override', 'corrected') or nullif(btrim(reason), '') is not null
  )
);

create index golfer_handicap_snapshots_week_idx
  on golfer_handicap_snapshots(effective_week_id);
create index weekly_events_course_idx on weekly_events(course_id);
create index weekly_matches_weekly_event_idx on weekly_matches(weekly_event_id);
create index weekly_match_sides_match_idx on weekly_match_sides(match_id);
create index weekly_match_participants_match_idx
  on weekly_match_participants(match_id);
create index stroke_allocations_match_idx on stroke_allocations(match_id);
create index weekly_results_weekly_event_idx on weekly_results(weekly_event_id);
create index weekly_results_golfer_idx on weekly_results(golfer_id);
create index tournament_rounds_tournament_idx on tournament_rounds(tournament_id);
create index tournament_results_tournament_idx on tournament_results(tournament_id);
create index award_results_award_idx on award_results(award_id);
create index admin_audit_events_entity_idx
  on admin_audit_events(entity_type, entity_id);
create index admin_audit_events_season_idx on admin_audit_events(season_id);
create index admin_audit_events_weekly_event_idx
  on admin_audit_events(weekly_event_id);

create or replace function validate_weekly_match_cardinality(target_match_id uuid)
returns void
language plpgsql
as $$
declare
  target_format match_format;
  target_status match_status;
  expected_side_count integer;
  expected_participants_per_side integer;
  actual_side_count integer;
  invalid_side_count integer;
begin
  select format, status
  into target_format, target_status
  from weekly_matches
  where id = target_match_id;

  if target_format is null or target_status = 'draft' then
    return;
  end if;

  expected_side_count := case target_format
    when 'two_v_two' then 2
    when 'one_v_one' then 2
    when 'one_v_one_v_one' then 3
  end;

  expected_participants_per_side := case target_format
    when 'two_v_two' then 2
    when 'one_v_one' then 1
    when 'one_v_one_v_one' then 1
  end;

  select count(*)
  into actual_side_count
  from weekly_match_sides
  where match_id = target_match_id;

  if actual_side_count <> expected_side_count then
    raise exception 'Invalid side count for % match %: expected %, found %',
      target_format,
      target_match_id,
      expected_side_count,
      actual_side_count;
  end if;

  select count(*)
  into invalid_side_count
  from (
    select side_rows.id
    from weekly_match_sides side_rows
    left join weekly_match_participants participants
      on participants.match_side_id = side_rows.id
    where side_rows.match_id = target_match_id
    group by side_rows.id
    having count(participants.id) <> expected_participants_per_side
  ) invalid_sides;

  if invalid_side_count > 0 then
    raise exception 'Invalid participant count for % match %',
      target_format,
      target_match_id;
  end if;
end;
$$;

create or replace function validate_weekly_match_cardinality_from_match()
returns trigger
language plpgsql
as $$
begin
  perform validate_weekly_match_cardinality(new.id);
  return new;
end;
$$;

create or replace function validate_weekly_match_cardinality_from_side()
returns trigger
language plpgsql
as $$
begin
  perform validate_weekly_match_cardinality(coalesce(new.match_id, old.match_id));
  return coalesce(new, old);
end;
$$;

create or replace function validate_weekly_match_cardinality_from_participant()
returns trigger
language plpgsql
as $$
begin
  perform validate_weekly_match_cardinality(coalesce(new.match_id, old.match_id));
  return coalesce(new, old);
end;
$$;

create trigger weekly_matches_validate_cardinality
after insert or update of status, format on weekly_matches
for each row
execute function validate_weekly_match_cardinality_from_match();

create constraint trigger weekly_match_sides_validate_cardinality
after insert or update or delete on weekly_match_sides
deferrable initially deferred
for each row
execute function validate_weekly_match_cardinality_from_side();

create constraint trigger weekly_match_participants_validate_cardinality
after insert or update or delete on weekly_match_participants
deferrable initially deferred
for each row
execute function validate_weekly_match_cardinality_from_participant();
