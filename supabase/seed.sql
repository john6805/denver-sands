begin;

insert into seasons (
  name,
  year,
  starts_on,
  ends_on,
  weekly_play_day,
  drop_lowest_week_count,
  status
)
values (
  '2026 Denver Sands',
  2026,
  '2026-05-12',
  null,
  2,
  2,
  'active'
)
on conflict (year) do update
set
  name = excluded.name,
  starts_on = excluded.starts_on,
  weekly_play_day = excluded.weekly_play_day,
  drop_lowest_week_count = excluded.drop_lowest_week_count,
  status = excluded.status,
  updated_at = now();

insert into courses (name, booking_url, rank, active)
values
  ('Indian Tree', 'https://indiantree.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23', 'A', true),
  ('Fox Hollow', 'https://app.membersports.com/tee-times/3703/20589/0', 'A', true),
  ('West Woods', null, 'A', true),
  ('Broken Tee', null, 'A', true),
  ('Overland', null, 'A', true),
  ('Willis Case', 'https://app.membersports.com/tee-times/3629/20573/1', null, true),
  ('Fossil Trace', 'https://fossiltrace.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23.999722222222225', 'A', true),
  ('Legacy Ridge', 'https://cityofwestminster.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23', null, true),
  ('Walnut Creek', 'https://cityofwestminster.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23', null, true),
  ('Foothills', 'https://app.membersports.com/tee-times/3697/4758/0', null, true),
  ('GVR', 'https://greenvalleyranch.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23', null, true),
  ('Heather Ridge', 'https://heatherridge.ezlinksgolf.com/index.html#/search', null, true),
  ('Homestead', 'https://app.membersports.com/tee-times/3807/4902/0', null, true)
on conflict (name) do update
set
  booking_url = excluded.booking_url,
  rank = excluded.rank,
  active = excluded.active,
  updated_at = now();

insert into golfers (display_name, active)
values
  ('Zach', true),
  ('Joe', true),
  ('Bird', true),
  ('Bryan', true),
  ('GT', true),
  ('Joey', true),
  ('Hunter', true),
  ('John', true),
  ('Brandt', true),
  ('Jared', true),
  ('Stefan', true)
on conflict (display_name) do update
set
  active = excluded.active,
  updated_at = now();

with current_season as (
  select id from seasons where year = 2026
),
seed_golfers(display_name, handicap) as (
  values
    ('Zach', 21.0::numeric),
    ('Joe', 17.9::numeric),
    ('Bird', 16.8::numeric),
    ('Bryan', 13.9::numeric),
    ('GT', 12.7::numeric),
    ('Joey', 10.9::numeric),
    ('Hunter', 28.0::numeric),
    ('John', 28.0::numeric),
    ('Brandt', 9.1::numeric),
    ('Jared', 28.0::numeric),
    ('Stefan', 10.0::numeric)
)
insert into season_golfers (
  season_id,
  golfer_id,
  starting_handicap,
  current_handicap,
  joined_on
)
select
  current_season.id,
  golfers.id,
  seed_golfers.handicap,
  seed_golfers.handicap,
  '2026-05-12'
from seed_golfers
cross join current_season
join golfers on golfers.display_name = seed_golfers.display_name
on conflict (season_id, golfer_id) do update
set
  starting_handicap = excluded.starting_handicap,
  current_handicap = excluded.current_handicap,
  joined_on = excluded.joined_on,
  updated_at = now();

with current_season as (
  select id from seasons where year = 2026
),
seed_weeks(week_code, play_date, course_name, status) as (
  values
    ('W01', '2026-05-12'::date, 'Overland', 'completed'::week_status),
    ('W02', '2026-05-19'::date, 'Broken Tee', 'planned'::week_status),
    ('W03', '2026-05-26'::date, 'Overland', 'planned'::week_status),
    ('W04', '2026-06-02'::date, null, 'planned'::week_status),
    ('W05', '2026-06-09'::date, null, 'planned'::week_status),
    ('W06', '2026-06-16'::date, null, 'planned'::week_status),
    ('W07', '2026-06-23'::date, null, 'planned'::week_status),
    ('W08', '2026-06-30'::date, null, 'planned'::week_status),
    ('W09', '2026-07-07'::date, null, 'planned'::week_status),
    ('W10', '2026-07-14'::date, null, 'planned'::week_status),
    ('W11', '2026-07-21'::date, null, 'planned'::week_status),
    ('W12', '2026-07-28'::date, null, 'planned'::week_status),
    ('W13', '2026-08-04'::date, null, 'planned'::week_status),
    ('W14', '2026-08-11'::date, null, 'planned'::week_status),
    ('W15', '2026-08-18'::date, null, 'planned'::week_status),
    ('W16', '2026-08-25'::date, null, 'planned'::week_status),
    ('W17', '2026-09-01'::date, null, 'planned'::week_status),
    ('W18', '2026-09-08'::date, null, 'planned'::week_status),
    ('W19', '2026-09-15'::date, null, 'planned'::week_status),
    ('W20', '2026-09-22'::date, null, 'planned'::week_status),
    ('W21', '2026-09-29'::date, null, 'planned'::week_status)
)
insert into weekly_events (
  season_id,
  week_code,
  play_date,
  course_id,
  status
)
select
  current_season.id,
  seed_weeks.week_code,
  seed_weeks.play_date,
  courses.id,
  seed_weeks.status
from seed_weeks
cross join current_season
left join courses on courses.name = seed_weeks.course_name
on conflict (season_id, week_code) do update
set
  play_date = excluded.play_date,
  course_id = excluded.course_id,
  status = excluded.status,
  updated_at = now();

with seed_tee_times(week_code, starts_at, sort_order) as (
  values
    ('W01', '17:40'::time, 1),
    ('W01', '17:50'::time, 2),
    ('W01', '18:00'::time, 3),
    ('W02', '17:20'::time, 1),
    ('W02', '17:30'::time, 2),
    ('W02', '17:40'::time, 3),
    ('W03', '17:40'::time, 1),
    ('W03', '17:50'::time, 2),
    ('W03', '18:00'::time, 3)
)
insert into weekly_tee_times (weekly_event_id, starts_at, sort_order)
select
  weekly_events.id,
  seed_tee_times.starts_at,
  seed_tee_times.sort_order
from seed_tee_times
join seasons on seasons.year = 2026
join weekly_events
  on weekly_events.season_id = seasons.id
  and weekly_events.week_code = seed_tee_times.week_code
on conflict (weekly_event_id, starts_at) do update
set
  sort_order = excluded.sort_order,
  updated_at = now();

with seed_rsvps(week_code, display_name, status) as (
  values
    ('W01', 'Zach', 'confirmed'::attendance_status),
    ('W01', 'Joe', 'confirmed'::attendance_status),
    ('W01', 'Bird', 'confirmed'::attendance_status),
    ('W01', 'Bryan', 'confirmed'::attendance_status),
    ('W01', 'GT', 'confirmed'::attendance_status),
    ('W01', 'Joey', 'confirmed'::attendance_status),
    ('W01', 'Hunter', 'confirmed'::attendance_status),
    ('W01', 'John', 'confirmed'::attendance_status),
    ('W01', 'Brandt', 'confirmed'::attendance_status),
    ('W01', 'Jared', 'no_show'::attendance_status),
    ('W01', 'Stefan', 'no_show'::attendance_status),
    ('W02', 'Zach', 'unknown'::attendance_status),
    ('W02', 'Joe', 'unknown'::attendance_status),
    ('W02', 'Bird', 'unknown'::attendance_status),
    ('W02', 'Bryan', 'unknown'::attendance_status),
    ('W02', 'GT', 'unknown'::attendance_status),
    ('W02', 'Joey', 'unknown'::attendance_status),
    ('W02', 'Hunter', 'unknown'::attendance_status),
    ('W02', 'John', 'unknown'::attendance_status),
    ('W02', 'Brandt', 'unknown'::attendance_status),
    ('W02', 'Jared', 'unknown'::attendance_status),
    ('W02', 'Stefan', 'unknown'::attendance_status)
)
insert into weekly_rsvps (weekly_event_id, golfer_id, status)
select
  weekly_events.id,
  golfers.id,
  seed_rsvps.status
from seed_rsvps
join seasons on seasons.year = 2026
join weekly_events
  on weekly_events.season_id = seasons.id
  and weekly_events.week_code = seed_rsvps.week_code
join golfers on golfers.display_name = seed_rsvps.display_name
on conflict (weekly_event_id, golfer_id) do update
set
  status = excluded.status,
  updated_at = now();

with w01 as (
  select id from weekly_events
  where week_code = 'W01'
  and season_id = (select id from seasons where year = 2026)
),
seed_matches(starts_at, random_seed) as (
  values
    ('17:40'::time, 'workbook-0512-import-1740'),
    ('17:50'::time, 'workbook-0512-import-1750'),
    ('18:00'::time, 'workbook-0512-import-1800')
)
insert into weekly_matches (
  weekly_event_id,
  tee_time_id,
  format,
  status,
  random_seed,
  generated_at,
  published_at,
  completed_at
)
select
  w01.id,
  weekly_tee_times.id,
  'one_v_one_v_one',
  'draft',
  seed_matches.random_seed,
  '2026-05-12 17:00:00-06'::timestamptz,
  '2026-05-12 17:00:00-06'::timestamptz,
  '2026-05-12 20:00:00-06'::timestamptz
from seed_matches
cross join w01
join weekly_tee_times
  on weekly_tee_times.weekly_event_id = w01.id
  and weekly_tee_times.starts_at = seed_matches.starts_at
where not exists (
  select 1
  from weekly_matches
  where weekly_matches.weekly_event_id = w01.id
  and weekly_matches.random_seed = seed_matches.random_seed
);

with seed_sides(random_seed, side_number, display_name, side_half_handicap, result) as (
  values
    ('workbook-0512-import-1740', 1, 'Bryan', 7, 'tied'::match_result),
    ('workbook-0512-import-1740', 2, 'Joe', 9, 'tied'::match_result),
    ('workbook-0512-import-1740', 3, 'John', 14, 'tied'::match_result),
    ('workbook-0512-import-1750', 1, 'Brandt', 5, 'lost'::match_result),
    ('workbook-0512-import-1750', 2, 'Bird', 9, 'won'::match_result),
    ('workbook-0512-import-1750', 3, 'Hunter', 14, 'lost'::match_result),
    ('workbook-0512-import-1800', 1, 'GT', 7, 'lost'::match_result),
    ('workbook-0512-import-1800', 2, 'Zach', 11, 'won'::match_result),
    ('workbook-0512-import-1800', 3, 'Joey', 6, 'lost'::match_result)
)
insert into weekly_match_sides (
  match_id,
  side_number,
  side_half_handicap,
  result
)
select
  weekly_matches.id,
  seed_sides.side_number,
  seed_sides.side_half_handicap,
  seed_sides.result
from seed_sides
join weekly_matches on weekly_matches.random_seed = seed_sides.random_seed
join weekly_events on weekly_events.id = weekly_matches.weekly_event_id
join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026
on conflict (match_id, side_number) do update
set
  side_half_handicap = excluded.side_half_handicap,
  result = excluded.result,
  updated_at = now();

with seed_participants(random_seed, side_number, display_name, handicap_snapshot, half_handicap_snapshot) as (
  values
    ('workbook-0512-import-1740', 1, 'Bryan', 13.9::numeric, 7),
    ('workbook-0512-import-1740', 2, 'Joe', 17.9::numeric, 9),
    ('workbook-0512-import-1740', 3, 'John', 28.0::numeric, 14),
    ('workbook-0512-import-1750', 1, 'Brandt', 9.1::numeric, 5),
    ('workbook-0512-import-1750', 2, 'Bird', 16.8::numeric, 9),
    ('workbook-0512-import-1750', 3, 'Hunter', 28.0::numeric, 14),
    ('workbook-0512-import-1800', 1, 'GT', 12.7::numeric, 7),
    ('workbook-0512-import-1800', 2, 'Zach', 21.0::numeric, 11),
    ('workbook-0512-import-1800', 3, 'Joey', 10.9::numeric, 6)
)
insert into weekly_match_participants (
  match_id,
  match_side_id,
  golfer_id,
  handicap_snapshot,
  half_handicap_snapshot
)
select
  weekly_matches.id,
  weekly_match_sides.id,
  golfers.id,
  seed_participants.handicap_snapshot,
  seed_participants.half_handicap_snapshot
from seed_participants
join weekly_matches on weekly_matches.random_seed = seed_participants.random_seed
join weekly_events on weekly_events.id = weekly_matches.weekly_event_id
join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026
join weekly_match_sides
  on weekly_match_sides.match_id = weekly_matches.id
  and weekly_match_sides.side_number = seed_participants.side_number
join golfers on golfers.display_name = seed_participants.display_name
on conflict (match_id, golfer_id) do update
set
  match_side_id = excluded.match_side_id,
  handicap_snapshot = excluded.handicap_snapshot,
  half_handicap_snapshot = excluded.half_handicap_snapshot,
  updated_at = now();

update weekly_matches
set
  status = 'completed',
  updated_at = now()
where random_seed in (
  'workbook-0512-import-1740',
  'workbook-0512-import-1750',
  'workbook-0512-import-1800'
)
and weekly_event_id = (
  select weekly_events.id
  from weekly_events
  join seasons on seasons.id = weekly_events.season_id
  where seasons.year = 2026
  and weekly_events.week_code = 'W01'
);

with w01_results(display_name, attendance_status, match_result, handicap_snapshot, gross_score, net_score, putts, beers) as (
  values
    ('Zach', 'confirmed'::attendance_status, 'won'::match_result, 21.0::numeric, 40, 29, 13, 0),
    ('John', 'confirmed'::attendance_status, 'tied'::match_result, 28.0::numeric, 60, 46, 18, 4),
    ('Joe', 'confirmed'::attendance_status, 'tied'::match_result, 17.9::numeric, 42, 33, 17, 0),
    ('Bird', 'confirmed'::attendance_status, 'won'::match_result, 16.8::numeric, 42, 33, 21, 0),
    ('Bryan', 'confirmed'::attendance_status, 'tied'::match_result, 13.9::numeric, 42, 35, 18, 0),
    ('GT', 'confirmed'::attendance_status, 'lost'::match_result, 12.7::numeric, 44, 37, 15, 0),
    ('Joey', 'confirmed'::attendance_status, 'lost'::match_result, 10.9::numeric, 44, 38, 18, 0),
    ('Hunter', 'confirmed'::attendance_status, 'lost'::match_result, 28.0::numeric, 55, 41, 18, 0),
    ('Brandt', 'confirmed'::attendance_status, 'lost'::match_result, 9.1::numeric, 51, 46, 16, 0),
    ('Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer, 0),
    ('Stefan', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer, 0)
),
w01 as (
  select id from weekly_events
  where week_code = 'W01'
  and season_id = (select id from seasons where year = 2026)
)
insert into weekly_results (
  weekly_event_id,
  golfer_id,
  attendance_status,
  match_side_id,
  match_result,
  handicap_snapshot,
  gross_score,
  net_score,
  putts,
  beers
)
select
  w01.id,
  golfers.id,
  w01_results.attendance_status,
  weekly_match_sides.id,
  w01_results.match_result,
  w01_results.handicap_snapshot,
  w01_results.gross_score,
  w01_results.net_score,
  w01_results.putts,
  w01_results.beers
from w01_results
cross join w01
join golfers on golfers.display_name = w01_results.display_name
left join weekly_match_participants
  on weekly_match_participants.golfer_id = golfers.id
left join weekly_match_sides
  on weekly_match_sides.id = weekly_match_participants.match_side_id
left join weekly_matches
  on weekly_matches.id = weekly_match_participants.match_id
  and weekly_matches.weekly_event_id = w01.id
on conflict (weekly_event_id, golfer_id) do update
set
  attendance_status = excluded.attendance_status,
  match_side_id = excluded.match_side_id,
  match_result = excluded.match_result,
  handicap_snapshot = excluded.handicap_snapshot,
  gross_score = excluded.gross_score,
  net_score = excluded.net_score,
  putts = excluded.putts,
  beers = excluded.beers,
  updated_at = now();

with w02_results(display_name) as (
  values
    ('Zach'),
    ('Joe'),
    ('Bird'),
    ('Bryan'),
    ('GT'),
    ('Joey'),
    ('Hunter'),
    ('John'),
    ('Brandt'),
    ('Jared'),
    ('Stefan')
),
w02 as (
  select id from weekly_events
  where week_code = 'W02'
  and season_id = (select id from seasons where year = 2026)
)
insert into weekly_results (
  weekly_event_id,
  golfer_id,
  attendance_status,
  match_result,
  beers
)
select
  w02.id,
  golfers.id,
  'unknown',
  'not_applicable',
  0
from w02_results
cross join w02
join golfers on golfers.display_name = w02_results.display_name
on conflict (weekly_event_id, golfer_id) do update
set
  attendance_status = excluded.attendance_status,
  match_result = excluded.match_result,
  handicap_snapshot = null,
  gross_score = null,
  net_score = null,
  putts = null,
  beers = excluded.beers,
  updated_at = now();

commit;
