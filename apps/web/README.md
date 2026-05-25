# Denver Sands Web App

Next.js app for the Denver Sands golf league operations scaffold.

## Getting Started

From the repository root:

```bash
pnpm install
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Open `http://localhost:3000`.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

## Scope

This scaffold includes layout, navigation, placeholder pages, Supabase environment wiring, and a small Vitest smoke test. It does not implement real league business logic yet.

Use `docs/` as the source of truth for future tickets.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
