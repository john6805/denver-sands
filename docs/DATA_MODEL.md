# Data Model

This document proposes a normalized relational data model for the league app.

## Principles

- Store raw facts and snapshots.
- Calculate standings and points dynamically.
- Preserve historical context when handicaps, courses, or rules change.
- Avoid spreadsheet placeholders such as `-`, `n/a`, and blank numeric cells.
- Keep admin overrides auditable.

## Tables

### seasons

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| name | text | Example: `2026 Denver Sands` |
| year | integer | 2026 |
| starts_on | date | Season start |
| ends_on | date | Season end; editable and may remain TBD during setup |
| weekly_play_day | integer | Tuesday = 2 if using ISO weekday |
| entry_fee_cents | integer | Optional future field; first version has no buy-in |
| drop_lowest_week_count | integer | Default 2 |
| status | enum | draft, active, finalized |

### golfers

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| display_name | text | Unique within season preferred |
| full_name | text | Optional |
| email | text | Optional |
| active | boolean | Roster status |

### season_golfers

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| golfer_id | uuid | FK golfers |
| starting_handicap | decimal | Optional |
| current_handicap | decimal | Manually updated from 18Birdies |
| paid_status | enum | Optional future field; first version can omit |
| joined_on | date | Optional |
| left_on | date | Optional |

### golfer_handicap_snapshots

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| golfer_id | uuid | FK golfers |
| effective_week_id | uuid | FK weekly_events |
| handicap | decimal | Full handicap |
| source | enum | admin, import, calculated |
| created_at | datetime | Audit |

### courses

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| name | text | Normalized course name |
| booking_url | text | Optional |
| rank | text | Workbook has rank such as `A` |
| active | boolean | Course pool status |

### course_holes

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| course_id | uuid | FK courses |
| hole_number | integer | 1-18 |
| par | integer | Optional |
| handicap_rank | integer | 1 = toughest |

### course_votes

Optional future table.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| course_id | uuid | FK courses |
| golfer_id | uuid | FK golfers |
| vote_type | enum | include, tournament |
| created_at | datetime | Audit |

### weekly_events

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| week_code | text | Example: `W01` |
| play_date | date | Tuesday date |
| course_id | uuid | FK courses, nullable until assigned |
| status | enum | planned, open, matchups_published, completed, locked, canceled |
| notes | text | Optional |

### weekly_tee_times

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| weekly_event_id | uuid | FK weekly_events |
| starts_at | time | Tee time |
| sort_order | integer | Display order |

### weekly_rsvps

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| weekly_event_id | uuid | FK weekly_events |
| golfer_id | uuid | FK golfers |
| status | enum | unknown, confirmed, declined, no_show, played |
| updated_by | uuid | Admin/user id if auth exists |
| updated_at | datetime | Audit |

### weekly_matches

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| weekly_event_id | uuid | FK weekly_events |
| tee_time_id | uuid | FK weekly_tee_times, nullable |
| format | enum | two_v_two, one_v_one, one_v_one_v_one |
| status | enum | draft, published, completed |
| random_seed | text | Optional reproducibility |
| generated_at | datetime | Audit |

### weekly_match_sides

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| match_id | uuid | FK weekly_matches |
| side_number | integer | 1, 2, or 3 |
| side_half_handicap | integer | Optional calculated snapshot for non-2v2 formats/display |
| result | enum | won, tied, lost, not_applicable |

### weekly_match_participants

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| match_side_id | uuid | FK weekly_match_sides |
| golfer_id | uuid | FK golfers |
| handicap_snapshot | decimal | Full handicap used that week |
| half_handicap_snapshot | integer | `ceil(handicap / 2)` |

### stroke_allocations

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| match_id | uuid | FK weekly_matches |
| receiving_side_id | uuid | FK weekly_match_sides |
| against_side_id | uuid | FK weekly_match_sides, nullable for team-level display |
| hole_number | integer | Hole where stroke applies |
| strokes | integer | Usually 1 |

### weekly_results

One row per golfer per week.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| weekly_event_id | uuid | FK weekly_events |
| golfer_id | uuid | FK golfers |
| attendance_status | enum | unknown, confirmed, no_show, played |
| match_side_id | uuid | FK weekly_match_sides, nullable |
| match_result | enum | won, tied, lost, not_applicable |
| handicap_snapshot | decimal | Full handicap |
| gross_score | integer | Nullable |
| net_score | integer | Nullable; entered from 18Birdies |
| putts | integer | Nullable |
| beers | integer | Default 0 |
| paid_status | enum | Optional future field; first version can omit |
| locked_at | datetime | Nullable |

### weekly_point_breakdowns

This can be a materialized/cache table or computed view. Prefer dynamic calculation first.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| weekly_result_id | uuid | FK weekly_results |
| net_score | integer | Entered value copied for breakdown; fallback-calculated only if missing |
| attendance_points | integer | Calculated |
| match_points | integer | Calculated |
| gross_points | integer | Calculated |
| net_points | integer | Calculated |
| putt_points | integer | Calculated |
| total_points | integer | Calculated |
| calculation_version | text | Rules version |

### tournaments

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| course_id | uuid | FK courses |
| name | text | End-of-season tournament |
| starts_on | date | Day 1 |
| ends_on | date | Day 2 |
| status | enum | planned, completed, locked |

### tournament_rounds

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| tournament_id | uuid | FK tournaments |
| round_number | integer | 1 or 2 |
| play_date | date | Date |
| holes | integer | 18 |

### tournament_results

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| tournament_id | uuid | FK tournaments |
| golfer_id | uuid | FK golfers |
| round_1_score | integer | Nullable |
| round_2_score | integer | Nullable |
| total_score | integer | Calculated or stored snapshot |
| place | integer | Calculated/locked |
| tournament_points | integer | From placement table |

### awards

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| season_id | uuid | FK seasons |
| type | enum | mvp, going_low, stroke_king, least_match_wins, highest_net, highest_putts, tournament_champion, points_champion |
| label | text | Display name |
| payout_cents | integer | Optional future field; first version has no payouts |
| action_text | text | For sanctions |

### award_results

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| award_id | uuid | FK awards |
| golfer_id | uuid | FK golfers |
| metric_value | decimal | Winning stat |
| rank | integer | Supports ties |
| finalized_at | datetime | Audit |

### admin_audit_events

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| actor_id | uuid | User/admin id if auth exists |
| entity_type | text | Example: weekly_result |
| entity_id | uuid | Target record |
| action | text | created, updated, override, locked |
| before_json | json | Optional |
| after_json | json | Optional |
| reason | text | Required for overrides |
| created_at | datetime | Audit |

## Recommended Enums

Attendance:

- unknown
- confirmed
- declined
- no_show
- played

Match result:

- won
- tied
- lost
- not_applicable

Match format:

- two_v_two
- one_v_one
- one_v_one_v_one

Week status:

- planned
- open
- matchups_published
- completed
- locked
- canceled

## Dynamic Calculations

Prefer computed services/views for:

- Half handicap.
- Net score fallback/validation.
- Rank points.
- Weekly total points.
- Raw season points.
- Official season points after drops.
- Leaderboard position.
- Points behind.
- Award/sanction winners.
- Tournament points.

Use stored snapshots for:

- Handicap at time of event.
- Generated matchups.
- Stroke allocations.
- Locked/finalized calculation outputs if audit/reproducibility requires them.

## Import Mapping From Workbook

`Weekly Point Data` maps mostly to `weekly_results`:

- Week -> `weekly_events.week_code`
- Date -> `weekly_events.play_date`
- Course -> `courses.name`
- Golfer -> `golfers.display_name`
- Showed -> `weekly_results.attendance_status`
- Beers -> `weekly_results.beers`
- Paid -> `weekly_results.paid_status`
- Partner -> match participant/team relationship, but active data uses `-`
- Match Result -> `weekly_results.match_result`
- HC -> `weekly_results.handicap_snapshot`
- Gross Score -> `weekly_results.gross_score`
- Net Score -> `weekly_results.net_score`
- Putts -> `weekly_results.putts`

Formula/output columns should be recalculated, not imported as authoritative:

- Showing Up Points.
- Match Points.
- Gross Points.
- Net Points.
- Putt Points.
- Points.
