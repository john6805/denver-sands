# First Admin-To-Public Vertical Slice QA

Ticket 23 verifies that the first version can replace one weekly spreadsheet cycle without adding new product scope.

## Local Automated Check

Run:

```bash
pnpm --filter web test:qa
```

The automated happy path covers:

- Admin season creation with nullable `ends_on`.
- Course creation and complete hole handicap readiness.
- Weekly event creation.
- Handicap snapshot planning for confirmed golfers.
- Match format planning and deterministic draft match generation.
- Persistence row shaping for generated matches, sides, participants, and stroke allocations.
- Weekly result entry validation.
- Weekly point breakdown calculation.
- Locked-week correction validation with a required reason.
- Audit event shape for the correction.
- Admin/public leaderboard parity from the shared leaderboard service.

## Manual QA Checklist

Use a configured local Supabase instance and the seeded 2026 workbook data.

1. Seed/import workbook facts.
   - Confirm the 2026 season exists.
   - Confirm `ends_on` is editable and may remain blank.
   - Confirm active roster excludes Cal.
   - Confirm course names are normalized, including Walnut Creek and Indian Tree.

2. Verify admin setup.
   - Open `/admin`.
   - Create or edit a season, golfer, course, weekly event, and tee time.
   - Confirm missing course hole data is visible before generation.
   - Add complete course hole handicap ranks for a scheduled course.

3. Snapshot handicaps.
   - Open `/handicap-history`.
   - Snapshot confirmed golfers for a week.
   - Confirm missing handicaps block only the affected golfer.
   - Change a current handicap after snapshotting and verify the historical snapshot is preserved.

4. Generate matches.
   - Open `/match-generator`.
   - Generate draft matchups for a week with confirmed golfers.
   - Confirm a 9-golfer week produces three 1v1v1 groups.
   - Reroll before publishing.
   - Confirm stroke allocation appears only when complete course hole ratings exist.

5. Enter and review weekly results.
   - Open `/weekly-results`.
   - Enter played, no-show, and unknown rows.
   - Confirm planned/unknown rows do not look like completed zero-point weeks.
   - Confirm the point breakdown matches gross, net, putt, attendance, and match scoring.

6. Lock and correct a week.
   - Lock a completed week.
   - Confirm normal edits are blocked.
   - Submit a correction with a non-empty reason.
   - Confirm the corrected totals recalculate.

7. Review audit trail.
   - Open `/admin/audit`.
   - Filter by season, week, entity type, and action.
   - Confirm the locked-week correction shows before/after values and the reason.
   - Confirm audit rows are read-only.

8. Verify leaderboards.
   - Open `/leaderboard`.
   - Confirm raw points, official points, drops, points behind, match wins, no-shows, lows, and beer social totals match the tested services.
   - Confirm beer totals do not affect official scoring.
   - Confirm planned and canceled weeks do not affect completed stats or drop-week eligibility.

9. Verify end-of-season separation.
   - Open `/awards-sanctions` and `/tournament`.
   - Confirm regular-season awards exclude tournament data.
   - Confirm Tournament Champion and Points Champion are separate outputs.
   - Confirm tournament points do not affect Points Champion.

## Follow-Up Gaps

- Live persistence QA requires configured Supabase credentials and a seeded database; local unit tests cover deterministic validation and calculation behavior without external credentials.
- The only remaining non-blocking policy ambiguity is the final season end date in `docs/OPEN_QUESTIONS.md`; keep it nullable and editable.
