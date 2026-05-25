# Rules Document Analysis

Source: `docs/Clubhouse Zyndicates GL.docx`

## Overview

The Word document is the league constitution/rules source. It is concise and covers the season calendar, weekly matchup rules, weekly scoring categories, end-of-season tournament, awards, sanctions, champions, and general playing rules.

The document appears more authoritative for league policy than the workbook. The workbook appears more authoritative for current implementation details and active data.

## Season

Rules stated:

- Weekly play is every Tuesday from May through August.
- Courses are voted into the weekly course cycle.
- The document is marked `Season (TBD)`.
- Payout examples assume 10 golfers at $100 entry.

Application implications:

- A season should have configurable start/end dates, expected weekday, entry fee, and participants.
- The default 2026 season should use Tuesday play and a TBD season end date, likely in August.
- Course eligibility should be modeled as a voted/approved course pool.
- Payouts should be omitted in the first version because the first league iteration has no money buy-in.

Workbook cross-check:

- `Schedule` includes Tuesdays from May through September 2026, but the league now expects the season end to be TBD and likely in August.
- The workbook contains a course list and rank column but does not record votes.

## Weekly Matchups

Rules stated:

- Weekly matches are normally 2v2.
- Fallback formats are 1v1 and 1v1v1 for the first app version.
- Teams play best ball.
- Teams are randomly generated weekly.
- No two golfers should be paired together 3 weeks in a row.
- Handicaps update weekly.
- Strokes are given on the toughest holes per hole handicap ratings.

Application implications:

- The app needs a matchup generator that supports multiple formats.
- The generator should prefer 2v2 when attendance count allows.
- Fallback format selection depends on the number of attending golfers.
- Pairing history must be retained so the generator can detect repeated partnerships.
- The generator should allow admin override because random generation plus constraints may produce edge cases.
- Courses need hole handicap data to allocate strokes to specific holes.

Workbook cross-check:

- `Match Generator` and `0512 Match Generator` include templates for 2v2, 1v1, and 1v1v1.
- The workbook does not show a `1vHandicap` implementation beyond placeholder references to `Handicap` in example data, and the league does not expect to use 1vHandicap.
- `0512 Match Generator` used 1v1v1 for 9 confirmed players.
- The workbook calculates strokes from half handicaps for nine-hole play.

## Weekly Point System

Rules stated:

- Weekly scoring has three areas:
  - Match play.
  - Individual stroke play.
  - Putts.
- Golfer weekly points sum through the season.
- Each golfer drops their 2 lowest-scoring weeks at the end of the season.
- Handicaps are included in both match play and individual play.
- Strokes are given on the toughest holes per handicap ratings.

Word table rules:

| Category | Points |
| --- | --- |
| Match play | Win 5, tie 2, loss 0 |
| Individual stroke play | 1st 6, 2nd 4, 3rd 3, 4th 2, 5th 1, 6th+ 0 |
| Putts | Lowest 4, 2nd 3, 3rd 2, 4th 1, 5th+ 0 |

Application implications:

- Weekly totals should include at least match play, gross stroke rank, net stroke rank, and putt rank.
- Show-up points are official league scoring even though the Word document does not mention them.
- The Word document says individual stroke play, singular, but the workbook splits it into gross and net scoring. The app should preserve the workbook split unless league confirms otherwise.
- End-of-season official points must drop each golfer's two lowest-scoring weeks.

Workbook cross-check:

- Workbook scoring adds show-up points and beers.
- Workbook uses both gross and net rank points.
- Workbook net score uses half handicap: `gross - ceil(handicap / 2)`.

## End-Of-Season Tournament

Rules stated:

- The tournament is a two-day individual tournament.
- It consists of two 18-hole rounds.
- Both rounds are played at the same course.
- Golfers vote on the course midway through the season.
- Tournament points:
  - 1st: 12
  - 2nd: 9
  - 3rd: 8
  - 4th: 7
  - 5th: 6
  - 6th: 5
  - 7th: 4
  - 8th and below: 2

Application implications:

- Tournament should be modeled separately from weekly nine-hole events.
- Tournament rounds are 18 holes and should not use the weekly half-handicap assumption without confirmation.
- Tournament standings are based on net score.
- Tournament tie-breakers are total putts, final-round net, then final-round putts.
- Tournament points do not count toward Points Champion.

Workbook cross-check:

- The workbook does not include tournament data or tournament scoring formulas.

## Awards

Rules stated:

- Awards are announced after the end-of-season tournament.
- MVP Award: most team match wins; payout $100 under the 10-golfer assumption.
- Going Low Award: lowest net score of the season; payout $100 under the assumption.
- Stroke King Award: lowest putts in one week; payout $100 under the assumption.

Application implications:

- Awards should be calculated from finalized season results.
- Awards need tie policies.
- Payout amounts should be omitted unless a future season has money buy-in.
- `Going Low` should use net score, not gross score.
- `Stroke King` should use lowest putt count in a single week.

Workbook cross-check:

- `Leaderboard` currently tracks match wins and lowest gross score, not lowest net score or lowest putts.

## Sanctions

Rules stated:

- Sanctions are announced after the end-of-season tournament.
- Stephen Glansberg Award: least team match wins; action is buying the league a round at season end.
- Wiz Khalifa Award: highest net score of the season; action is buying the league a second round at season end.
- 3putt King Award: highest putts in one week; action is buying the league a third round at season end.

Application implications:

- Sanctions are derived from the same underlying stats as awards.
- Tie policies are needed.
- The app should distinguish positive awards from sanctions in display and language.

Workbook cross-check:

- Workbook can calculate least match wins from `Weekly Point Data`.
- Workbook does not currently calculate highest net score or highest putts in one week.

## Champions

Rules stated:

- Champions are announced after the end-of-season tournament.
- Tournament Champion: winner of the end-of-season tournament; payout $300 under the 10-golfer assumption.
- Points Champion: golfer with the most points accumulated at the end of the season; payout $400 under the assumption.

Application implications:

- Points Champion should be based on official season points after drop-week rules and any tournament-point policy.
- Tournament Champion should be based on tournament results.
- Payout amounts should be omitted unless a future season has money buy-in.

Workbook cross-check:

- Current `Leaderboard` sums all weekly points and does not drop two lowest weeks.
- Workbook does not model tournament champion.

## General Rules

Rules stated:

- Each golfer gets one breakfast ball on Hole 1 only.
- No mulligans anywhere else.
- Everything must be putted out. No gimmies.
- Ready golf everywhere except putting order.
- On the green, farthest from the hole putts first.
- OB, penalty areas, and hazards are simplified:
  - One-stroke penalty.
  - Drop back on the line between the hole and where the ball crossed.
  - No stroke-and-distance.
  - No re-teeing.

Application implications:

- These are mostly informational rules for the app.
- The app can show them in a rules/help page and maybe weekly event reminders.
- Score entry should not allow gimmie assumptions; putts should be entered as actual putts holed.

## Conflicts With Workbook

- Word document says weekly play is May through August; workbook schedule extends into September.
- Word document says weekly scoring has three areas; workbook has five point components: show-up, match, gross, net, putts.
- Word document does not mention beers; workbook tracks beers and points plus beer points.
- Word document says 2v2 is the normal format; the historical 2026-05-12 generator uses 1v1v1.
- Word document says golfers drop their two lowest weeks; workbook leaderboard currently sums all weekly points.
- Word document awards Going Low by lowest net score; workbook leaderboard tracks lowest gross score.
- Word document awards Stroke King by lowest putts in one week; workbook leaderboard does not track this.
- Word document requires strokes by hole handicap ratings; workbook only calculates total strokes/differences and does not store hole handicap ratings.
