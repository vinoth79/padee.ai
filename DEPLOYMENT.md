# Deployment

Phase 1 architecture: **frontend on Vercel**, **backend on Railway**, **database +
auth on Supabase**, **NCERT vector index on Supabase pgvector**.

This doc covers a fresh deploy from a clean repo. For redeploys after the first,
skip to [Routine redeploy](#routine-redeploy).

---

## Prerequisites

- Supabase account (free tier is sufficient for pilot — < 500 MB DB, < 50K MAU)
- Railway account (free tier covers ~500 hrs/month; paid plan for always-on)
- Vercel account (free tier is fine; Pro for analytics)
- Domain (optional for pilot; padee.ai will route to Vercel by default)
- API keys:
  - Groq (free tier — generous rate limits per key)
  - OpenAI (paid; ~$5–20/mo at pilot scale)
  - Google Cloud Text-to-Speech (optional; falls back to browser SpeechSynthesis if unset)

---

## 1. Supabase setup

### 1a. Create the project

1. New Supabase project. Region: closest to your students. For India: AWS Mumbai (`ap-south-1`) ideally; the current dev project sits in `us-east-1` which is acceptable but adds ~250ms latency per round-trip.
2. From **Project Settings → API**, copy:
   - Project URL → `SUPABASE_URL` AND `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never ship to frontend)

### 1b. Enable pgvector

In **Database → Extensions**, search for `vector` and enable it. Required by migrations 002 (response_cache) and 003 (ncert_chunks).

### 1c. Run migrations in order

Supabase SQL Editor → paste each migration file from `supabase/migrations/` in numeric order. **Do not skip migration 006** — it fixes a `similarity real` cast bug; without it the entire semantic cache silently returns zero rows.

```
001_core_tables.sql
002_ai_tables.sql
003_ncert_rag.sql
004_practice_worksheets.sql
005_rls_policies.sql
006_fix_cache_rpc.sql           # CRITICAL — see CLAUDE.md
007_test_assignments.sql
008_recommendation_engine.sql
009_profile_onboarding_extensions.sql
010_daily_pledge.sql
011_pledge_aware_streak.sql
```

### 1d. Auth settings

**Authentication → Providers → Email**: enable. Set **Confirm email** to disabled for the pilot (auto-confirm signup; CLAUDE.md notes this is the current convention).

**Authentication → URL Configuration**:
- Site URL: your Vercel URL (e.g. `https://padee.ai`)
- Redirect URLs: `https://padee.ai/**`, `http://localhost:5173/**`

### 1e. Create the test student (optional, for first smoke-test)

```sql
-- In Supabase SQL Editor, after auth user is created via signup flow
-- (the auto-trigger in migration 001 inserts the profile row).
-- Then promote any user to admin/teacher as needed:
update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## 2. Backend on Railway

### 2a. New Railway project

1. From the GitHub-linked Railway dashboard: **New Project → Deploy from GitHub repo** → select this repo.
2. **Settings → Service**: set **Start Command** to `npm run dev:server`. The default `npm start` doesn't exist in this repo. (You may want a `start` script in `package.json` for prod — see [Future hardening](#future-hardening) below.)
3. **Settings → Networking**: enable **Public Networking**. Note the generated `*.up.railway.app` URL — you'll feed this to Vercel as the API base.

### 2b. Environment variables

In **Variables**, paste every entry from `.env.example` except `VITE_*` (those go on Vercel). At minimum:

```
PORT=3001                                 # Railway sets this; explicit is fine
SUPABASE_URL=…
SUPABASE_SERVICE_ROLE_KEY=…
ADMIN_PASSWORD=<long random string>       # MUST be set; server refuses to start without it
GROQ_API_KEY=…
OPENAI_API_KEY=…
ALLOWED_ORIGINS=https://padee.ai          # ← your Vercel URL; multiple comma-separated

# LLM routing (defaults from .env.example — the deprecated 3.1-* models will fail)
LLM_DOUBT_SIMPLE=groq/llama-3.3-70b-versatile
LLM_DOUBT_VISION=groq/meta-llama/llama-4-scout-17b-16e-instruct
LLM_PRACTICE_GEN=groq/llama-3.3-70b-versatile
LLM_WORKSHEET=gpt-4o-mini
LLM_VISUAL_EXPLAIN=gpt-4o
LLM_VALIDATION=groq/llama-3.3-70b-versatile
LLM_FALLBACK=gpt-4o-mini
LLM_TEST_INSIGHTS=gpt-4o-mini
LLM_CONCEPT_EXTRACT=gpt-4o
LLM_RECOMMENDATION=gpt-4o-mini
LLM_VISION_FALLBACK=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small

# Optional
GOOGLE_TTS_API_KEY=…                      # leave unset → browser SpeechSynthesis fallback
LLM_TTS_VOICE=en-IN-Wavenet-D
```

### 2c. Verify the deploy

After Railway builds (~2 min), hit:
```
curl https://<your-railway-url>/api/health
```
Should return `{"status":"ok","timestamp":"…"}`. If 502 or timeout, check **Deployments → Logs** — the most common failure is a missing env var, in which case `lib/adminAuth.ts` throws a clear "ADMIN_PASSWORD environment variable is required" message.

---

## 3. Frontend on Vercel

### 3a. New Vercel project

1. **Import Project → from GitHub** → select this repo.
2. **Framework Preset**: Vite (auto-detected).
3. **Build & Output Settings**: leave defaults (`npm run build` → `dist/`).

### 3b. Environment variables

```
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

That's it for the frontend. The backend URL is hardcoded as relative paths (`/api/...`) which means **the frontend assumes a same-origin API**. Two ways to handle this:

**Option A — Vercel rewrites (recommended for pilot)**
Add `vercel.json` at repo root:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<your-railway-url>/api/:path*" }
  ]
}
```
This proxies `/api/*` calls from the Vercel domain to Railway. CORS doesn't bind because the browser sees same-origin.

**Option B — Wire an API base var**
Switch all `fetch('/api/...')` calls to `fetch(${API_BASE}/api/...)` where `API_BASE` is from `import.meta.env.VITE_API_BASE`. Requires touching every screen — not done yet. Defer to Phase 2.

### 3c. Domain (optional)

Vercel project → **Settings → Domains** → add `padee.ai`. Update Supabase auth Site URL accordingly.

### 3d. Verify

Open the Vercel URL. Expected flow:
1. `/` → landing page
2. `/login` → sign in with the test student account
3. `/home` → home loads with subjects, daily challenge, etc.
4. Open Ask Pa, ask "What is Newton's third law?" → streaming response with KaTeX rendering.

---

## 4. Post-deploy: NCERT content

Even with everything wired, the recommendation engine is empty until NCERT chapters are indexed.

1. Sign in as admin (set `role = 'admin'` on your profile in Supabase).
2. Navigate to `/admin`.
3. **NCERT Content** tab → upload PDFs (per chapter) for each Class × Subject you want to support.
4. Wait for processing (~30s per chapter — chunk + embed). Auto-extracts concepts as drafts.
5. **Concept Catalog** tab → review extracted drafts → publish.
6. **Recompute recommendations** (admin button) → populates `class_concept_health` + `student_recommendations` for active students.

Without published concepts for a chapter, practice on that chapter falls back to ungrounded LLM generation (flagged in `practice_sessions.questions[].grounded = false` — see commit f6ef605).

---

## 5. Smoke test the live deploy

```bash
# From your laptop, against the deployed Railway URL:
curl https://<railway-url>/api/health
# → {"status":"ok",...}

# Sign in (replace with real test creds):
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"teststudent@padee.ai","password":"TestPass123!"}' | jq -r '.access_token')

curl -s https://<railway-url>/api/user/home-data \
  -H "Authorization: Bearer $TOKEN" | jq '.profile.name, .totalXP'
```

If both return real values, the deploy works.

---

## Routine redeploy

After the first deploy:
- **Backend**: push to `main` → Railway auto-builds.
- **Frontend**: push to `main` → Vercel auto-builds.
- **DB schema change**: write a new migration `supabase/migrations/NNN_*.sql`, paste it into the Supabase SQL Editor before redeploying the backend. Per CLAUDE.md: "DB migrations must live in repo. Never only via Supabase UI."

Run `npm test` locally before pushing — it's the only gate that catches the cheat-prevention contract regressions, schema mismatches, etc. (113 backend assertions, ~30s).

---

## Future hardening

These are not pre-pilot blockers but worth tracking:

- [ ] **Prod start command**: add a `"start"` script in `package.json` so Railway doesn't run `tsx watch` in production. Suggested: `"start": "tsx server/index.ts"` (or compile-and-run).
- [ ] **Cron job** for nightly `recomputeAll`. Currently triggered manually via the `/admin/recompute` button. Railway supports scheduled jobs — wire one to hit `POST /api/recommendations/recompute` at 2 AM IST.
- [ ] **Sentry / PostHog**: no error monitoring or product analytics yet (deferred per CLAUDE.md).
- [ ] **Rate-limit defence**: per-user limits ship in code (commit 045e33e), but nothing caps total spend per day. Add a Stripe billing alert on the OpenAI dashboard ($X/day threshold) at minimum.
- [ ] **Scheduled DB backups**: Supabase auto-backups every 24h on free tier; verify retention is sufficient for your pilot's data-loss tolerance.
- [ ] **DPDP**: per CLAUDE.md follow-ups — parent OTP for under-18, /privacy and /terms pages, data-deletion endpoint. Code-side PII minimisation shipped (commit a0d5d0c); UI/legal work pending.
- [ ] **Frontend tests**: Playwright smoke test for the student journey (signup → home → ask → practice → test → results). Adds ~5min to CI but catches the bugs that backend tests can't see.

---

## Quick reference — env vars by destination

| Variable                          | Railway (backend) | Vercel (frontend) | Supabase  |
|-----------------------------------|:-----------------:|:-----------------:|:---------:|
| `SUPABASE_URL`                    | ✓                 |                   |           |
| `SUPABASE_SERVICE_ROLE_KEY`       | ✓                 |                   |           |
| `VITE_SUPABASE_URL`               |                   | ✓                 |           |
| `VITE_SUPABASE_ANON_KEY`          |                   | ✓                 |           |
| `ADMIN_PASSWORD`                  | ✓                 |                   |           |
| `ALLOWED_ORIGINS`                 | ✓                 |                   |           |
| `GROQ_API_KEY`                    | ✓                 |                   |           |
| `OPENAI_API_KEY`                  | ✓                 |                   |           |
| `GOOGLE_TTS_API_KEY` (optional)   | ✓                 |                   |           |
| `LLM_*` (model routing)           | ✓                 |                   |           |
| `EMBEDDING_MODEL`                 | ✓                 |                   |           |
| `PORT`                            | ✓ (auto-set)      |                   |           |
| Auto-confirm email                |                   |                   | ✓         |
| Site URL + redirect URLs          |                   |                   | ✓         |

If you put `SUPABASE_SERVICE_ROLE_KEY` on Vercel by mistake, **rotate it immediately** in Supabase — the bundled frontend JS is public.
