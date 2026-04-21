# Feature Status

_Last updated: April 21, 2026_
_Current state: Phase 1 v3 UI, working. Teacher side ~95% complete (review queue, student profile, paper mimic, real command centre all shipped Apr 19-20). Ask AI streaming bug fixed._

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
| Supabase project + 8 migrations | ✅ | `ifxekwenhidotyqlrpty`, us-east-1 |
| Real auth (signup/login) | ✅ | Email autoconfirm via Management API |
| Role-based routing | ✅ | student/teacher/parent → different dashboards |
| Protected routes | ✅ | `ProtectedRoute` wrapper |
| Auto-profile trigger on signup | ✅ | Creates `profiles` + `student_streaks` rows |
| Admin role management | ✅ | `/admin` → Users tab, or `POST /api/admin/set-role` |
| Test account | ✅ | `teststudent@padee.ai` / `TestPass123!` |
| Admin password auth | ✅ | `padee-admin-2026` |

---

## 2. Onboarding

| Feature | Status | Notes |
|---|---|---|
| 3-step flow (Class → Subjects → Track) | ✅ | `/onboarding/class` → `subjects` → `track` |
| Commerce subjects for Class 11-12 | ✅ | Economics, Accounts, Business Studies |
| Track selection (School/JEE/NEET/CA) | ✅ | Writes `active_track` on profile |
| Writes `student_subjects` rows | ✅ | One row per enrolled subject |
| 4-step flow with Board selection | 🚫 | Was part of v4 UI, rolled back |

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

## 6. Practice MCQ

| Feature | Status | Notes |
|---|---|---|
| Inline "Quiz me" in Ask AI | ✅ | Contextual single MCQ from chat |
| Full practice screen (`/practice`) | ✅ | Loading → quiz → results flow |
| `POST /api/ai/practice/complete` | ✅ | Saves session, awards XP, updates `subject_mastery` |
| Results screen (accuracy ring, XP, retry) | ✅ | |
| Pre-loading from home screen | ✅ | Cached in localStorage for instant start |
| Adaptive difficulty | 🚫 | Phase 2 — needs concept-tagged question bank |

---

## 7. Test Mode

| Feature | Status | Notes |
|---|---|---|
| Migration 007 (`test_assignments`, extended `test_sessions`) | ✅ | |
| **Self-picked test** (subject + length + difficulty) | ✅ | |
| **AI-recommended test** (weakest subject) | ✅ | |
| **Teacher-assigned test** (pre-generated questions) | ✅ | |
| Timer + auto-submit on expiry | ✅ | |
| Question navigation drawer + flag for review | ✅ | |
| Results screen with AI insights | ✅ | Per-question review, weak topic tags |
| XP award + bonus for ≥80% | ✅ | Admin-configurable thresholds |
| Teacher-side: assign test screen | ✅ | AI preview + publish + deactivate |
| Teacher submission stats per assignment | ✅ | Submissions count + average score |
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
| Streak automation | ✅ | Increment / reset / bonus XP for streak >= 2 |

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
| Live class feature | 🚫 | Deferred — requires WebRTC/real-time infrastructure; revisit post-pilot |

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

## 16. UI Redesign (v4)

| Feature | Status | Notes |
|---|---|---|
| v4 UI Spec (Lexend Deca + vermillion + topbar) | 🚫 | **Rolled back April 17, 2026. Future implementation will be step-by-step, not all-at-once.** |
| Right AI panel (380px persistent) | 🚫 | |
| Bottom bar (subjects + XP + badges) | 🚫 | |
| Concept-level home cards (4 types) | ✅ | Built in Phase 1 code, works under v3 UI |

---

## 17. Phase 2 (Intentionally Deferred)

| Feature | Status |
|---|---|
| School onboarding (invite codes, school codes) | 🚫 |
| Teacher concept-catalog tools (mark-as-taught, teaching date, flag) | 🚫 |
| Student diagnosis agent (root-cause across 30+ sessions) | 🚫 |
| Adaptive difficulty (needs concept-tagged question bank) | 🚫 |
| Exam readiness score (needs full catalog) | 🚫 |
| Parent dashboard (currently shares progress screen) | 🚫 |
| JEE/NEET track dashboard (currently shares home) | 🚫 |

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

## Summary

| Area | Progress |
|---|---|
| Student side | **~90% Phase 1 complete** (desc eval, flashcards, voice, prep-for-test, offline still pending) |
| **Teacher side** | **~95% complete** (live-class intentionally deferred; everything else shipped) |
| Admin side | **~95% complete** (generic server error log still pending) |
| Recommendation engine | **~90%** (backend complete, nightly cron + empty-state UI pending) |
| Platform / deployment | **0% — no host selected** |
| Observability | **LLM-only** (server errors, DB errors, frontend crashes not captured yet) |
| **Code review / testing** | **0%** — see Section 18 above for the pre-pilot gate |
| v4 UI | **Rolled back — will be done step-by-step in future** |

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

**Track C — post-pilot learnings drive the list:**
10. Incremental v4 UI — start with font or one screen.
11. Student-side nice-to-haves (voice, flashcards, streak calendar).
