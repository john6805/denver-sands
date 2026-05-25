# Roadmap

## Phase 0: Confirm Non-Blocking Policy

Goal: keep implementation from depending on unresolved league policy.

Tasks:

- Treat the final season end date as TBD and editable.
- Keep confirmed scoring, matchmaking, data cleanup, and tournament decisions in their rule docs.
- Use `OPEN_QUESTIONS.md` only for unresolved questions.

Deliverable:

- `OPEN_QUESTIONS.md` contains no blocker for database schema work.

## Phase 1: Foundation And Seeded Setup

Goal: create the durable domain model and enough admin setup to verify imported workbook facts.

Tasks:

- Create database schema for seasons, golfers, courses, schedule, RSVPs, matches, results, and audits.
- Seed/import the current workbook's first-version facts.
- Add course and golfer normalization.
- Add basic admin season, roster, course, schedule, and tee-time editing.

Acceptance checks:

- Can create a season.
- Can create golfers.
- Can create courses.
- Can create weekly events and tee times.
- Can verify and correct the seeded season before scoring logic is implemented.

## Phase 2: Scoring Engine

Goal: replace workbook formulas with tested application logic.

Tasks:

- Implement half-handicap calculation.
- Implement net score fallback/validation calculation.
- Implement attendance and match points.
- Implement gross/net/putt rank points.
- Implement weekly total points.
- Implement raw and official season totals.

Acceptance checks:

- Unit tests cover examples from `SCORING_RULES.md`.
- No derived point value is manually stored as the only source of truth.

## Phase 3: Weekly Results Workflow

Goal: replace `Weekly Point Data`.

Tasks:

- Build admin result-entry workflow.
- Support no-show and unknown statuses.
- Support score/putt entry.
- Support beer tracking as a social stat.
- Show point breakdowns per golfer.
- Lock completed weeks.

Acceptance checks:

- Admin can enter a full week and see calculated totals.
- Leaderboard updates from result data.
- Locked week correction requires audit reason.

## Phase 4: Match Generation And Stroke Allocation

Goal: replace `Match Generator` before the weekly result workflow depends on it.

Tasks:

- Snapshot weekly handicaps.
- Capture course hole handicap ratings.
- Allocate strokes to holes.
- Build RSVP/attendance list for a week.
- Implement format planning for 2v2, 1v1, and 1v1v1.
- Implement random match generation.
- Enforce no third consecutive 2v2 partnership where possible.
- Store generated matchups.
- Allow admin reroll and override.

Acceptance checks:

- 9 confirmed golfers can generate three 1v1v1 groups like the workbook example.
- 4 confirmed golfers can generate one 2v2 group.
- Repeated partner constraint is tested.
- Missing course hole handicap data blocks stroke allocation rather than guessing.

## Phase 5: Weekly Results And Leaderboards

Goal: replace `Weekly Point Data`, `Leaderboard`, `Weekly Points`, and `Stroke & Putt History`.

Tasks:

- Build admin result-entry workflow.
- Support no-show and unknown statuses.
- Support score/putt entry.
- Show point breakdowns per golfer.
- Lock completed weeks.
- Build raw leaderboard.
- Build official leaderboard after dropped weeks.
- Build public leaderboard.
- Build golfer score history.
- Build match wins/no-shows/lowest score stats.

Acceptance checks:

- Admin can complete one week from attendance through public leaderboard without Excel formulas.
- Leaderboard shows raw points, official points, behind, match wins, no-shows, lowest gross, lowest net, lowest putts, and beer totals where enabled.
- Locked week correction requires audit reason.

## Phase 6: Awards, Sanctions, And Tournament

Goal: implement end-of-season rules not present in the workbook.

Tasks:

- Calculate regular-season awards and sanctions.
- Build tournament setup.
- Enter two 18-hole tournament rounds.
- Calculate tournament points.
- Calculate Tournament Champion and Points Champion.
- Finalize awards and champions.

Acceptance checks:

- Final standings use official points.
- Tournament placement points match the Word document.
- Awards/sanctions are explainable from source data.

## Phase 7: Audit, Regression, And Release Readiness

Goal: prove the first version can replace the spreadsheet for a weekly cycle.

Tasks:

- Build audit trail browser.
- Add first-version regression harness.
- Run admin-to-public vertical slice QA.
- Document follow-up gaps as future tickets.

Acceptance checks:

- Regression suite protects confirmed scoring, matchmaking, leaderboard, drop-week, awards, and tournament behavior.
- No first-version blocker remains for spreadsheet replacement.

## Phase 8: Polish And Optional Enhancements

Potential additions:

- Course voting.
- Player RSVP self-service.
- Notifications.
- Payment tracking.
- Workbook import.
- Per-hole scoring.
- Live mobile score entry.
- External handicap sync.

Do not treat these as required unless explicitly prioritized.
