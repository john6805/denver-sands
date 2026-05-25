# Product Spec

## Product Goal

Build a web application that replaces the current Excel/Word workflow for managing the Denver Sands / Clubhouse Zyndicates recreational golf league.

The app should preserve the league's current scoring and matchup behavior while making weekly operations easier, less error-prone, and auditable.

## Primary Users

- League admin/commissioner: manages schedule, courses, golfer roster, RSVPs, match generation, score entry, scoring corrections, and final standings.
- Golfer: views schedule, RSVP status, weekly matchups, scores, leaderboard, rules, awards, and sanctions.

## Source Documents

- Workbook: `docs/Denver Sands Golf League.xlsx`
- Rules document: `docs/Clubhouse Zyndicates GL.docx`

## Current Process Summary

1. Maintain schedule and course/tee-time details in Excel.
2. Track golfer availability/status manually.
3. Generate weekly teams using a scratchpad and external randomizer.
4. Calculate handicap stroke differences in Excel.
5. Enter weekly results manually in `Weekly Point Data`.
6. Manually enter rank points for gross, net, and putts.
7. Leaderboard formulas aggregate weekly rows.
8. End-of-season rules from the Word document are not fully implemented in the workbook.

## In Scope

- Season setup.
- Golfer roster.
- Course catalog with booking links and hole handicap ratings.
- Schedule management.
- RSVP/attendance tracking.
- Weekly random match generation.
- Match format support: 2v2, 1v1, and 1v1v1.
- Weekly score/result entry.
- Handicap snapshot per week.
- Stroke allocation by hole handicap rating.
- Scoring calculations.
- Leaderboards.
- Drop-two-lowest-weeks final standings.
- End-of-season tournament tracking.
- Awards, sanctions, and champions.
- Rules reference page.
- Admin correction/audit workflow.

## Out Of Scope For Initial Build

- Live tee-time booking integrations.
- Payments collection.
- GHIN or external handicap sync.
- Fully automated course voting workflow, unless added later.
- Mobile push notifications.
- Real-time live scoring.

## Core Objects

- Season.
- Golfer.
- Course.
- Course hole.
- Weekly event.
- Tee time.
- RSVP/attendance.
- Match.
- Match participant/team.
- Scorecard or weekly result.
- Handicap snapshot.
- Point calculation.
- Tournament.
- Award/sanction.

## Weekly League Workflow

1. Admin creates or confirms the weekly event.
2. Admin assigns course and tee times.
3. Golfers RSVP or admin marks attendance.
4. App snapshots current handicaps for confirmed golfers.
5. Admin generates matchups.
6. App checks pairing constraints and calculates strokes.
7. Admin reviews, edits if needed, and publishes matchups.
8. After play, admin enters:
   - Attendance/no-show.
   - Match result.
   - Gross score.
   - Net score from 18Birdies.
   - Putts.
   - Optional beers.
9. App calculates:
   - Net score fallback/validation if needed.
   - Attendance points.
   - Match points.
   - Gross rank points.
   - Net rank points.
   - Putt rank points.
   - Total weekly points.
10. App updates leaderboard and history views dynamically.
11. Admin reviews and locks the week.

## Admin Workflow

Admin capabilities:

- Manage seasons and schedule weeks.
- Manage courses and hole handicap ratings.
- Manage golfer roster and status.
- Enter/update golfer handicaps.
- Mark RSVP/attendance.
- Generate and publish matchups.
- Enter scores and match results.
- Review scoring calculation details.
- Override calculated values only where explicitly allowed, with an audit reason.
- Lock completed weeks.
- Configure award labels and sanction text.
- Run end-of-season finalization.

## Golfer Workflow

Golfer capabilities:

- View season schedule.
- View weekly course, tee times, and matchups.
- View strokes received/given.
- View leaderboard.
- View personal score/points history.
- View rules, awards, sanctions, and champions.
- RSVP if the league wants self-service.

## Match Generation Behavior

- Prefer 2v2 best-ball matches.
- Use 1v1 and 1v1v1 as fallback formats.
- Generate teams randomly.
- Prevent the same pair from being partners 3 weeks in a row when possible; also reduce repeated opponents/groupmates when random choices allow it.
- Use weekly handicap snapshots for stroke calculations.
- Calculate nine-hole strokes with `ceil(handicap / 2)`.
- Allocate strokes to the hardest holes based on course hole handicap ratings.
- Preserve generated matchups historically.
- Do not balance teams by handicap in the generator.

## Leaderboard Behavior

The app should support:

- Raw season points: sum of weekly points.
- Official season points: sum of weekly points after dropping each golfer's two lowest eligible weeks.
- Points behind leader.
- Match wins.
- No-show/blank weeks.
- Lowest gross score.
- Lowest net score.
- Lowest putts in one week.
- Beer count and points plus beer points as optional/social metrics.

Current workbook caveat:

- The active workbook leaderboard sums all weekly points and does not apply drop-week rules.

## Handicap Behavior

- Each golfer has a handicap that updates weekly.
- Each weekly result stores a handicap snapshot used for that week's calculations.
- Weekly nine-hole net scoring uses half-handicap rounded up.
- Official first-version net scoring uses the admin-entered net score from 18Birdies, with the workbook half-handicap formula available as a fallback/check.
- Historical scores should not change if a golfer's later handicap changes.
- Handicaps must be editable. Seed Stefan's handicap as 10 until his real handicap is known.

Handicap source:

- Handicaps are tracked in 18Birdies and manually updated in the league app.

## Stroke Allocation Behavior

- Strokes are based on handicap differences.
- Strokes are assigned to the toughest holes according to course hole handicap ratings.
- For nine-hole weekly play, use the holes actually played.
- If stroke count exceeds holes played, extra strokes are assigned by cycling through the same difficulty order again.
- Courses without hole handicap ratings should not be scheduled.
- For tournament play, use full handicap.

## End-Of-Season Tournament Behavior

- Two-day individual tournament.
- Two 18-hole rounds.
- Same course both days.
- Course is voted on midway through the season.
- Tournament points: 12, 9, 8, 7, 6, 5, 4, 2 for 8th+.
- Tournament Champion is the tournament winner.
- Tournament placement is based on net score.
- Tournament tie-breakers are total putts, final-round net score, then final-round putts.
- Tournament points do not feed the Points Champion calculation.

## Awards And Sanctions

Awards:

- MVP: most team match wins.
- Going Low: lowest net score of the season.
- Stroke King: lowest putts in one week.

Sanctions:

- Least team match wins.
- Highest net score of the season.
- Highest putts in one week.

Champions:

- Tournament Champion.
- Points Champion.

Awards/sanctions use the tie-breakers in `SCORING_RULES.md`.

There are no payout amounts in the current version because the first league iteration has no money buy-in.

Award/sanction preview leaderboards should be visible to all players during the season.

## Calculated Dynamically Instead Of Stored Manually

The app should calculate:

- Half handicap.
- Net score fallback/validation.
- Attendance points.
- Match points.
- Gross rank points.
- Net rank points.
- Putt rank points.
- Total weekly points.
- Season raw points.
- Official season points after dropped weeks.
- Points behind.
- Match win count.
- No-show count.
- Lowest/highest gross/net/putt stats.
- Beer totals.
- Tournament points.
- Award/sanction winners.

The app should store:

- Raw score inputs.
- Entered net score from 18Birdies.
- Match results.
- Attendance.
- Handicap snapshots.
- Matchups and tee times.
- Admin overrides/audit events.

## Edge Cases

- Planned future week with unknown attendance.
- No-show after matchups are generated.
- Missing handicap.
- Missing score or putts.
- Odd number of golfers.
- More golfers than tee times.
- Same pair would be partners for a third week in a row.
- Tied gross/net/putt ranks.
- Tied match.
- Deprecated 1vHandicap fallback from the Word document.
- Course missing hole handicap ratings.
- Course changed after matchups are generated.
- Week locked but correction needed.
- Golfer joins mid-season.
- Golfer leaves mid-season.
- Weather cancellation.
- Tournament ties.
- Drop-week behavior for no-shows and unplayed weeks.

## Non-Goals / Optional Future Enhancements

- Course voting UI.
- Tee-time booking links deep integration.
- Player self-service score entry.
- Per-hole live scoring.
- Automated handicap calculation.
- Notifications.
- Payment tracking.
- Import from the existing workbook.
