# Implementation Tickets

This backlog replaces the current Excel workbook and Word rules workflow with a web app while preserving current league behavior first. Each ticket is sized for one focused Codex session and should be built as a vertical slice when possible.

Do not guess unresolved policy. If a rule is unclear, reference `docs/OPEN_QUESTIONS.md` and keep the behavior configurable or editable.

## Phase 1: Foundation And First Usable Season

### Ticket 01: Project Scaffold

Goal:

- Create the web app foundation without implementing league logic yet.

Requirements:

- Add the application framework, package scripts, lint/test setup, environment example, and baseline app shell.
- Add a simple health page or route.
- Add a database client placeholder and migration command wiring.
- Add a minimal admin/public routing convention that later tickets can extend.

Acceptance criteria:

- The app installs, starts locally, and renders the health page.
- The test command runs successfully with at least one smoke test.
- Database configuration can be provided through environment variables.
- No scoring, match generation, leaderboard, payment, notification, or chart logic exists yet.

Data model impact:

- None beyond database connection configuration.

UI impact:

- Minimal app shell and health/status page only.

Tests required:

- App smoke test.
- Health route/page test.
- Configuration loading test if the framework supports it cleanly.

Things not to do:

- Do not build dashboards, charts, marketing pages, authentication polish, payments, notifications, or external integrations.
- Do not encode scoring rules in the scaffold.

### Ticket 02: Core Database Schema

Goal:

- Create the durable relational schema needed to preserve workbook data and future weekly operations.

Requirements:

- Add migrations for seasons, golfers, season golfers, courses, course holes, weekly events, tee times, RSVPs, matches, match sides, match participants, stroke allocations, weekly results, and admin audit events.
- Use explicit enums for attendance, match result, match format, week status, season status, match status, and common audit actions.
- Store raw facts and snapshots rather than derived point totals as the only source of truth.
- Keep `season.ends_on` nullable/editable because the final season end date is the only remaining non-blocking open question in `docs/OPEN_QUESTIONS.md`.
- Include first-version weekly-operation constraints from `docs/DATA_MODEL.md`, especially unique golfer-week results, match participant cardinality validation, course-hole rank uniqueness, duplicate RSVP prevention, and duplicate season golfer prevention.
- Defer tournament, tournament round, tournament result, award, and award result tables to the end-of-season tickets so this ticket stays focused on the spreadsheet-replacement workflow.

Acceptance criteria:

- Migrations apply cleanly to an empty database.
- Schema can represent `Weekly Point Data`, `Schedule`, and the historical `0512 Match Generator`.
- Formula/output columns from the workbook are not stored as authoritative user input.
- Constraints prevent duplicate golfer-week result rows and invalid match participant relationships where practical.
- The only unresolved question referenced by the schema is nullable/editable `season.ends_on`.

Data model impact:

- Introduces all first-version core tables from `docs/DATA_MODEL.md`.

UI impact:

- None, except any generated admin/dev database inspection route if already standard in the framework.

Tests required:

- Migration apply/rollback test or schema validation test.
- Model relationship tests for season, golfer, weekly event, match, participant, and weekly result records.
- Constraint tests for course hole ranks, duplicate weekly results, duplicate RSVP rows, duplicate season golfers, and invalid match participants.

Things not to do:

- Do not add course voting, payment tracking, notification tables, live scoring, or external handicap sync.
- Do not add tournament or award tables in this ticket.
- Do not materialize leaderboard totals yet unless the chosen stack requires generated views.
- Do not block schema work on the final season end date.

### Ticket 03: Seed Workbook Reference Data

Goal:

- Seed/import the current workbook facts so the app starts with the same league state.

Requirements:

- Import or seed the 2026 season, active golfers, schedule weeks, courses, tee times, weekly results, and first-week historical matchups.
- Treat `Weekly Point Data` as the current result source of truth.
- Treat `Schedule` as the current schedule source of truth.
- Backfill first-week partners/opponents from `0512 Match Generator`.
- Normalize `Walnut Creet` to `Walnut Creek` and `IndianTree`/`Indian Tree` to `Indian Tree`.
- Do not import hidden example/prototype sheets as active data.
- Exclude `Cal` from the active roster.
- Seed Stefan's handicap as `10` and keep it editable.

Acceptance criteria:

- Seed command creates the current season without duplicate records when rerun safely.
- W01 uses 2026-05-12 as the first play date.
- Planned/unplayed W02-style rows with `unk` become `UNKNOWN`/planned records, not completed results.
- No-show rows preserve zero-point eligibility for completed weeks.
- Imported formula-derived point columns are ignored or stored only for comparison diagnostics, not as authoritative values.

Data model impact:

- Populates seasons, golfers, season golfers, courses, weekly events, tee times, RSVPs, matches, match sides, match participants, and weekly results.

UI impact:

- None required, though a simple admin seed status view is acceptable if the project pattern favors it.

Tests required:

- Seed idempotency test.
- Workbook mapping tests for attendance status, match result, handicap, gross score, net score, putts, course names, and active roster.
- Regression test that hidden example sheets are ignored.

Things not to do:

- Do not add a general-purpose spreadsheet upload UI.
- Do not infer missing policies from spreadsheet oddities; reference `docs/OPEN_QUESTIONS.md` if needed.

### Ticket 04: Minimal Season Admin Screens

Goal:

- Allow an admin to verify and edit the seeded season, roster, courses, and schedule before scoring work begins.

Requirements:

- Add admin views for season details, golfer roster, course list, weekly schedule, and tee times.
- Allow editing season name/status/end date, golfer active status/current handicap, course name/booking URL/active status, weekly course, week status, and tee times.
- Keep the season end date optional/editable.
- Before stroke allocation is enabled, show missing course hole data clearly without blocking basic schedule verification.

Acceptance criteria:

- Admin can inspect seeded data and correct obvious data-entry issues.
- Edits persist and are visible after refresh.
- Weekly events can remain planned with blank course or tee times.
- User-facing validation avoids spreadsheet placeholders such as `-`, `n/a`, and blank numeric strings.

Data model impact:

- Uses existing core tables; may add updated timestamps if not already present.

UI impact:

- Basic admin CRUD screens for season setup only.

Tests required:

- CRUD tests for seasons, golfers, courses, weekly events, and tee times.
- Validation tests for nullable season end date and missing course/time fields.

Things not to do:

- Do not build public leaderboard, charts, award pages, notifications, or course voting.
- Do not implement scoring calculations in these screens.

### Ticket 04A: Phase 1 Gap Closure

Goal:

- Close the remaining Phase 1 acceptance gaps before starting scoring work.

Requirements:

- Add admin create flows for seasons, golfers, courses, weekly events, and tee times.
- Keep create forms aligned with the existing seeded-data edit screens and validation rules.
- Allow season creation even when the database has no seeded season yet.
- Add deterministic validation tests for create payload builders.
- Add static verification that the seed uses idempotent conflict handling for Phase 1 tables.
- Document any live database verification that still requires a configured Supabase instance.

Acceptance criteria:

- Admin can create a season from an empty configured database.
- Admin can add golfers to the active season roster with an editable current handicap.
- Admin can add courses with optional booking URLs.
- Admin can add weekly events with optional courses and planned status.
- Admin can add, edit, and delete tee times for weekly events.
- Local tests cover create-form validation and seed idempotency expectations.

Data model impact:

- Uses existing Phase 1 tables.

UI impact:

- Adds compact create forms to the Phase 1 admin setup page.

Tests required:

- Create validation tests for seasons, golfers, courses, weekly events, and tee times.
- Seed idempotency SQL checks for Phase 1 inserts.

Things not to do:

- Do not add scoring, match generation, leaderboard, tournament, award, or audit browser logic.
- Do not require live Supabase credentials for the local unit test suite.

## Phase 2: Scoring Correctness

### Ticket 05: Scoring Engine Core Points

Goal:

- Replace workbook attendance, match, half-handicap, net fallback, and weekly total formulas with tested application logic.

Requirements:

- Implement `ceil(handicap / 2)` half-handicap calculation.
- Implement attendance points: `YES`/`CONFIRMED`/`PLAYED` = 3, `NO`/`UNKNOWN`/`NO_SHOW` = 0 according to normalized statuses.
- Implement match points: won 5, tied 2, lost 0, not applicable 0.
- Store entered net score from 18Birdies as official when present.
- Provide workbook net fallback/check: gross minus half-handicap when entered net is missing and inputs are valid.
- Calculate weekly total as attendance + match + gross rank + net rank + putt rank once rank points are supplied by later code.

Acceptance criteria:

- Unit tests pass for all examples in `docs/SCORING_RULES.md`.
- Missing handicap, gross, net, or putts does not produce bogus zero scores.
- Derived values can be explained from raw weekly result inputs.

Data model impact:

- Prefer service/view calculations over stored derived totals.
- If calculation versioning is needed, add a version identifier without making stored totals authoritative.

UI impact:

- None required beyond optional developer/debug output.

Tests required:

- Unit tests for half-handicap examples.
- Unit tests for attendance points, match points, net fallback/check, missing values, and total composition.

Things not to do:

- Do not implement rank points, leaderboard, awards, or tournament scoring here.
### Ticket 06: Weekly Rank Points Engine

Goal:

- Calculate gross, net, and putt rank points from weekly result rows instead of manually entering workbook columns.

Requirements:

- Implement dense ranking for gross scores, net scores, and putts.
- Lower values rank better.
- Exclude no-shows, unknown/planned rows, missing values, and non-numeric placeholders.
- Award gross points as 6, 4, 3, 2, 1, 0 for ranks 1 through 6+.
- Award net points as 5, 4, 3, 2, 1, 0 for ranks 1 through 6+.
- Award putt points as 4, 3, 2, 1, 0 for ranks 1 through 5+.

Acceptance criteria:

- Tied golfers receive the same dense-rank points.
- The next distinct score receives the next rank, not a skipped rank.
- Hidden workbook example putt values of 5 are ignored because current rules cap putt points at 4.
- Rank point breakdowns are reproducible from raw results.

Data model impact:

- None if implemented as dynamic calculations.
- Optional computed view/service response includes gross/net/putt ranks and points.

UI impact:

- None required yet.

Tests required:

- Dense-rank tests for ties in gross, net, and putts.
- Exclusion tests for no-shows, unknown weeks, blanks, and missing scores.
- Current W01 workbook regression test if seeded data is available.

Things not to do:

- Do not preserve manual rank point inconsistencies from the workbook.
- Do not add leaderboard UI yet.

### Ticket 07: Weekly Point Breakdown View

Goal:

- Show admins exactly how each golfer's weekly points were calculated.

Requirements:

- Add a weekly admin view that lists golfer, attendance, match result, handicap snapshot, gross, net, putts, category points, and total points.
- Show entered net score and fallback/check net score distinctly.
- Flag missing inputs that prevent a category from scoring.
- Keep all point values read-only; audited rank-point overrides are documented policy but should be implemented as a future correction/override ticket, not this first breakdown view.

Acceptance criteria:

- Admin can open a seeded or manually entered week and see a complete point breakdown.
- Total points match the scoring and rank engines.
- Planned/unplayed weeks do not look like completed zero-point weeks.

Data model impact:

- Uses weekly results and dynamic scoring services.

UI impact:

- Admin weekly scoring breakdown table.

Tests required:

- Rendering test for completed week, planned week, no-show, and missing score cases.
- Integration test comparing displayed totals to scoring service output.

Things not to do:

- Do not add edit forms in this ticket unless they already exist.
- Do not add public leaderboard or charts.

## Phase 3: Match Generation And Stroke Allocation

### Ticket 08: Handicap Snapshot Engine

Goal:

- Preserve the handicap used for each week so later handicap edits do not rewrite history.

Requirements:

- Snapshot each confirmed golfer's current handicap for a weekly event.
- Store both full handicap and calculated half-handicap for match display/reference.
- Allow admin to update current handicaps before generating matchups.
- Preserve existing historical weekly result handicap snapshots on later edits.

Acceptance criteria:

- Generating or preparing a week snapshots current handicaps for confirmed golfers.
- Changing a golfer's current handicap later does not alter locked or already generated weekly snapshots.
- Missing handicap blocks generation for that golfer unless admin supplies an editable value.

Data model impact:

- Uses `golfer_handicap_snapshots` and participant/result handicap snapshot fields.

UI impact:

- Admin handicap review/edit screen within weekly setup.

Tests required:

- Snapshot creation test.
- Historical preservation test after current handicap edit.
- Missing handicap validation test.

Things not to do:

- Do not calculate handicaps from scores.
- Do not integrate GHIN, 18Birdies, or any external handicap service.

### Ticket 09: Course Hole Handicap Entry

Goal:

- Capture the hole handicap ratings required for stroke allocation.

Requirements:

- Add admin UI for entering course holes 1-18 with optional par and required handicap rank.
- Validate unique handicap ranks per course.
- Mark whether a course has enough hole data for weekly scheduling.
- Prevent first-version scheduling/generation on courses missing required hole handicap ratings, per confirmed rules.

Acceptance criteria:

- Admin can enter and edit hole handicap ratings.
- Duplicate or missing handicap ranks are rejected.
- Course readiness is visible before match generation and stroke allocation.

Data model impact:

- Populates `course_holes`.

UI impact:

- Course detail/edit screen for hole ratings.

Tests required:

- Validation tests for rank uniqueness and completeness.
- UI tests for editing hole ratings.

Things not to do:

- Do not add course voting.
- Do not import hole ratings from external course APIs.

### Ticket 10: Stroke Allocation Engine

Goal:

- Calculate which holes receive strokes based on handicap differences and hole difficulty.

Requirements:

- For 1v1, calculate stroke difference from player half-handicaps and allocate strokes to the higher-handicap golfer.
- For 1v1v1, calculate low/mid/high relative stroke differences as documented in `docs/MATCHMAKING_RULES.md`.
- Allocate strokes to the hardest holes being played.
- If stroke count exceeds holes played, cycle again through the same difficulty order.
- For first-version 2v2, display player half-handicaps only; do not calculate official team best-ball result.

Acceptance criteria:

- A golfer receiving 3 strokes gets them on the three toughest eligible holes.
- A golfer receiving more strokes than holes gets extra strokes by cycling through the same order.
- 1v1v1 examples match the Bryan/Joe/John style calculations in the workbook analysis.
- Missing course hole data blocks allocation rather than guessing.

Data model impact:

- Writes `stroke_allocations` for generated matches.

UI impact:

- None required beyond debug/service output until match display ticket.

Tests required:

- Unit tests for 1v1 differences.
- Unit tests for 1v1v1 low/mid/high differences.
- Unit tests for hole allocation and cycling.
- Missing course data test.

Things not to do:

- Do not implement hole-by-hole scoring.
- Do not calculate 2v2 best-ball match winners from hole scores.

### Ticket 11: Match Format Planner

Goal:

- Choose the weekly match format mix from confirmed attendance before randomizing pairings.

Requirements:

- Implement deterministic format selection for 2 through 10 golfers exactly as documented in `docs/MATCHMAKING_RULES.md`.
- For 11+ golfers, combine available tee-time capacity with 2v2 preference and 1v1/1v1v1 fallbacks.
- Exclude unknown, declined, withdrawn, and no-show golfers from generation.
- Do not implement `1vHandicap`.

Acceptance criteria:

- 9 confirmed golfers produce three 1v1v1 groups, matching the first-week workbook pattern.
- 4 confirmed golfers produce one 2v2.
- Odd attendance counts produce expected fallback combinations.
- Format planning returns a clear error if there are fewer than 2 golfers.

Data model impact:

- None; this is generation planning logic.

UI impact:

- None required yet.

Tests required:

- Unit tests for each attendance count from 0 through 11.
- Status filtering tests.

Things not to do:

- Do not randomize teams in this ticket.
- Do not balance teams by handicap.

### Ticket 12: Random Match Generator

Goal:

- Generate, store, reroll, and publish random weekly matchups.

Requirements:

- Randomly assign confirmed golfers to the planned format mix.
- Preserve generated matchups, tee times, participants, handicap snapshots, stroke allocations, random seed, and generated timestamp.
- Enforce the hard constraint against the same 2v2 partnership for a third consecutive week when possible.
- Apply softer scoring to reduce repeated 1v1 opponents and 1v1v1 groupmates when random choices allow it.
- Allow reroll before publication.
- If the repeat-pairing constraint is impossible, allow the result and flag it as unavoidable.

Acceptance criteria:

- Admin can generate draft matchups for a week.
- Admin can reroll draft matchups before publishing.
- Published matchups become historical records.
- Third-consecutive 2v2 partnerships are avoided when a valid alternative exists.
- Constraint overrides or unavoidable conflicts are visible and auditable.

Data model impact:

- Creates weekly matches, sides, participants, stroke allocations, and audit events for rerolls/overrides.

UI impact:

- Admin match generation screen with generate, reroll, edit, and publish actions.

Tests required:

- Generator tests with fixed seeds.
- Repeat-partner constraint tests.
- Reroll/publish persistence tests.
- Unavoidable conflict flag test.

Things not to do:

- Do not calculate match winners.
- Do not optimize teams by handicap or skill.
- Do not integrate with tee-time booking services.

## Phase 4: Weekly Results And Leaderboard

### Ticket 13: Weekly Result Entry

Goal:

- Replace the workbook `Weekly Point Data` entry workflow.

Requirements:

- Add admin form for each week and golfer to enter attendance, match result, gross score, net score from 18Birdies, putts, and handicap snapshot if missing.
- Support no-show, unknown/planned, and played states clearly.
- Validate numeric score fields only when a golfer played.
- Use generated match sides when available but allow result entry without generated matchups for imported history.
- Show calculated point breakdown immediately after saving.

Acceptance criteria:

- Admin can enter a full completed week.
- No-show golfers receive no score values and zero scoring categories except eligible attendance/match behavior.
- Unknown/planned rows do not count as completed zero-point weeks.
- Saved results update calculated weekly totals.
- If a rank-point override is implemented here, it must require an audit reason; otherwise leave overrides out of scope.

Data model impact:

- Creates and updates `weekly_results`.
- May update weekly event status from planned/open to completed.

UI impact:

- Admin weekly result-entry form and per-golfer rows.

Tests required:

- Form validation tests for played, no-show, and unknown statuses.
- Integration test that saving a week recalculates point breakdowns.
- Regression test for imported W01-style data.

Things not to do:

- Do not add player self-service score entry.
- Do not implement hole-by-hole scoring.
- Do not treat paid status as official points.
- Do not add silent manual point overrides.

### Ticket 14: Week Locking

Goal:

- Prevent accidental edits to finalized weekly results while preserving an audit path for corrections.

Requirements:

- Add lock action for completed weeks.
- Block normal edits to locked weekly results.
- Allow admin correction flow only with a required reason.
- Record before/after values and correction reason in `admin_audit_events`.

Acceptance criteria:

- Locked weeks cannot be edited through the normal form.
- Corrections to locked weeks require a non-empty reason.
- Audit events show entity type, entity id, action, before/after JSON, reason, and timestamp.
- Corrected data recalculates weekly and season totals.

Data model impact:

- Uses `weekly_results.locked_at`, weekly event status, and `admin_audit_events`.

UI impact:

- Lock button, locked state display, correction modal/form, audit history panel.

Tests required:

- Locked edit rejection test.
- Correction with reason test.
- Audit before/after persistence test.
- Recalculation after correction test.

Things not to do:

- Do not add role-heavy approval workflows unless auth already exists.
- Do not allow silent edits to locked results.

### Ticket 15: Raw Leaderboard Calculation

Goal:

- Replace the workbook leaderboard's raw season point totals and supporting stats.

Requirements:

- Calculate raw season points as the sum of completed weekly totals.
- Calculate points behind leader as positive values.
- Calculate match wins, no-show/blank week counts, lowest gross, lowest net, lowest putts, beer totals, and points plus beer points as a social metric.
- Exclude planned/unplayed unknown weeks from completed stats.
- Avoid the workbook `MINIFS` zero-score bug for missing gross scores.

Acceptance criteria:

- Raw leaderboard updates after weekly result saves or corrections.
- Positions are calculated, not manually entered.
- Ties are handled consistently.
- Points plus beer points is labeled as non-official/social.

Data model impact:

- Prefer dynamic query/service calculation.

UI impact:

- Admin leaderboard view or service endpoint that can later power public display.

Tests required:

- Leaderboard aggregation tests.
- Points-behind tests.
- Missing score exclusion tests.
- Tie position tests.

Things not to do:

- Do not apply drop-week logic in this ticket.
- Do not add charts or visual polish.

### Ticket 16: Drop-Week Official Standings

Goal:

- Implement the Word rule that each golfer drops their two lowest eligible completed weeks.

Requirements:

- Use `season.drop_lowest_week_count`, defaulting to 2.
- Exclude planned/unplayed `UNKNOWN` weeks and canceled/weather weeks.
- Include completed no-show weeks with 0 points as eligible drop weeks.
- Calculate official season points after drops.
- Preserve raw season points for comparison.

Acceptance criteria:

- Official standings drop each golfer's two lowest eligible weekly totals.
- Golfers with fewer than or equal to two eligible weeks calculate predictably and are covered by tests.
- Raw and official points are both available.
- Points Champion calculations can later use official points.

Data model impact:

- Uses season configuration and weekly event statuses.

UI impact:

- Add official points and dropped-week indicators to leaderboard view.

Tests required:

- Drop-two calculation tests.
- Unknown/planned exclusion tests.
- Canceled week exclusion tests.
- Completed no-show inclusion tests.

Things not to do:

- Do not guess the final season end date; keep `docs/OPEN_QUESTIONS.md` as the reference.
- Do not include tournament points in Points Champion logic.

### Ticket 17: Public Leaderboard

Goal:

- Give golfers a read-only public view of current standings.

Requirements:

- Add public leaderboard page showing rank, golfer, raw points, official/projected points, points behind, match wins, no-shows, lowest gross, lowest net, lowest putts, and beer social stats where enabled.
- Use the same calculation service as admin leaderboard.
- Clearly distinguish official scoring from social beer totals.
- Keep the first version simple and table-focused.

Acceptance criteria:

- Public page loads without admin controls.
- Values match tested leaderboard calculations.
- Planned weeks do not appear as completed zeroes.
- The page is usable on desktop and mobile without adding charts.

Data model impact:

- None.

UI impact:

- Read-only public leaderboard page.

Tests required:

- Public rendering test.
- Authorization/control absence test if auth exists.
- Calculation parity test with admin/service data.

Things not to do:

- Do not add charts, notifications, payments, or login-heavy golfer features.
- Do not expose audit correction controls publicly.

## Phase 5: End-Of-Season Calculations

### Ticket 18: Award And Sanction Metrics

Goal:

- Calculate regular-season awards and sanctions from finalized weekly data.

Requirements:

- Calculate MVP from most team match wins.
- Calculate Going Low from lowest regular-season net score.
- Calculate Stroke King from lowest putts in one regular-season week.
- Calculate least team match wins sanction.
- Calculate highest regular-season net score sanction.
- Calculate highest putts in one regular-season week sanction.
- Apply tie-breakers from `docs/SCORING_RULES.md`.
- Exclude tournament results from regular-season awards and sanctions.

Acceptance criteria:

- Award/sanction preview can run during the season.
- Winners are explainable with source week/result references.
- Ties follow documented tie-breakers and share when still tied.
- No payout amounts appear in first-version output.

Data model impact:

- Adds `awards` and `award_results` if they were not created earlier.
- Previews should be dynamic; finalization may populate award result rows.

UI impact:

- Admin preview/finalize screen and simple public preview section.

Tests required:

- Unit tests for each award/sanction metric.
- Tie-breaker tests for each documented tie policy.
- Tournament-exclusion test.

Things not to do:

- Do not add payouts or payment collection.
- Do not invent new tie-breakers; unresolved changes belong in `docs/OPEN_QUESTIONS.md`.

### Ticket 19: Tournament Setup And Result Entry

Goal:

- Model and enter the end-of-season two-round tournament separately from weekly play.

Requirements:

- Add admin setup for tournament course, dates, two 18-hole rounds, golfers, and status.
- Enter each golfer's round net scores and putts.
- Use full handicap behavior for tournament context; do not use weekly half-handicap assumptions.
- Keep tournament course voting out of scope for first version.

Acceptance criteria:

- Admin can create an end-of-season tournament with two rounds.
- Admin can enter round results for each golfer.
- Tournament data does not affect regular-season weekly points or awards/sanctions.

Data model impact:

- Adds and uses `tournaments`, `tournament_rounds`, `tournament_round_results`, and `tournament_results`.

UI impact:

- Admin tournament setup and result-entry screens.

Tests required:

- Tournament CRUD tests.
- Result-entry validation tests.
- Regular-season isolation test.

Things not to do:

- Do not build course voting.
- Do not include tournament points in Points Champion.
- Do not add payouts.

### Ticket 20: Tournament Placement And Champions

Goal:

- Calculate tournament standings, tournament points, Tournament Champion, and Points Champion.

Requirements:

- Rank tournament placement by total net score across two 18-hole rounds.
- Apply tie-breakers: lower total putts, lower final-round net, lower final-round putts, then shared place.
- Assign tournament points: 12, 9, 8, 7, 6, 5, 4, 2 for 8th+.
- Calculate Tournament Champion from tournament placement.
- Calculate Points Champion from official regular-season points after drop weeks.
- Ensure tournament points do not affect Points Champion.

Acceptance criteria:

- Tournament standings and points match the Word rules.
- Tournament Champion and Points Champion can be previewed and finalized.
- Points Champion tie-breakers follow `docs/SCORING_RULES.md`.
- Final champion outputs are explainable from source data.

Data model impact:

- Populates final award/champion results if finalization is implemented here.

UI impact:

- Tournament standings display and champions section.

Tests required:

- Tournament ranking tests.
- Tournament tie-breaker tests.
- Tournament point assignment tests.
- Points Champion drop-week and tie-breaker tests.

Things not to do:

- Do not let tournament points feed official regular-season standings.
- Do not add payout amounts.

## Phase 6: Audit, Corrections, And Release Readiness

### Ticket 21: Admin Audit Trail Browser

Goal:

- Make corrections and overrides transparent to the commissioner.

Requirements:

- Add admin audit list filtered by season, week, entity type, and action.
- Show actor if auth exists, action, target entity, before/after summary, reason, and timestamp.
- Link audit entries back to the affected week/result/match where possible.

Acceptance criteria:

- Corrections from locked weeks appear in the audit browser.
- Match rerolls, published overrides, and scoring overrides appear when those flows create audit events.
- Audit data is read-only.

Data model impact:

- Uses `admin_audit_events`.

UI impact:

- Admin audit trail page.

Tests required:

- Audit list rendering test.
- Filtering test.
- Read-only behavior test.

Things not to do:

- Do not let users edit audit records.
- Do not build complex compliance exports.

### Ticket 22: First-Version Regression Harness

Goal:

- Protect scoring and standings behavior against accidental spreadsheet-behavior regressions.

Requirements:

- Add fixture data based on workbook W01 and representative planned/no-show/missing-data weeks.
- Add integration tests for scoring, rank points, leaderboard, drop-week logic, match generation, stroke allocation, awards, and tournament calculations.
- Add a single command that runs the first-version regression suite.

Acceptance criteria:

- Regression suite passes from a clean checkout.
- Fixtures cover known workbook conflicts and confirmed decisions.
- Tests fail if beer points affect official scoring, planned weeks count as drops, or missing scores become zeroes.

Data model impact:

- Test fixtures only.

UI impact:

- None.

Tests required:

- This ticket is itself test-focused; include service and end-to-end coverage where practical.

Things not to do:

- Do not chase visual polish.
- Do not add new product scope while building the harness.

### Ticket 23: First Admin-To-Public Vertical Slice QA

Goal:

- Verify the app can replace the spreadsheet for one weekly cycle.

Requirements:

- Walk through seed/import, admin setup, handicap snapshot, match generation, weekly result entry, locking/correction, raw leaderboard, official leaderboard, and public leaderboard.
- Document any gaps as follow-up tickets rather than patching broad scope into this QA ticket.
- Confirm the only remaining policy ambiguity is the final season end date in `docs/OPEN_QUESTIONS.md`.

Acceptance criteria:

- A commissioner can complete one week from attendance through public leaderboard without using Excel formulas.
- Scoring and leaderboard outputs are traceable and tested.
- No first-version blocker remains for scoring correctness, match generation, weekly results, leaderboard accuracy, or drop-week calculations.

Data model impact:

- None unless QA reveals a blocking schema gap.

UI impact:

- Minor copy or validation fixes only.

Tests required:

- Manual QA checklist.
- One automated happy-path integration test if feasible.

Things not to do:

- Do not add charts, payments, notifications, course voting, external booking, external handicap sync, or live scoring.
- Do not expand the release target beyond preserving the current spreadsheet behavior plus confirmed end-of-season calculations.
