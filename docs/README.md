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

## Current State (April 26, 2026)

**Student side: end-to-end v4 and shipped.** Full journey is on the v4 design language (Lexend Deca + coral + dark topnav + Pa mascot) — landing → signup → 3-step onboarding → home → ask → learn → practice → tests (list / active / results) → settings → progress. v3 fallback screens deleted; the `NEW_HOME_V4` flag is gone. KaTeX, voice TTS (Google Cloud en-IN-Wavenet-D), Pa speech-sync animations, IST-bound day boundaries, pledge-aware streak engine, three test types (teacher / Pa-recommended / self-pick) with redesigned results + Pa's Debrief — all live.

**Teacher side: real backend on v3 visuals.** Worksheet generator + paper mimic + dashboard + alert feed + assign-test + review queue + student profile are functional. **v4 UI rebuild is the next planned chunk of work.**

**Parent dashboard:** `/parent` is a `Navigate to /home` placeholder. Parents can sign up, log in, but currently land on the student home. Real parent v4 is the next planned student-side build.

**Recommendation engine:** concept catalog, mastery tracking, hero card logic, all 4 home cards live. Mid-session recompute fires inline; full-class recompute is a manual admin trigger (Railway scheduled cron is Phase 2).

**Database:** 20 tables across 11 migrations. Migrations 009 (`board`), 010 (`daily_pledge_xp` + `study_days`), 011 (`pledged_days_missed`) all need to be applied for current onboarding + streak engine to work.

**Deployment:** 0% — no live host yet.

See [feature-status.md](feature-status.md) for the full scannable tracker.

### Recent decisions

- **April 26, 2026** — `NEW_HOME_V4` flag removed entirely. v4 is permanent. 14 dead files (8 v3 screens + 4 dead aliases + 2 phase-2 placeholder screens) pruned across 3 cleanup sweeps.
- **April 26, 2026** — Pa's Debrief on test results upgraded: per-topic stats injected into the prompt, structured 3-paragraph diagnosis (assessment / misconception correction / next step), `gpt-4o-mini` for prose quality.
- **April 26, 2026** — KaTeX shipped. LLM prompts flipped from "no LaTeX" to "use LaTeX". Server-side delimiter validation strips malformed `$` before caching.
- **April 26, 2026** — Pledge-aware streak engine + IST-bound day boundaries. Rest days don't break streaks; missed pledged days freeze (not reset). All today/yesterday comparisons use IST midnight via `server/lib/dateIST.ts`.
- **April 25, 2026** — Auth + onboarding fully redesigned in v4 (LandingPage, LoginScreen, SignupScreen, OnboardingClass with board picker, OnboardingSubjects with Pa auto-select, OnboardingTrack with daily pledge + study days). DPDP-aligned consent wording at signup.
- **April 25, 2026** — Settings screen `/settings` shipped. Edit pledge / days / track / subjects independently. Class + board read-only.
- **April 24, 2026** — Voice TTS via Google Cloud (en-IN-Wavenet-D) with browser fallback. SpeechContext singleton drives Pa mascot mouth-bob animation.
