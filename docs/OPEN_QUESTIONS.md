# Open Questions

This file now separates confirmed decisions from the few remaining unknowns. Confirmed decisions should be treated as product requirements unless later changed by the league.

## Confirmed Decisions

### Season And Schedule

- The season end is TBD and likely in August.
- The season end date should remain editable in the app.
- 2026-05-12 was the first week of play.
- Planned/unplayed `UNKNOWN` weeks are excluded from drop-lowest-week calculations.
- Canceled/weather weeks should also be excluded from drop-lowest-week calculations.

### Scoring

- Show-up points are official.
- Beer points are only for fun and must not affect official scoring, awards, sanctions, or champions.
- Weekly scoring includes both gross and net scoring.
- Use dense ranking for gross, net, and putt rank points.
- Admin may override calculated rank points, but overrides should require an audit reason.
- Dropping the two lowest weeks is intended to soften absences, schedule conflicts, and unusually bad weeks. Completed no-show weeks with 0 points are eligible to be dropped; planned/unplayed weeks are not.

### Matchmaking

- Do not implement `1vHandicap` in the first version.
- The repeat-pairing rule applies most strongly to 2v2 partners and also somewhat to repeated 1v1 opponents or 1v1v1 groupmates.
- Match generation should be purely random apart from repeat-pairing constraints.
- Do not balance teams by handicap.
- Generated matchups can be rerolled.
- If avoiding a third consecutive pairing is unavoidable, the app should allow it and flag it as unavoidable.

### Handicaps And Strokes

- Handicaps are tracked in 18Birdies and manually updated in the league app.
- Weekly handicaps are manually entered/updated.
- Stefan's starting handicap should be seeded as 10 for now, but all handicaps must remain editable.
- For first-version 2v2 best-ball, do not combine half-handicaps into a team handicap. Admin enters final match results.
- Tournament rounds use full handicap.
- Strokes are allocated by hole difficulty, starting with the most difficult hole.
- If the stroke count exceeds holes played, extra strokes are assigned by cycling through the same most-difficult-to-least-difficult order again.
- Courses without hole handicap ratings should not be scheduled.

### Score Entry

- Weekly play is nine holes.
- The first version does not need hole-by-hole scoring.
- Admin enters total gross score, total net score from 18Birdies, total putts, and final match play standing/result for the group.
- Admin enters final match result; the app does not calculate best-ball match result from hole-by-hole scores.
- There was no money buy-in for the first league iteration, so payout/payment features are not part of the first version.
- Track partners/opponents historically.
- Backfill first-week partners/opponents from `0512 Match Generator`.

### Tournament

- Tournament placement is based on net score.
- Tournament tie-breakers should be:
  1. Lower total putts across both tournament rounds.
  2. Lower final-round net score.
  3. Lower final-round putts.
  4. If still tied, share the place and each tied golfer receives the points for that place.
- Tournament points do not count toward Points Champion.
- Tournament results do not affect regular-season awards/sanctions.
- Tournament course voting is not required in the first version.

### Awards, Sanctions, And Payouts

- Use the tie-breakers defined in `SCORING_RULES.md`.
- No payout amounts in the first version because there are no entry fees.
- Preview leaderboards for awards/sanctions should be visible to all players during the season.

### Data Cleanup

- `Cal` should not remain on the active roster.
- Stefan's handicap should be seeded as 10 for now and remain editable.
- Correct `Walnut Creet` to `Walnut Creek`.
- Normalize `IndianTree` and `Indian Tree` to `Indian Tree`.
- Do not import hidden example sheets into the app.

## Remaining Questions

1. What is the final season end date once the August schedule is set? This should remain editable rather than blocking implementation.
