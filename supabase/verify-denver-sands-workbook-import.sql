with season as (
  select id
  from seasons
  where year = 2026
),
week_counts as (
  select
    count(*) as weekly_events,
    count(*) filter (where status = 'completed') as completed_events,
    count(*) filter (where status = 'planned') as planned_events
  from weekly_events
  where season_id = (select id from season)
),
result_counts as (
  select
    count(*) as weekly_results,
    count(*) filter (where attendance_status = 'played') as played_results,
    count(*) filter (where attendance_status = 'no_show') as no_show_results,
    count(*) filter (where attendance_status = 'unknown') as unknown_results
  from weekly_results
  join weekly_events on weekly_events.id = weekly_results.weekly_event_id
  where weekly_events.season_id = (select id from season)
),
latest_completed_week as (
  select week_code, play_date
  from weekly_events
  where season_id = (select id from season)
  and status = 'completed'
  order by play_date desc
  limit 1
)
select
  (select count(*) from golfers where active) as active_golfers,
  week_counts.weekly_events,
  week_counts.completed_events,
  week_counts.planned_events,
  result_counts.weekly_results,
  result_counts.played_results,
  result_counts.no_show_results,
  result_counts.unknown_results,
  latest_completed_week.week_code as latest_completed_week,
  latest_completed_week.play_date as latest_completed_date
from week_counts
cross join result_counts
cross join latest_completed_week;
