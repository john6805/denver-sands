# Denver Sands Golf League

Web application scaffold for replacing the Denver Sands / Clubhouse Zyndicates spreadsheet workflow.

The current app is intentionally a placeholder shell. It uses the documents in `docs/` as the source of truth and does not implement scoring, match generation, leaderboard, or end-of-season business logic yet.

## Stack

- Next.js App Router
- TypeScript
- Supabase client packages
- Tailwind CSS
- shadcn/ui
- Zod
- Vitest

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create local environment files:

```bash
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
```

3. Fill in Supabase values when a local or hosted Supabase project is ready:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
```

4. Start the web app:

```bash
pnpm dev
```

5. Open `http://localhost:3000`.

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Placeholder Routes

- `/`
- `/login`
- `/admin`
- `/schedule`
- `/players`
- `/courses`
- `/match-generator`
- `/weekly-results`
- `/leaderboard`
- `/handicap-history`
- `/tournament`
- `/awards-sanctions`
- `/scoring-rules`

## Implementation Notes

- Preserve current spreadsheet behavior before adding enhancements.
- Keep unresolved rule ambiguity pointed at `docs/OPEN_QUESTIONS.md`.
- Do not add payments, notifications, charts, external booking, external handicap sync, live scoring, or course voting in the initial scaffold.
