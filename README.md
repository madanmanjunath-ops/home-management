# Griha — Home Staff Management

Griha helps a household run its domestic team — cook, housekeeper, nanny, driver — from one calm,
warm screen. It has two experiences that stay in sync in real time:

- **Owner app** — manage staff, assign tasks, track attendance, approve shopping, run payroll,
  handle leave, log expenses, and keep documents.
- **Staff tablet** — a shared board where staff see their tasks, mark them done, and request shopping
  items. Joins a home with a short code (no per-staff passwords).

Built as a real full-stack app: **React + Vite + TypeScript** frontend, **Node + Express + Prisma
(SQLite)** backend, and **WebSockets** for live updates across every device.

## Features

| Module | Owner | Staff tablet |
| --- | --- | --- |
| **Dashboard** — live metrics + activity feed | ✓ | — |
| **Staff** — profiles, roles, languages, salary | ✓ | view |
| **Tasks** — assign, recurring, complete | ✓ | complete |
| **Attendance** — daily check-in / out (leave-aware) | ✓ | — |
| **Shopping** — request → approve/reject → purchased | ✓ | request |
| **Salary** — monthly payroll, advances, mark paid | ✓ | — |
| **Leave & holidays** — request → approve/decline | ✓ | request |
| **Expenses** — petty-cash log with monthly totals | ✓ | — |
| **Calendar** — leave, payday and spending by day | ✓ | — |
| **Documents** — Aadhaar / PAN / verification registry | ✓ | — |
| **Notifications** — a quiet feed of what changed | ✓ | — |

Approved leave automatically stops attendance flagging someone as “not checked in.”

## Quick start

```bash
npm install          # installs both workspaces (client + server)
npm run setup        # runs migrations + seeds a demo household
npm run dev          # starts API (:4000) and web app (:5173) together
```

Open **http://localhost:5173**.

**Demo credentials**

- Owner login — `owner@griha.app` / `griha123`
- Staff tablet join code — `HOME24`

To sign up a fresh household instead, use **Create a household** on the login screen. Each new
household gets its own join code (shown in the owner app header).

## How it works

```
client/   React + Vite + TypeScript
  src/
    api.ts        typed REST client
    store.tsx     session + snapshot + WebSocket live-sync
    pages/        owner screens
    tablet/       staff tablet
server/   Express + TypeScript
  prisma/         schema, migrations, seed
  src/
    routes/       one router per module
    auth.ts       JWT (owner) + join-code (tablet)
    realtime.ts   per-household WebSocket broadcast
```

The client holds one **household snapshot** (`GET /api/state`) as its source of truth. Any mutation
on the server broadcasts a `sync` message over WebSocket to that household's connected clients, which
refetch the snapshot — so the owner's phone and the staff tablet stay consistent automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run API + web app together (hot reload) |
| `npm run setup` | Apply DB migrations and seed demo data |
| `npm run db:reset` | Drop, re-migrate and re-seed the database |
| `npm run build` | Type-check and build both workspaces |

## Notes on production

This is a solid interim build. Before real-world use, these need a proper integration (deliberately
left out here):

- Phone / SMS OTP authentication and secure multi-user access
- Aadhaar OCR and **encrypted** document storage
- Real payments / payslips
- Push notifications; biometric or GPS attendance
- Move SQLite → Postgres (change one line in `server/prisma/schema.prisma` + `DATABASE_URL`)

## Tech

React 18 · Vite · TypeScript · React Router · Express · Prisma · SQLite · `ws` · JWT · Zod
