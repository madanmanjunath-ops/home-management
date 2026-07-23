# Griha — Home Staff Management

Griha helps a household run its domestic team — cook, housekeeper, nanny, driver — from one calm,
friendly screen. It has two experiences:

- **Owner app** — manage staff, assign tasks, track attendance, approve shopping, run payroll,
  handle leave, log expenses, and keep documents.
- **Staff tablet** — a shared board where staff see their tasks, mark them done, and request shopping
  items. Joins a home with a short code (no per-staff passwords).

Built as a real full-stack app: **React + Vite + TypeScript** frontend, an **Express + Prisma** API
(runs locally and as a **Netlify serverless function**), **Supabase Postgres** for data, and
**Supabase Auth** for sign-in. The app auto-refreshes so the owner's phone and the staff tablet stay
in sync.

## Features

| Module                                                | Owner | Staff tablet |
| ----------------------------------------------------- | ----- | ------------ |
| **Dashboard** — live metrics + activity feed          | ✓     | —            |
| **Staff** — profiles, roles, languages, salary        | ✓     | view         |
| **Tasks** — assign, recurring, complete               | ✓     | complete     |
| **Attendance** — daily check-in / out (leave-aware)   | ✓     | —            |
| **Shopping** — request → approve/reject → purchased   | ✓     | request      |
| **Salary** — monthly payroll, advances, mark paid     | ✓     | —            |
| **Leave & holidays** — request → approve/decline      | ✓     | request      |
| **Expenses** — petty-cash log with monthly totals     | ✓     | —            |
| **Calendar** — leave, payday and spending by day      | ✓     | —            |
| **Documents** — Aadhaar / PAN / verification registry | ✓     | —            |
| **Notifications** — a quiet feed of what changed      | ✓     | —            |

Approved leave automatically stops attendance flagging someone as “not checked in.”

## Quick start (local development)

You need a free [Supabase](https://supabase.com) project (Postgres + Auth). Then:

```bash
npm install

# server/.env — from your Supabase project (see docs/DEPLOYMENT.md)
cp server/.env.example server/.env       # fill in DATABASE_URL, DIRECT_URL, SUPABASE_JWT_SECRET, TABLET_JWT_SECRET
# client/.env — from your Supabase project
cp client/.env.example client/.env       # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

npm run db:setup     # apply migrations to your Supabase database
npm run dev          # API on :4000, web on :5173
```

Open **http://localhost:5173**, create an account, and set up your household (a little sample data is
added so it isn't empty). Share the join code (shown in the owner header) with the staff tablet.

> **Just want to look?** A no-setup interactive demo (in-browser mock, no Supabase needed) is built
> with `npm run build:demo --workspace client`.

## Deploying (Netlify + Supabase)

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full click-by-click guide. In short:
frontend + API deploy to Netlify (config in `netlify.toml`), data + auth live in Supabase, and every
push to `main` auto-deploys.

## How it works

```
client/            React + Vite + TypeScript (frontend)
  src/
    api.ts         typed API client
    supabase.ts    Supabase Auth client
    store.tsx      session + household snapshot + polling
    pages/         owner screens
    tablet/        staff tablet
    demo/          in-browser mock for the no-setup preview
server/            Express + Prisma (the API)
  prisma/          schema + migrations
  src/
    app.ts         Express app (shared by local dev + serverless)
    auth.ts        verifies Supabase tokens (owner) + tablet join tokens
    routes/        one router per module
    sampleData.ts  seeds a new household
netlify/functions/ serverless entrypoint (wraps app.ts)
```

The client holds one **household snapshot** (`GET /api/state`) as its source of truth and refreshes it
on a short interval and on focus. Owners authenticate with **Supabase Auth**; the API verifies the
Supabase token and scopes every query to the owner's household. The staff tablet exchanges a join code
for a scoped token.

## Scripts

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Run API + web app together (hot reload)          |
| `npm run db:setup`  | Apply database migrations to Supabase            |
| `npm run build`     | Build both workspaces (what Netlify runs)        |
| `npm run typecheck` | Type-check both workspaces                        |
| `npm run lint`      | ESLint                                            |
| `npm run format`    | Format with Prettier                             |

## Phase-2 upgrades (deliberately out of scope for now)

- Phone / SMS OTP and Google sign-in (Supabase Auth supports these)
- Aadhaar OCR and **encrypted** document storage
- Real payments / payslips
- Push notifications; biometric or GPS attendance
- Instant realtime via Supabase Realtime (replacing the current polling)

## Tech

React 18 · Vite · TypeScript · React Router · Express · Prisma · Supabase (Postgres + Auth) · Netlify
Functions · Zod
