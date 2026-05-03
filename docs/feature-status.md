# Feature Status

_Last updated: April 26, 2026_
_Current state: Full student journey is end-to-end **v4 and shipped** — landing → signup → 3-step onboarding → home → ask → learn → practice → tests (list/active/results) → settings → progress. v3 fallbacks deleted. Teacher side is on real backend with v3 visuals (v4 upgrade is the next planned work). Parent dashboard is a `Navigate to /home` placeholder pending Phase 2._

This document tracks which Padee.ai features are **built, partially built, or pending**. For technical deep-dives on individual features, see [`features.md`](./features.md).

---

## Legend
- ✅ **Complete** — shipped, tested, in production code
- 🟡 **Partial** — backend or frontend built but not both / data pipeline has a gap
- ❌ **Pending** — not started / placeholder / 501 stub
- 🚫 **Phase 2** — intentionally deferred per PRD

---

## 1. Foundation & Auth

| Feature | Status | Notes |
|---|---|---|
| Supabase project + 11 migrations | ✅ | `ifxekwenhidotyqlrpty`, us-east-1 |
| Real auth (signup/login) | ✅ | Email autoconfirm via Management API |
| Role-based routing | ✅ | student/teacher/parent → different dashboards |
| Protected routes | ✅ | `ProtectedRoute` wrapper |
| Auto-profile trigger on signup | ✅ | Creates `profiles` + `student_streaks` rows |
| Admin role management | ✅ | `/admin` → Users tab, or `POST /api/admin/set-role` |
| Test account | ✅ | `teststudent@padee.ai` / `TestPass123!` |
| Admin password auth | ✅ | `padee-admin-2026` |

---

## 2. Onboarding (v4, 3 steps)

| Feature | Status | Notes |
|---|---|---|
| Step 1 — Class (8-12) + Board picker | ✅ | CBSE / ICSE / IGCSE / IB / STATE / OTHER. CBSE pre-selected with "Most common" badge. Persists via migration 009. |
| Step 2 — Subjects with Pa auto-select | ✅ | 5 standard CBSE subjects auto-selected (Class 8-10), 4 for 11-12 science stream. Reset button restores defaults. |
| Step 3 — Track + Daily Pledge + Study Days | ✅ | School Learning enabled; JEE/NEET/CA show "Coming soon" disabled. XP pledge tile picker (15/35/60/100). Day picker (Mon-Fri pre-selected). Persists via migration 010. |
| Commerce subjects for Class 11-12 | ✅ | Economics, Accounts, Business Studies |
| Partial-update-safe `/api/user/onboarding` | ✅ | Only writes fields explicitly sent — reused by `/settings`. |

---

## 3. Student Home Screen

| Feature | Status | Notes |
|---|---|---|
| Real XP + level + streak from DB | ✅ | |
| Daily goal progress ring | ✅ | Admin-configurable target |
| Streak-at-risk alert banner | ✅ | Shows when goal not met today |
| AI Recommendation card (keyword-based) | ✅ | 5-priority cascade; fallback when no concept data |
| **AI Recommendation (concept-level)** | 🟡 | **Backend complete; UI only shows if student has ≥3 attempts** |
| Quick-ask input bar | ✅ | Taps → `/ask` |
| Recent doubts list (last 3) | ✅ | Tappable, re-opens Ask AI |
| Weak subject action card | ✅ | When any subject < admin threshold |
| "Explore more" unexplored subject card | ✅ | |
| Daily challenge card | ✅ | Admin-configurable count + XP; pre-loads questions |
| Recent wins / badges carousel | ✅ | |
| Subject health progress rings | ✅ | |
| Right panel (desktop): XP breakdown + subjects | ✅ | Doubts / Practice / Streak / Tests |

---

## 4. Ask AI (Doubt Solver)

| Feature | Status | Notes |
|---|---|---|
| Streaming SSE | ✅ | `POST /api/ai/doubt` |
| RAG retrieval from `ncert_chunks` | ✅ | pgvector cosine, threshold 0.5, top 4 |
| Semantic cache lookup | ✅ | `response_cache`, threshold 0.92 |
| Memory injection | ✅ | Name, weak subjects, last 3 doubts |
| NCERT source citation chip | ✅ | Only shown when confidence > 0.55 |
| Memory-aware indicator | ✅ | "Remembering your profile" |
| Subject auto-detection | ✅ | Keyword match on frontend |
| Conversation history | ✅ | Last 6 turns sent to LLM |
| 8 action chips | ✅ | Explain visually, Simpler, Exam, Quiz, Similar, Challenge, Real-life, Mistakes |
| Quality signals (👍/👎 + reasons) | ✅ | Writes to `doubt_feedback` |
| Report incorrect bottom sheet | ✅ | Writes to `flagged_responses` |
| Copy button on AI bubbles | ✅ | Hover-reveal |
| Clear chat history | ✅ | |
| localStorage persistence | ✅ | Last 30 messages |
| Photo doubt (Llama-4-Scout) | ✅ | Skips cache + RAG |
| Cold-start: 6 action cards + try-asking | ✅ | |
| **KaTeX math rendering** | ✅ | LLM uses `$...$` / `$$...$$`, frontend renders via `MathText` (KaTeX). Server-side validation strips malformed `$` before caching. |
| **Listen to answer (TTS)** | ✅ | Google Cloud TTS (en-IN-Wavenet-D) via `/api/ai/tts` with browser Web Speech fallback. Pa mascot bobs while audio plays. |
| **Quiz Me as inline widget** | ✅ | `InlineQuiz` component fetches 1 MCQ from `/api/ai/practice` with the answer as context. No round-trip through the doubt LLM. |
| **Challenge Me with hidden solution** | ✅ | Structured `[problem]\n---SOLUTION---\n[steps]` response; frontend gates the solution behind a "Show solution" reveal button. |
| Voice input (mic + Whisper) | ❌ | |
| Share doubt / copy as shareable card | ❌ | |

---

## 5. Visual Explanation

| Feature | Status | Notes |
|---|---|---|
| GPT-4o SVG generation | ✅ | `POST /api/ai/visual` |
| Self-contained HTML+SVG output | ✅ | Responsive viewBox, inline CSS, no external deps |
| Sandboxed iframe | ✅ | `sandbox="allow-scripts"` |
| Expand-to-fullscreen modal | ✅ | |
| Regenerate button | ✅ | |
| Semantic cache with `viz::` prefix | ✅ | Same `response_cache` table |
| `force=true` bypass cache | ✅ | |

---

## 6. Practice MCQ (`PracticeRunScreenV4`)

| Feature | Status | Notes |
|---|---|---|
| Inline "Quiz me" in Ask AI | ✅ | `InlineQuiz` widget — 1 MCQ from chat context |
| Full practice screen (`/practice`) | ✅ | Loading → questions with state strip → results |
| Per-question difficulty + XP chip | ✅ | LLM tags each question easy/medium/hard; XP per correct = 3/6/10 (admin-configurable) |
| Always-visible hint per question | ✅ | LLM-generated hint that points at method/formula without revealing answer |
| Question progress strip | ✅ | Live state per tile: correct ✓ / wrong ✗ / skipped — / current / upcoming |
| Skip button | ✅ | Counts as wrong, 0 XP, advances |
| Per-question Report → `flagged_responses` | ✅ | Reason chips modal |
| KaTeX in question + options + hint | ✅ | |
| Concept slug per question → mastery update | ✅ | `update_concept_mastery()` RPC per correct answer |
| `POST /api/ai/practice/complete` | ✅ | Sums XP by difficulty, updates `subject_mastery` + `concept_mastery`, triggers `recomputeForStudent()` |
| Results screen (accuracy ring, XP, retry) | ✅ | |
| Pre-loading from home screen | ✅ | Cached in localStorage for instant start |
| Adaptive difficulty | 🚫 | Phase 2 — needs concept-tagged question bank |

---

## 7. Test Mode (v4)

| Feature | Status | Notes |
|---|---|---|
| Migration 007 (`test_assignments`, extended `test_sessions`) | ✅ | |
| **TestListScreenV4** with 3 test types visible by default | ✅ | Teacher-assigned, Pa Recommends, Build Your Own |
| Self-picked test (subject + length 5/10/15 + difficulty) | ✅ | `mode: 'self'` |
| AI-recommended test (weakest subject, auto-tuned difficulty) | ✅ | `mode: 'ai_recommended'` |
| Teacher-assigned test (pre-generated questions) | ✅ | `mode: 'teacher'`, with Prep + Take test buttons |
| **TestActiveScreenV4** — minimal "test mode" top bar with timer | ✅ | No nav pills; student is locked in |
| Timer color shifts (green → amber <3min → coral <1min) + auto-submit | ✅ | |
| Question navigation drawer + flag-for-review | ✅ | |
| Submit + exit confirm modals | ✅ | beforeunload guard, no mid-test save |
| KaTeX in question + options | ✅ | |
| **TestResultsScreenV4** — full v4 redesign | ✅ | Hero ring + tone-aware grade headline + question-by-question grid + What went wrong + Concept Mastery Updated + collapsed full review |
| **Pa's Debrief sticky sidebar** | ✅ | Multi-paragraph diagnosis (assessment + misconception + correction + analogy + next-step). gpt-4o-mini via `LLM_TEST_INSIGHTS`. Per-topic stat chips above prose. Listen button reads aloud. |
| XP award + bonus for ≥80% | ✅ | Admin-configurable thresholds |
| Teacher-side: assign test screen | ✅ | AI preview + publish + deactivate |
| Teacher submission stats per assignment | ✅ | Submissions count + average score |
| Re-learn / Explain Q CTAs on results | ✅ | Routes to Learn (with topic) and Ask Pa (with question pre-filled) |
| Class rank / class average / last-attempt comparison | ❌ | Frontend renders if backend supplies; backend doesn't yet |
| "Prep for test" flow (exam date → plan) | ❌ | Stub only in Ask AI cold-start |

---

## 8. Gamification

| Feature | Status | Notes |
|---|---|---|
| Level system (1-10, Beginner → Grandmaster) | ✅ | XP thresholds in `UserContext` |
| Level-up overlay | ✅ | Full-screen, confetti, bouncing emoji |
| Badge unlock bottom sheet | ✅ | Spinning conic ring + pop animation |
| Celebration queue + host | ✅ | Mounted in `StudentLayout` |
| `refreshUser()` after XP awards | ✅ | Triggers detection automatically |
| 8 admin-configurable badges | ✅ | Condition language: `doubts >= N`, `streak >= N`, etc. |
| **Pledge-aware streak engine** | ✅ | Rest day → no change. Pledged day with no missed pledged days → +1. Pledged day after misses → freeze (not reset). `pledged_days_missed` counter drives "miss 3 → re-plan check-in". |
| **IST-bound day boundaries** | ✅ | `server/lib/dateIST.ts` — all "today / yesterday" comparisons use IST midnight, not UTC. Affects streak engine, home-data today's-XP, /api/ai/usage. |
| Streak bonus XP | ✅ | Once-per-day, only when streak actually grows (frozen streaks don't earn bonus). Default 5 XP, admin-configurable. |

---

## 9. Progress Screen

| Feature | Status | Notes |
|---|---|---|
| Profile card (name + level + XP) | ✅ | |
| Stats row (total XP, streak, doubts) | ✅ | |
| Streak section | ✅ | |
| Badge grid (unlocked + locked) | ✅ | |
| Subject mastery bars | ✅ | |
| Today's activity summary | ✅ | |
| Streak calendar view | ❌ | |
| XP over time chart | ❌ | |

---

## 10. Learn Screen

| Feature | Status | Notes |
|---|---|---|
| Selected subjects grouped with NCERT chapters | ✅ | Reads from `ncert_uploads` |
| Chapter list with chunk counts + mastery % | ✅ | |
| Click chapter → Ask AI with subject context | ✅ | |
| "No content uploaded" empty state per subject | ✅ | |
| Flashcards / spaced-repetition | ❌ | No table, no UI |

---

## 11. Recommendation Engine (PRD v4.3 Section 8)

| Feature | Status | Notes |
|---|---|---|
| Migration 008 (5 tables) | ✅ | `concept_catalog`, `concept_mastery`, `student_recommendations`, `class_concept_health`, `teacher_alerts` |
| `update_concept_mastery()` SQL function | ✅ | accuracy × 0.5 + recency × 0.3 + consistency × 0.2 |
| Auto-extract concepts on NCERT upload | ✅ | GPT-4o reads chunks → drafts concepts |
| Admin catalog UI (review/publish/edit/delete) | ✅ | `/admin` → Concept Catalog tab |
| Concept catalog seeded | ✅ | ~40 published concepts: Bio/Chem/Maths/Physics Class 10 |
| Concept detection (keyword + chapter boost) | ✅ | 5-min cache, `server/lib/conceptDetection.ts` |
| Mastery wiring into practice/test/doubt | ✅ | `rpc('update_concept_mastery')` after every attempt |
| `recomputeForStudent()` mid-session | ✅ | Fires inline, non-blocking |
| `recomputeAll()` admin button | ✅ | `/api/recommendations/recompute` |
| `recomputeClassHealth()` teacher alerts | ✅ | Red/amber/green with 48h expiry |
| Hero copy via gpt-4o-mini + template fallback | ✅ | ~Rs 0.002/student |
| 4 home card components (Hero/Weak/Revision/Next) | ✅ | `src/components/recommendations/RecommendationCards.jsx` |
| Home screen renders cards | 🟡 | **Only when student has ≥3 attempts; otherwise falls back to keyword rec** |
| **Nightly automated recompute** | ❌ | **Was on Vercel cron, removed with rollback. No host selected yet.** |
| Empty state ("keep practising to unlock") | ❌ | Silent fallback today — user doesn't know why |
| Prerequisite gap detection | 🚫 | Column reserved; Phase 1 Month 3 |
| Full Class 8-12 catalog seed | ❌ | Only Class 10 pilot subjects covered |

---

## 12. Admin Panel

| Feature | Status | Notes |
|---|---|---|
| NCERT content upload (PDF → chunks → embeddings) | ✅ | pdf-parse → 800-char chunks, OpenAI `text-embedding-3-small` |
| Content library + re-index + delete | ✅ | |
| LLM audit log (JSONL + ring buffer 500) | ✅ | Live prompt inspector, filter by endpoint, auto-refresh 3s |
| Users tab (list + inline role change) | ✅ | |
| Config tab (XP, daily goal, badges, threshold) | ✅ | Admin-editable `server/config.json` |
| Concept Catalog tab | ✅ | Tree view: subject → class → chapter → concepts |
| "Recompute recommendations" button | ✅ | Manual trigger of nightly job |

---

## 13. Teacher Side

| Feature | Status | Notes |
|---|---|---|
| Teacher dashboard layout + nav | ✅ | |
| **Alert feed (red/amber/green)** | ✅ | `GET /api/teacher/alerts` |
| Dismiss + acted-on endpoints | ✅ | |
| One-tap "Create remedial worksheet" | ✅ | Pre-fills test assignment via `sessionStorage` |
| Test assignment (AI preview + publish) | ✅ | |
| Submission stats per assignment | ✅ | |
| **Worksheet generator** | ✅ | Free-text brief → structured worksheet. `POST /api/ai/worksheet` |
| **Worksheet validation agent** (PRD 2A) | ✅ | Batch validate via Llama-3.1-8b → regenerate flagged (gpt-4o-mini) |
| **Worksheet library (save/list/get/delete)** | ✅ | Teacher-scoped CRUD; reuse via "Open" |
| **Worksheet PDF export** | ✅ | Print-ready A4, name/roll/date header, blank writing lines, separate answer key page |
| **Worksheet DOCX export** | ✅ | Editable Word doc with same layout |
| **CBSE Paper Mimic** | ✅ | Upload PDF → infer structure → fresh paper. Shared preview with worksheet. `POST /api/ai/mimic` |
| **Real Command Centre** | ✅ | Top stats strip (students/alerts/flagged/tests-this-week), concept hotspots, class health bars, recent activity. `GET /api/teacher/dashboard` |
| **Teacher review queue** (flagged responses) | ✅ | List / detail / review (correct/wrong/partial) / reopen. `/teacher/review` |
| **Real student list** (replaces mock) | ✅ | Search + class filter, clicks drill into profile. `GET /api/teacher/students` |
| **Individual student profile view** | ✅ | 30-day activity sparkline, subject mastery bars, weak concepts, recent tests/practice, doubt history. `/teacher/student/:id` |
| **Live class feature** | ❌ | See Section 19 below. Scoped as chat-first MVP (Supabase Realtime, not WebRTC video) — achievable in 2-3 days |

---

## 14. Platform / Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Frontend build (Vite 4 + React 18 + TS) | ✅ | `npm run build` passes |
| Backend (Hono on port 3001) | ✅ | `npm run dev:server` |
| Combined dev script | ✅ | `npm run dev:all` |
| **LLM call audit log** | ✅ | `/admin` → LLM Audit tab. In-memory ring + `logs/llm-calls.jsonl`. Captures every LLM call with prompt, response, latency. |
| **LLM errors surfaced in admin** (Apr 17 2026) | ✅ | Red row styling + "🚨 Errors only" filter. Doubt/vision/practice/visual catch blocks log with `error` field. |
| **Generic server error logging** | ❌ | Only LLM errors are captured. Non-LLM failures (DB errors, 500s, auth rejections, embedding failures, cron errors, startup errors) only go to stdout and are lost on restart. See "Plan for later" below. |
| **Deployment** | ❌ | **No live host selected yet (Vercel removed)** |
| **Nightly cron automation** | ❌ | No scheduler |
| PostHog analytics | ❌ | |
| Sentry error tracking | ❌ | Recommended once we go live (complements the admin panel) |
| Service worker / offline mode | ❌ | |
| Quality metrics dashboard | ❌ | helpful_rate, flag_rate per subject |

### Plan for later: Generic server error logging

**Problem:** Only ~20% of server errors are admin-visible today. The LLM audit captures LLM-call failures only. Everything else (500s, DB errors, auth rejections, embedding failures, cron errors, PDF chunking errors, concept extraction errors) goes to server stdout and disappears on restart.

**Coverage gap:**

| Error type | Visible to admin today? |
|---|---|
| LLM call fails (rate limit, timeout) | ✅ Yes |
| Unhandled 500s | ❌ stdout only |
| Supabase / DB errors | ❌ stdout only |
| OpenAI embedding failures | ❌ stdout only |
| Auth failures (401/403) | ❌ not logged |
| PDF upload / chunking errors | ⚠️ Partial — `ncert_uploads.error_message` only |
| Concept extraction errors | ❌ stdout only |
| Nightly cron errors | ❌ stdout only |
| Frontend JS crashes | ❌ browser console only |
| Server startup / port conflict | ❌ stdout only |

**Planned approach (Option A, ~1 day):**

1. **New** `server/lib/errorLog.ts` mirroring `llmLog.ts` — in-memory ring + `logs/server-errors.jsonl`. Shape: `{ timestamp, method, path, statusCode, userId?, message, stack?, metadata? }`
2. **Hono global `app.onError`** logs every unhandled exception
3. **Request middleware** logs any response with `status >= 400`
4. Retrofit existing `console.error` sites across `ai.ts`, `test.ts`, `concepts.ts`, `admin.ts`, cron job
5. **New admin tab "Server Errors"** next to LLM Audit — filter by status code / path, expandable rows with stack trace + request context, red styling, auto-refresh
6. Verify by intentionally triggering a 500

**Alternative Option C (once live):** Drop in Sentry SDK — industry standard with source maps, alerting, session replay. Recommend adding alongside Option A when we deploy to production.

**Source:** Discussion on Apr 17, 2026. Deferred to later.

---

## 15. AI Evaluation & Advanced Features

| Feature | Status | Notes |
|---|---|---|
| **Real-time descriptive answer evaluation** | ❌ | `POST /api/ai/evaluate` is 501 stub |
| Automated eval agent (LLM-as-judge) | 🚫 | PRD layer 6, Phase 2 |
| Fine-tuning pipeline | 🚫 | Phase 3 — collect labelled data, fine-tune Llama-3.1-8B |
| Hindi support via Qwen-2.5-72B | 🚫 | Phase 2 |
| Pre-built SVG templates (top 30 concepts) | 🚫 | All visuals currently LLM-generated |

---

## 16. UI Redesign (v4) — student journey is end-to-end v4

| Feature | Status | Notes |
|---|---|---|
| v4 UI Spec (Lexend Deca + coral + dark topnav) | ✅ | **All student screens shipped. v3 fallbacks deleted Apr 26.** Flag mechanism removed. |
| Landing page v4 | ✅ | Hero with Pa chat mockup, KaTeX equation in handwritten Kalam font, trust strip |
| Login v4 | ✅ | Two-column with dark stats panel + Pa quote pill |
| Signup v4 | ✅ | Role picker (Student / Parent / Teacher), DPDP-aligned consent checkbox, password strength meter |
| Onboarding (3 steps) v4 | ✅ | Class+Board / Subjects with Pa auto-select / Goals+Pledge+Days |
| Home v4 | ✅ | Boss Quest hero, 3-up row, weak spots, upcoming tests, right rail, footer strip, re-plan banner |
| Ask AI v4 | ✅ | Pa identity, dark student bubbles, paper-bg AI text, 8 chips, KaTeX math, Listen button, InlineQuiz, ChallengeView, VisualExplanationBubble |
| Learn v4 | ✅ | Subject pill tabs, dark subject hero with donut, Pa cue banner, chapter rows with status chips |
| Tests v4 (list) | ✅ | 3 sections always visible: TEACHER-ASSIGNED, PA RECOMMENDS, BUILD YOUR OWN. Upcoming/Past tabs. |
| Tests v4 (active timed exam) | ✅ | Minimal "test mode" top bar, question strip + flag + drawer, KaTeX, submit/exit confirms |
| Tests v4 (results) | ✅ | Hero ring + tone-aware grade + question grid + What went wrong + Pa's Debrief sticky sidebar + Concept Mastery row |
| Practice run v4 | ✅ | Question strip + per-question difficulty/XP/hint/skip/report, KaTeX |
| Progress v4 | ✅ | Dark profile hero, weekly XP bars, Pa's read heuristic, mastery rows |
| Settings v4 | ✅ | Daily pledge / Study days / Goal track / Subjects (each saves independently); Class/Board read-only |
| Shared right rail + footer | ✅ | PaStatusCard, QuickQuestCard, AskPaSuggestions, ResumeCard, FooterStrip |
| HomeTopNav user-chip dropdown | ✅ | Profile + Settings & plan + Logout |
| Pa mascot speech sync | ✅ | `syncWithSpeech` prop subscribes to global SpeechContext; mood = "speaking" + mouth-bob while audio plays |
| Concept-level home cards (4 types) | ✅ | HeroCard / WeakConceptCard / RevisionCard / NextToLearnCard. Falls back to keyword rec for new users. |

---

## 17. Phase 2 (Intentionally Deferred)

| Feature | Status | Notes |
|---|---|---|
| Parent dashboard (`/parent` v4) | 🚫 | Currently `Navigate to /home` placeholder. **Next planned student-side build.** Parent role fully usable at signup. |
| JEE / NEET / CA track dashboards | 🚫 | Tracks disabled at signup with "Coming soon" badges. `/jee-neet` redirects to `/home`. |
| Class 6-7 support | 🚫 | Class picker is 8-12 only. NCERT content + concept catalog also need expansion. |
| **Teacher v4 UI rebuild** | 🚫 | Backend is complete; teacher screens are still v3 visuals. **Next planned teacher-side work.** |
| Parent OTP verification (DPDP-grade) | 🚫 | Currently self-attestation at signup. Parent-phone OTP for verifiable consent — needed before B2B school deals. |
| School onboarding (invite codes, school codes) | 🚫 | No `schools` table, no invite-code flow. |
| Teacher concept-catalog tools (mark-as-taught, teaching date, flag) | 🚫 | |
| Student diagnosis agent (root-cause across 30+ sessions) | 🚫 | |
| Adaptive difficulty (needs concept-tagged question bank) | 🚫 | |
| Exam readiness score (needs full catalog) | 🚫 | |
| Hindi support via Qwen-2.5-72B | 🚫 | |
| Pre-built SVG templates for top 30 CBSE concepts | 🚫 | All visuals currently LLM-generated. |
| Automated nightly recompute cron | 🚫 | Currently manual admin trigger. Railway scheduled job pending. |

---

## 19. Recently shipped (Apr 24-26, 2026 sprint)

Major work from the spring v4 cleanup sprint:

| Item | Status | Notes |
|---|---|---|
| Practice run screen (v4 redesign) | ✅ | Per-question difficulty/XP/hint/skip; concept slug routes mastery |
| KaTeX math rendering across student journey | ✅ | LLM prompts flipped from Unicode-only to LaTeX. Server-side `validateLatex()` strips malformed `$` before caching. |
| Voice TTS (Google Cloud en-IN-Wavenet-D) | ✅ | `/api/ai/tts` proxy + in-memory LRU cache + browser fallback. SpeechContext singleton drives Pa mascot mouth-bob. |
| `latexToSpeech.ts` unparser | ✅ | TTS reads "F equals m g sine theta" not "dollar F equals m g sine theta dollar" |
| Re-plan check-in banner on home | ✅ | Surfaces when `pledged_days_missed >= 3`; Got it button hits `POST /api/user/replan-acknowledged` |
| Settings page (`/settings`) | ✅ | Edit pledge / days / track / subjects independently; class+board read-only |
| Pledge-aware streak engine | ✅ | Migration 011. Rest days don't break streak; missed pledged days freeze (not reset). |
| IST-bound day boundaries | ✅ | `server/lib/dateIST.ts`. All today/yesterday comparisons use IST midnight. |
| Tests list — three test types restored (teacher / Pa rec / self-pick) | ✅ | All visible by default, all route through `/api/test/start` real timed exam. |
| TestActiveScreenV4 + TestResultsScreenV4 | ✅ | Real timed exam UI + redesigned results with Pa's Debrief sticky sidebar |
| Pa's Debrief multi-paragraph diagnosis | ✅ | gpt-4o-mini, structured 3-paragraph prompt (assessment + diagnosis + next-step), per-topic stat chips |
| Repo cleanup — v3 fallbacks deleted | ✅ | 14 files removed across 3 sweeps; `routes.tsx` halved (167 → 84 lines); `NEW_HOME_V4` flag removed entirely. |
| Migrations 009 / 010 / 011 added | ✅ | board column, daily_pledge_xp + study_days, pledged_days_missed counter |

---

## 18. Code Review & Testing (pre-pilot gate)

Before we put Padee in front of real teachers and students, these hygiene passes must happen. None of them should be skipped; they're cheap compared to a bad first impression. Do them **after feature-complete, before deployment**.

### 18A. End-to-end feature testing (manual pilot-sim)

A structured walkthrough of every user journey with real data, from a fresh DB.

| Flow | Test steps | Status |
|---|---|---|
| **Student signup → onboarding → home** | New email → confirm → 3-step onboarding → home cards render | ❌ |
| **Ask AI (text)** | Type question → streaming response → NCERT citation → thumbs + report → all 8 action chips | ❌ |
| **Ask AI (photo)** | Upload image → Llama-4-Scout vision → response renders | ❌ |
| **Ask AI → concept from Learn** | Click Learn concept → auto-ask → response streams (this was the big bug) | ❌ |
| **Practice MCQ flow** | Home → Challenge → generate questions → complete → XP awarded + mastery updated | ❌ |
| **Test mode — all 3 entry points** | Self-picked / AI-recommended / Teacher-assigned → timer → submit → results | ❌ |
| **Visual explanation** | Click ✨ chip → GPT-4o SVG → fullscreen → regenerate | ❌ |
| **Streak + level-up** | Activity on 3+ days → streak bonus XP → level-up overlay | ❌ |
| **Admin: NCERT upload** | Upload PDF → chunks + embeddings + auto-extract concepts | ❌ |
| **Admin: concept catalog** | Draft → edit → publish → verify in home recs | ❌ |
| **Admin: recompute recommendations** | Click → concept_mastery rows populated → teacher alerts created | ❌ |
| **Teacher dashboard** | Log in → 4 stat cards load → alerts render → hotspots correct → recent activity sorted | ❌ |
| **Teacher worksheet gen + export** | Free-text → generate → validate → regen flagged → save → PDF + DOCX | ❌ |
| **Teacher paper mimic** | Upload real past CBSE paper → structure preserved → fresh questions → export | ❌ |
| **Teacher review queue** | Student flags response → teacher reviews (wrong/partial/correct) → reopen | ❌ |
| **Teacher student profile** | Students list → click row → profile loads (mastery, weak concepts, doubts) | ❌ |
| **Amber alert → student profile one-tap** | Teacher dashboard amber alert → click → correct student profile opens | ❌ |

**Blocker exit criteria:** every flow green. Tolerate minor UI polish; do not tolerate broken state or silent failures.

### 18B. Code review — structural

Full-codebase read-through with these specific lenses:

| Lens | What we're looking for | Where |
|---|---|---|
| **Security** | Auth check on every write endpoint; no role-gate bypasses; no secrets in client bundle | All `server/routes/*.ts`, `src/lib/supabaseClient.ts` |
| **Error handling** | Every `catch {}` either logs or surfaces; no silent swallows | Grep for `catch {}` and `catch (e) { /* empty */ }` |
| **Memory leaks** | All `useEffect` with timers / subscriptions have cleanup; no setState after unmount | All screens; search for `setInterval`, `setTimeout`, `addEventListener` without cleanup |
| **N+1 queries** | Each backend endpoint uses at most O(1) Supabase round trips per entity | `ai.ts` and `teacher.ts` especially |
| **Duplicated code** | Anything copy-pasted 3+ times becomes a helper | `server/routes/ai.ts` (worksheet/mimic validation loop is a candidate — already duplicated once) |
| **Dead code** | Unused imports, unused functions, `console.log` debug leftovers, stale TODO comments | All files |
| **Config sprawl** | Hardcoded thresholds that should be admin-config | `server/routes/*.ts` — compare against `server/config.json` |
| **Type safety** | `any` used liberally in TS; runtime shape mismatches | All `.ts` files |
| **Prompt hygiene** | No LaTeX, no `[Source 1]` leaking into output, Unicode-only guidance consistent | `server/routes/ai.ts` prompts |

### 18C. Code review — operational

| Check | What to verify |
|---|---|
| **LLM cost audit** | Per-student daily cost projection at 100 students, then 1,000. Review models per endpoint. |
| **Rate limit behavior** | Simulate Groq 429 (easy: run 10 concurrent doubt calls) → fallback to OpenAI fires → student sees response |
| **DB load test** | Simulate 50 concurrent students asking doubts. pgvector queries < 100ms? |
| **Bundle size** | Run `vite build` → check final bundle; look for accidental large imports (lodash, moment) |
| **Lighthouse perf** | Mobile score on / (landing), /login, /home, /ask |
| **Mobile responsiveness** | Every screen at 360 / 768 / 1280 widths |
| **Browser compat** | Chrome + Safari + Firefox — known issues: `crypto.randomUUID` on old Safari, SSE on mobile Safari |

### 18D. Performance optimization passes (based on review findings)

Empty checklist for now; populate after 18B and 18C identify bottlenecks. Common candidates based on current code:

- [ ] Pre-compute `totalXP` + current level as a materialized column or RPC (currently summed on every home/profile load — fine at Phase 1 scale, breaks at 10,000+ students)
- [ ] Add indexes on frequent filter columns: `flagged_responses(status, class_level)`, `doubt_sessions(student_id, created_at)`
- [ ] Cache `/api/teacher/dashboard` per teacher for 60s (it hits 9 tables)
- [ ] Batch the worksheet validation regeneration (currently serial per-question — could run in parallel)

### 18E. Pre-pilot testing with 1 real teacher + 3 real students

A 2-hour session with volunteers from the founder's network:

- Teacher does a full morning flow: open dashboard, check alerts, generate worksheet, export to PDF, print, mark as teaching material
- Students each ask 5 doubts + take 1 practice session
- Teacher uses review queue on any flagged answer
- Founder observes silently; notes where users hesitate or get confused
- Interview at end: what felt magical, what felt broken, what's missing

**Output:** a prioritized punch list of real-user-driven fixes before broader pilot.

---

## 19. Live Class (teacher-led synchronous session)

**Status:** Active pending feature. Scoped below.

The goal: a teacher can start a session in the classroom (or online), students join with a 6-digit code, and the teacher drives the session — pushes a question, sees who answered what in real time, reviews wrong answers with the AI tutor, moves to the next concept. Not a video call — that's the trap. Video exists elsewhere (Zoom, Meet, Teams). Padee's differentiator is the **AI-assisted teaching loop**: the AI is the teacher's co-pilot during class.

### Product shape (MVP)

**Teacher flow:**
1. Click "Start live class" in dashboard
2. Select subject + chapter (or concept) — session gets a 6-digit code
3. Share code with class (print on board, WhatsApp, etc.)
4. Teacher screen shows: roster (who joined), a question composer, a live response grid
5. Teacher pushes a question ("Quick check: What's the unit of resistance?") → appears instantly on every joined student's phone
6. Student picks A/B/C/D → teacher sees live bar chart updating
7. Teacher taps "Reveal answer" → correct option highlights on everyone's screen
8. Teacher taps "Explain with AI" → Padee's AI generates a classroom-appropriate explanation → renders on every student screen (streamed)
9. Teacher moves to next question
10. End session → stats saved + optional auto-generated homework from weak questions

**Student flow:**
1. Tap "Join live class" on home screen
2. Enter 6-digit code
3. Wait for teacher to push the first question
4. Answer → see live (anonymised) class distribution after teacher reveals
5. See AI explanation when teacher triggers it
6. End screen: "You got 7/10. Here's what you'll revise next."

### Why this instead of WebRTC video

| Option | Cost | Value |
|---|---|---|
| WebRTC video (Zoom-like) | 2-3 weeks, infra cost, privacy/consent issues | Redundant with tools schools already use |
| **Chat-first live class (above)** | **2-3 days, Supabase Realtime, zero infra** | **Unique — AI co-pilot in the moment** |
| Text polls (Kahoot-like) | 1 day | Solved problem, no AI moat |

The chat-first shape gives Padee a reason to be the classroom tool rather than one of many.

### Technical approach

**Backend:**
- New table `live_sessions`: `id, teacher_id, code, subject, class_level, chapter, status (active/ended), started_at, ended_at`
- New table `live_session_participants`: `session_id, student_id, joined_at, left_at`
- New table `live_session_events`: `session_id, event_type (question/answer/reveal/explanation), payload jsonb, created_at` — the replay log
- Supabase Realtime channel per session (`live-session:<id>`) — broadcast model
- `POST /api/live/start` — teacher creates a session, returns code
- `POST /api/live/join` — student joins with code
- `POST /api/live/push-question` — teacher publishes a question to the channel
- `POST /api/live/answer` — student submits their pick
- `POST /api/live/reveal` — teacher broadcasts "correct answer" event
- `POST /api/live/ai-explain` — streams an AI explanation via SSE to all participants
- `POST /api/live/end` — teacher ends session, triggers post-session recompute

**Frontend:**
- New `/teacher/live` screen — roster, question composer, response grid, reveal/AI-explain controls
- New `/live/:code` student screen — join, see pushed content, answer
- New "Join live class" entry point on student home
- Reuse worksheet generator's question shape for the question composer

### Features within live class (phase 1)

| Feature | Priority |
|---|---|
| Session create + 6-digit code | P0 |
| Student join via code | P0 |
| Push MCQ question → everyone sees | P0 |
| Live response grid (teacher view) | P0 |
| Reveal answer → everyone sees correct option | P0 |
| Roster (who joined / left) | P0 |
| AI explain on demand (streaming) | P0 |
| Session end + per-student results | P0 |
| Auto-generate follow-up worksheet from weak questions | P1 |
| Push short-answer question (text, not MCQ) | P1 |
| Push visual explanation (reuse Screen 19) | P1 |
| Anonymous mode (hide names from grid) | P1 |
| Session replay (watch the event log) | P2 |
| Breakout rooms | 🚫 deferred |
| Video / audio | 🚫 deferred |
| Teacher can chat with one student privately | 🚫 deferred |

### Scope effort

- Backend (tables + routes + Realtime): **1 day**
- Teacher live screen: **1 day**
- Student live screen + join flow: **0.5 day**
- AI explain streaming integration: **0.5 day**
- Post-session results + optional worksheet generation: **0.5 day**

**Total: ~2.5–3 days for a shippable MVP.**

### Why build this now

1. **It's the teacher's clearest "why Padee" moment.** Worksheets and tests are useful but not magical. AI-in-the-classroom-in-real-time is magical.
2. **It drives daily active use.** Worksheets are weekly. Live class is daily.
3. **It's the best pilot demo surface.** A 10-minute live session in front of a headmaster is worth more than a printed worksheet.
4. **It reuses existing infra.** Worksheet question generation, AI doubt solver, visual explanation, concept mastery — all plug in.
5. **Supabase Realtime is already available.** No new infra to set up.

### Pilot positioning

Pitched to teachers as:
> *"Use Padee's live class for your last 15 minutes. Ask the AI to explain anything the class is confused about, right there on their phones. Then take the weak topics home as an auto-generated worksheet for tomorrow."*

### Open questions to resolve before building

1. **Who can start a session?** Any teacher? Or only for students enrolled in their class? (Phase 1: any teacher, any code. Phase 2: school-scoped when `schools` table exists.)
2. **Does the student need an account to join?** (Phase 1: yes — we already track concept_mastery per student. Phase 2: guest join via code + name only.)
3. **What's the max session size?** (Phase 1: cap at 60 participants. Supabase Realtime free tier supports this.)
4. **Do we save student answers to `practice_sessions`?** (Probably yes — counts as practice, updates concept_mastery.)
5. **Can students ask questions mid-session?** (Phase 1: no — teacher-driven only. Phase 2: raise-hand queue.)

Defaults: most permissive / simplest option for each. Revisit based on pilot feedback.

---

## 20. v3 frontend cleanup (post-v4 rollout)

**Status:** Active pending task, queued for execution **only after every v4 screen has been validated with real users**. Do NOT do this before the pilot — v3 is the safety net.

### What this task covers

Once the `NEW_HOME_V4` flag has been on in production for long enough that we're confident in v4 (Home, Ask AI, and any other screens redesigned subsequently), delete the v3 frontend code entirely. Single-source the codebase on v4.

### Preconditions (must ALL be true before starting)

- ✅ Every student-facing screen has a v4 replacement OR an explicit decision to keep v3 indefinitely
- ✅ `NEW_HOME_V4=true` has been the default for ≥ 2 weeks of pilot usage
- ✅ No production telemetry shows a regression on v4 vs v3 (helpful rate, doubts per day, streak retention)
- ✅ No open bug in the v4 screens that requires falling back to v3
- ✅ Founder and first teacher have independently signed off on the v4 flow

### Cleanup checklist

#### 20A. Delete v3 screen files that have v4 replacements

| File | LOC | When v4 done |
|---|---|---|
| `src/screens/StudentHomeScreen.jsx` | ~585 | Home v4 validated (in flight) |
| `src/screens/DoubtSolverScreen.jsx` | ~1400 | Ask AI v4 validated (in flight) |
| Future screens as they're redesigned | — | Per-screen decision |

#### 20B. Delete v3-only components no longer referenced

Run `grep -rl '<ComponentName'` to confirm zero usages before deleting:

- `src/components/recommendations/RecommendationCards.jsx` (HeroCard, SupportingCardsRow, WeakConceptCard, RevisionCard, NextToLearnCard — replaced by `home-v4/BossQuestCard`, `WeakSpotsCard`, QuestCard row)
- `src/components/AIOrb.jsx` — if Ask AI is the only consumer, replace with `PaMascot`
- `src/components/BottomNav.jsx` — only used by v3 mobile student shell; delete when all student screens are full-bleed v4
- `src/components/teacher/TeacherRightPanel.tsx` — still used, keep
- `src/components/XPToast.jsx` + `src/components/LevelUpOverlay.jsx` + `src/components/celebrations/*` — cross-screen, keep
- `src/data/mockData.js` — audit; likely deletable (v3 fallback data)

#### 20C. Simplify routing

- `src/routes.tsx` — remove `NEW_HOME_V4` conditional branches; make v4 the single definition
- `src/config/flags.ts` — delete entirely (no flags left) OR repurpose for future flags
- `.env.example` — remove `VITE_NEW_HOME_V4=false` line
- Dev instructions in `CLAUDE.md` — update

#### 20D. Simplify the student shell

- If every student screen is full-bleed v4 (owning its own `HomeTopNav` + `FooterStrip`), **`src/layouts/StudentLayout.tsx` can be deleted**
- Or: refactor `StudentLayout` to just be a thin `ProtectedRoute` wrapper, keeping it as a common protection layer but without any chrome

#### 20E. Clean up CSS

- Audit `src/index.css` — any v3-only tokens or global rules (Forest Teal `.brand.*` palette not referenced by v4) can be deleted or marked deprecated
- `tailwind.config.js` — v3 uses DM Sans globally; if v4 is the only product, consider switching the global font to Lexend Deca. Check with every teacher + admin screen first since they still use DM Sans / the v3 Tailwind palette.

#### 20F. Delete v3 UI doc

- `docs/ui-spec-current.md` — update or retire (it describes v3 reality as the source of truth for Claude Design)
- Create `docs/ui-spec-v4.md` as the new canonical UI spec
- Keep `docs/features-printable.md` current

### Estimated effort

| Sub-task | Effort |
|---|---|
| Delete v3 screens + verify no breaks | 2 hours |
| Delete v3-only components | 1 hour |
| Simplify routes + flags | 30 min |
| Shell decision + cleanup | 1-2 hours |
| CSS audit + cleanup | 1 hour |
| Update docs | 1 hour |
| **Total** | **~6-8 hours (1 day with testing)** |

### Risk mitigation

- Do it on a branch; one PR per subsection above (so any one can be reverted)
- After each subsection, full build + smoke test every screen (Home / Ask / Learn / Practice / Tests / Progress / Teacher flows / Admin)
- Keep `main` shipping green throughout

### When to start

Queued to kick off **after** pilot feedback (Section 18E) AND v4 sign-off. Until then, v3 stays as-is.

---

## Summary

| Area | Progress |
|---|---|
| Student side | **~90% Phase 1 complete** (desc eval, flashcards, voice, prep-for-test, offline still pending) |
| **Teacher side** | **~90% complete** (live-class in scope and pending — see Section 19; everything else shipped) |
| Admin side | **~95% complete** (generic server error log still pending) |
| Recommendation engine | **~90%** (backend complete, nightly cron + empty-state UI pending) |
| Platform / deployment | **0% — no host selected** |
| Observability | **LLM-only** (server errors, DB errors, frontend crashes not captured yet) |
| **Code review / testing** | **0%** — see Section 18 above for the pre-pilot gate |
| **v4 UI** | **✅ ~100% (all 5 student screens: Home / Ask AI / Learn / Tests / Progress)** — teacher-side v4 not started |

---

## Recommended next priorities (updated Apr 21)

**Track A — close the pre-pilot gate:**
1. **End-to-end testing pass (Section 18A)** — 1 day. Walk every flow, fix whatever breaks.
2. **Code review structural + operational (Section 18B + 18C)** — 1-2 days. Best time is NOW, feature-complete on both sides.
3. **Performance fixes identified in review (Section 18D)** — 0.5-1 day depending on findings.
4. **Pilot-sim session (Section 18E)** — 2 hours session + 0.5 day follow-up fixes.

**Track B — ship-ready platform:**
5. **Empty-state UI** on home when no concept data yet (2 hours).
6. **Nightly automated recompute** (Railway/Render cron) — 0.5 day.
7. **Generic server error logging** — see Section 14 plan.
8. **Descriptive answer evaluation** (`POST /api/ai/evaluate`) — unlocks board prep, 1-2 days.
9. **Deployment** — pick host (Railway recommended for backend, Vercel or Render for frontend), go live.

**Track C — high-value differentiator:**
10. **Live class feature** (Section 19) — 2.5-3 days, biggest teacher "why Padee" moment, unlocks daily classroom use.

**Track D — post-pilot learnings drive the list:**
11. Incremental v4 UI — start with font or one screen.
12. Student-side nice-to-haves (voice, flashcards, streak calendar).
