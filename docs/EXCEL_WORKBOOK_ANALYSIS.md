# Excel Workbook Analysis

Source: `docs/Denver Sands Golf League.xlsx`

## Workbook Structure

The workbook contains ten sheets:

| Sheet | Visible | Role | Formula count |
| --- | --- | --- | ---: |
| Schedule | Yes | Season date/course/tee-time schedule | 0 |
| Leaderboard | Yes | Current season standings and secondary stats | 65 |
| Weekly Point Data | Yes | Current golfer-week scoring records | 75 |
| Match Generator | Yes | Current weekly pairing/stroke helper and course list | 7 |
| 0512 Match Generator | Hidden | Historical weekly matchup sheet for 2026-05-12 | 16 |
| Scoring Rules | Yes | Manual scoring reference table and golfer list | 0 |
| Example Leaderboard | Hidden | Prototype leaderboard against example data | 68 |
| Example Weekly Point Data | Hidden | Prototype scoring rows and formula patterns | 71 |
| Weekly Points | Hidden | Older wide-format weekly points tracker | 9 |
| Stroke & Putt History | Hidden | Older wide-format handicap/gross/net/putts tracker | 9 |

## Current Source Of Truth

`Weekly Point Data` appears to be the current source of truth for weekly scoring because:

- `Leaderboard` calculates standings entirely from `Weekly Point Data`.
- `Weekly Point Data` has one row per golfer per week and stores the active season's attendance, match result, handicap, gross score, putts, net score, category points, total weekly points, beer count, and paid status.
- `Weekly Point Data` is visible and uses updated columns not present in the older hidden example sheets, including `Beers`, `Paid`, `Confirmed`, `unk`, and `n/a`.
- `Example Weekly Point Data`, `Weekly Points`, and `Stroke & Putt History` look like historical prototypes because they are hidden and use older formats.

`Schedule` is the likely source of truth for week dates, courses, and tee times. `Match Generator` is the current operational scratchpad for weekly pairings but not a durable source of results.

## Sheet Details

### Schedule

Purpose:

- Lists season play dates, courses, and tee times.
- Columns are `Date`, `Course`, `Time 1`, `Time 2`, and `Time 3`, with extra stray values in row 4.

Observed data:

- Dates run from 2026-05-05 through 2026-09-29.
- Early scheduled courses include Fossil Trace, Overland, and Broken Tee.
- Some rows have dates only and no course/time yet.
- Row 4 contains additional values `510`, `520`, `530`, and `IndianTree` beyond the visible schedule columns. These look like stray tee-time/course notes.

Application implications:

- Store schedule weeks as structured records, not as spreadsheet rows.
- Support blank/unassigned courses and tee times for future weeks.
- Validate tee times as times, not numeric notes.
- Treat September rows as tentative/placeholders unless the TBD season end is extended beyond August.

### Leaderboard

Purpose:

- Aggregates golfer standings from `Weekly Point Data`.
- Shows two leaderboard-style blocks:
  - Main standings: position, golfer, points, behind.
  - Secondary stats: golfer, points plus beer points, match wins, blank weeks, lowest score.

Important formulas:

- Points: `SUMIF('Weekly Point Data'!$D:$D, golfer, 'Weekly Point Data'!$S:$S)`
- Behind: `current_points - leader_points`
- Points plus beer points: season points plus `SUMIF(... Beers)`
- Match wins: `COUNTIFS('Weekly Point Data'!I:I,"Won",'Weekly Point Data'!D:D,golfer)`
- Blank weeks: `COUNTIFS('Weekly Point Data'!E:E,"No",'Weekly Point Data'!D:D,golfer)`
- Lowest score: `MINIFS('Weekly Point Data'!K:K,'Weekly Point Data'!D:D,golfer)`

Application implications:

- Leaderboard totals should be calculated dynamically from golfer-week results.
- `points_plus_beer_points` is a derived fun/social metric and should not replace official points unless explicitly confirmed.
- `lowest_score` should ignore no-show rows, blanks, and non-numeric placeholders.
- `behind` should be displayed as positive points behind the leader, even though the workbook stores negative numbers for trailing golfers.

Data quality notes:

- Position values are manually entered and not formula-driven. The current visible positions have duplicate/missing ranks: 6, 7, 9, 9, 10, 11.
- The secondary stats block order differs from the main standings after row 8; this is manually maintained and can drift.

### Weekly Point Data

Purpose:

- Stores the active season's scoring rows in normalized-ish row form.
- This is the most important active sheet.

Columns:

| Column | Meaning |
| --- | --- |
| Week | Week code such as `W01` or `W02` |
| Date | Play date |
| Course | Course name |
| Golfer | Golfer name |
| Showed | Attendance/status: `Confirmed`, `Yes`, `No`, `unk` |
| Beers | Beer points/count |
| Paid | Payment status |
| Partner | Partner name or placeholder |
| Match Result | `Won`, `Tied`, `Lost`, `n/a` |
| HC | Handicap |
| Gross Score | Nine-hole gross score in current weekly context |
| Putts | Putts count |
| Net Score | Gross minus half-handicap rounded up |
| Showing Up Points | Attendance points |
| Match Points | Match result points |
| Gross Points | Gross-score rank points |
| Net Points | Net-score rank points |
| Putt Points | Putt rank points |
| Points | Total weekly points |

Important formulas:

- Net score: `gross_score - ROUNDUP(handicap / 2, 0)`
- Showing up points: `IFS(Showed="Yes",3, Showed="No",0, Showed="Confirmed",3, Showed="unk",0)`
- Match points: `IFS(Match Result="Tied",2, "Won",5, "Lost",0, "n/a",0)`
- Total points: `SUM(show_up_points:putt_points)`

Application implications:

- Store raw input fields and entered 18Birdies net score, then calculate point totals dynamically. Keep the workbook net formula as a fallback/check.
- Category rank points are currently manually entered, not formula-generated. The app should calculate them from scores.
- Support placeholder/no-result values, but normalize them to explicit statuses rather than storing `-` and `n/a` in numeric fields.

Data quality notes:

- `W02` rows are pre-created with `unk` attendance and no scores for every golfer. They should be treated as planned/unplayed rows, not completed results.
- `W01` has date 2026-05-12; the league confirmed that 2026-05-12 was the first week.
- `Partner` is `-` for all active rows, so partner/team data is not preserved in the current scoring table.
- `Beers` has only one populated value in current data.
- No-show rows use `-` in numeric columns.
- Rank point columns include manual entries and should not be trusted as formulas.

### Match Generator

Purpose:

- Scratchpad for weekly matchup creation, attendance, handicaps, stroke differences, and course booking links.
- Current visible title references `5/19 Weekly Matches Indian Tree`.

Observed sections:

- Empty templates for `2v2`, `1v1`, and `1v1v1`.
- Attendance list with golfer, handicap, and status.
- Course list with booking links and rough rank.
- Link to `https://wheelofnames.com`, implying random generation may currently be manual/external.

Important formulas:

- 2v2 team handicap: sum both player handicaps.
- 2v2 stroke difference: absolute difference between team handicaps.
- 1v1 stroke difference: absolute difference between player handicaps.
- 1v1v1 stroke differences:
  - Middle handicap vs low handicap: `MEDIAN(handicaps) - MIN(handicaps)`
  - High handicap vs low handicap: `MAX(handicaps) - MIN(handicaps)`
  - High handicap vs middle handicap: `MAX(handicaps) - MEDIAN(handicaps)`

Application implications:

- Replace this scratchpad with a match-generation workflow.
- Use random team generation with constraints from the Word document.
- Track attendance/confirmed status separately from generated matchups.
- Preserve booking links as course metadata.
- Treat the 2v2 team-handicap formula as historical workbook behavior, not first-version app scoring logic.

Data quality notes:

- Template formulas reference `#N/A` placeholders.
- `Stefan` has handicap `-`, which must be treated as missing handicap.
- Course name typo: `Walnut Creet`; normalize to `Walnut Creek`.
- Course `Indian Tree` also appears as `IndianTree` in `Schedule` row 4; normalize to `Indian Tree`.

### 0512 Match Generator

Purpose:

- Hidden historical generator for 2026-05-12.
- Shows actual 1v1v1 groups for three tee times: 17:40, 17:50, 18:00.

Observed matches:

- 17:40: Bryan vs Joe vs John.
- 17:50: Brandt vs Bird vs Hunter.
- 18:00: GT vs Zach vs Joey.
- Jared and Stefan marked `No`.

Important formulas:

- Same 1v1v1 stroke difference logic as `Match Generator`.
- Uses half-handicap values in the visible match rows. Example: Bryan handicap 13.9 becomes 7, Joe 17.9 becomes 9, John 28.0 becomes 14.

Application implications:

- For weekly nine-hole match play, use `ceil(handicap / 2)` as the match handicap/stroke count.
- For 1v1v1, calculate relative strokes between the three half-handicap values.
- Store generated groups historically instead of hiding old generator tabs.

### Scoring Rules

Purpose:

- Manual scoring reference table.
- Includes a Google Doc link, scoring rules, and a golfer list.

Rules captured:

- Showing up:
  - Showed: 3
  - No Show: 0
- Match play:
  - Winners: 5
  - Tie: 2
  - Losers: 0
- Rank points:
  - Gross strokes: 1st 6, 2nd 4, 3rd 3, 4th 2, 5th 1, 6+ 0
  - Net strokes: 1st 5, 2nd 4, 3rd 3, 4th 2, 5th 1, 6+ 0
  - Putts: 1st 4, 2nd 3, 3rd 2, 4th 1, 5+ 0

Data quality notes:

- Typo: `Wiiners`.
- Golfer list includes `Cal`, who does not appear in the current active `Weekly Point Data`; the league confirmed Cal should not remain on the active roster.
- Golfer list includes `Stefan`; active generator has missing handicap for Stefan.

### Example Leaderboard

Purpose:

- Hidden prototype leaderboard based on `Example Weekly Point Data`.

Application implications:

- Useful for formula lineage only.
- Should not be treated as active season data.

### Example Weekly Point Data

Purpose:

- Hidden example row-based weekly scoring table.
- Older layout without `Beers` or `Paid`.

Important formulas:

- Net score: `gross_score - ROUNDUP(handicap / 2, 0)`
- Showing up: `Yes = 3`, `No = 0`
- Match points: `Tied = 2`, `Won = 5`, `Lost = 0`
- Total points: sum category point columns.

Application implications:

- Confirms the normalized row-per-golfer-week model existed before the current sheet.

Data quality notes:

- Example putt points include a `5` even though the formal rule tables cap putt points at `4`.
- Example leaderboard formulas refer to example data only.

### Weekly Points

Purpose:

- Hidden older wide-format tracker with golfers as columns and point categories as rows.
- Contains an `Example Week` and a blank `Week 1 05/05` template.

Application implications:

- Do not use as source of truth.
- Confirms point categories: showing up, match play, gross strokes, net strokes, putts, totals.

Data quality notes:

- Example `Putts` row contains a value of `5`, conflicting with current rules.

### Stroke & Putt History

Purpose:

- Hidden older wide-format tracker for handicap, gross score, net score, and putts.

Important formula:

- Net score: `gross_score - ROUNDUP(handicap / 2, 0)`

Application implications:

- Replace with dynamic score history views derived from golfer-week results.

## Formulas To Become Application Logic

- Attendance points by status.
- Match result points by result.
- Nine-hole net score fallback/check from gross score and handicap; official first-version net score is entered from 18Birdies.
- Half-handicap calculation: `ceil(handicap / 2)`.
- Gross rank points.
- Net rank points.
- Putt rank points.
- Total weekly points.
- Leaderboard season points.
- Points after dropping two lowest weeks.
- Points plus beer points, if retained as a secondary stat.
- Match win counts.
- No-show/blank week counts.
- Lowest gross score.
- 2v2 team handicap difference as historical workbook behavior only.
- 1v1 handicap difference.
- 1v1v1 relative stroke allocations.

## Workbook Conflicts And Data Quality Issues

- Word document says weekly play is May through August, but `Schedule` includes September dates.
- `W01` in `Weekly Point Data` is dated 2026-05-12; this is correct because 2026-05-12 was the first week.
- `0512 Match Generator` shows 2026-05-12 as 1v1v1 groups, while the Word document says 2v2 is the usual format.
- Active `Weekly Point Data` does not preserve actual partners for the 2026-05-12 matchups.
- Rank point columns are manually entered and contain likely tie-handling inconsistencies.
- Hidden example sheets award 5 putt points in places, but current rules and Word document cap putt points at 4.
- `Leaderboard` positions are manually entered and currently inconsistent.
- `MINIFS` lowest score can return 0 for golfers with no numeric gross score because of blank/no-show rows.
- Course names and golfer names are not normalized.
- Missing handicaps are represented with `-`.
- Status values mix attendance and RSVP concepts: `Confirmed`, `Yes`, `No`, and `unk`.
- Beer points are tracked in the workbook but not mentioned in the Word rules document.
