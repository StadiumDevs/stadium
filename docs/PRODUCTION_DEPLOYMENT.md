# Production Deployment (Vercel + Railway)

Instructions for a **code agent** or automation to update production after code changes.

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

### 4. Database (Supabase)

- [ ] **Option A – CLI:** `supabase migration list` shows remote = local (all applied).  
  If not: `supabase db push` to apply pending migrations.
- [ ] **Option B – Manual:** If you use the SQL script, run `supabase/manual_fix_schema.sql` in Supabase Dashboard → **SQL Editor**.  
  Then in **Table Editor** → **projects**: confirm `live_url` exists (and **payments**: `bounty_name`, `paid_date` if you use them).

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
