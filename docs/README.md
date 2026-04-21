# Padee.ai Internal Documentation

Internal playbook for Padee.ai -- an AI-first K12 learning platform for CBSE Classes 8-12.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env and fill in your keys
cp .env.example .env
# Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL,
# VITE_SUPABASE_ANON_KEY, GROQ_API_KEY, OPENAI_API_KEY

# 3. Start frontend + backend together
npm run dev:all
# Frontend: http://localhost:5173  |  Backend: http://localhost:3001
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [feature-status.md](feature-status.md) | **Scannable status tracker** — what's complete, partial, pending, Phase 2. Start here for "what's done?" |
| [features.md](features.md) | Deep dive on every built feature: endpoints, tables, LLM models, data flows |
| [architecture.md](architecture.md) | System diagram, tech stack, request lifecycles, caching strategy, security model |
| [database.md](database.md) | All tables, migration history, RPC functions, the migration 006 bug fix |
| [api-reference.md](api-reference.md) | Every API endpoint with method, path, auth, request/response shapes |
| [admin-guide.md](admin-guide.md) | Step-by-step instructions for the admin panel: NCERT uploads, audit, users, config, concepts |
| [deployment.md](deployment.md) | Environment variables, Supabase setup, model routing, known issues |
| [llm-prompts.md](llm-prompts.md) | Every LLM prompt in the system: purpose, key rules, modification guidelines |

## Build Philosophy

1. **Backend route first** -- build and test with curl, then add to `src/services/api.ts`, then wire the screen.
2. **Single API layer** -- all frontend API calls go through `src/services/api.ts` (exception: SSE streaming).
3. **Admin-configurable** -- XP rewards, badges, daily goals, and challenge settings live in `server/config.json` and are editable from the admin panel.
4. **Audit everything** -- every LLM call is logged to `logs/llm-calls.jsonl` and viewable in the admin panel.

## Current State (April 17, 2026)

**Working tree:** commit `b036c3e` — Phase 1 with v3 UI (teal sidebar, DM Sans, working).

**Student side ~90% done:** core product (Ask AI with RAG, visual explanations, practice MCQs, photo doubts, test mode with 3 entry points, progress tracking, gamification celebrations) is fully wired. Pending: descriptive answer evaluation, flashcards, voice input, prep-for-test flow.

**Teacher side ~35% done:** alert feed + test assignment work; worksheet generator, paper mimic, and review queue remain.

**Recommendation engine ~90% done:** concept catalog, mastery tracking, hero card logic, and 4 home cards are all built. Gaps: nightly cron (no host selected), empty-state UI when fallback triggers.

**Deployment:** 0% — no live host yet.

See [feature-status.md](feature-status.md) for the complete scannable tracker.

### Recent decisions

- **April 17, 2026** — v4 UI redesign (Lexend Deca + vermillion + topbar + right panel) was rolled back. Future UI improvements will be done **one change at a time, committed and verified at each step**, instead of all-at-once.
- **April 17, 2026** — Vercel deployment removed. Deployment host will be selected separately.
