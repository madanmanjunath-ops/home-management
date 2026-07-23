# Contributing to Griha

Thanks for helping build Griha. This guide keeps the codebase consistent and the
main branch always deployable.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- A Supabase project (Postgres + Auth) — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Getting started

```bash
npm install
cp server/.env.example server/.env      # fill in your Supabase values
cp client/.env.example client/.env      # fill in your Supabase values
npm run db:setup                        # apply migrations
npm run dev                             # API on :4000, web on :5173
```

## Branching & commits

- Never commit directly to `main`. Branch from `main`:
  - `feat/<short-name>` for features
  - `fix/<short-name>` for bug fixes
  - `chore/<short-name>` for tooling/docs
- Write clear, imperative commit messages ("Add leave approval", not "added stuff").
- Open a Pull Request; fill in the template. CI must be green before merge.

## Quality gates (run before pushing)

```bash
npm run format        # auto-format with Prettier
npm run lint          # ESLint
npm run typecheck     # TypeScript, both workspaces
npm run build         # production build
```

CI runs all of these on every PR. Keep `main` green.

## Project layout

```
client/    React + Vite + TypeScript (frontend)
server/    Express + Prisma (API — runs locally and as a Netlify Function)
netlify/   Serverless function entrypoint
docs/      Deployment & operations docs
```

## Security

Never commit secrets. See [`SECURITY.md`](SECURITY.md).
