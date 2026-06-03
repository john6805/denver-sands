# Scoring Rules

This document converts the league rules and workbook formulas into explicit, testable app logic.

## Core Inputs

For each golfer-week, the app needs:

- Attendance status.
- Match result.
- Handicap used for that week.
- Gross score.
- Putts.
- Match format and team/group membership.

Confirmed setup decisions:

- Weekly play is nine holes.
- 2026-05-12 was the first week of play for the current workbook import.
- The final season end date is TBD and should remain editable; it does not block scoring implementation.

## Attendance Points

Workbook rule:

| Status | Points |
| --- | ---: |
| `Yes` | 3 |
| `Confirmed` | 3 |
| `No` | 0 |
| `unk` | 0 |

Implementation rule:

```text
attendance_points(status):
  if status in ["YES", "CONFIRMED"] return 3
  if status in ["NO", "UNKNOWN"] return 0
```

Normalize workbook `unk` to `UNKNOWN`.

Decision:

- Show-up points are official league scoring and should be included in weekly totals.
- Planned/unplayed `UNKNOWN` weeks are excluded from completed-week, leaderboard, and drop-week calculations.
- Canceled/weather weeks are excluded from drop-week calculations.

## Match Points

Workbook and Word rule:

| Match result | Points |
| --- | ---: |
| Won | 5 |
| Tied | 2 |
| Lost | 0 |
| n/a | 0 |

Implementation rule:

```text
match_points(result):
  WON -> 5
  TIED -> 2
  LOST -> 0
  NOT_APPLICABLE -> 0
```

No-show golfers should receive `NOT_APPLICABLE` or no result and 0 match points.

## Half Handicap

Workbook rule:

```text
half_handicap = ceil(handicap / 2)
```

This is used for match stroke references and as a net-score fallback/check. Official first-version net scoring uses the admin-entered net score from 18Birdies.

Examples:

| Handicap | Half handicap |
| ---: | ---: |
| 9.1 | 5 |
| 10.9 | 6 |
| 13.9 | 7 |
| 16.8 | 9 |
| 17.9 | 9 |
| 21.0 | 11 |
| 28.0 | 14 |

## Net Score

First-version official rule:

- Admin enters the gross score and net score from 18Birdies.
- The app stores the entered net score and uses it for net rank points.
- Handicap is tracked in 18Birdies and manually updated in the league app.

Workbook fallback/check:

```text
net_score = gross_score - ceil(handicap / 2)
```

Use this as a validation/fallback calculation when an entered net score is missing, not as the only official net score source.

Workbook test cases:

| Golfer | Handicap | Gross | Expected net |
| --- | ---: | ---: | ---: |
| Zach | 21.0 | 40 | 29 |
| Joe | 17.9 | 42 | 33 |
| Bird | 16.8 | 42 | 33 |
| Bryan | 13.9 | 42 | 35 |
| John | 28.0 | 60 | 46 |

No-show, missing score, missing net score, or missing handicap should produce no net score, not `0`.

## Gross Rank Points

Workbook and Word rule:

| Gross rank | Points |
| ---: | ---: |
| 1 | 6 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |
| 6+ | 0 |

Ranking direction:

- Lower gross score is better.
- No-shows and missing/non-numeric scores are excluded.

Tie handling:

- The workbook appears to intend dense ranking, but the rank point columns are manually entered and contain likely inconsistencies.
- Use dense ranking. Tied golfers receive the same points, and the next distinct score receives the next rank. This is recommended because it is simple, generous for ties, and avoids punishing the field too harshly in a small recreational league.

Dense ranking example:

```text
scores: 40, 42, 42, 44, 51
ranks:  1,  2,  2,  3,  4
points: 6,  4,  4,  3,  2
```

## Net Rank Points

Workbook rule:

| Net rank | Points |
| ---: | ---: |
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |
| 6+ | 0 |

Ranking direction:

- Lower net score is better.
- No-shows and missing/non-numeric net scores are excluded.

Tie handling:

- Use dense ranking.

## Putt Rank Points

Workbook and Word rule:

| Putt rank | Points |
| ---: | ---: |
| 1 | 4 |
| 2 | 3 |
| 3 | 2 |
| 4 | 1 |
| 5+ | 0 |

Ranking direction:

- Fewer putts is better.
- No-shows and missing/non-numeric putt counts are excluded.

Tie handling:

- Use dense ranking.

Data warning:

- Hidden example sheets include putt point values of `5`, but the visible scoring rules and Word document cap putt points at `4`. Use the `4,3,2,1,0` rule unless the league revises it.

## Total Weekly Points

Workbook rule:

```text
weekly_points =
  attendance_points
  + match_points
  + gross_rank_points
  + net_rank_points
  + putt_rank_points
```

Audited overrides:

- Admins may override calculated rank points only through an audited correction flow with a required reason.
- Overrides should not be part of the first scoring service unless the implementing ticket explicitly includes audit behavior.

## Season Points

Current workbook behavior:

```text
season_points = sum(all weekly_points)
```

Word document rule:

```text
official_season_points = sum(weekly_points after dropping each golfer's 2 lowest-scoring weeks)
```

Implementation rule:

- During the season, show both raw points and projected official points if useful.
- For final standings, drop each golfer's two lowest weekly point totals.
- Planned/unplayed weeks with `UNKNOWN` status should not count as low weeks.
- No-show completed weeks with 0 points should count as eligible low weeks.
- Canceled/weather weeks should not count as low weeks.

Purpose:

- Dropping the two lowest weeks softens the impact of vacations, schedule conflicts, illness, weather weirdness, and one truly bad round.
- It keeps the season competitive without requiring perfect attendance.
- It should not erase planned/unplayed future weeks or canceled weeks.

## Tournament Points

Word document rule:

| Tournament place | Points |
| ---: | ---: |
| 1 | 12 |
| 2 | 9 |
| 3 | 8 |
| 4 | 7 |
| 5 | 6 |
| 6 | 5 |
| 7 | 4 |
| 8+ | 2 |

Tournament scoring basis:

- Tournament placement is based on total net score across the two 18-hole rounds.
- Tournament points do not count toward Points Champion.
- Tournament results do not affect regular-season awards or sanctions.

Tournament tie-breakers:

1. Lower total putts across both tournament rounds.
2. Lower final-round net score.
3. Lower final-round putts.
4. If still tied, share the place and each tied golfer receives the points for that place.

## Award And Sanction Metrics

Awards:

- MVP: most team match wins.
- Going Low: lowest net score of the season.
- Stroke King: lowest putts in one week.

Sanctions:

- Stephen Glansberg Award: least team match wins.
- Wiz Khalifa Award: highest net score of the season.
- 3putt King Award: highest putts in one week.

Champion metrics:

- Tournament Champion: winner of end-of-season tournament.
- Points Champion: highest official season points.

Tie-breaker policies:

| Metric | Tie-breakers |
| --- | --- |
| MVP: most team match wins | 1. Higher match win percentage, 2. higher official season points, 3. higher raw season points, 4. share award |
| Going Low: lowest regular-season net score | 1. Lower putts in that week, 2. lower gross score in that week, 3. share award |
| Stroke King: lowest putts in one regular-season week | 1. Lower net score in that week, 2. lower gross score in that week, 3. share award |
| Least team match wins sanction | 1. Lower match win percentage, 2. more matches played, 3. lower official season points, 4. share sanction |
| Highest regular-season net score sanction | 1. Higher putts in that week, 2. higher gross score in that week, 3. share sanction |
| Highest putts in one regular-season week sanction | 1. Higher net score in that week, 2. higher gross score in that week, 3. share sanction |
| Tournament Champion | Tournament tie-breakers above |
| Points Champion | 1. Higher raw season points before drops, 2. more match wins, 3. lowest regular-season net score, 4. share championship |
