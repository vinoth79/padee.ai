# Padee.ai

AI-first K12 learning platform for India. CBSE Classes 8-12, all subjects. RAG over NCERT content via pgvector.

## Tech stack

- **Frontend**: React 18 + Vite 4 + TypeScript + Tailwind CSS + Framer Motion + React Router v7
- **Backend**: Hono + TypeScript (server/ folder, port 3001)
- **Database + Auth**: Supabase (PostgreSQL + pgvector + Auth) -- project ref `ifxekwenhidotyqlrpty`, region `us-east-1`
- **LLM layer**: Direct Groq SDK + OpenAI SDK (NOT LiteLLM -- never wired). Model selection per task via `.env`
- **Deploy**: Vercel (frontend) + Railway (backend)

## Project structure

```
padee.ai/
├── src/                    # Frontend (React)
│   ├── screens/            # Student + teacher + AdminScreen + LoginScreen
│   ├── components/         # Reusable UI components, ProtectedRoute, ScreenBridge
│   ├── layouts/            # StudentLayout.tsx, TeacherLayout.tsx
│   ├── context/            # AuthContext.tsx (Supabase Auth) + UserContext.tsx (profile sync)
│   ├── lib/                # supabaseClient.ts (frontend Supabase)
│   ├── services/           # api.ts (single API layer -- all screens import from here)
│   ├── hooks/              # useAppNavigate.ts
│   ├── data/               # mockData.js (fallback only)
│   └── routes.tsx          # React Router config (incl. /admin, /login, ProtectedRoute)
├── server/                 # Backend (Hono)
│   ├── index.ts            # Server entry point (port 3001) + loadExistingLog
│   ├── lib/supabase.ts     # Server Supabase client + getUserFromToken()
│   ├── lib/llmLog.ts       # Custom in-process LLM audit logger (JSONL + ring buffer)
│   ├── routes/health.ts    # GET /api/health
│   ├── routes/user.ts      # Profile, onboarding, home-data
│   ├── routes/ai.ts        # Doubt (streaming SSE + RAG + cache + memory + vision), visual, practice, feedback, flag
│   └── routes/admin.ts     # NCERT PDF upload + processing, content list, llm-log endpoint
├── supabase/migrations/    # 6 SQL migrations (001-006)
├── logs/                   # llm-calls.jsonl (gitignored, audit log)
└── .env                    # API keys + LLM model routing
```

## Commands

- `npm run dev` -- frontend only (Vite picks first available port from 5173)
- `npm run dev:server` -- backend only (port 3001, tsx watch)
- `npm run dev:all` -- both together

## Build rules

1. Backend route first. Test with curl. Then add to api.ts. Then wire the screen.
2. Never call fetch() directly in screen files -- everything goes through src/services/api.ts (exception: streaming SSE which manages its own ReadableStream).
3. The frontend prototype has 21 screens with mock data. We are wiring them to the real backend.

## Database

15 tables across 6 migrations. Migration 006 fixes a critical bug in two RPCs (`search_response_cache`, `search_ncert_chunks`) where `similarity real` should have been cast from `double precision`.

Key tables: profiles, doubt_sessions, doubt_feedback, flagged_responses, ncert_chunks (pgvector), response_cache (pgvector), ncert_uploads, student_xp, student_streaks, student_subjects, subject_mastery, practice_sessions, test_sessions, worksheets.

Auto-profile trigger creates profile + streak row on user signup.

---

## Phase 1 build state (April 2026)

### Completed end-to-end

**Auth + profile**
- Real Supabase Auth (signup/login). Email autoconfirm enabled via Management API.
- `AuthContext.tsx` exposes `{ user, session, token }`. `ProtectedRoute` guards `/home`, `/ask`, `/admin/*`, all `/teacher/*`.
- `UserContext` syncs profile + XP + streak + level from `/api/user/home-data` on token availability.
- Login screen at `/login` -- single form for all roles (no Student/Teacher toggle). Role determines post-login routing:
  - `student` → onboarding (if no class_level) → `/home`
  - `teacher` → `/teacher` (teacher dashboard)
  - `parent` → `/parent` (parent summary)
- Role is set via admin panel (`/admin` → Users tab → Set Role by email) or API: `POST /api/admin/set-role`
- All new signups default to `role: 'student'`. Teacher/parent roles assigned by admin.
- Test account: `teststudent@padee.ai` / `TestPass123!`

**Onboarding**
- 3 steps: class (8-12) -> subjects (Class 11-12 also shows Commerce subjects) -> track (school/jee/neet/ca).
- Step 3 saves to backend via `POST /api/user/onboarding` (writes profile + student_subjects rows).

**Home screen**
- `StudentHomeScreen.jsx` reads from `/api/user/home-data` (profile, totalXP, todayXP, streak, mastery, recentSubjects).
- Sidebar + level badge update from real DB. Mock data still fills sections without backend (daily challenges, recent wins).

**Ask AI doubt solver (the core product)**
Endpoint: `POST /api/ai/doubt` (streaming SSE). Full pipeline:
1. Optional photo: if `imageDataUrl` present, route to `handleVisionDoubt()` using `groq/meta-llama/llama-4-scout-17b-16e-instruct`. Skips cache + RAG.
2. Embed question (OpenAI text-embedding-3-small).
3. Semantic cache lookup (`search_response_cache` RPC, threshold 0.92). Cache hit -> stream cached response word-by-word, log to audit.
4. RAG retrieval from `ncert_chunks` (threshold 0.5, top 4).
5. Build student memory context (name, weak subjects from `subject_mastery` <70%, last 3 doubt question texts).
6. Build system prompt (CBSE persona + NCERT context + memory injection + personalisation rule + no-LaTeX rule).
7. Stream Groq Llama-3.3-70B response.
8. Detect memory usage in response, save session to `doubt_sessions`, award 10 XP, cache only if NOT memory-personalised.
9. Final SSE event with `{ sessionId, ncertSource, cacheHit, memoryUsed }`.

UI features (per UI Spec Screen 06):
- Dual-loop thinking state (5 phase labels cycling 700ms each)
- All 8 action chips: Explain visually ✨, Explain simpler, Show exam answer, Quiz me, Similar question, Challenge me, Real-life example, Common mistakes
- Mobile chip overflow: first 4 + "More ↓" on `<sm`
- Quality signals: Thumbs up/down + inline reason chips ([Unclear] [Inaccurate] [Not NCERT] [Skip]) + Report incorrect bottom-sheet modal
- NCERT source citation chip (shown when confidence > 0.55)
- Memory-aware indicator ("● Remembering your profile" next to AI Tutor when `memoryUsed: true`)
- Subject auto-detected from question keywords (no manual selector — removed for better UX)
- Conversation history (last 6 turns) sent to LLM so follow-ups have context
- Copy button on every AI bubble (hover-reveal)
- Clear chat button
- Message persistence in localStorage (last 30 messages)
- Daily usage cap REMOVED per request (Phase 1 is completely free)

**Quiz me (Practice MCQ)**
- `POST /api/ai/practice` -- Groq Llama-3.3-70B with `response_format: json_object` (switched from 8B for speed: 2s vs 16s)
- Generates contextual MCQ from the last AI response with strict quality rules (mutually exclusive options, plausible distractors, randomised correctIndex)
- Inline quiz UI with Try another / Done / Close

**Practice MCQ Screen** (`/practice`)
- Full MCQ flow: loading → question cards with A/B/C/D → check answer → explanation → next → results
- `POST /api/ai/practice/complete` saves to `practice_sessions`, awards XP (admin-configurable), updates `subject_mastery` running average
- Pre-loaded: home screen generates questions in background, stored in localStorage. Practice screen reads cache first → instant start
- Results screen: accuracy ring, correct/wrong/XP stats, practice again or back to home

**Streak Automation**
- `updateStreak()` called after every XP award (doubt, photo doubt, practice)
- If last active was yesterday → increment. If missed a day → reset to 1. First day → set to 1
- Streak bonus XP awarded once per day when streak >= 2 (admin-configurable, default 5 XP)

**Progress Screen** (`/progress`)
- 100% real data from UserContext.homeData
- Profile card, stats row (XP, streak, doubts), streak section, badge grid, subject mastery bars, today's activity

**Learn Screen** (`/learn`)
- Shows student's selected subjects with uploaded NCERT chapters from `ncert_uploads`
- Chapters grouped by subject with chunk counts and mastery %
- Click chapter → opens Ask AI with subject context
- "No content uploaded" state for subjects without NCERT PDFs

**Explain Visually (Screen 19)**
- `POST /api/ai/visual` -- OpenAI GPT-4o (`LLM_VISUAL_EXPLAIN=gpt-4o`)
- Generates self-contained HTML+SVG (responsive viewBox, inline CSS, animations, no external deps)
- Sandboxed iframe with auto-sizing + Expand-to-fullscreen modal + Regenerate button
- Cached via `response_cache` table with `viz::question::context` key (prefix prevents collision with doubt cache). `force=true` bypasses cache.

**NCERT Admin panel** (`/admin`)
- Password auth (`ADMIN_PASSWORD` env var, default `padee-admin-2026`)
- Two tabs: NCERT Content (upload/manage) + LLM Audit (live prompt inspector)
- Upload: PDF -> pdf-parse extraction -> 800-char chunks with 100-char overlap -> OpenAI text-embedding-3-small -> stored in ncert_chunks
- Re-index action (delete + re-upload) and Delete action per row
- Note: pdf-parse v1 has a known startup bug; mitigated by keeping `test/data/05-versions-space.pdf` in repo

**LLM Audit panel** (`/admin` → LLM Audit tab)
- In-process logger (`server/lib/llmLog.ts`) writes JSONL to `logs/llm-calls.jsonl` (ring buffer 500, rotates at 5MB)
- Captures: timestamp, endpoint, userId, model, full system prompt, all messages, full response, latency, cacheHit, memoryUsed, ncertChunksUsed, ncertSource
- UI: filter by endpoint, expandable rows showing full prompt + response, auto-refresh 3s
- Considered Langfuse/LangSmith/Helicone but deferred to Phase 2 -- custom panel is sufficient for solo founder MVP

### Critical model + API key facts

- **Groq**: `llama-3.1-70b-versatile` is DECOMMISSIONED. Use `llama-3.3-70b-versatile`.
- **Groq vision**: `llama-3.2-11b-vision-preview` is DECOMMISSIONED. Use `meta-llama/llama-4-scout-17b-16e-instruct`.
- **OpenAI**: First key (sk-proj-oZIa...) hit quota. Working key in .env starts `sk-proj-rplY...`.
- **Supabase RPCs** `search_response_cache` and `search_ncert_chunks` were broken from migration 003 (declared `similarity real` but cosine returns double precision). Migration 006 fixes both with `::real` cast. Without 006 the entire semantic cache silently failed.

### What's NOT built yet (Phase 1 remaining)

**Student side:**
- [ ] **Test mode** (`/tests/active`) -- mock screen. Needs: timed exam, question navigation, submit → results with AI insights
- [ ] **Gamification celebrations** -- level-up overlay, badge unlock animation (UI spec Screen 13)

**Teacher side:**
- [ ] **Worksheet generator** (POST /api/ai/worksheet still 501 stub) -- next priority after student side
- [ ] **Worksheet validation agent** (PRD 2A) -- generate questions -> validate each via Llama-8B -> regenerate failures
- [ ] **CBSE Paper Mimic** (POST /api/ai/mimic stub)
- [ ] **Teacher command centre** -- TeacherDashboardScreen.jsx is mock. Needs: AI alerts, class health, student activity
- [ ] **Teacher review queue** (`/admin/flagged`) -- flagged_responses sit in DB with no UI to triage

**Platform:**
- [ ] **Quality metrics dashboard** -- helpful_rate, flag_rate per subject/chapter
- [ ] **PostHog + Sentry** integration
- [ ] **Real-time AI evaluation of descriptive answers** (POST /api/ai/evaluate stub)
- [ ] **Deployment** (Vercel frontend + Railway backend)

**Already completed (were previously listed as not built):**
- [x] ~~Streak XP automation~~ -- done, auto-increments on activity + streak bonus XP
- [x] ~~Subject mastery population~~ -- done, practice/complete endpoint updates subject_mastery

### Upcoming: Personalised Recommendation & Guidance Engine (PRD v4.3 Section 8)

A major addition to the platform. Introduces a concept-level knowledge state model that powers every home screen recommendation, student card, and teacher alert. Replaces the current keyword-based AI recommendation cascade with a proper data-driven engine.

**The core idea:** score every student at three simultaneous levels (subject / chapter / concept). Most edtech recommends what students haven't done. Padee recommends where they're most confused. Composite concept score = (accuracy × 0.5) + (recency × 0.3) + (consistency × 0.2).

**Four new Supabase tables** (migration 008):
1. `concept_catalog` -- CBSE syllabus as concept graph (pre-seeded, with prerequisites + exam_weight_percent)
2. `concept_mastery` -- one row per student per concept (composite_score, doubt_count, helpful_rate)
3. `student_recommendations` -- cached nightly recommendation + supporting cards (read on home screen load)
4. `class_concept_health` + `teacher_alerts` -- aggregated concept health + pre-generated alerts

**Four student home cards, only shown when triggered**
- **Hero card** (navy) -- single highest-priority action per day, LLM-generated copy ("you've gotten [concept] wrong 4 times -- fix in 6 questions, 8 CBSE marks")
- **Weak concept** (amber) -- score < 0.45 AND attempt_count >= 3. Shows failure count, not percentage
- **Revision** (teal) -- score > 0.65 AND days_since_practice >= 7. Forgetting-curve refresh
- **Next to learn** (blue) -- ONLY when no gaps exist. Forward-looking

**Three teacher alert types, one-click actions**
- **Red** -- >40% of class below 0.50 on same concept → auto-generate remedial worksheet
- **Amber** -- individual risk (5+ days inactive + test within 7 days, OR accuracy dropped >15pp in a week) → view student profile
- **Green** -- >80% of class above 0.70 on all chapter concepts → generate chapter test

**Nightly algorithm (midnight IST)**
1. Recalculate composite score for every active student's concepts
2. Identify critical gaps (score < 0.45)
3. Apply prerequisite ordering
4. Apply exam weightage tiebreaker
5. Pick hero concept
6. One GPT-4o-mini call per student (≈ Rs 0.002) to generate hero copy
7. Cache to `student_recommendations`
8. Aggregate class health + write teacher alerts

Mid-day recalculation: if a practice session pushes a concept above threshold, recommendation refreshes immediately (no wait for midnight).

**Phase 1 build — COMPLETED April 15 2026**
Per PRD v4.3 (PDF revised April 2026): concepts come from AI extraction of uploaded NCERT PDFs, admin reviews and publishes. No hand-edited JSON. Prerequisites deferred — Phase 1 uses exam_weight → score_gap → recency priority.

- [x] **Migration 008** — `concept_catalog`, `concept_mastery`, `student_recommendations`, `class_concept_health`, `teacher_alerts` + `update_concept_mastery()` SQL function.
- [x] **`server/routes/concepts.ts`** — admin endpoints: `/extract` (GPT-4o reads chapter chunks, inserts as draft), `/list`, `PATCH /:slug`, `/:slug/publish`, `/bulk-publish`, `DELETE /:slug` (soft-archive if mastery data exists), `/manual`.
- [x] **Auto-extract on NCERT upload** — after pdf-parse + embeddings succeed, `processUpload()` in admin.ts calls `extractConceptsFromChapter()` which stores concepts as `draft` status.
- [x] **Admin "Concept Catalog" tab** (`src/components/admin/ConceptCatalogTab.tsx`) — tree view of subject → class → chapter → concepts. Inline edit (name, exam_weight, summary), publish, re-extract, bulk publish, delete. Includes the "Recompute recommendations" button.
- [x] **Concept detection** (`server/lib/conceptDetection.ts`) — keyword-match scoring with chapter-name boost when known. 5-min cache of published concepts per subject+class.
- [x] **Mastery wiring** — `update_concept_mastery` called per question in `/api/ai/practice/complete` and `/api/test/complete`. `/api/ai/doubt` increments `doubt_count` only (doesn't affect composite_score).
- [x] **Recompute job** (`server/cron/recompute-recommendations.ts`) — `recomputeForStudent()` fires inline after practice/test/doubt; `recomputeAll()` is the manual admin trigger. Applies recency decay per PRD 8C (7d=0.5, 30d=0.2). Picks hero by priority: exam_weight → score_gap → recency. Generates hero copy via `gpt-4o-mini` (`LLM_RECOMMENDATION` env var, defaults to this).
- [x] **Teacher alerts** — same job aggregates `class_concept_health`, writes `teacher_alerts` (red: >40% below 0.5 → remedial test; amber: inactive student with upcoming test; green: >80% above 0.7 → chapter test).
- [x] **Admin "Recompute recommendations" button** — `/api/recommendations/recompute` triggers the full job on demand. Phase 1 = manual trigger; Phase 2 = Railway scheduled job.
- [x] **Student home cards** (`src/components/recommendations/RecommendationCards.jsx`) — HeroCard (navy), WeakConceptCard (amber), RevisionCard (teal), NextToLearnCard (blue). Home screen reads `GET /api/recommendations/today`; if no concept data yet, falls back to the old keyword-based rec (so new users aren't blank).
- [x] **Teacher dashboard alert feed** (`src/components/teacher/TeacherAlertFeed.tsx`) — reads `GET /api/teacher/alerts`. "Create remedial worksheet" one-tap pre-fills `TeacherAssignTestScreen` via `sessionStorage['padee-prefill-test']`.

**Deferred (Phase 2 per PRD 8H/8I)**
- Teacher "mark as taught" toggle, teaching-date estimates, teaching notes, concept flag/review workflow
- Prerequisite gap detection (PRD 8I: Month 2 once catalog covers multiple chapters)
- Student diagnosis agent (root-cause analysis across 30+ sessions)
- Adaptive difficulty
- Exam readiness score
- Automated nightly cron (currently manual admin trigger)

**Phase 2 (deferred)**
- Student diagnosis agent (root-cause analysis across 30+ sessions)
- Adaptive difficulty (requires concept-tagged question bank with difficulty metadata)

**New env variable**
```
LLM_RECOMMENDATION=gpt-4o-mini   # hero card copy, nightly job only
```
Fallback tiers if cost becomes an issue: Llama-3.1-8B (75% cheaper) → pre-written templates (zero cost).

**Why this replaces current home screen AI rec**
The existing 5-priority keyword cascade works at subject level only (e.g., "you're weak in Physics"). The new engine works at concept level (e.g., "Ohm's Law application problems — failed 4 times this week, 8 marks in boards"). Concept-level specificity is what drives retention.

**Reference:** `/Users/admin/Downloads/PRD_Section8_Recommendation.docx` (ingested into roadmap 2026-04-15).

### What's NOT built (Phase 2+)

- **School onboarding** -- no school entity/table, no invite flow, no school-code linking. Phase 2: create `schools` table, admin creates school + generates invite codes, teachers join via code, students linked to school via teacher.
- Automated eval agent (PRD layer 6) -- LLM-as-judge scoring every doubt response before display. Recommend Langfuse for this rather than building custom.
- Fine-tuning pipeline (PRD Phase 3) -- collect labelled data, fine-tune Llama-3.1-8B
- Hindi support via Qwen-2.5-72B
- Pre-built SVG templates for top 30 CBSE concepts (currently all visuals are LLM-generated)

## PRD reference

Three PDF documents in repo root:
- **Padee_PRD_v4_2.pdf** -- Product requirements (features, architecture, quality control, agent patterns, roadmap)
- **Padee_Implementation_Guide (2).pdf** -- Feature-by-feature build guide (backend route -> curl test -> api.ts -> screen)
- **Padee_UI_Spec_v3.pdf** -- 19+1 screens spec (5 updated, 2 new in v3 -- visual explanation overlay + admin)

## Design system

- Primary: Teal #0D9488 | Action: Coral #EA580C | Background: #F8F7F4
- Font: DM Sans 16px base
- Subject colors defined in tailwind.config.js

## Conventions established during build

- All LLM prompts live in `server/routes/ai.ts` (not yet refactored to `server/prompts/` -- consider for Phase 2 to enable non-engineer prompt editing)
- Subject auto-detected from question keywords via `detectSubject()` in DoubtSolverScreen. No manual subject selector.
- className from `user.studentClass` (UserContext). Never hardcoded.
- LLM responses must NOT use LaTeX syntax (`$F = BIL\sin\theta$`). Prompts explicitly instruct Unicode (`F = BIL sin θ`). Frontend `stripLatex()` is a defensive fallback.
- Internal RAG chunks are prefixed `[Source 1]`, `[Source 2]` etc. Prompts explicitly tell LLM these are internal-only and never to repeat them in output.
- Cache writes are best-effort and async (don't block response)
- Iframe `sandbox="allow-scripts"` for visual explanations (no `allow-same-origin` so sandboxed scripts can't fetch/access cookies)
