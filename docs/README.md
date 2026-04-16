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
| [architecture.md](architecture.md) | System diagram, tech stack, request lifecycles, caching strategy, security model |
| [features.md](features.md) | Deep dive on every built feature: endpoints, tables, LLM models, data flows |
| [database.md](database.md) | All 15 tables, migration history, RPC functions, the migration 006 bug fix |
| [api-reference.md](api-reference.md) | Every API endpoint with method, path, auth, request/response shapes |
| [admin-guide.md](admin-guide.md) | Step-by-step instructions for the admin panel: NCERT uploads, audit, users, config |
| [deployment.md](deployment.md) | Environment variables, Supabase setup, model routing, known issues |
| [llm-prompts.md](llm-prompts.md) | Every LLM prompt in the system: purpose, key rules, modification guidelines |

## Build Philosophy

1. **Backend route first** -- build and test with curl, then add to `src/services/api.ts`, then wire the screen.
2. **Single API layer** -- all frontend API calls go through `src/services/api.ts` (exception: SSE streaming).
3. **Admin-configurable** -- XP rewards, badges, daily goals, and challenge settings live in `server/config.json` and are editable from the admin panel.
4. **Audit everything** -- every LLM call is logged to `logs/llm-calls.jsonl` and viewable in the admin panel.

## Current State (April 2026)

Phase 1 is mostly complete. The core product (Ask AI with RAG, visual explanations, practice MCQs, photo doubts, progress tracking) is fully wired. See [features.md](features.md) for what is built and what remains.
