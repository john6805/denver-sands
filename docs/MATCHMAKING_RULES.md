# Matchmaking Rules

This document captures weekly match generation behavior from the Word rules and workbook match generator sheets.

## Goals

The app should generate fair weekly matches while preserving the league's casual workflow:

- Random weekly teams.
- Prefer 2v2 best-ball matches.
- Support fallback formats when attendance does not divide cleanly.
- Avoid pairing the same golfers together 3 weeks in a row.
- Apply handicap strokes using weekly handicaps and hole handicap ratings.
- Allow admin override.

## Inputs

For each scheduled week:

- Course.
- Tee times.
- Confirmed golfers.
- No-show/unavailable golfers.
- Each golfer's current handicap.
- Pairing history from prior completed/generated weeks.
- Course hole handicap ratings.

Confirmed setup decisions:

- Track partners/opponents historically.
- Backfill first-week partners/opponents from `0512 Match Generator`.
- Weekly handicaps are manually entered or updated from 18Birdies.

## Attendance Statuses

Workbook statuses:

- `Confirmed`
- `Yes`
- `No`
- `unk`

Recommended app statuses:

- `UNKNOWN`: no RSVP yet.
- `CONFIRMED`: golfer plans to play.
- `PLAYED`: golfer attended and has score data.
- `NO_SHOW`: golfer did not play.
- `WITHDRAWN`: known absence before match generation.

For generation, include `CONFIRMED` and possibly admin-selected golfers only.

## Format Selection

Word document preference order:

1. 2v2 best-ball matches.
2. 1v1 matches if needed.
3. 1v1v1 as fallback.

`1vHandicap` appears in the Word document, but the league does not expect to use it. Do not include it in the first app version.

Recommended deterministic generation rules:

- 2 golfers: one 1v1 match.
- 3 golfers: one 1v1v1 match.
- 4 golfers: one 2v2 match.
- 5 golfers: one 1v1v1 plus one 1v1.
- 6 golfers: one 2v2 plus one 1v1.
- 7 golfers: one 2v2 plus one 1v1v1.
- 8 golfers: two 2v2 matches.
- 9 golfers: three 1v1v1 matches, matching the 2026-05-12 workbook example.
- 10 golfers: two 2v2 matches plus one 1v1.
- 11+ golfers: combine tee-time capacity, 2v2 preference, 1v1, and 1v1v1.

Admin override:

- The admin can override the recommended format mix before publishing.
- For 11+ golfers, default to the recommended format mix automatically.
- If the repeat-pairing constraint is impossible to satisfy, the app should allow the matchup and flag it as unavoidable.

## Randomization

Current workbook clue:

- `Match Generator` links to `https://wheelofnames.com`, suggesting randomization is currently manual/external.

Implementation rule:

- The app should generate pairings randomly from eligible confirmed golfers.
- Store the random seed or generated result for audit/replay.
- Allow rerolling before publication.
- Once published, changes should create an audit event or version.

## Pairing Constraint

Word rule:

- No two golfers should be paired together 3 weeks in a row.

Implementation interpretation:

- A golfer pair may be partners for at most 2 consecutive weeks.
- On week 3, the generator must avoid that same partnership if possible.
- This applies most strongly to 2v2 partners.
- It should also consider repeated opponents/groupmates in 1v1 and 1v1v1 as a softer constraint.
- Hard constraint: avoid the same 2v2 partnership for a third consecutive week unless unavoidable.
- Soft constraint: reduce repeated 1v1 opponents and 1v1v1 groupmates when random choices allow it.

Algorithm:

1. Build all candidate team/group assignments for the attendance set.
2. Score candidates:
   - Hard reject any 2v2 partnership that would make the same pair partners for a third consecutive week, unless no valid candidate exists.
   - Prefer the format mix above.
   - Do not balance by handicap; teams/groups should be purely random apart from repeat-pairing constraints.
3. Randomly select from the best-scoring candidates.
4. If no candidate satisfies all constraints, allow the best random result and mark the conflict as unavoidable.

## Handicap And Stroke Calculations

Workbook rule for weekly nine-hole play:

```text
half_handicap = ceil(handicap / 2)
```

### 2v2

For first-version scoring, do not combine partner handicaps into a team handicap. The league uses 18Birdies for gross/net scoring and the admin enters final match play standings for the group.

The app should store each golfer's weekly handicap snapshot and optionally display each golfer's half-handicap for reference, but official 2v2 match result points come from the admin-entered final result.

Stefan's starting handicap should be seeded as 10 for the current workbook import, but all handicaps remain editable.

### 1v1

Workbook formula:

```text
stroke_difference = abs(player_1_half_handicap - player_2_half_handicap)
```

The higher-handicap golfer receives the difference.

### 1v1v1

Workbook formulas:

```text
low = min(half_handicaps)
mid = median(half_handicaps)
high = max(half_handicaps)

middle_vs_low_strokes = mid - low
high_vs_low_strokes = high - low
high_vs_middle_strokes = high - mid
```

Example from `0512 Match Generator`:

- Bryan 7, Joe 9, John 14.
- Joe receives 2 strokes relative to Bryan.
- John receives 7 strokes relative to Bryan.
- John receives 5 strokes relative to Joe.

## Stroke Allocation By Hole

Word rule:

- Strokes are given on the toughest holes based on hole handicap ratings.

Implementation rule:

- Store hole handicap rank for each course hole.
- For a nine-hole event, allocate strokes to the hardest holes being played.
- If a player/team receives `N` strokes, assign one stroke on each of the `N` toughest eligible holes.
- If `N` exceeds holes played, cycle through the handicap order for additional strokes. This is standard handicap allocation but needs league confirmation.

- Weekly league play is nine holes.
- If stroke count exceeds holes played, extra strokes are allocated in the same difficulty order, cycling from most difficult to least difficult again.
- Courses without hole handicap data should not be scheduled.
- For 2v2, first-version app behavior does not need to calculate team-level best-ball stroke allocation because final match results are entered by admin.

## Best-Ball Match Result

Word rule:

- 2v2 teams play best ball.

Implementation rule:

- The first version does not calculate best-ball results from hole-by-hole scores.
- Admin enters the final match play standing/result for the group.
- The app stores the match result and awards match points from that final admin-entered result.
- The first version does not need hole-by-hole scoring.

## Admin Override

The app should allow admins to:

- Mark golfers in/out.
- Generate matchups.
- Reroll before publishing.
- Manually edit teams/groups.
- Override pairing constraints with a reason.
- Edit stroke allocations if course data is incomplete.
- Lock/publish final matchups.

## Historical Preservation

The workbook preserves old matchups by hiding copied generator sheets. The app should instead store:

- Generated matches.
- Tee times.
- Teams/groups.
- Player handicaps used at generation time.
- Stroke allocations.
- Publication timestamp.
- Admin overrides.

Import/backfill requirement:

- Backfill first-week partners/opponents from `0512 Match Generator` during initial data migration.
