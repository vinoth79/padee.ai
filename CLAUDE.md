# Padee.ai

AI-first K12 learning platform for India. CBSE Classes 8-12, all subjects. RAG over NCERT content via pgvector.

## Tech stack

- **Frontend**: React 18 + Vite 4 + TypeScript + Tailwind CSS + Framer Motion + React Router v7
- **Backend**: Hono + TypeScript (server/ folder, port 3001)
- **Database + Auth**: Supabase (PostgreSQL + pgvector + Auth) — project ref `ifxekwenhidotyqlrpty`, region `us-east-1`
- **LLM layer**: Direct Groq SDK + OpenAI SDK (NOT LiteLLM — never wired). Model selection per task via `.env`
- **Math rendering**: KaTeX (frontend) — LLM responses use `$...$` / `$$...$$` and frontend renders typeset math
- **TTS**: Google Cloud Text-to-Speech (en-IN-Wavenet-D), with browser Web Speech API fallback
- **Deploy**: Vercel (frontend) + Railway (backend)

## Project structure

```
padee.ai/
├── src/                    # Frontend (React)
│   ├── screens/            # Auth, onboarding, student v4 screens, teacher screens, AdminScreen
│   ├── components/         # ask-v4/, home-v4/, learn-v4/, practice-v4/, progress-v4/,
│   │                       #   tests-v4/, test-v4/, teacher/, recommendations/, ui/, admin/
│   ├── layouts/            # StudentLayout (placeholder shell) + TeacherLayout
│   ├── context/            # AuthContext, UserContext, SpeechContext (single TTS source)
│   ├── lib/                # supabaseClient, latexToSpeech (TTS LaTeX unparser)
│   ├── services/           # api.ts (single API layer — all screens import from here)
│   ├── hooks/              # useAppNavigate, useSpeech (re-export from SpeechContext)
│   ├── styles/             # home-v4.css, ask-v4.css, learn-v4.css, practice-v4.css,
│   │                       #   tests-v4.css, test-v4.css, test-results-v4.css,
│   │                       #   settings-v4.css, progress-v4.css, onboarding.css
│   └── routes.tsx          # React Router config (incl. /admin, /login, /signup, ProtectedRoute)
├── server/                 # Backend (Hono)
│   ├── index.ts            # Server entry point (port 3001) + loadExistingLog
│   ├── lib/supabase.ts     # Server Supabase client + getUserFromToken()
│   ├── lib/llmLog.ts       # Custom in-process LLM audit logger (JSONL + ring buffer)
│   ├── lib/dateIST.ts      # IST-aware day-boundary helpers (streak, today's-XP windows)
│   ├── lib/latexValidate.ts# Server-side LaTeX delimiter sanity check + sanitiser
│   ├── lib/conceptDetection.ts # Keyword + chapter-boost concept matching with 5-min cache
│   ├── lib/llmFallback.ts  # Groq → OpenAI fallback chain
│   ├── routes/health.ts    # GET /api/health
│   ├── routes/user.ts      # Profile, onboarding, home-data, replan-acknowledged
│   ├── routes/ai.ts        # Doubt (streaming SSE + RAG + cache + memory + vision),
│   │                       #   visual, practice (+complete), tts, flag, feedback, evaluate (501),
│   │                       #   worksheet, mimic
│   ├── routes/admin.ts     # NCERT PDF upload + processing, content list, llm-log, config
│   ├── routes/test.ts      # /list, /start (3 modes), /complete, /session/:id, /assign,
│   │                       #   /assignments, /assign/preview
│   ├── routes/concepts.ts  # Admin concept catalog CRUD + AI extraction
│   ├── routes/recommendations.ts # /today, /acted-on, /recompute (admin trigger)
│   ├── routes/teacher.ts   # /dashboard, /alerts, /students, /review-queue
│   └── cron/recompute-recommendations.ts # nightly job (manual trigger Phase 1)
├── supabase/migrations/    # 11 SQL migrations (001-011)
├── logs/                   # llm-calls.jsonl (gitignored, audit log)
└── .env                    # API keys + LLM model routing + GOOGLE_TTS_API_KEY
```

## Commands

- `npm run dev` — frontend only (Vite picks first available port from 5173)
- `npm run dev:server` — backend only (port 3001, tsx watch)
- `npm run dev:all` — both together

## Build rules

1. Backend route first. Test with curl. Then add to `src/services/api.ts`. Then wire the screen.
2. Never call `fetch()` directly in screen files — everything goes through `src/services/api.ts` (exception: streaming SSE which manages its own ReadableStream).
3. **DB migrations must live in repo.** Any schema change goes in `supabase/migrations/NNN_*.sql`, never only via Supabase UI.
4. **Use LaTeX in LLM responses.** Prompts instruct `$...$` for inline math and `$$...$$` for display. Frontend renders via KaTeX in `MathText`. (This is the inverse of the v3 rule — KaTeX shipped 2026-04-26.)
5. v4 screens are **full-bleed** — they own their own `HomeTopNav` + `FooterStrip`, do not nest inside `StudentLayout`.

## Database

11 tables across 11 SQL migrations. All tables have RLS enabled. Backend uses service-role key (bypasses RLS); frontend uses anon key (RLS-bound).

Auto-profile trigger creates `profiles` + `student_streaks` rows on Supabase Auth signup.

| # | Migration | What it adds |
|---|---|---|
| 001 | `core_tables` | profiles, student_subjects, student_xp, student_streaks, subject_mastery, level_tiers |
| 002 | `ai_tables` | doubt_sessions, doubt_feedback, flagged_responses, response_cache (pgvector) |
| 003 | `ncert_rag` | ncert_uploads, ncert_chunks (pgvector) + `search_response_cache` / `search_ncert_chunks` RPCs |
| 004 | `practice_worksheets` | practice_sessions, test_sessions, worksheets |
| 005 | `rls_policies` | RLS for all of the above |
| 006 | `fix_cache_rpc` | **Critical**: casts `similarity real` from `double precision` in 003's RPCs (without 006 the entire semantic cache silently fails) |
| 007 | `test_assignments` | `test_assignments` table (teacher-assigned tests) + `test_sessions` extensions (assignment_id) |
| 008 | `recommendation_engine` | concept_catalog, concept_mastery, student_recommendations, class_concept_health, teacher_alerts + `update_concept_mastery()` RPC |
| 009 | `profile_onboarding_extensions` | `profiles.board` (CBSE/ICSE/IGCSE/IB/STATE/OTHER) |
| 010 | `daily_pledge` | `profiles.daily_pledge_xp` + `profiles.study_days[]` (per-student goal override + pledged weekdays) |
| 011 | `pledge_aware_streak` | `student_streaks.pledged_days_missed` counter (drives "miss 3 → re-plan" check-in) |

---

## Phase 1 build state (April 2026)

The full **student journey is end-to-end v4 and shipped**: landing → signup → 3-step onboarding → home → ask → learn → practice → tests (list/active/results) → settings → progress. Teacher side is mostly v3 visuals on real backend (worksheet generator, paper mimic, dashboard, review queue, student performance, assign-test, live-class).

### Auth + profile

- Supabase Auth (email autoconfirm enabled via Management API).
- `AuthContext.tsx` exposes `{ user, session, token }`. `ProtectedRoute` guards all `/home`, `/ask`, `/learn`, `/tests/*`, `/practice`, `/progress`, `/settings`, `/admin/*`, `/teacher/*`, `/parent`.
- **Login** at `/login` (v4 two-column with dark stats panel). **Signup** at `/signup` (v4, role picker: Student / Parent / Teacher).
- Post-login routing by `profile.role`:
  - `student` → `/home` (or `/onboarding/class` if no class_level set)
  - `teacher` → `/teacher`
  - `parent` → `/parent` (currently `Navigate to /home` placeholder until parent v4 ships)
- Test account: `teststudent@padee.ai` / `TestPass123!`. Admin password: `padee-admin-2026`.

### Onboarding (3 steps)

- **Step 1** `/onboarding/class`: pick **class (8-12)** + **board** (CBSE / ICSE / IGCSE / IB / STATE / OTHER). CBSE pre-selected with "Most common" badge.
- **Step 2** `/onboarding/subjects`: Pa auto-selects the standard board subjects (5 for CBSE Class 8-10: Maths, Science, English, Social Studies, Hindi; 4 for Class 11-12 science stream). Student can deselect / add electives. **Reset** button restores Pa's defaults.
- **Step 3** `/onboarding/track`: pick **goal track** (School Learning enabled; JEE / NEET / CA disabled with "Coming soon"), **daily XP pledge** (15 / 35 / 60 / 100), and **study days** (M-T-W-T-F-S-S, Mon-Fri pre-selected).
- Final POST: `POST /api/user/onboarding` writes `profile.class_level`, `board`, `active_track`, `daily_pledge_xp`, `study_days` + replaces `student_subjects` rows.
- **Partial-update safe** — sends only fields explicitly set; reused by `/settings`.

### Home (`StudentHomeScreenV4`)

- Reads `/api/user/home-data` (one call) — profile, totalXP, todayXP, streak, mastery, recentDoubts, dailyChallenge, badges, subjectHealth, selectedSubjects, **studyMinutes** (estimate from doubts × 2 min + practice Q × 1.5 min + test seconds), **streak.pledged_days_missed**.
- Concept-level **Boss Quest** card (PRD v4.3 §8) — uses `concept_mastery` recommendation from nightly job. Falls back to keyword-based rec for new users.
- 3-up cards: Continue / Daily Challenge / Revise (or Next Test)
- **Re-plan check-in banner** when `pledged_days_missed >= 3` (writes to `POST /api/user/replan-acknowledged` to dismiss)
- Streak-at-risk banner when today's pledge XP not yet hit
- Pa mascot animations: idle breathe (always), celebrate (xpGap=0 + xpToday>0), speaking (xpToday=0), antenna glow (streak ≥ 3 days)

### Ask AI doubt solver — `/ask` (`DoubtSolverScreenV4`)

- `POST /api/ai/doubt` (streaming SSE). Pipeline:
  1. Optional photo: `imageDataUrl` → vision endpoint with `groq/meta-llama/llama-4-scout-17b-16e-instruct`. Skips cache + RAG.
  2. Embed question (OpenAI text-embedding-3-small).
  3. Semantic cache lookup (`search_response_cache` RPC, threshold 0.92). Hit → stream cached response word-by-word, log to audit.
  4. RAG retrieval from `ncert_chunks` (threshold 0.5, top 4).
  5. Build student memory context (name, weak subjects from `subject_mastery` <70%, last 3 doubt question texts).
  6. System prompt = CBSE persona + NCERT context + memory + personalisation rule + **LaTeX permitted** (KaTeX-rendered).
  7. Stream Groq Llama-3.3-70B response.
  8. Detect memory usage, save session, award 10 XP, cache only if not memory-personalised. Post-stream LaTeX validation: malformed `$...$` is sanitised before storing in cache.
- UI features:
  - Dual-loop thinking state (5 phase labels cycling 700ms each)
  - 8 action chips: Explain visually ✨, Simpler please, Show exam answer, Quiz me, Similar question, Challenge me, Real-life example, Common mistakes
    - **Quiz me** opens an inline `InlineQuiz` widget (1 MCQ from `/api/ai/practice` with the answer as context), no LLM round-trip via doubt.
    - **Challenge me** asks the LLM for a structured `[problem]\n---SOLUTION---\n[steps]` response; frontend renders the problem and gates the solution behind a **Show solution** reveal.
    - **Explain visually** calls `/api/ai/visual` (GPT-4o HTML+SVG) and renders in a sandboxed iframe inside the bubble. `visual:force` bypasses the cache.
  - Quality signals: thumbs up/down, inline reason chips, Report-incorrect modal → `flagged_responses`
  - NCERT source citation chip (when confidence > 0.55)
  - Memory-aware indicator
  - Subject auto-detected from question keywords (no manual selector)
  - Conversation history (last 6 turns) in LLM context
  - **Listen button** — Google Cloud TTS (en-IN-Wavenet-D) with browser-Web-Speech fallback. Pa mascot in the bubble syncs mood and bobs while audio plays.
  - **MathText** (KaTeX) renders math after stream completes; plain text during streaming to avoid mid-stream half-rendered LaTeX.
  - Conversation cleared via "Clear chat", persisted in localStorage (last 30 messages).
  - Daily usage cap = unlimited (Phase 1 is free).

### Practice MCQ — `/practice` (`PracticeRunScreenV4`)

- **Standalone v4 screen.** Entry points: home Daily Challenge / Weak Spots / Revise (each passes `{ subject, concept? }`).
- `POST /api/ai/practice` returns 3-8 MCQs with: `question`, `options[4]`, `correctIndex`, `explanation`, `difficulty` (easy/medium/hard), `hint` (always-visible per question), `hint_subtitle`, `concept_slug`. Generated by Groq Llama-3.3-70B with `response_format: json_object`.
- Question strip with state tiles, per-question difficulty + XP chip, always-visible hint box, skip button (counts as wrong), Report → `flagged_responses`.
- `POST /api/ai/practice/complete` — sums per-correct XP by difficulty (3/6/10 by default, admin-configurable in `config.json` `xpRewards.practiceDifficulty`), minus hint penalty (2 XP each, currently unused since hints are free). Updates `subject_mastery` running average + per-question `concept_mastery` via RPC. Writes to `practice_sessions`. Triggers `recomputeForStudent()` async.
- KaTeX-rendered math in question + options + hint.

### Tests — `/tests` (`TestListScreenV4`)

Three test types, all visible by default:
1. **TEACHER-ASSIGNED** (real `test_assignments` rows for the student's class, `mode: 'teacher'`) — Prep button (warm up via `/practice`) + Take test button (real timed exam with the assigned questions).
2. **PA RECOMMENDS** — backend picks weakest subject from `subject_mastery`, auto-tunes difficulty (<50% → easy, <75% → medium, ≥75% → hard), 10 questions. `mode: 'ai_recommended'`.
3. **BUILD YOUR OWN** — student picks subject (from enrolled list) + length (5/10/15) + difficulty (easy/medium/hard). `mode: 'self'`.

All three set `sessionStorage['padee-test-start']` and route to `/tests/active`.

### Test Active — `/tests/active` (`TestActiveScreenV4`)

- Calls `/api/test/start` with the stashed params, gets back questions + total time.
- Real countdown timer (color shifts: green → amber <3min → coral <1min). Auto-submit at 0.
- Question strip (states: answered/flagged/current/upcoming), Flag-for-review button per question, Drawer modal to jump to any question.
- Submit confirm modal shows answered/unanswered/flagged counts. Exit confirm modal warns about losing progress. `beforeunload` guard while active.
- KaTeX in question + options.
- Minimal "test mode" top bar (no nav pills — student is locked in). No mid-test save (intentional).
- `POST /api/test/complete` — saves session, awards XP (per-difficulty + bonus if ≥80%), updates `subject_mastery` + `concept_mastery`, generates **Pa's Debrief** (see below).

### Test Results — `/tests/results` (`TestResultsScreenV4`)

- Reads from `sessionStorage['padee-test-result']` (just-submitted) OR `?sessionId=` query param (review of past test).
- **Hero** — dark card with score ring (left), tone-aware grade headline (A+/A/B+/B/C/D), submitted/duration eyebrow, XP earned + bonus chip + badge unlock notice (when applicable).
- **Question-by-question grid** — color-coded tile per question (correct/wrong/skipped) with topic tag. Click → opens "Explain Q in Ask Pa" pre-filled.
- **What went wrong** — focused row per wrong question with topic + question snippet + student pick / correct answer, **Re-learn** button (routes to Learn with topic) + Ask Pa button.
- **Concept Mastery Updated** — 3-up cards showing per-topic correct/total, color-coded Mastered/Almost/Needs work.
- **Pa's Debrief** — amber sticky sidebar (right column on desktop). Multi-paragraph LLM-generated diagnosis: assessment with topic stats ("very confident on N1 and N2 — 6/6 correct") → misconception diagnosis with corrective mental model + memorable analogy → next-step recommendation with the weakest topic. Per-topic stat chips above the prose. Listen button reads aloud (LaTeX-free unparsed). Pa mascot bobs while audio plays. Generated via `gpt-4o-mini` (`LLM_TEST_INSIGHTS` env var, ~₹0.05/test). Llama 3.3-70b is the fallback.
- Full review accordion (all questions, options + explanations).

### Visual Explanation (`/api/ai/visual`)

- GPT-4o (`LLM_VISUAL_EXPLAIN=gpt-4o`). Generates self-contained HTML+SVG (responsive viewBox, inline CSS, animations, no external deps).
- Sandboxed iframe (`sandbox="allow-scripts"` only — no same-origin so scripts can't fetch cookies). Auto-sizing + Expand-to-fullscreen modal + Regenerate button.
- Cached via `response_cache` table with `viz::question::context` key.

### Voice TTS (`/api/ai/tts`)

- Server proxy to Google Cloud TTS, returns `audio/mpeg`. In-memory LRU cache (500 entries, keyed by `sha256(text::voice)`). 5000 char per call cap.
- Default voice: `en-IN-Wavenet-D` (warm Indian English female), overridable via `LLM_TTS_VOICE` env var.
- Falls back to browser `speechSynthesis` if `GOOGLE_TTS_API_KEY` not set.
- All TTS goes through `SpeechContext` (single audio source app-wide). Pa mascots with `syncWithSpeech={true}` switch to "speaking" mood + mouth-bob animation while audio plays.
- LaTeX in text is unparsed to spoken English (`$F = mg \sin\theta$` → "F equals m g sine theta") via `latexToSpeech.ts`.

### Settings — `/settings` (`SettingsScreen`)

- Edit daily pledge XP, study days, goal track, subjects (each section saves independently via partial `/api/user/onboarding`).
- Class + board are read-only ("contact support to change" — changing mid-year would invalidate XP/mastery).
- Entry points: HomeTopNav user-chip dropdown, home Re-plan banner CTA.

### Streak engine (pledge-aware, IST-bound)

`updateStreak()` in `server/routes/ai.ts`:

- **Rest day** (today not in `profile.study_days`) → row left alone, no streak change. XP still awarded by the calling endpoint.
- **Pledged day, no missed pledged days since last_active** → streak +1, `pledged_days_missed` reset to 0. Streak bonus XP fires if streak ≥ 2 (admin-configurable, default 5).
- **Pledged day after missing 1+ pledged days** → streak **frozen** (not reset to 1), `pledged_days_missed += missedCount`. Frontend shows re-plan check-in when ≥ 3.
- **Legacy users** (`study_days` NULL) → all 7 days treated as pledged.
- All day comparisons use **IST midnight** (helpers in `server/lib/dateIST.ts`). Same applies to `home-data` today's-XP / today's-counts windows and `/api/ai/usage`.
- Note: `server/routes/test.ts` has its own duplicate `updateStreak()` for test completions — IST-bound but **not pledge-aware yet**. Unification is a known follow-up.

### Recommendation engine (PRD v4.3 §8) — built April 15

Concept-level knowledge state model. Tables in migration 008. Hero is computed by the recompute job, fires inline after any practice/test/doubt. Manual full-class trigger via admin "Recompute recommendations" button → `POST /api/recommendations/recompute`.

Composite score = accuracy × 0.5 + recency × 0.3 + consistency × 0.2. Recency decay per PRD 8C (7d=0.5, 14d=0.3, 30d=0.2).

Hero priority (Phase 1, no prereqs): exam_weight → score_gap → recency.

Hero copy generated via `gpt-4o-mini` (`LLM_RECOMMENDATION` env var, ~₹0.002/student).

### NCERT Admin panel — `/admin`

- Password auth (`ADMIN_PASSWORD` env var).
- Tabs: NCERT Content, LLM Audit, Concept Catalog, Users, Config.
- **Upload**: PDF → pdf-parse → 800-char chunks (100-char overlap) → OpenAI text-embedding-3-small → `ncert_chunks`.
  - Auto-extract on upload: `extractConceptsFromChapter()` (GPT-4o) inserts concepts as `draft` status. Admin reviews + publishes.
- **LLM Audit**: in-memory ring buffer + JSONL on disk (`logs/llm-calls.jsonl`, rotates at 5MB). Filter by endpoint, expandable rows showing full prompt + response.
- **Concept Catalog**: tree view (subject → class → chapter → concepts), inline edit, publish, re-extract, bulk publish, delete. "Recompute recommendations" button.
- **Config**: edit `xpRewards.{textDoubt,photoDoubt,practiceSession,practiceDifficulty.{easy,medium,hard},practiceHintPenalty,testCompletion,streakBonus}`, `dailyGoal`, `dailyChallenge.{questionCount,xpReward,preferWeakSubject}`, `weakTopicThreshold`, `badges[]`, `test.{secondsPerQuestion,availableLengths,availableDifficulties,baseXp,bonusXpThreshold,bonusXp}`.
- pdf-parse v1 has a known startup bug; mitigated by keeping `test/data/05-versions-space.pdf` in repo.

### Critical model + API key facts

- **Groq**: `llama-3.1-70b-versatile` is DECOMMISSIONED. Use `llama-3.3-70b-versatile`.
- **Groq vision**: `llama-3.2-11b-vision-preview` is DECOMMISSIONED. Use `meta-llama/llama-4-scout-17b-16e-instruct`.
- **OpenAI**: First key (sk-proj-oZIa…) hit quota. Working key in `.env` starts `sk-proj-rplY…`.
- **Migration 006** is critical: without it `search_response_cache` and `search_ncert_chunks` silently return zero rows (the `similarity real` cast bug).
- **Migrations 009 + 010 + 011** must be applied for the new onboarding + pledge-aware streak to function.

### What's NOT built (Phase 1 / Phase 2)

**Student-side Phase 2:**
- Parent dashboard (`/parent` is a `Navigate to /home` placeholder; parent v4 is the next planned build).
- JEE / NEET / CA tracks (disabled at signup with "Coming soon" badges; `/jee-neet` redirects to `/home`).
- Class 6-7 support (UI blocks at signup; NCERT content + concept catalog also need expansion).
- Gamification celebrations (level-up overlay, badge unlock animation).

**Teacher-side:**
- Worksheet generator and Paper Mimic — backend partly built, teacher-side UI is v3.
- Teacher dashboard, review queue, student profile, assign-test, live-class — all v3 visuals on real backend; **v4 upgrade is the next planned teacher-side work**.

**Platform:**
- Quality metrics dashboard (helpful_rate, flag_rate per subject/chapter).
- PostHog + Sentry integration.
- Real-time AI evaluation of descriptive answers (`POST /api/ai/evaluate` is a 501 stub).
- Vercel + Railway deployment.
- Parent OTP verification for under-18 signup (currently self-attestation; DPDP-compliant upgrade for Phase 2).
- Automated nightly cron for recommendation recompute (Railway scheduled job; currently manual).

**Deferred to Phase 2+:**
- School onboarding (no `schools` table, no invite-code flow).
- Automated eval agent (LLM-as-judge scoring every doubt response — recommend Langfuse for this).
- Fine-tuning pipeline.
- Hindi support via Qwen-2.5-72B.
- Pre-built SVG templates for top 30 CBSE concepts.

## PRD reference

Three PDF documents in repo root:
- **Padee_PRD_v4_2.pdf** — Product requirements (features, architecture, quality control, agent patterns, roadmap)
- **Padee_Implementation_Guide (2).pdf** — Feature-by-feature build guide (backend route → curl test → api.ts → screen)
- **Padee_UI_Spec_v3.pdf** — 19+1 screens spec (5 updated, 2 new in v3 — visual explanation overlay + admin)

## Design system (v4)

- **Primary action**: Coral `#E85D3A` with ink shadow `0 3px 0 #B2381B`
- **Ink**: `#13131A` (text + dark hero cards)
- **Paper**: `#FAF8F4` (background)
- **Amber**: `#FFB547` (eyebrows on dark, streak/Pa accent)
- **Greens**: `#36D399` (correct/mastered), `#0F7A4F` (deep), `#DDF6E9` (light)
- **Pinks/coral**: `#FF4D8B` (wrong), `#E85D75` (alerts)
- **Neutrals**: `#ECECEE` hairline, `#F3EFE4` paper-2, `#8A8A95` muted
- **Font**: Lexend Deca 14-15px base. **Kalam** for handwritten flourishes (Pa's whiteboard equation on landing). KaTeX ships its own math fonts.
- All v4 screens scope styles under `.home-v4` (or screen-specific class composing with it). Tokens live at the top of each `*-v4.css` file or are inherited from `home-v4.css`.

## Conventions

- All LLM prompts live in `server/routes/ai.ts` (consider refactoring to `server/prompts/` in Phase 2).
- Subject auto-detected from question keywords via `detectSubject()`.
- `className` from `user.studentClass` (UserContext). Never hardcoded.
- **LLM responses use LaTeX** (`$...$` inline, `$$...$$` display). Frontend renders via `MathText` (KaTeX). LaTeX is server-side validated post-stream; malformed `$` counts are sanitised before caching.
- Internal RAG chunks are prefixed `[Source 1]`, `[Source 2]` — prompts explicitly tell the LLM these are internal-only and never to repeat them in output.
- Cache writes are best-effort and async (don't block response).
- Iframe `sandbox="allow-scripts"` for visual explanations (no `allow-same-origin` so sandboxed scripts can't fetch / access cookies).
- All "today" / "yesterday" student-facing comparisons use **IST midnight** boundaries (`server/lib/dateIST.ts`) — not UTC.
- v4 screen styling: each screen has a paired `*-v4.css` file. All v4 screens are full-bleed (own `HomeTopNav` + `FooterStrip`) — they do **not** nest inside `StudentLayout`.
