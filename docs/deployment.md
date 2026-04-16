# Deployment Guide

## Environment Variables

All variables are defined in `.env`. Copy from `.env.example` to get started.

### Supabase

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Backend: Supabase project URL (e.g. `https://ifxekwenhidotyqlrpty.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Backend: service role key (bypasses RLS, never expose to frontend) |
| `VITE_SUPABASE_URL` | Yes | Frontend: same URL as above (Vite exposes `VITE_` prefixed vars to the browser) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Frontend: anon/public key (safe for browser, respects RLS) |

### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Backend server port |
| `ADMIN_PASSWORD` | No | `padee-admin-2026` | Password for admin panel and admin API endpoints |

### LLM Model Routing

These variables control which model is used for each task. The backend reads them at runtime.

| Variable | Default (in code) | Description |
|----------|-------------------|-------------|
| `LLM_DOUBT_SIMPLE` | `groq/llama-3.3-70b-versatile` | Text doubt solver (main model) |
| `LLM_DOUBT_VISION` | `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Photo doubt solver (vision model) |
| `LLM_PRACTICE_GEN` | `groq/llama-3.1-8b-instant` | MCQ question generation |
| `LLM_VISUAL_EXPLAIN` | `gpt-4o` | HTML/SVG visual explanation generation |
| `LLM_EVALUATION` | `gpt-4o-mini` | Descriptive answer evaluation (not yet wired) |
| `LLM_WORKSHEET` | `gpt-4o-mini` | Worksheet generation (not yet wired) |
| `LLM_HOME_CURATOR` | `groq/llama-3.1-8b-instant` | Home screen content curation (not yet wired) |
| `LLM_VALIDATION` | `groq/llama-3.1-8b-instant` | Worksheet validation agent (not yet wired) |
| `LLM_FALLBACK` | `gpt-4o-mini` | Fallback model if primary fails (not yet wired) |

### Embeddings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model (1536 dimensions) |

### API Keys

| Variable | Required | Provider |
|----------|----------|----------|
| `GROQ_API_KEY` | Yes | Groq (for Llama models) |
| `OPENAI_API_KEY` | Yes | OpenAI (for embeddings + visual generation) |

---

## Supabase Project Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Note the project URL and keys from Settings -> API
3. Enable email auth with autoconfirm:
   - Dashboard -> Authentication -> Providers -> Email -> Enable
   - Or use the Management API to enable autoconfirm
4. Run all 6 migrations in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually in the SQL Editor (Dashboard -> SQL Editor):
# Run each file in supabase/migrations/ in order: 001, 002, 003, 004, 005, 006
```

**Critical**: Migration 006 MUST be applied after 003. Without it, the semantic cache RPCs are broken (see [database.md](database.md) for details).

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm

### Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Frontend only (Vite, port 5173) |
| `npm run dev:server` | Backend only (tsx watch, port 3001) |
| `npm run dev:all` | Both frontend + backend together |

### Verifying the Setup

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check auth works (use the test account)
curl -X POST 'https://ifxekwenhidotyqlrpty.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"teststudent@padee.ai","password":"TestPass123!"}'

# Check home-data with the token
curl http://localhost:3001/api/user/home-data \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

---

## Deploying to Production

### Frontend (Vercel)

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Backend (Railway)

- Start command: `npx tsx server/index.ts`
- Port: Railway auto-detects from `PORT` env var
- Environment variables: all backend vars (Supabase, API keys, admin password, LLM routing)

### CORS

The backend must allow the frontend origin. Update CORS origins to include both:
- Local dev: `http://localhost:5173` (or whichever port Vite picks)
- Production: your Vercel domain

---

## Known Issues and Gotchas

### pdf-parse v1 Startup Bug

The `pdf-parse` library v1 attempts to read `test/data/05-versions-space.pdf` on first import as a test. If this file is missing, the import fails silently or throws. The file is kept in the repo to prevent this issue.

**Do not delete** `test/data/05-versions-space.pdf`.

### Decommissioned Models

These models are DECOMMISSIONED and will fail if used:

| Decommissioned Model | Replacement |
|---------------------|-------------|
| `llama-3.1-70b-versatile` | `llama-3.3-70b-versatile` |
| `llama-3.2-11b-vision-preview` | `meta-llama/llama-4-scout-17b-16e-instruct` |

The `.env.example` file still references the old models. The backend code uses the correct defaults if env vars are not set.

### Migration 006 RPC Cast Bug

If you see this error in Supabase logs: `"structure of query does not match function result type"`, migration 006 has not been applied. The semantic cache is completely broken without it. Run:

```sql
-- Paste the contents of supabase/migrations/006_fix_cache_rpc.sql
-- into the Supabase SQL Editor and execute
```

### CORS Origins

Vite picks the first available port starting from 5173. If 5173 is occupied, it may use 5174, 5175, etc. Make sure your CORS configuration on the backend includes the actual port Vite is running on.

### OpenAI API Key Quota

The first OpenAI key (starting `sk-proj-oZIa...`) hit its quota. The working key starts with `sk-proj-rplY...`. If embeddings fail with a quota error, rotate the key.

### Supabase Anon Key vs Service Role Key

- **Anon key** (`VITE_SUPABASE_ANON_KEY`): used by the frontend, respects RLS. Safe to expose in browser.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`): used by the backend, bypasses RLS. NEVER expose to the frontend or commit to a public repo.
