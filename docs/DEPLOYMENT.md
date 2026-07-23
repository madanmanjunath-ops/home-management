# Deploying Griha (Netlify + Supabase)

This is the full, click-by-click guide to putting Griha live. It takes ~15–20
minutes. You'll create two free accounts (Supabase for the database + login,
Netlify for hosting), copy a few values between them, and deploy.

**Architecture:** the React frontend is served by Netlify as a static site; the
API runs as a Netlify serverless function; data lives in Supabase Postgres;
sign-in is handled by Supabase Auth.

---

## Part 1 — Supabase (database + auth)

1. Go to **https://supabase.com** → sign up → **New project**.
   - Name: `griha`
   - Database password: click **Generate**, then **save it somewhere safe**.
   - Region: pick the closest (e.g. **South Asia (Mumbai)**).
   - Create, then wait ~2 minutes for it to provision.

2. **Turn off email confirmation** (so sign-up logs you straight in for Phase 1):
   - Left sidebar → **Authentication** → **Providers** → **Email**.
   - Turn **Confirm email** OFF → Save. (You can re-enable later.)

3. **Collect these 5 values** (keep them in a scratch note):

   | Value | Where in Supabase |
   |---|---|
   | `VITE_SUPABASE_URL` | Settings → **API** → **Project URL** |
   | `VITE_SUPABASE_ANON_KEY` | Settings → **API** → **Project API keys** → `anon` `public` |
   | `SUPABASE_JWT_SECRET` | Settings → **API** → **JWT Settings** → **JWT Secret** |
   | `DATABASE_URL` | Settings → **Database** → **Connection string** → **Connection pooling** tab → URI (port **6543**). Add `?pgbouncer=true` at the end. |
   | `DIRECT_URL` | Settings → **Database** → **Connection string** → **URI** (direct, port **5432**) |

   For both connection strings, replace `[YOUR-PASSWORD]` with the database
   password from step 1.

4. **Create the tables** — no Mac needed. In Supabase:
   - Left sidebar → **SQL Editor** → **New query**.
   - Open [`docs/supabase-setup.sql`](supabase-setup.sql), copy the whole file,
     paste it into the editor, and click **Run**.
   - You should see "Success". In **Table Editor** you'll now see the
     `Household`, `Staff`, `Task`, … tables.

   > Prefer the command line instead? On your Mac, put the Supabase values in
   > `server/.env` and run `npm install && npm run db:setup`. Do **one** of these,
   > not both.

---

## Part 2 — GitHub → Netlify (hosting + deploys)

First, get the code onto your `main` branch (Netlify deploys from GitHub):

- Merge the feature branch into `main` via a Pull Request on GitHub (recommended),
  or set Netlify's production branch to the feature branch in step 3.

1. Go to **https://netlify.com** → sign up (use **Sign up with GitHub**).
2. **Add new site** → **Import an existing project** → **GitHub** → authorize →
   pick **`madanmanjunath-ops/home-management`**.
3. Build settings — Netlify auto-detects them from `netlify.toml`. Confirm:
   - Build command: `npm run build`
   - Publish directory: `client/dist`
   - (Production branch: `main`)
4. Before the first deploy, click **Add environment variables** (or Site settings
   → **Environment variables** afterward) and add **all six**:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the pooled 6543 URL (`?pgbouncer=true`) |
   | `DIRECT_URL` | the direct 5432 URL |
   | `SUPABASE_URL` | your project URL, e.g. `https://xxxxx.supabase.co` (same value as `VITE_SUPABASE_URL`) |
   | `SUPABASE_JWT_SECRET` | from Supabase (Project Settings → API → JWT Settings) |
   | `TABLET_JWT_SECRET` | the same long random string you chose in Part 1 |
   | `VITE_SUPABASE_URL` | from Supabase |
   | `VITE_SUPABASE_ANON_KEY` | from Supabase |

   > `SUPABASE_URL` lets the API verify logins whether your project uses the
   > legacy JWT secret **or** the newer asymmetric signing keys — set it and
   > you're covered either way.

5. **Deploy site.** Wait for the build (~2–3 min). Netlify gives you a URL like
   `https://your-site.netlify.app`.

6. Open the URL → **Create an account** → set your name + household → you're live.
   Try the staff tablet with the join code shown in the owner app header.

---

## Updating the app later

Every push to `main` auto-deploys to production; every Pull Request gets its own
preview URL. If you change the database schema, create a migration
(`npm run db:migrate` locally) and run `npm run db:setup` against Supabase.

## Notes & Phase-2 upgrades

- **Custom domain:** Netlify → Domain settings → add your domain + free HTTPS.
- **Email confirmation / password reset / Google login:** all available in
  Supabase Auth settings when you want them.
- **Instant realtime:** the app currently auto-refreshes every few seconds. True
  push updates can be added later via Supabase Realtime.
- **Backups:** Supabase provides automatic daily backups on paid tiers; enable
  when you go beyond testing.

## Troubleshooting

- **Blank page / "Supabase is not configured":** the `VITE_*` env vars weren't set
  at build time — add them in Netlify and redeploy.
- **API 500s / "Something went wrong":** usually `DATABASE_URL` is wrong or the
  migration hasn't been run. Re-check Part 1 step 4.
- **"Session expired":** `SUPABASE_JWT_SECRET` in Netlify doesn't match the one in
  Supabase.
