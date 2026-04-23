# Padee.ai — Complete Feature List

**Generated:** April 22, 2026
**For:** Printable / shareable reference

**Legend:** ✅ Shipped | 🟡 Partial | ❌ Pending | 🚫 Deferred (Phase 2+)

---

## 1. FOUNDATION & AUTH

| # | Feature | Status |
|---|---|---|
| 1.1 | Supabase project (`ifxekwenhidotyqlrpty`, us-east-1) | ✅ |
| 1.2 | 8 database migrations (001–008) | ✅ |
| 1.3 | Real auth (signup / login / email confirmation) | ✅ |
| 1.4 | Role-based routing (student / teacher / parent) | ✅ |
| 1.5 | Protected routes with `ProtectedRoute` wrapper | ✅ |
| 1.6 | Auto-profile trigger on signup (creates profile + streak row) | ✅ |
| 1.7 | Admin role management (UI + `POST /api/admin/set-role`) | ✅ |
| 1.8 | Admin password auth (`padee-admin-2026`) | ✅ |

---

## 2. ONBOARDING

| # | Feature | Status |
|---|---|---|
| 2.1 | 3-step flow: Class → Subjects → Track | ✅ |
| 2.2 | Commerce subjects for Class 11–12 | ✅ |
| 2.3 | Track selection (School / JEE / NEET / CA) | ✅ |
| 2.4 | Writes to `student_subjects` table | ✅ |
| 2.5 | Onboarding — Board selection (from v4 UI) | 🚫 |

---

## 3. STUDENT — HOME SCREEN

| # | Feature | Status |
|---|---|---|
| 3.1 | Real XP + level + streak from DB | ✅ |
| 3.2 | Daily goal progress ring (admin-configurable) | ✅ |
| 3.3 | Streak-at-risk alert banner | ✅ |
| 3.4 | AI Recommendation card (keyword-based cascade fallback) | ✅ |
| 3.5 | AI Recommendation (concept-level hero/weak/revision/next cards) | 🟡 — only shows when student has ≥3 attempts |
| 3.6 | Quick-ask input bar | ✅ |
| 3.7 | Recent doubts list (last 3, tappable) | ✅ |
| 3.8 | Weak subject action card | ✅ |
| 3.9 | "Explore more" unexplored subject card | ✅ |
| 3.10 | Daily challenge card + pre-loaded questions | ✅ |
| 3.11 | Recent wins / badges carousel | ✅ |
| 3.12 | Subject health progress rings | ✅ |
| 3.13 | Right panel (desktop) XP + subjects | ✅ |
| 3.14 | Empty-state message for new users with no concept data | ❌ |

---

## 4. STUDENT — ASK AI (Doubt Solver)

| # | Feature | Status |
|---|---|---|
| 4.1 | Streaming SSE (`POST /api/ai/doubt`) | ✅ |
| 4.2 | RAG retrieval from NCERT chunks (pgvector, threshold 0.35) | ✅ |
| 4.3 | Semantic cache (threshold 0.92) | ✅ |
| 4.4 | Student memory injection (name, weak subjects, recent doubts) | ✅ |
| 4.5 | NCERT source citation chip | ✅ |
| 4.6 | Memory-aware indicator ("Remembering your profile") | ✅ |
| 4.7 | Subject auto-detection (keyword match + Learn-click preservation) | ✅ |
| 4.8 | Conversation history (last 6 turns sent to LLM) | ✅ |
| 4.9 | 8 action chips: visual / simpler / exam / quiz / similar / challenge / real-life / mistakes | ✅ |
| 4.10 | Chip prompts interpolate topic text (stops drift) | ✅ |
| 4.11 | Thumbs up/down with inline reason chips | ✅ |
| 4.12 | Report incorrect bottom-sheet modal | ✅ |
| 4.13 | Copy button on every AI bubble | ✅ |
| 4.14 | Clear chat button | ✅ |
| 4.15 | localStorage persistence (last 30 messages) | ✅ |
| 4.16 | Orphan-state sanitization on load | ✅ |
| 4.17 | Photo doubt (Llama-4-Scout vision) | ✅ |
| 4.18 | Cold-start 6 action cards + sample questions | ✅ |
| 4.19 | Voice input (mic + Whisper) | ❌ |
| 4.20 | Share doubt / shareable card | ❌ |

---

## 5. STUDENT — VISUAL EXPLANATION

| # | Feature | Status |
|---|---|---|
| 5.1 | GPT-4o SVG generation (`POST /api/ai/visual`) | ✅ |
| 5.2 | Self-contained HTML+SVG output (inline CSS, no external deps) | ✅ |
| 5.3 | Sandboxed iframe (`sandbox="allow-scripts"`) | ✅ |
| 5.4 | Expand-to-fullscreen modal | ✅ |
| 5.5 | Regenerate button | ✅ |
| 5.6 | Semantic cache with `viz::` prefix | ✅ |
| 5.7 | `force=true` bypass cache | ✅ |

---

## 6. STUDENT — PRACTICE MCQ

| # | Feature | Status |
|---|---|---|
| 6.1 | Inline "Quiz me" in Ask AI (contextual single MCQ) | ✅ |
| 6.2 | Full practice screen (`/practice`) | ✅ |
| 6.3 | `POST /api/ai/practice/complete` saves + awards XP + updates mastery | ✅ |
| 6.4 | Results screen (accuracy ring, XP, retry) | ✅ |
| 6.5 | Pre-loading from home screen (instant start) | ✅ |
| 6.6 | Adaptive difficulty | 🚫 Phase 2 |

---

## 7. STUDENT — TEST MODE

| # | Feature | Status |
|---|---|---|
| 7.1 | Migration 007 (`test_assignments`, extended `test_sessions`) | ✅ |
| 7.2 | Self-picked test (subject + length + difficulty) | ✅ |
| 7.3 | AI-recommended test (weakest subject) | ✅ |
| 7.4 | Teacher-assigned test (pre-generated questions) | ✅ |
| 7.5 | Timer + auto-submit on expiry | ✅ |
| 7.6 | Question navigation drawer + flag for review | ✅ |
| 7.7 | Results screen with AI insights per question | ✅ |
| 7.8 | XP award + bonus for ≥80% | ✅ |
| 7.9 | "Prep for test" flow (exam date → study plan) | ❌ |

---

## 8. STUDENT — GAMIFICATION

| # | Feature | Status |
|---|---|---|
| 8.1 | Level system (1–10, Beginner → Grandmaster) | ✅ |
| 8.2 | Level-up overlay (full-screen, confetti, bouncing emoji) | ✅ |
| 8.3 | Badge unlock bottom sheet (spinning ring + pop animation) | ✅ |
| 8.4 | Celebration queue + host | ✅ |
| 8.5 | `refreshUser()` triggers detection automatically | ✅ |
| 8.6 | 8 admin-configurable badges | ✅ |
| 8.7 | Streak automation (increment / reset / bonus XP ≥ 2 days) | ✅ |

---

## 9. STUDENT — PROGRESS SCREEN

| # | Feature | Status |
|---|---|---|
| 9.1 | Profile card (name + level + XP) | ✅ |
| 9.2 | Stats row (total XP, streak, doubts) | ✅ |
| 9.3 | Streak section | ✅ |
| 9.4 | Badge grid (unlocked + locked) | ✅ |
| 9.5 | Subject mastery bars | ✅ |
| 9.6 | Today's activity summary | ✅ |
| 9.7 | Streak calendar view | ❌ |
| 9.8 | XP over time chart | ❌ |

---

## 10. STUDENT — LEARN SCREEN

| # | Feature | Status |
|---|---|---|
| 10.1 | Selected subjects grouped with NCERT chapters | ✅ |
| 10.2 | Chapter list with chunk counts + mastery % | ✅ |
| 10.3 | Click chapter → Ask AI with subject context | ✅ |
| 10.4 | "No content uploaded" empty state per subject | ✅ |
| 10.5 | Flashcards / spaced repetition | ❌ |

---

## 11. RECOMMENDATION ENGINE (PRD v4.3 Section 8)

| # | Feature | Status |
|---|---|---|
| 11.1 | Migration 008: 5 tables (catalog / mastery / recs / class health / alerts) | ✅ |
| 11.2 | `update_concept_mastery()` SQL function (0.5 / 0.3 / 0.2 weights) | ✅ |
| 11.3 | Auto-extract concepts on NCERT upload (GPT-4o) | ✅ |
| 11.4 | Admin catalog UI (review/publish/edit/delete/bulk/re-extract) | ✅ |
| 11.5 | ~40 concepts seeded (Class 10 Physics/Chem/Maths/Biology) | ✅ |
| 11.6 | Concept detection (keyword + chapter boost, 5-min cache) | ✅ |
| 11.7 | Mastery wiring into practice/test/doubt endpoints | ✅ |
| 11.8 | `recomputeForStudent()` fires inline after activity | ✅ |
| 11.9 | `recomputeAll()` admin button | ✅ |
| 11.10 | `recomputeClassHealth()` teacher alerts (red/amber/green + 48h expiry) | ✅ |
| 11.11 | Hero copy via gpt-4o-mini + template fallback | ✅ |
| 11.12 | 4 home card components (Hero / Weak / Revision / Next) | ✅ |
| 11.13 | Nightly automated recompute (cron) | ❌ — manual button only |
| 11.14 | Empty-state message for students with no concept data yet | ❌ |
| 11.15 | Prerequisite gap detection | 🚫 Phase 1 Month 3 |
| 11.16 | Full Class 8–12 catalog seed | ❌ — Class 10 only today |

---

## 12. ADMIN PANEL

| # | Feature | Status |
|---|---|---|
| 12.1 | NCERT content upload (PDF → chunks → embeddings) | ✅ |
| 12.2 | Content library + re-index + delete | ✅ |
| 12.3 | LLM audit log (JSONL + ring buffer 500) | ✅ |
| 12.4 | LLM audit live prompt inspector with filter + auto-refresh | ✅ |
| 12.5 | Users tab (list + inline role change) | ✅ |
| 12.6 | Config tab (XP / daily goal / badges / threshold) | ✅ |
| 12.7 | Concept Catalog tab (tree view with workflow) | ✅ |
| 12.8 | "Recompute recommendations" button | ✅ |
| 12.9 | LLM errors surfaced (red rows + Errors-only filter) | ✅ |
| 12.10 | Generic server error logging (non-LLM) | ❌ |

---

## 13. TEACHER SIDE

| # | Feature | Status |
|---|---|---|
| 13.1 | Teacher dashboard layout + sidebar nav | ✅ |
| 13.2 | Alert feed (red/amber/green) | ✅ |
| 13.3 | Dismiss + acted-on endpoints | ✅ |
| 13.4 | One-tap "Create remedial worksheet" from red alerts | ✅ |
| 13.5 | Test assignment (AI preview + publish) | ✅ |
| 13.6 | Submission stats per assignment | ✅ |
| 13.7 | **Worksheet generator** (free-text brief → structured) | ✅ |
| 13.8 | **Worksheet validation agent** (Llama-3.1-8b + regen flagged) | ✅ |
| 13.9 | **Worksheet library** (save/list/get/delete, teacher-scoped) | ✅ |
| 13.10 | **Worksheet PDF export** (A4 print-ready, separate answer key) | ✅ |
| 13.11 | **Worksheet DOCX export** (editable Word doc) | ✅ |
| 13.12 | **CBSE Paper Mimic** (upload → infer structure → fresh paper) | ✅ |
| 13.13 | **Real Command Centre** (stats strip, hotspots, health, activity) | ✅ |
| 13.14 | **Teacher review queue** (triage flagged AI responses) | ✅ |
| 13.15 | **Real student list** (search + class filter, replaces mock) | ✅ |
| 13.16 | **Individual student profile view** (sparkline, mastery, weak, doubts) | ✅ |
| 13.17 | Amber alert one-tap → student profile | ✅ |
| 13.18 | **Live class feature** (teacher-led session with AI co-pilot) | ❌ — **active pending, see Section 19** |
| 13.19 | Teacher notification of student flag outcomes | ❌ |
| 13.20 | Cache invalidation when teacher marks wrong | ❌ |

---

## 14. PLATFORM / INFRASTRUCTURE

| # | Feature | Status |
|---|---|---|
| 14.1 | Frontend build (Vite 4 + React 18 + TypeScript) | ✅ |
| 14.2 | Backend (Hono on port 3001) | ✅ |
| 14.3 | Combined dev script (`npm run dev:all`) | ✅ |
| 14.4 | LLM fallback chain (Groq primary → OpenAI fallback) | ✅ |
| 14.5 | Rate-limit UX (fallback + actionable error card + admin banner) | ✅ |
| 14.6 | Vite proxy tuned for SSE (no-buffer headers) | ✅ |
| 14.7 | Layout remount bug fixed (both student + teacher) | ✅ |
| 14.8 | Deployment (pick host, go live) | ❌ — **blocker for pilot** |
| 14.9 | Nightly cron automation | ❌ |
| 14.10 | Generic server error logging (non-LLM) | ❌ |
| 14.11 | PostHog analytics | ❌ |
| 14.12 | Sentry error tracking | ❌ |
| 14.13 | Service worker / offline mode | ❌ |
| 14.14 | Quality metrics dashboard (helpful_rate, flag_rate) | ❌ |

---

## 15. AI QUALITY & EVALUATION

| # | Feature | Status |
|---|---|---|
| 15.1 | Real-time descriptive answer evaluation (`POST /api/ai/evaluate`) | ❌ — 501 stub |
| 15.2 | Automated eval agent (LLM-as-judge scoring every doubt) | 🚫 Phase 2 |
| 15.3 | Fine-tuning pipeline (Llama-3.1-8b on collected data) | 🚫 Phase 3 |
| 15.4 | Hindi support (Qwen-2.5-72B) | 🚫 Phase 2 |
| 15.5 | Pre-built SVG templates for top 30 concepts | 🚫 |
| 15.6 | RAG on worksheet generator | ❌ — quick win |
| 15.7 | RAG on practice MCQ generator | ❌ — quick win |
| 15.8 | Reranker pass on retrieved chunks | ❌ |
| 15.9 | Student diagnosis agent (root-cause across 30+ sessions) | 🚫 Phase 2 |

---

## 16. UI DESIGN SYSTEM

| # | Feature | Status |
|---|---|---|
| 16.1 | v3 UI (teal + coral, DM Sans) — current production | ✅ |
| 16.2 | v4 UI spec (Lexend Deca + vermillion + topbar) | 🚫 rolled back |
| 16.3 | Incremental v4 rollout (one piece at a time) | ❌ post-pilot |

---

## 17. PHASE 2 — INTENTIONALLY DEFERRED

| Feature | Why deferred |
|---|---|
| School onboarding (invite codes, school linkage) | Needs `schools` table + teacher invite flow |
| Teacher concept-catalog tools (mark-as-taught, teaching date, flag) | Only needed at 20+ schools |
| Student diagnosis agent | Needs 30+ sessions of history |
| Adaptive difficulty | Needs concept-tagged question bank |
| Exam readiness score | Needs full catalog |
| Parent dashboard (dedicated) | Currently shares progress screen |
| JEE/NEET track dashboard | Currently shares home |
| Hindi support (Qwen-2.5-72B) | Content + language model work |
| Pre-built SVG templates | All visuals currently LLM-generated |

---

## 18. PRE-PILOT GATE — Code Review & Testing

Must complete before putting Padee in front of real users.

### 18A. End-to-end feature testing (17 flows)
Student signup → onboarding → home → Ask AI (text / photo / from Learn) → Practice → Tests (3 entry points) → Visual → Streak → Admin upload/catalog/recompute → Teacher dashboard / worksheet / mimic / review queue / student profile → Amber alert navigation

### 18B. Structural code review
Security · error handling · memory leaks · N+1 · duplicated code · dead code · config sprawl · type safety · prompt hygiene

### 18C. Operational review
LLM cost audit · rate-limit behavior · DB load · bundle size · Lighthouse · mobile responsiveness · browser compatibility

### 18D. Performance optimization passes
Pre-compute XP totals · DB indexes (flagged_responses, doubt_sessions) · cache teacher dashboard · parallel regeneration in validation

### 18E. Pilot simulation
1 teacher + 3 students, 2 hours, observe silently, interview, punch list

---

## 19. LIVE CLASS (active pending feature)

Teacher-led synchronous session with AI co-pilot. Chat-first, not video. ~2.5–3 days to ship.

| # | Feature | Priority |
|---|---|---|
| 19.1 | Session create + 6-digit code | P0 |
| 19.2 | Student join via code | P0 |
| 19.3 | Push MCQ question → everyone sees in real time | P0 |
| 19.4 | Live response grid (teacher sees who picked what) | P0 |
| 19.5 | Reveal correct answer → pushes to everyone | P0 |
| 19.6 | Roster (who joined / left) | P0 |
| 19.7 | AI explain on demand (streams to all students) | P0 |
| 19.8 | Session end + per-student results | P0 |
| 19.9 | Auto-generate follow-up worksheet from weak questions | P1 |
| 19.10 | Short-answer (text) question support | P1 |
| 19.11 | Push visual explanation (reuse Screen 19) | P1 |
| 19.12 | Anonymous mode (hide names from grid) | P1 |
| 19.13 | Session replay | P2 |
| 19.14 | Breakout rooms | 🚫 |
| 19.15 | Video / audio | 🚫 |
| 19.16 | Private teacher-to-student chat | 🚫 |

**Tech:** Supabase Realtime (no WebRTC, no new infra), new tables `live_sessions` + `live_session_participants` + `live_session_events`, reuse worksheet generator + AI doubt solver + visual explainer.

**Why this, not video:** video is commodity (Zoom/Meet/Teams). AI-in-the-classroom-in-real-time is unique. This is the biggest teacher "why Padee" moment and drives daily use, not weekly.

---

## PROGRESS SUMMARY

| Area | Progress |
|---|---|
| Student side | ~90% Phase 1 complete |
| **Teacher side** | **~90% complete** — live class pending (Section 19) |
| Admin side | ~95% complete |
| Recommendation engine | ~90% |
| Platform / deployment | **0% — no host selected** |
| Observability | LLM-only |
| Code review / testing | **0% — see Section 18** |

---

## RECOMMENDED NEXT SEQUENCE

**Week 1: Pre-pilot gate**
1. E2E testing pass (1 day)
2. Structural + operational code review (1–2 days)
3. Performance fixes from review findings (0.5–1 day)
4. Pilot-sim session with 1 teacher + 3 students (0.5 day)

**Week 2: Ship-ready**
5. Empty-state UI on home for new students (2 hrs)
6. Nightly automated recompute (0.5 day)
7. Generic server error logging (1 day)
8. Deployment — pick host, go live (0.5 day)

**Week 3: High-value differentiator**
9. **Live class feature** (Section 19) — 2.5–3 days, biggest teacher "wow" moment, drives daily classroom use

**Week 4+: Post-pilot learnings**
10. Descriptive answer evaluation (1–2 days)
11. Full Class 8–12 NCERT catalog seed (rolling)
12. RAG for worksheet + practice generators (quick wins, 3 hrs)
13. Student nice-to-haves based on pilot feedback (voice, flashcards, calendar)

---

_End of feature list._
_For detailed technical notes per feature, see `docs/features.md`._
_For running status on build state, see `docs/feature-status.md`._
