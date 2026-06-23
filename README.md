# Denver Sands Golf League

Web application for replacing the Denver Sands / Clubhouse Zyndicates spreadsheet workflow.

The first-version league workflow is implemented through release-readiness QA: admin setup, scoring, match generation, weekly results, leaderboard calculations, audit browsing, regression coverage, and end-of-season calculations all have local service/UI coverage. The documents in `docs/` remain the source of truth for rules, tickets, and follow-up scope.

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
SUPABASE_SERVICE_ROLE_KEY=replace-with-server-only-service-role-key
```

The Next.js server layer owns Supabase reads and writes. The service role key is
server-only and should not be prefixed with `NEXT_PUBLIC_`; local development can
fall back to the anon key when service-role access is not configured.

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
pnpm test:regression
pnpm test:qa
pnpm build
```

## Database Verification

The local test suite statically verifies the Phase 1 migration and seed files. Full database verification still requires a configured Supabase project.

With Supabase configured, run:

```bash
supabase db reset
pnpm db:seed
pnpm db:seed
```

The second seed run should complete without duplicate-record errors. Use the `/admin` page to verify season, roster, course, weekly event, and tee-time create/edit/delete flows against that database.

## Release Readiness QA

The first-version regression suite protects confirmed spreadsheet behavior:

```bash
pnpm test:regression
```

The admin-to-public vertical slice QA check covers one weekly cycle from setup through public leaderboard parity:

```bash
pnpm test:qa
```

Manual Supabase/browser QA steps live in `docs/FIRST_ADMIN_TO_PUBLIC_QA.md`.

## App Routes

- `/admin`
- `/admin/audit`
- `/match-generator`
- `/weekly-results`
- `/leaderboard`
- `/handicap-history`
- `/tournament`
- `/awards-sanctions`

The root route redirects to `/leaderboard`.

## Implementation Notes

- Preserve current spreadsheet behavior before adding enhancements.
- Keep unresolved rule ambiguity pointed at `docs/OPEN_QUESTIONS.md`.
- Do not add payments, notifications, charts, external booking, external handicap sync, live scoring, or course voting in the initial scaffold.
