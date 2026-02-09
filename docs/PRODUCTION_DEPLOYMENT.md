# Production Deployment (Vercel + Railway)

Instructions for a **code agent** or automation to update production after code changes.

---

## 🚀 One-command deploy (recommended)

From the **repo root**, run:

```bash
node server/scripts/deploy-all.js
```

Or from **server/**:

```bash
cd server
npm run deploy:all
```

This single command:

1. ✅ Checks Git (on main, clean, up to date) — auto-commits/pushes if needed
2. ✅ Applies Supabase migrations (`supabase db push` if any pending)
3. ✅ Updates Symbiosis M2 status:
   - Sets main-track winners to `m2_status='building'` (for Program Overview)
   - Sets completed projects to `m2_status='completed'` (for Recently Shipped)
4. ✅ Applies Symbiosis payouts:
   - Updates `payments` table with M1/M2/BOUNTY payments
   - Updates project `m2_status` and `completion_date` based on payouts
5. ✅ Deploys Railway server (`railway up --detach`)
6. ✅ Deploys Vercel client (`vercel --prod`)
7. ✅ Quick verification (API/frontend reachable)

**Note:** Steps 3-4 require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment. If not set, they will skip with a warning (projects may already be updated).

**After it finishes**, wait 1-2 minutes for Railway build, then run:

```bash
cd server
npm run verify:production
```

For full verification that everything matches main and works correctly.

---

---

## Do I need to commit everything for deploy?

**Railway & Vercel (app code):**  
- **If they deploy from Git (recommended):** Yes. Commit and push to the branch they watch (e.g. `main`). That triggers the build and deploy; what’s on that branch is what gets deployed.  
- **If you deploy via CLI** (`railway up`, `vercel --prod`): The CLI can deploy from your **local** files. Your repo can be ahead or behind; for a consistent state, still commit and push after a successful deploy so the branch matches production.

**Supabase (database):**  
- **Committing** migration files is for version control and sharing the schema. Push them with the rest of the repo.  
- **Applying** migrations (actually changing the DB) is separate: run `supabase db push` (or run SQL in the Dashboard). Pushing to Git does **not** run migrations on your Supabase project.

**Summary:** Commit (and push) everything you want in production to the branch Railway/Vercel use; then deploy. For Supabase, committing is enough for the repo; run migrations when you want the DB updated.

---

## Prerequisites

- **Railway CLI** installed and logged in (`railway login` if needed).
- **Vercel CLI** installed and logged in (`vercel login` if needed).
- Repo linked to Railway (project `STADIUM`, service `stadium`) and to Vercel (client app).
- All changes committed; deploy from the branch you want (e.g. `main` or `develop`).

---

## Deploy order

1. **Server (Railway)** – deploy first so the API is up to date.
2. **Client (Vercel)** – deploy second so the frontend uses the new API.

---

## 1. Deploy server to Railway

From the **repository root**:

```bash
cd server
railway up --detach
```

- Ensure you’re in the **production** environment (`railway status` shows `Environment: production`). If not, run `railway link` and select the production project/environment.
- `--detach` exits after the deploy is queued; build and deploy continue on Railway.
- Build logs: open the URL printed by the CLI, or go to [Railway dashboard](https://railway.app) → project → service → Deployments.

---

## 2. Deploy client to Vercel

From the **repository root**:

```bash
cd client
vercel --prod
```

- This builds and deploys the client to **production**.
- The CLI prints the production URL and an “Inspect” link for the deployment.

---

## One-shot from repo root

```bash
# Server (Railway)
cd /path/to/stadium/server && railway up --detach

# Client (Vercel)
cd /path/to/stadium/client && vercel --prod
```

Replace `/path/to/stadium` with the actual workspace path (e.g. `$WORKSPACE` or the repo root).

---

## Verifying

- **Railway:** Dashboard → Deployments → latest deployment should be “Success”; check logs for `Listening on port …` or similar.
- **Vercel:** Dashboard → Deployments → latest production deployment; open the production URL and smoke-test (e.g. Home, Program Overview, search).

---

## Connect Railway to Vercel

For the Vercel frontend to talk to the Railway API, both sides must be configured:

### 1. Vercel → Railway (frontend calls API)

- In **Vercel**: [Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**.
- Add (or edit) for **Production** (and Preview if you want):
  - **Name:** `VITE_API_BASE_URL`
  - **Value:** `https://stadium-production-996a.up.railway.app/api`
- **Save**, then trigger a **new production deploy** (Deployments → … → Redeploy).  
  Vite bakes this in at build time, so a redeploy is required after changing it.

### 2. Railway → Vercel (API allows frontend origin)

- The server already allows any `https://*.vercel.app` origin (see `server.js` CORS). No change needed if you deploy from this repo.
- Optional: In **Railway** → your service → **Variables**, you can set **`CORS_ORIGIN`** to a comma-separated list of exact origins (e.g. your custom domain + Vercel URL). If set, it overrides the default list but the code still allows any `*.vercel.app` in addition.

### 3. Confirm

- Open your Vercel production URL. In the browser console run: `__STADIUM_API_BASE__`  
  It should print `https://stadium-production-996a.up.railway.app/api`.
- Projects should load. If not, see [DEBUG_UI_PROJECTS.md](./DEBUG_UI_PROJECTS.md).

---

## How Railway connects to Supabase

The server (on Railway) talks to Supabase using **two environment variables**. They are read in `server/db.js` when the app starts.

### Required variables (set in Railway)

In **Railway** → your project → **Variables** (or the service that runs the server), add:

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| **`SUPABASE_URL`** | Your project URL | Supabase Dashboard → Project Settings → API → **Project URL** (e.g. `https://xxxxx.supabase.co`) |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Service role secret (bypasses RLS) | Supabase Dashboard → Project Settings → API → **Project API keys** → **service_role** (secret) |

- No other Supabase env vars are needed for the app.
- The server trims whitespace/newlines from these values (so pasting from the dashboard is safe).
- If either is missing or wrong, the server will either fail to start (connection test on startup) or return errors when handling requests.

### Verify the connection

1. **Railway logs**  
   On startup you should see: `✅ Connected to Supabase`. If you see `❌ Supabase connection failed`, the URL or key is wrong or the project is unreachable.

2. **Health endpoint**  
   After deploy, open (replace with your Railway URL if different):
   ```text
   https://stadium-production-996a.up.railway.app/api/health/db
   ```
   - **200** and `"message": "Connected to Supabase"` → connection is working.
   - **503** or an error message → connection or query failed; check the variables and Supabase project.

3. **Projects API**  
   If `/api/health/db` is OK but the UI still has no projects, the issue is likely CORS or the frontend API URL, not Railway ↔ Supabase.

### If it’s not working

- Confirm **both** variables are set in the **same** Railway service that runs the server (and that you didn’t leave a space or newline in the value).
- Confirm the **service_role** key is from the same Supabase project as the **Project URL**.
- In Supabase Dashboard, confirm the project is not paused and that the **projects** table exists (migrations applied).

---

## Environment / config

- **Railway:** Env vars (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`) are set in the Railway project. No local `.env` is uploaded.
- **Vercel:** Build and env vars (e.g. `VITE_API_BASE_URL`) are set in the Vercel project. Ensure production `VITE_API_BASE_URL` points at the Railway API URL.
- **DB (Supabase):** Migrations are applied separately (e.g. via Supabase CLI or dashboard). Deploying the server does not run migrations.

---

## Rollback

- **Railway:** Dashboard → Deployments → select a previous deployment → “Redeploy” (or use Railway’s rollback if available).
- **Vercel:** Dashboard → Deployments → select a previous deployment → “Promote to Production”.

---

## Step-by-step: Deploy latest to production

Use this checklist so the latest code and DB are live and working.

### 1. Git

- [ ] All changes you want in prod are committed.
- [ ] Push to the branch production uses (e.g. `main`):  
  `git push origin main`

### 2. Server (Railway)

- [ ] From repo root: `cd server && railway status`  
  Confirm **Environment: production** (and correct project/service).
- [ ] Deploy: `railway up --detach`
- [ ] In [Railway dashboard](https://railway.app) → your project → **Deployments**:  
  Latest deployment is **Success** and logs show the server listening (e.g. “Listening on port …”).

### 3. Client (Vercel)

- [ ] From repo root: `cd client && vercel --prod`
- [ ] Build finishes without errors; CLI shows **Production** URL.
- [ ] In [Vercel dashboard](https://vercel.com) → your project → **Deployments**:  
  Latest production deployment is **Ready**.

### 4. Database (Supabase) – ensure all migrations are done

Production uses the **same** Supabase project as the one you link to the CLI. To have the latest schema so the app can render correctly:

1. **From the repo (with Supabase linked):**
   ```bash
   cd /path/to/stadium
   supabase migration list
   ```
   - If **Local** and **Remote** match for every row → all migrations are applied; you’re done.
   - If any migration is **only in Local** (missing under Remote), apply them:
     ```bash
     supabase db push
     ```

2. **Optional safety pass (idempotent):**  
   In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, run the contents of **`supabase/manual_fix_schema.sql`**.  
   Then in **Table Editor** → **projects** confirm the **`live_url`** column exists (and **payments** → `bounty_name`, `paid_date` if you use them).

3. **If you never use the CLI:**  
   You can apply schema changes by running the SQL from each migration file (or `manual_fix_schema.sql` / `fresh_project_schema.sql` as appropriate) in the Dashboard **SQL Editor**. The app and CLI both talk to the same DB; migrations just need to be applied once.

### 5. Config / env

- [ ] **Railway:** Project **Variables** include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (and any others the server needs).
- [ ] **Vercel:** Project **Settings** → **Environment Variables**: production has `VITE_API_BASE_URL` set to your **Railway API URL** (e.g. `https://your-app.up.railway.app`).

### 6. Smoke test on live app

- [ ] Open your **production frontend URL** (Vercel production or custom domain).
- [ ] Homepage loads; project list or search works.
- [ ] Open a project that has a **live URL**; confirm the live link appears and works.
- [ ] **Program Overview** (M2) loads and shows the expected projects (main track, in program only).
- [ ] If something fails: check browser Network tab (API errors?) and Railway logs (server errors?).

When all steps are checked, the latest version is deployed to production.

### 7. Verify API reads from DB (optional)

From the **server** directory, run the API test against production (replace the URL if your Railway domain differs):

```bash
cd server
API_BASE_URL=https://stadium-production-996a.up.railway.app/api npm run test:api-db
```

Or against a local server (with Supabase env set):

```bash
cd server && npm start
# In another terminal:
cd server && npm run test:api-db
```

All three checks should pass: list projects, filtered list, and get-by-id. Then the UI can read from the DB via the API.

### 8. Full production verification (recommended)

From the **server** directory, run the comprehensive verification script:

```bash
cd server
export API_BASE_URL="https://stadium-production-996a.up.railway.app/api"
export FRONTEND_URL="https://your-vercel-production-url.vercel.app"
npm run verify:production
```

This checks:

- ✅ Railway API is reachable (`/api/health`)
- ✅ Railway → Supabase connection (`/api/health/db`)
- ✅ API returns projects from DB
- ✅ Symbiosis 2025 projects exist
- ✅ Symbiosis main-track winners exist
- ✅ Symbiosis main-track appear on M2 Program Overview (M2 filters)
- ✅ Vercel frontend is reachable
- ✅ Frontend can call API (CORS)

If any checks fail, the script prints next steps (e.g. run migrations, check env vars, redeploy).

### 9. Verify production matches main branch

From the **repo root** (not server/), run:

```bash
export API_BASE_URL="https://stadium-production-996a.up.railway.app/api"
export FRONTEND_URL="https://your-vercel-production-url.vercel.app"
npm run verify:main-deployed --prefix server
```

Or from **server/**:

```bash
cd server
export API_BASE_URL="..." FRONTEND_URL="..."
node scripts/verify-main-deployed.js
```

This checks:

- ✅ Git: on main branch, clean working tree, up to date with origin/main
- ✅ Supabase: migrations match local (all applied)
- ✅ Railway API health and DB connection
- ✅ API returns projects correctly
- ✅ Program Overview filters work (main track + M2 only)
- ✅ Vercel frontend reachable
- ✅ Frontend → API CORS works

If any check fails, it prints what to fix (commit/push, run migrations, redeploy, etc.).
