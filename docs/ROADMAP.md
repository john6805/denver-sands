# Roadmap

## Phase 0: Resolve Policy Questions

Goal: remove ambiguity before building logic that will be hard to change.

Tasks:

- Keep season end date editable and allow it to remain TBD during setup.
- Seed Stefan's handicap as 10 and keep all handicaps editable.
- Backfill historical partners/opponents from the first workbook's `0512 Match Generator`.

Deliverable:

- Updated `OPEN_QUESTIONS.md` with answered decisions moved into the relevant rule docs.

## Phase 1: Foundation

Goal: create the durable domain model.

Tasks:

- Create database schema for seasons, golfers, courses, schedule, RSVPs, matches, results, and audits.
- Seed initial scoring configuration.
- Add course and golfer normalization.
- Add admin-only basics if auth exists.

Acceptance checks:

- Can create a season.
- Can create golfers.
- Can create courses.
- Can create weekly events and tee times.

## Phase 2: Scoring Engine

Goal: replace workbook formulas with tested application logic.

Tasks:

- Implement half-handicap calculation.
- Implement net score fallback/validation calculation.
- Implement attendance and match points.
- Implement gross/net/putt rank points.
- Implement weekly total points.
- Implement raw and official season totals.
- Implement tournament placement points.

Acceptance checks:

- Unit tests cover examples from `SCORING_RULES.md`.
- No derived point value is manually stored as the only source of truth.

## Phase 3: Weekly Results Workflow

Goal: replace `Weekly Point Data`.

Tasks:

- Build admin result-entry workflow.
- Support no-show and unknown statuses.
- Support score/putt entry.
- Support beer and paid tracking if retained.
- Show point breakdowns per golfer.
- Lock completed weeks.

Acceptance checks:

- Admin can enter a full week and see calculated totals.
- Leaderboard updates from result data.
- Locked week correction requires audit reason.

## Phase 4: Leaderboards And History

Goal: replace `Leaderboard`, `Weekly Points`, and `Stroke & Putt History`.

Tasks:

- Build current leaderboard.
- Build official leaderboard after dropped weeks.
- Build golfer score history.
- Build match wins/no-shows/lowest score stats.
- Add award/sanction preview stats.

Acceptance checks:

- Leaderboard shows raw points, official points, behind, match wins, no-shows, lowest gross, lowest net, lowest putts, and beer totals where enabled.

## Phase 5: Match Generation

Goal: replace `Match Generator`.

Tasks:

- Build RSVP/attendance list for a week.
- Implement random match generation.
- Support 2v2, 1v1, and 1v1v1.
- Enforce no third consecutive partnership where possible.
- Calculate handicap stroke differences.
- Store generated matchups.
- Allow admin reroll and override.

Acceptance checks:

- 9 confirmed golfers can generate three 1v1v1 groups like the workbook example.
- 4 confirmed golfers can generate one 2v2 group.
- Repeated partner constraint is tested.

## Phase 6: Course Holes And Stroke Allocation

Goal: support Word rule requiring strokes on toughest holes.

Tasks:

- Add course hole handicap entry.
- Allocate strokes to holes.
- Display strokes received/given for each match.
- Handle missing hole handicap data.

Acceptance checks:

- A player/team receiving 3 strokes gets them on the three toughest holes being played.

## Phase 7: End-Of-Season

Goal: implement rules not present in workbook.

Tasks:

- Apply two-lowest-week drops.
- Build tournament setup.
- Enter two 18-hole tournament rounds.
- Calculate tournament points.
- Calculate Tournament Champion and Points Champion.
- Calculate awards and sanctions.

Acceptance checks:

- Final standings use official points.
- Tournament placement points match the Word document.
- Awards/sanctions are explainable from source data.

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
