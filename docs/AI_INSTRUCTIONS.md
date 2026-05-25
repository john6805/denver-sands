# AI Instructions

These instructions are for future coding agents implementing the league app.

## Prime Directive

Do not invent league behavior silently. Preserve what the workbook and Word document imply, and put unresolved policy choices in `docs/OPEN_QUESTIONS.md` or behind explicit configuration.

## Source Priority

Use this precedence:

1. `docs/SCORING_RULES.md` for testable scoring logic.
2. `docs/MATCHMAKING_RULES.md` for match generation behavior.
3. `docs/DATA_MODEL.md` for persistence shape.
4. `docs/PRODUCT_SPEC.md` for product workflows.
5. `docs/EXCEL_WORKBOOK_ANALYSIS.md` and `docs/RULES_DOCUMENT_ANALYSIS.md` for source evidence and conflicts.
6. Original workbook/docx only when validating or answering an unresolved question.

## Implementation Constraints

- Do not use spreadsheet formulas as runtime logic.
- Implement scoring in deterministic, unit-tested application code.
- Store raw inputs and snapshots; calculate derived values dynamically.
- Preserve historical handicap snapshots.
- Preserve generated matchups historically.
- Do not overwrite finalized/locked weeks without an audit event.
- Normalize placeholder values like `-`, `n/a`, blank, and `unk`.

## Critical Rules To Test

Attendance:

- `Yes` -> 3.
- `Confirmed` -> 3.
- `No` -> 0.
- `unk` -> 0.

Match:

- `Won` -> 5.
- `Tied` -> 2.
- `Lost` -> 0.
- `n/a` -> 0.

Net score:

- Admin-entered net score from 18Birdies is official for the first version.
- `gross - ceil(handicap / 2)` is a fallback/validation calculation.

Rank points:

- Gross: 6, 4, 3, 2, 1, 0 for ranks 1, 2, 3, 4, 5, 6+.
- Net: 5, 4, 3, 2, 1, 0 for ranks 1, 2, 3, 4, 5, 6+.
- Putts: 4, 3, 2, 1, 0 for ranks 1, 2, 3, 4, 5+.
- Lower score/putts ranks better.
- Use dense ranking.

Weekly total:

- attendance + match + gross + net + putt.

Season final:

- Drop each golfer's two lowest eligible weekly totals.

Tournament:

- Placement points: 12, 9, 8, 7, 6, 5, 4, 2 for 8th+.
- Placement is based on total net score.
- Tournament points do not count toward Points Champion.

## Known Conflicts To Respect

- Workbook currently sums all weeks; Word requires dropping two lowest weeks at season end.
- Workbook tracks show-up points and beers; show-up points are official, beer points are for fun only.
- Word says weekly scoring has three areas; workbook splits individual stroke play into gross and net points.
- Word says May through August; workbook schedule includes September, but the league end date is TBD and likely in August.
- Workbook leaderboard tracks lowest gross; Word's Going Low award uses lowest net.
- Hidden examples have putt points of 5; formal rules cap putt points at 4.

When implementing, choose the documented recommendation and add tests that make the choice visible.

## Suggested Build Order

1. Data model/migrations.
2. Scoring service with unit tests.
3. Roster, season, course, and schedule CRUD.
4. Weekly RSVP and result entry.
5. Dynamic leaderboard.
6. Match generation service.
7. Admin override/audit workflow.
8. End-of-season drop-week finalization.
9. Tournament module.
10. Awards/sanctions/champions.

## UI Guidance

- The first useful screen should be the current week dashboard, not a marketing page.
- Admin screens should prioritize dense, scan-friendly tables and clear editing states.
- Golfer screens should make schedule, matchups, strokes, and leaderboard easy to see on mobile.
- Always show calculation breakdowns for points so disputed scores are explainable.
- Do not bury rules conflicts; make admin configuration explicit where policy is unresolved.

## Testing Guidance

Add unit tests for:

- Half-handicap rounding.
- Net score fallback/validation calculation.
- Attendance points.
- Match points.
- Dense rank scoring with ties.
- No-show exclusion from rank calculations.
- Weekly total points.
- Drop-two-lowest-week calculation.
- 1v1 stroke difference.
- 1v1v1 stroke differences.
- Tournament placement points.

Add integration tests for:

- Creating a week, entering scores, and rendering leaderboard.
- Generating matchups with an odd number of golfers.
- Preventing a third consecutive partnership.
- Locking a completed week and requiring audit reason for corrections.

## Data Import Guidance

If importing from the workbook:

- Import raw current-season rows from `Weekly Point Data`.
- Do not import formula result columns as authoritative, except that entered net scores may be imported as historical net-score values when they represent 18Birdies/admin-entered net scores.
- Treat `W02` unknown rows as planned/unplayed placeholders.
- Normalize golfer and course names.
- Treat hidden example sheets as fixtures/reference only.
- Backfill first-week partners/opponents from `0512 Match Generator`; do not infer missing partners from current `Weekly Point Data`.

## Optional Enhancements Must Be Marked Optional

Examples:

- Course voting UI.
- Player self-service RSVPs.
- Payment collection.
- External handicap sync.
- Tee-time booking integrations.
- Push/email notifications.
- Per-hole live scoring.

Do not implement these in the core app unless explicitly requested.
