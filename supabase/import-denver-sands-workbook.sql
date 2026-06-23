begin;

-- Generated from docs/Denver Sands Golf League (1).xlsx on 2026-06-22 21:59:16 -06:00.

insert into golfers (display_name, active)
values
  ('Bird', true),
  ('Brandt', true),
  ('Bryan', true),
  ('GT', true),
  ('Hunter', true),
  ('Jared', true),
  ('Joe', true),
  ('Joey', true),
  ('John', true),
  ('Stefan', true),
  ('Zach', true)
on conflict (display_name) do update
set active = excluded.active, updated_at = now();

insert into courses (name, active)
values
  ('Broken Tee', true),
  ('Fox Hollow', true),
  ('Indian Tree', true),
  ('Overland', true)
on conflict (name) do update
set active = excluded.active, updated_at = now();

with current_season as (
  select id from seasons where year = 2026
), seed_golfers(display_name, handicap) as (
  values
    ('Bird', 15.8::numeric),
    ('Brandt', 10::numeric),
    ('Bryan', 13.1::numeric),
    ('GT', 13.8::numeric),
    ('Hunter', 27.4::numeric),
    ('Jared', 28.9::numeric),
    ('Joe', 18.5::numeric),
    ('Joey', 11::numeric),
    ('John', 31.7::numeric),
    ('Stefan', 11.5::numeric),
    ('Zach', 19.4::numeric)
)
insert into season_golfers (season_id, golfer_id, starting_handicap, current_handicap, joined_on)
select current_season.id, golfers.id, seed_golfers.handicap, seed_golfers.handicap, '2026-05-12'::date
from seed_golfers
cross join current_season
join golfers on golfers.display_name = seed_golfers.display_name
on conflict (season_id, golfer_id) do update
set current_handicap = excluded.current_handicap, updated_at = now();

with current_season as (
  select id from seasons where year = 2026
), seed_weeks(week_code, play_date, course_name, status) as (
  values
    ('W01', '2026-05-12'::date, 'Overland', 'completed'::week_status),
    ('W02', '2026-05-19'::date, 'Indian Tree', 'completed'::week_status),
    ('W03', '2026-05-26'::date, 'Overland', 'completed'::week_status),
    ('W04', '2026-06-02'::date, 'Broken Tee', 'completed'::week_status),
    ('W05', '2026-06-09'::date, 'Fox Hollow', 'completed'::week_status),
    ('W06', '2026-06-16'::date, 'Broken Tee', 'completed'::week_status),
    ('W07', '2026-06-22'::date, 'Broken Tee', 'planned'::week_status),
    ('W08', '2026-06-23'::date, 'Broken Tee', 'planned'::week_status),
    ('W09', '2026-06-30'::date, null, 'planned'::week_status),
    ('W10', '2026-07-07'::date, null, 'planned'::week_status),
    ('W11', '2026-07-14'::date, null, 'planned'::week_status),
    ('W12', '2026-07-21'::date, null, 'planned'::week_status),
    ('W13', '2026-07-28'::date, null, 'planned'::week_status),
    ('W14', '2026-08-04'::date, null, 'planned'::week_status),
    ('W15', '2026-08-11'::date, null, 'planned'::week_status),
    ('W16', '2026-08-18'::date, null, 'planned'::week_status),
    ('W17', '2026-08-25'::date, null, 'planned'::week_status),
    ('W18', '2026-09-01'::date, null, 'planned'::week_status),
    ('W19', '2026-09-08'::date, null, 'planned'::week_status),
    ('W20', '2026-09-15'::date, null, 'planned'::week_status),
    ('W21', '2026-09-22'::date, null, 'planned'::week_status),
    ('W22', '2026-09-29'::date, null, 'planned'::week_status)
)
insert into weekly_events (season_id, week_code, play_date, course_id, status)
select current_season.id, seed_weeks.week_code, seed_weeks.play_date, courses.id, seed_weeks.status
from seed_weeks
cross join current_season
left join courses on courses.name = seed_weeks.course_name
on conflict (season_id, week_code) do update
set play_date = excluded.play_date, course_id = excluded.course_id, status = excluded.status, updated_at = now();

with seed_tee_times(week_code, starts_at, sort_order) as (
  values
    ('W02', '17:40'::time, 1),
    ('W02', '17:50'::time, 2),
    ('W02', '18:00'::time, 3),
    ('W03', '17:20'::time, 1),
    ('W03', '17:30'::time, 2),
    ('W04', '17:40'::time, 1),
    ('W04', '17:50'::time, 2),
    ('W04', '18:00'::time, 3),
    ('W05', '17:30'::time, 1),
    ('W05', '17:40'::time, 2),
    ('W06', '17:39'::time, 1),
    ('W06', '17:48'::time, 2),
    ('W07', '17:40'::time, 1),
    ('W07', '17:50'::time, 2),
    ('W08', '17:40'::time, 1),
    ('W08', '17:50'::time, 2),
    ('W08', '18:00'::time, 3)
), deletable_tee_times as (
  select weekly_tee_times.id
  from seed_tee_times
  join seasons on seasons.year = 2026
  join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_tee_times.week_code
  join weekly_tee_times on weekly_tee_times.weekly_event_id = weekly_events.id
  left join weekly_matches on weekly_matches.tee_time_id = weekly_tee_times.id
  where weekly_matches.id is null
)
delete from weekly_tee_times
using deletable_tee_times
where weekly_tee_times.id = deletable_tee_times.id;

with seed_tee_times(week_code, starts_at, sort_order) as (
  values
    ('W02', '17:40'::time, 1),
    ('W02', '17:50'::time, 2),
    ('W02', '18:00'::time, 3),
    ('W03', '17:20'::time, 1),
    ('W03', '17:30'::time, 2),
    ('W04', '17:40'::time, 1),
    ('W04', '17:50'::time, 2),
    ('W04', '18:00'::time, 3),
    ('W05', '17:30'::time, 1),
    ('W05', '17:40'::time, 2),
    ('W06', '17:39'::time, 1),
    ('W06', '17:48'::time, 2),
    ('W07', '17:40'::time, 1),
    ('W07', '17:50'::time, 2),
    ('W08', '17:40'::time, 1),
    ('W08', '17:50'::time, 2),
    ('W08', '18:00'::time, 3)
)
insert into weekly_tee_times (weekly_event_id, starts_at, sort_order)
select weekly_events.id, seed_tee_times.starts_at, seed_tee_times.sort_order
from seed_tee_times
join seasons on seasons.year = 2026
join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_tee_times.week_code
on conflict (weekly_event_id, sort_order) do update
set starts_at = excluded.starts_at, updated_at = now();

with seed_rsvps(week_code, display_name, status) as (
  values
    ('W07', 'Bird', 'unknown'::attendance_status),
    ('W07', 'Brandt', 'unknown'::attendance_status),
    ('W07', 'Bryan', 'unknown'::attendance_status),
    ('W07', 'GT', 'unknown'::attendance_status),
    ('W07', 'Hunter', 'unknown'::attendance_status),
    ('W07', 'Jared', 'unknown'::attendance_status),
    ('W07', 'Joe', 'unknown'::attendance_status),
    ('W07', 'Joey', 'unknown'::attendance_status),
    ('W07', 'John', 'unknown'::attendance_status),
    ('W07', 'Stefan', 'unknown'::attendance_status),
    ('W07', 'Zach', 'unknown'::attendance_status),
    ('W06', 'Bird', 'played'::attendance_status),
    ('W06', 'Brandt', 'played'::attendance_status),
    ('W06', 'Bryan', 'no_show'::attendance_status),
    ('W06', 'GT', 'played'::attendance_status),
    ('W06', 'Hunter', 'no_show'::attendance_status),
    ('W06', 'Jared', 'no_show'::attendance_status),
    ('W06', 'Joe', 'played'::attendance_status),
    ('W06', 'Joey', 'played'::attendance_status),
    ('W06', 'John', 'played'::attendance_status),
    ('W06', 'Stefan', 'played'::attendance_status),
    ('W06', 'Zach', 'played'::attendance_status),
    ('W05', 'Bird', 'no_show'::attendance_status),
    ('W05', 'Brandt', 'no_show'::attendance_status),
    ('W05', 'Bryan', 'played'::attendance_status),
    ('W05', 'GT', 'no_show'::attendance_status),
    ('W05', 'Hunter', 'played'::attendance_status),
    ('W05', 'Jared', 'played'::attendance_status),
    ('W05', 'Joe', 'played'::attendance_status),
    ('W05', 'Joey', 'played'::attendance_status),
    ('W05', 'John', 'no_show'::attendance_status),
    ('W05', 'Stefan', 'played'::attendance_status),
    ('W05', 'Zach', 'played'::attendance_status),
    ('W04', 'Bird', 'played'::attendance_status),
    ('W04', 'Brandt', 'no_show'::attendance_status),
    ('W04', 'Bryan', 'played'::attendance_status),
    ('W04', 'GT', 'played'::attendance_status),
    ('W04', 'Hunter', 'played'::attendance_status),
    ('W04', 'Jared', 'no_show'::attendance_status),
    ('W04', 'Joe', 'played'::attendance_status),
    ('W04', 'Joey', 'no_show'::attendance_status),
    ('W04', 'John', 'played'::attendance_status),
    ('W04', 'Stefan', 'played'::attendance_status),
    ('W04', 'Zach', 'played'::attendance_status),
    ('W03', 'Bird', 'played'::attendance_status),
    ('W03', 'Brandt', 'no_show'::attendance_status),
    ('W03', 'Bryan', 'played'::attendance_status),
    ('W03', 'GT', 'played'::attendance_status),
    ('W03', 'Hunter', 'played'::attendance_status),
    ('W03', 'Jared', 'played'::attendance_status),
    ('W03', 'Joe', 'no_show'::attendance_status),
    ('W03', 'Joey', 'played'::attendance_status),
    ('W03', 'John', 'played'::attendance_status),
    ('W03', 'Stefan', 'played'::attendance_status),
    ('W03', 'Zach', 'played'::attendance_status),
    ('W02', 'Bird', 'played'::attendance_status),
    ('W02', 'Brandt', 'no_show'::attendance_status),
    ('W02', 'Bryan', 'played'::attendance_status),
    ('W02', 'GT', 'played'::attendance_status),
    ('W02', 'Hunter', 'no_show'::attendance_status),
    ('W02', 'Jared', 'no_show'::attendance_status),
    ('W02', 'Joe', 'played'::attendance_status),
    ('W02', 'Joey', 'played'::attendance_status),
    ('W02', 'John', 'no_show'::attendance_status),
    ('W02', 'Stefan', 'no_show'::attendance_status),
    ('W02', 'Zach', 'played'::attendance_status),
    ('W01', 'Bird', 'played'::attendance_status),
    ('W01', 'Brandt', 'played'::attendance_status),
    ('W01', 'Bryan', 'played'::attendance_status),
    ('W01', 'GT', 'played'::attendance_status),
    ('W01', 'Hunter', 'played'::attendance_status),
    ('W01', 'Jared', 'no_show'::attendance_status),
    ('W01', 'Joe', 'played'::attendance_status),
    ('W01', 'Joey', 'played'::attendance_status),
    ('W01', 'John', 'played'::attendance_status),
    ('W01', 'Stefan', 'no_show'::attendance_status),
    ('W01', 'Zach', 'played'::attendance_status)
)
insert into weekly_rsvps (weekly_event_id, golfer_id, status)
select weekly_events.id, golfers.id, seed_rsvps.status
from seed_rsvps
join seasons on seasons.year = 2026
join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_rsvps.week_code
join golfers on golfers.display_name = seed_rsvps.display_name
on conflict (weekly_event_id, golfer_id) do update
set status = excluded.status, updated_at = now();

with seed_snapshots(week_code, display_name, handicap, half_handicap) as (
  values
    ('W06', 'Bird', 15.8::numeric, 8),
    ('W06', 'Brandt', 10::numeric, 5),
    ('W06', 'GT', 13.8::numeric, 7),
    ('W06', 'Joe', 18.5::numeric, 10),
    ('W06', 'Joey', 11::numeric, 6),
    ('W06', 'John', 31.7::numeric, 16),
    ('W06', 'Stefan', 11.5::numeric, 6),
    ('W06', 'Zach', 19.4::numeric, 10),
    ('W05', 'Bryan', 13.1::numeric, 7),
    ('W05', 'Hunter', 27.4::numeric, 14),
    ('W05', 'Jared', 28.9::numeric, 15),
    ('W05', 'Joe', 18.1::numeric, 10),
    ('W05', 'Joey', 11.5::numeric, 6),
    ('W05', 'Stefan', 11.7::numeric, 6),
    ('W05', 'Zach', 19::numeric, 10),
    ('W04', 'Bird', 15.3::numeric, 8),
    ('W04', 'Bryan', 12.8::numeric, 7),
    ('W04', 'GT', 13.3::numeric, 7),
    ('W04', 'Hunter', 27.4::numeric, 14),
    ('W04', 'Joe', 18.3::numeric, 10),
    ('W04', 'John', 28.8::numeric, 15),
    ('W04', 'Stefan', 13.4::numeric, 7),
    ('W04', 'Zach', 19::numeric, 10),
    ('W03', 'Bird', 16.1::numeric, 9),
    ('W03', 'Bryan', 13.7::numeric, 7),
    ('W03', 'GT', 13.4::numeric, 7),
    ('W03', 'Hunter', 27.4::numeric, 14),
    ('W03', 'Jared', 28.7::numeric, 15),
    ('W03', 'Joey', 11.7::numeric, 6),
    ('W03', 'John', 28.8::numeric, 15),
    ('W03', 'Stefan', 8::numeric, 4),
    ('W03', 'Zach', 17.8::numeric, 9),
    ('W02', 'Bird', 15.3::numeric, 8),
    ('W02', 'Bryan', 13.1::numeric, 7),
    ('W02', 'GT', 13.6::numeric, 7),
    ('W02', 'Joe', 18.2::numeric, 10),
    ('W02', 'Joey', 11.6::numeric, 6),
    ('W02', 'Zach', 17.8::numeric, 9),
    ('W01', 'Bird', 16.8::numeric, 9),
    ('W01', 'Brandt', 9.1::numeric, 5),
    ('W01', 'Bryan', 13.9::numeric, 7),
    ('W01', 'GT', 12.7::numeric, 7),
    ('W01', 'Hunter', 28::numeric, 14),
    ('W01', 'Joe', 17.9::numeric, 9),
    ('W01', 'Joey', 10.9::numeric, 6),
    ('W01', 'John', 28::numeric, 14),
    ('W01', 'Zach', 21::numeric, 11)
)
insert into golfer_handicap_snapshots (season_id, golfer_id, effective_week_id, handicap, half_handicap, source)
select seasons.id, golfers.id, weekly_events.id, seed_snapshots.handicap, seed_snapshots.half_handicap, 'import'::handicap_snapshot_source
from seed_snapshots
join seasons on seasons.year = 2026
join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_snapshots.week_code
join golfers on golfers.display_name = seed_snapshots.display_name
on conflict (season_id, golfer_id, effective_week_id) do update
set handicap = excluded.handicap, half_handicap = excluded.half_handicap;

with w01 as (
  select id from weekly_events where week_code = 'W01' and season_id = (select id from seasons where year = 2026)
), seed_matches(starts_at, random_seed) as (
  values
    ('17:40'::time, 'workbook-0512-import-1740'),
    ('17:50'::time, 'workbook-0512-import-1750'),
    ('18:00'::time, 'workbook-0512-import-1800')
)
insert into weekly_matches (weekly_event_id, tee_time_id, format, status, random_seed, generated_at, published_at, completed_at)
select w01.id, weekly_tee_times.id, 'one_v_one_v_one', 'draft', seed_matches.random_seed, '2026-05-12 17:00:00-06'::timestamptz, '2026-05-12 17:00:00-06'::timestamptz, '2026-05-12 20:00:00-06'::timestamptz
from seed_matches
cross join w01
join weekly_tee_times on weekly_tee_times.weekly_event_id = w01.id and weekly_tee_times.starts_at = seed_matches.starts_at
where not exists (select 1 from weekly_matches where weekly_matches.weekly_event_id = w01.id and weekly_matches.random_seed = seed_matches.random_seed);

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
insert into weekly_match_sides (match_id, side_number, side_half_handicap, result)
select weekly_matches.id, seed_sides.side_number, seed_sides.side_half_handicap, seed_sides.result
from seed_sides
join weekly_matches on weekly_matches.random_seed = seed_sides.random_seed
join weekly_events on weekly_events.id = weekly_matches.weekly_event_id
join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026
on conflict (match_id, side_number) do update
set side_half_handicap = excluded.side_half_handicap, result = excluded.result, updated_at = now();

with seed_participants(random_seed, side_number, display_name, handicap_snapshot, half_handicap_snapshot) as (
  values
    ('workbook-0512-import-1740', 1, 'Bryan', 13.9::numeric, 7),
    ('workbook-0512-import-1740', 2, 'Joe', 17.9::numeric, 9),
    ('workbook-0512-import-1740', 3, 'John', 28::numeric, 14),
    ('workbook-0512-import-1750', 1, 'Brandt', 9.1::numeric, 5),
    ('workbook-0512-import-1750', 2, 'Bird', 16.8::numeric, 9),
    ('workbook-0512-import-1750', 3, 'Hunter', 28::numeric, 14),
    ('workbook-0512-import-1800', 1, 'GT', 12.7::numeric, 7),
    ('workbook-0512-import-1800', 2, 'Zach', 21::numeric, 11),
    ('workbook-0512-import-1800', 3, 'Joey', 10.9::numeric, 6)
)
insert into weekly_match_participants (match_id, match_side_id, golfer_id, handicap_snapshot, half_handicap_snapshot)
select weekly_matches.id, weekly_match_sides.id, golfers.id, seed_participants.handicap_snapshot, seed_participants.half_handicap_snapshot
from seed_participants
join weekly_matches on weekly_matches.random_seed = seed_participants.random_seed
join weekly_events on weekly_events.id = weekly_matches.weekly_event_id
join seasons on seasons.id = weekly_events.season_id and seasons.year = 2026
join weekly_match_sides on weekly_match_sides.match_id = weekly_matches.id and weekly_match_sides.side_number = seed_participants.side_number
join golfers on golfers.display_name = seed_participants.display_name
on conflict (match_id, golfer_id) do update
set match_side_id = excluded.match_side_id, handicap_snapshot = excluded.handicap_snapshot, half_handicap_snapshot = excluded.half_handicap_snapshot, updated_at = now();

update weekly_matches
set status = 'completed', updated_at = now()
where random_seed in ('workbook-0512-import-1740', 'workbook-0512-import-1750', 'workbook-0512-import-1800')
and weekly_event_id = (select weekly_events.id from weekly_events join seasons on seasons.id = weekly_events.season_id where seasons.year = 2026 and weekly_events.week_code = 'W01');

with seed_results(week_code, display_name, attendance_status, match_result, handicap_snapshot, gross_score, net_score, putts) as (
  values
    ('W07', 'Bird', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Brandt', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Bryan', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'GT', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Hunter', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Jared', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Joe', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Joey', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'John', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Stefan', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W07', 'Zach', 'unknown'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W06', 'Bird', 'played'::attendance_status, 'tied'::match_result, 15.8::numeric, 47, 39, 19),
    ('W06', 'Brandt', 'played'::attendance_status, 'tied'::match_result, 10::numeric, 49, 44, 0),
    ('W06', 'Bryan', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W06', 'GT', 'played'::attendance_status, 'lost'::match_result, 13.8::numeric, 44, 37, 20),
    ('W06', 'Hunter', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W06', 'Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W06', 'Joe', 'played'::attendance_status, 'tied'::match_result, 18.5::numeric, 47, 37, 17),
    ('W06', 'Joey', 'played'::attendance_status, 'won'::match_result, 11::numeric, 40, 34, 15),
    ('W06', 'John', 'played'::attendance_status, 'lost'::match_result, 31.7::numeric, 63, 47, 0),
    ('W06', 'Stefan', 'played'::attendance_status, 'won'::match_result, 11.5::numeric, 43, 37, 16),
    ('W06', 'Zach', 'played'::attendance_status, 'tied'::match_result, 19.4::numeric, 46, 36, 15),
    ('W05', 'Bird', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W05', 'Brandt', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W05', 'Bryan', 'played'::attendance_status, 'tied'::match_result, 13.1::numeric, 43, 36, 19),
    ('W05', 'GT', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W05', 'Hunter', 'played'::attendance_status, 'won'::match_result, 27.4::numeric, 58, 44, 18),
    ('W05', 'Jared', 'played'::attendance_status, 'tied'::match_result, 28.9::numeric, 58, 43, 20),
    ('W05', 'Joe', 'played'::attendance_status, 'lost'::match_result, 18.1::numeric, 49, 39, 19),
    ('W05', 'Joey', 'played'::attendance_status, 'won'::match_result, 11.5::numeric, 41, 35, 17),
    ('W05', 'John', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W05', 'Stefan', 'played'::attendance_status, 'tied'::match_result, 11.7::numeric, 44, 38, 16),
    ('W05', 'Zach', 'played'::attendance_status, 'lost'::match_result, 19::numeric, 51, 41, 16),
    ('W04', 'Bird', 'played'::attendance_status, 'won'::match_result, 15.3::numeric, 44, 36, 18),
    ('W04', 'Brandt', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W04', 'Bryan', 'played'::attendance_status, 'lost'::match_result, 12.8::numeric, 43, 36, 16),
    ('W04', 'GT', 'played'::attendance_status, 'won'::match_result, 13.3::numeric, 48, 41, 18),
    ('W04', 'Hunter', 'played'::attendance_status, 'lost'::match_result, 27.4::numeric, 54, 40, 14),
    ('W04', 'Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W04', 'Joe', 'played'::attendance_status, 'won'::match_result, 18.3::numeric, 47, 37, 13),
    ('W04', 'Joey', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W04', 'John', 'played'::attendance_status, 'lost'::match_result, 28.8::numeric, 54, 39, 17),
    ('W04', 'Stefan', 'played'::attendance_status, 'won'::match_result, 13.4::numeric, 41, 34, 17),
    ('W04', 'Zach', 'played'::attendance_status, 'lost'::match_result, 19::numeric, 47, 37, 19),
    ('W03', 'Bird', 'played'::attendance_status, 'won'::match_result, 16.1::numeric, 42, 33, 20),
    ('W03', 'Brandt', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W03', 'Bryan', 'played'::attendance_status, 'won'::match_result, 13.7::numeric, 39, 32, 17),
    ('W03', 'GT', 'played'::attendance_status, 'lost'::match_result, 13.4::numeric, 44, 37, 15),
    ('W03', 'Hunter', 'played'::attendance_status, 'lost'::match_result, 27.4::numeric, 54, 40, 19),
    ('W03', 'Jared', 'played'::attendance_status, 'tied'::match_result, 28.7::numeric, 52, 37, 18),
    ('W03', 'Joe', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W03', 'Joey', 'played'::attendance_status, 'tied'::match_result, 11.7::numeric, 42, 36, 17),
    ('W03', 'John', 'played'::attendance_status, 'lost'::match_result, 28.8::numeric, 54, 39, 19),
    ('W03', 'Stefan', 'played'::attendance_status, 'lost'::match_result, 8::numeric, 41, 37, 17),
    ('W03', 'Zach', 'played'::attendance_status, 'tied'::match_result, 17.8::numeric, 49, 40, 19),
    ('W02', 'Bird', 'played'::attendance_status, 'won'::match_result, 15.3::numeric, 46, 38, 19),
    ('W02', 'Brandt', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W02', 'Bryan', 'played'::attendance_status, 'lost'::match_result, 13.1::numeric, 45, 38, 18),
    ('W02', 'GT', 'played'::attendance_status, 'won'::match_result, 13.6::numeric, 40, 33, 19),
    ('W02', 'Hunter', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W02', 'Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W02', 'Joe', 'played'::attendance_status, 'lost'::match_result, 18.2::numeric, 50, 40, 18),
    ('W02', 'Joey', 'played'::attendance_status, 'lost'::match_result, 11.6::numeric, 45, 39, 19),
    ('W02', 'John', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W02', 'Stefan', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W02', 'Zach', 'played'::attendance_status, 'lost'::match_result, 17.8::numeric, 52, 43, 18),
    ('W01', 'Bird', 'played'::attendance_status, 'won'::match_result, 16.8::numeric, 42, 33, 21),
    ('W01', 'Brandt', 'played'::attendance_status, 'lost'::match_result, 9.1::numeric, 51, 46, 16),
    ('W01', 'Bryan', 'played'::attendance_status, 'tied'::match_result, 13.9::numeric, 42, 35, 18),
    ('W01', 'GT', 'played'::attendance_status, 'lost'::match_result, 12.7::numeric, 44, 37, 15),
    ('W01', 'Hunter', 'played'::attendance_status, 'lost'::match_result, 28::numeric, 55, 41, 18),
    ('W01', 'Jared', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W01', 'Joe', 'played'::attendance_status, 'tied'::match_result, 17.9::numeric, 42, 33, 17),
    ('W01', 'Joey', 'played'::attendance_status, 'lost'::match_result, 10.9::numeric, 44, 38, 18),
    ('W01', 'John', 'played'::attendance_status, 'tied'::match_result, 28::numeric, 60, 46, 18),
    ('W01', 'Stefan', 'no_show'::attendance_status, 'not_applicable'::match_result, null::numeric, null::integer, null::integer, null::integer),
    ('W01', 'Zach', 'played'::attendance_status, 'won'::match_result, 21::numeric, 40, 29, 13)
)
insert into weekly_results (weekly_event_id, golfer_id, attendance_status, match_side_id, match_result, handicap_snapshot, gross_score, net_score, putts)
select weekly_events.id, golfers.id, seed_results.attendance_status, weekly_match_sides.id, seed_results.match_result, seed_results.handicap_snapshot, seed_results.gross_score, seed_results.net_score, seed_results.putts
from seed_results
join seasons on seasons.year = 2026
join weekly_events on weekly_events.season_id = seasons.id and weekly_events.week_code = seed_results.week_code
join golfers on golfers.display_name = seed_results.display_name
left join weekly_match_participants on weekly_match_participants.golfer_id = golfers.id
left join weekly_matches on weekly_matches.id = weekly_match_participants.match_id and weekly_matches.weekly_event_id = weekly_events.id
left join weekly_match_sides on weekly_match_sides.id = weekly_match_participants.match_side_id
on conflict (weekly_event_id, golfer_id) do update
set attendance_status = excluded.attendance_status, match_side_id = excluded.match_side_id, match_result = excluded.match_result, handicap_snapshot = excluded.handicap_snapshot, gross_score = excluded.gross_score, net_score = excluded.net_score, putts = excluded.putts, updated_at = now();

commit;