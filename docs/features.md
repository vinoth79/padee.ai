# Features Deep Dive

## Ask AI (Text Doubt with RAG Pipeline)

**What it does**: Students type a question and receive a streaming AI response grounded in NCERT textbook content. The response uses RAG retrieval, semantic caching, and student memory personalisation.

**Endpoints**: `POST /api/ai/doubt` (streaming SSE)

**Tables read**: `response_cache` (cache lookup), `ncert_chunks` (RAG retrieval), `profiles` (memory), `subject_mastery` (weak areas), `doubt_sessions` (recent questions)

**Tables written**: `doubt_sessions` (save interaction), `student_xp` (award XP), `student_streaks` (update streak), `response_cache` (cache new response)

**LLM model**: Groq `llama-3.3-70b-versatile` (max_tokens: 800, temperature: 0.3)

**Data flow**: Question -> embed (OpenAI) -> cache check (0.92 threshold) -> RAG retrieval (0.5 threshold, top 4 chunks) -> build memory context -> build system prompt -> stream Groq response -> save session -> award 10 XP -> update streak -> cache response (if not personalised) -> send final metadata SSE event

**Key behaviours**:
- Conversation history: last 6 turns sent to LLM for follow-up context
- Subject auto-detected from question keywords on the frontend (no manual selector)
- NCERT source citation shown only when confidence > 0.55
- Memory-aware indicator shown when `memoryUsed: true`
- Daily usage cap removed (Phase 1 is free)
- **LaTeX permitted** — LLM uses `$...$` and `$$...$$`; frontend renders typeset math via KaTeX (`MathText` component). Server-side `validateLatex()` post-stream strips malformed `$` before caching.
- **Listen button** on every AI bubble — Google Cloud TTS (en-IN-Wavenet-D); Pa mascot bobs while audio plays via the global `SpeechContext`. Browser Web Speech API fallback when `GOOGLE_TTS_API_KEY` unset.

---

## Photo Doubt (Vision Model)

**What it does**: Students photograph a textbook page, worksheet, or diagram. The vision model reads the image and responds appropriately based on content type.

**Endpoints**: `POST /api/ai/doubt` (with `imageDataUrl` field)

**Tables written**: `doubt_sessions` (with `session_metadata: { photo: true }`), `student_xp`, `student_streaks`

**LLM model**: Groq `meta-llama/llama-4-scout-17b-16e-instruct` (max_tokens: 900, temperature: 0.3)

**Data flow**: Image (base64) + optional text -> `handleVisionDoubt()` -> build vision system prompt -> stream Groq multimodal response -> save session -> award XP -> update streak

**Key behaviours**:
- Skips cache and RAG entirely (image understanding is per-image)
- Three response cases in the prompt: (A) full problem with given values, (B) diagram/figure, (C) conceptual content
- Prior text-only turns (up to 4) sent as context
- Image data URL is not stored in DB (too large); only `imageBytes` length is recorded

---

## Visual Explanation (HTML/SVG Generation)

**What it does**: Generates interactive, self-contained HTML+SVG visualisations for CBSE concepts. Rendered in a sandboxed iframe with expand-to-fullscreen capability.

**Endpoints**: `POST /api/ai/visual`

**Tables read**: `response_cache` (visual cache lookup, `viz::` prefix)

**Tables written**: `response_cache` (cache new visual)

**LLM model**: OpenAI `gpt-4o` (configurable via `LLM_VISUAL_EXPLAIN`, max_tokens: 2500, temperature: 0.5)

**Data flow**: Concept/context -> check cache (0.90 threshold, `viz::` prefix match) -> generate HTML via GPT-4o -> strip markdown fences -> validate (must contain HTML/SVG elements) -> cache async -> return `{ html, cached }`

**Key behaviours**:
- Cache key format: `viz::question_text::context_text` (prevents collision with doubt cache)
- `force=true` parameter bypasses cache (used by Regenerate button)
- Output must be self-contained: no external resources, no CDNs, no Google Fonts
- SVG must use `viewBox` + `width="100%"` for responsiveness
- Iframe uses `sandbox="allow-scripts"` (no `allow-same-origin`)

---

## Quiz Me (Inline MCQ from Doubt Context)

**What it does**: After an AI doubt response, students can tap "Quiz me" to get an MCQ based on the concept just explained. Appears inline in the chat as an interactive widget — the chip does NOT round-trip through the doubt LLM.

**Component**: `src/components/ask-v4/InlineQuiz.jsx` (rendered inside `PaBubble` when `msg.showQuiz === true`)

**Endpoints**: `POST /api/ai/practice` with `count: 1` and the AI answer as `context`

**LLM model**: Groq `llama-3.3-70b-versatile` with `response_format: json_object` (max_tokens scales with count, temperature: 0.4)

**Data flow**: Context (AI's last response) + subject + className → MCQ system prompt → Groq JSON response → validate structure (4 options, valid correctIndex, balance LaTeX `$` count) → return question + difficulty + hint

**Key behaviours**:
- Strict validation: exactly 4 options, correctIndex 0-3, mutually exclusive options
- KaTeX renders math in question + options (via `MathText` with `inlineOnly`)
- Per-question difficulty + always-visible hint (same shape as the full Practice screen)
- Frontend shows Check answer → correct/wrong feedback + explanation → Try another / Done buttons

---

## Challenge Me (gated-reveal harder problem)

**What it does**: Tapping "Challenge me" on an AI answer asks the LLM for a harder problem with the solution hidden behind a "Show solution" reveal — the student must attempt it before peeking.

**Component**: `src/components/ask-v4/ChallengeView.jsx`

**Endpoint**: `POST /api/ai/doubt` (uses regular doubt streaming, with a structured-format prompt)

**Contract**: LLM is instructed to format the response as:
```
[Problem statement here]

---SOLUTION---

[Step-by-step solution here]
```

**Frontend**: splits on `\n?-{2,}\s*SOLUTION\s*-{2,}\n?` (case-insensitive). Renders the problem; gates the solution behind a Show solution / Hide solution button. If the LLM forgets the marker, falls back to rendering the entire response as plain text (no reveal).

---

## Practice MCQ Screen (Full Flow)

**What it does**: Dedicated practice screen at `/practice` (`PracticeRunScreenV4`) with multi-question MCQ sessions, per-question difficulty + hint + skip, concept-tagged mastery updates, results.

**Entry points**: home Daily Challenge / Weak Spots / Revise. Each passes `{ subject, concept? }` via `onNavigate('practice', ...)`.

**Endpoints**: `POST /api/ai/practice` (generate), `POST /api/ai/practice/complete` (save results)

**Tables written (on complete)**: `practice_sessions`, `student_xp`, `student_streaks`, `subject_mastery`, `concept_mastery` (via `update_concept_mastery()` RPC per question)

**LLM model**: Groq `llama-3.3-70b-versatile` with `response_format: json_object` (token budget scales with count: `max(600, count * 320 + 200)`)

**Data flow**:
1. Home screen pre-generates questions in background, stores in localStorage (versioned cache key — discarded if cached size < requested count)
2. Practice screen reads cache first for instant start; if absent, calls `/api/ai/practice` with `{ subject, count, concept? }`
3. Each returned question carries: `question`, `options[4]`, `correctIndex`, `explanation`, `difficulty` (easy/medium/hard), `hint`, `hint_subtitle`, `concept_slug`
4. Student answers with A/B/C/D cards; per-question Skip button (counts as wrong, 0 XP); always-visible hint box; per-question Report → `flagged_responses`
5. KaTeX renders math in question + options + hint
6. On finish: `POST /api/ai/practice/complete` with answers + per-question difficulty
7. Backend sums XP per CORRECT answer by difficulty (3/6/10 default, admin-configurable in `xpRewards.practiceDifficulty`), updates `subject_mastery` running average, calls `update_concept_mastery()` per question
8. Triggers `recomputeForStudent()` async (non-blocking)
9. Results screen shows accuracy ring, correct/wrong/XP stats, retry / done buttons

---

## NCERT Admin (Upload Pipeline)

**What it does**: Admin uploads NCERT PDF chapters. The system extracts text, chunks it, generates embeddings, and stores in pgvector for RAG retrieval.

**Endpoints**: `POST /api/admin/upload`, `DELETE /api/admin/content/:id`, `POST /api/admin/content/:id/reindex`

**Tables written**: `ncert_uploads` (tracking), `ncert_chunks` (content + embeddings)

**Pipeline**:
1. PDF uploaded via multipart form data
2. `ncert_uploads` row created with status `processing`
3. Background processing: pdf-parse extracts text -> chunk into 800-char pieces with 100-char overlap -> batch embed (20 at a time) via OpenAI `text-embedding-3-small` -> insert into `ncert_chunks`
4. Status updated to `completed` or `failed`

**Re-index**: Deletes existing chunks for the upload, then re-runs the pipeline with a new PDF.

---

## Quality Signals (Feedback + Flagging)

**What it does**: Students provide thumbs up/down feedback and can flag incorrect responses for teacher review.

**Endpoints**: `POST /api/ai/feedback`, `POST /api/ai/flag`

**Tables written**: `doubt_feedback` (helpful boolean + reason), `flagged_responses` (full question + response + report text)

**Data flow**:
- **Feedback**: `{ sessionId, helpful, reason }` -> insert into `doubt_feedback`. Reason can be: `unclear`, `inaccurate`, `not_ncert`, or free text.
- **Flag**: `{ sessionId, questionText, aiResponse, subject, classLevel, reportText }` -> insert into `flagged_responses` with status `pending`. Teacher review queue is not yet built.

---

## Memory Personalisation

**What it does**: Injects student context (name, weak subjects, recent questions) into the LLM system prompt. Detects when the LLM actually uses this context and marks the response accordingly.

**How memory is built** (`buildStudentMemoryWithTokens` in `server/routes/ai.ts`):
1. Fetch profile (name, class, track)
2. Fetch weak subjects from `subject_mastery` where accuracy < 70% (limit 2)
3. Fetch last 3 doubt question texts from `doubt_sessions`
4. Combine into structured text block

**How memory detection works** (`detectMemoryUsage`):
1. Name mention: checks if the student's real name appears in the response (skips generic names like "teststudent")
2. Weak subject + personal phrase: response mentions a weak subject AND contains words like "struggling", "previously", "you asked"
3. Recent topic echo: checks if distinctive words from recent questions appear
4. Personalised opener patterns: regex matching phrases like "Building on what you asked about..." or "Since you recently asked about..."

**Why it matters**: Memory-personalised responses are NOT cached (they are student-specific). The `memoryUsed` flag drives the "Remembering your profile" indicator in the UI.

---

## Home Screen Widgets

**Endpoint**: `GET /api/user/home-data` (single call returns everything)

All data is computed from pure DB queries -- NO LLM calls.

| Widget | How it is computed |
|--------|-------------------|
| **Profile card** | `profiles` table: name, class_level, active_track, avatar (first 2 chars of name) |
| **Total XP** | Sum of all `student_xp.amount` rows for the user |
| **Today's XP** | Sum of `student_xp.amount` where `created_at` starts with today's date |
| **XP breakdown** | Group today's XP rows by `source` field: doubts, practice, test, streak, other |
| **Daily goal progress** | `todayXP / dailyGoal` where dailyGoal comes from admin config (default 50) |
| **Streak** | `student_streaks.current_streak` and `longest_streak` |
| **Subject health** | From `subject_mastery` if available (accuracy, total questions, trend). Fallback: doubt count per subject from `doubt_sessions` |
| **Recent doubts** | Last 5 `doubt_sessions` (id, subject, question_text truncated to 80 chars, created_at) |
| **Today's activity** | Count of today's `doubt_sessions` + `practice_sessions` |
| **Feedback stats** | Count of `doubt_feedback` rows, count where `helpful = true` |
| **Badges** | Evaluated from admin config conditions against badge stats (see Badges section) |
| **Daily challenge** | Subject selected by algorithm (see Daily Challenge section), question count and XP from config |
| **NCERT content** | All completed `ncert_uploads` for the Learn screen |

---

## Badges (Admin-Configurable)

**What it does**: Awards badges based on configurable conditions evaluated against student stats.

**Config location**: `server/config.json` -> `badges` array

**Each badge has**: `id`, `name`, `icon`, `condition` (string like `"doubts >= 10"`)

**Supported condition fields**: `doubts` (total doubt sessions), `photoDoubts` (sessions with photo), `streak` (current streak), `xp` (total XP), `subjects` (distinct subjects asked about)

**Evaluation logic** (`parseBadgeCondition` in `server/routes/user.ts`): Parses `"field >= N"` format, compares against computed `badgeStats` object. Returns list of unlocked badge IDs/names/icons.

**Default badges**:
- First Doubt (doubts >= 1), Curious Mind (doubts >= 10), Snap & Learn (photoDoubts >= 1)
- 3-Day Streak (streak >= 3), 7-Day Streak (streak >= 7)
- Century (xp >= 100), Half K (xp >= 500)
- Subject Explorer (subjects >= 3)

---

## Daily Challenge

**What it does**: Suggests a daily practice challenge with a specific subject, question count, and XP reward.

**Subject selection algorithm** (in `home-data` endpoint):
1. If `preferWeakSubject` is true (default), find the subject with lowest accuracy in `subject_mastery`
2. If no mastery data exists, pick the subject with fewest doubts asked
3. Fallback: first selected subject or "Physics"

**Config**: `server/config.json` -> `dailyChallenge` -> `{ questionCount, xpReward, preferWeakSubject }`

---

## XP System

**All XP award points** (admin-configurable in `server/config.json` -> `xpRewards`):

| Action | Default XP | Source field | Trigger |
|--------|-----------|-------------|---------|
| Text doubt | 10 | `doubt` | After saving doubt session |
| Photo doubt | 10 | `doubt` | After saving photo session (metadata: `{ photo: true }`) |
| Practice — per correct answer (easy) | 3 | `practice` | Sum at `POST /api/ai/practice/complete` |
| Practice — per correct answer (medium) | 6 | `practice` | Sum at `POST /api/ai/practice/complete` |
| Practice — per correct answer (hard) | 10 | `practice` | Sum at `POST /api/ai/practice/complete` |
| Practice — legacy fallback (flat) | 15 | `practice` | Applied only when no per-difficulty math computes a value |
| Test base | 25 | `test` | `POST /api/test/complete` |
| Test bonus (≥80% accuracy) | 20 | `test` | Same endpoint, additive |
| Streak bonus | 5 | `streak` | Once per day, only when streak grew (frozen streaks don't earn this) |

**Level system** (computed in `UserContext.tsx`):

| XP Range | Level | Name |
|----------|-------|------|
| 0-199 | 1 | Beginner |
| 200-499 | 2 | Curious |
| 500-999 | 3 | Learner |
| 1000-1599 | 4 | Explorer |
| 1600-2399 | 5 | Achiever |
| 2400-3499 | 6 | Scholar |
| 3500-4999 | 7 | Advanced |
| 5000-7499 | 8 | Expert |
| 7500-9999 | 9 | Master |
| 10000+ | 10 | Grandmaster |

---

## Streak Automation (pledge-aware, IST-bound)

**How `updateStreak` works** (in `server/routes/ai.ts`):

1. Called after every XP award (doubt, photo doubt, practice complete, test complete).
2. **All day comparisons use IST midnight** (`server/lib/dateIST.ts`) — a 1 AM IST study session correctly counts as the new day, not the previous UTC day.
3. Pull `profiles.study_days` (mig 010) — the array of weekday codes (`mon`..`sun`) the student pledged. NULL → treat all 7 days as pledged (legacy users).
4. **Rest day** (today not in `study_days`) → no-op. Row left alone. The XP / doubt / practice was still logged by the calling endpoint; the streak just doesn't change.
5. **Pledged day** with `last_active_date` already = today → no-op (already counted today).
6. **First-ever pledged-day activity** (no `last_active_date`) → set `current_streak = 1`, `pledged_days_missed = 0`.
7. **Pledged day with no missed pledged days** between `last_active_date` and today → increment `current_streak` by 1, reset `pledged_days_missed` to 0.
8. **Pledged day after missing 1+ pledged days** → **freeze** `current_streak` (NOT reset to 1). Increment `pledged_days_missed` by the count of missed pledged days. Frontend shows the re-plan check-in banner when the counter ≥ 3.
9. Update `longest_streak` if new streak exceeds it.
10. **Streak bonus** (default 5 XP, admin-configurable): only fires when streak actually grew (rule 7), not when frozen (rule 8). Once per day, IST-bound check.

**Re-plan acknowledgement**: when the student dismisses the home re-plan banner ("Got it"), `POST /api/user/replan-acknowledged` resets `pledged_days_missed` to 0 server-side.

**Known follow-up**: `server/routes/test.ts` has its own duplicate `updateStreak()` (called by `/api/test/complete`) that is IST-bound but **not yet pledge-aware**. Unifying the two is a planned cleanup.

---

## Subject Auto-Detection

**What it does**: Frontend detects the subject from the student's question using keyword matching, so the correct subject is sent to the backend for RAG retrieval.

**Implementation**: `detectSubject()` function in `DoubtSolverScreen.jsx`. Uses keyword lists per subject (e.g., "ohm", "circuit", "resistance" -> Physics; "photosynthesis", "mitosis" -> Biology). Defaults to the student's first selected subject if no match.

---

## NCERT Citation

**What it does**: Shows a citation chip below the AI response indicating which NCERT chapter the answer draws from.

**How it works**:
1. During RAG retrieval, the top chunk's `chapter_name`, `chapter_number`, `class_level`, and `subject` are captured
2. Citation format: `"NCERT Class {class_level} {subject}, Chapter {chapter_number} -- {chapter_name}"`
3. **Fallback when chapter_name is missing**: just `"NCERT Class {class_level} {subject}"`
4. Citation only shown when `ncertConfidence > 0.55` (set in the final SSE metadata event)
5. Frontend displays citation as a tappable chip

---

## Voice TTS (Listen button)

**What it does**: Every AI bubble + practice hint + Pa's test debrief has a 🔊 Listen button. Reads the text aloud with a warm Indian English voice. Pa mascot mouth bobs while audio plays.

**Endpoints**: `POST /api/ai/tts`, `GET /api/ai/tts/stats`

**Backends** (tried in order):
1. **Server (Google Cloud TTS)** — when `GOOGLE_TTS_API_KEY` is set. Default voice `en-IN-Wavenet-D` (overridable via `LLM_TTS_VOICE`). Returns raw `audio/mpeg`. In-memory LRU cache (500 entries, keyed by `sha256(text::voice)`). 5000-char per-call cap.
2. **Browser (Web Speech API)** — fallback when server unavailable / 501. Uses `window.speechSynthesis` with `en-IN` voice if installed. Free, on-device, robotic-ish.

**LaTeX handling**: `latexToSpeech()` in `src/lib/latexToSpeech.ts` unparses `$F = mg \sin\theta$` into "F equals m g sine theta" before sending to either backend.

**Single audio source app-wide**: `SpeechContext` provider in `src/context/SpeechContext.jsx`. Starting a new Listen anywhere stops any previously-playing audio. Pa mascots with `syncWithSpeech={true}` subscribe to the speaking state and switch mood/animation accordingly.

---

## Pa's Debrief (Test results)

**What it does**: After a test, the results screen's right-column sticky sidebar shows a multi-paragraph diagnosis from Pa. Structure: assessment with topic stats → misconception correction with mental model + analogy → next-step recommendation.

**Endpoint**: `POST /api/test/complete` (debrief is generated as part of test submission)

**LLM model**: `gpt-4o-mini` (configurable via `LLM_TEST_INSIGHTS`). Llama 3.3-70b is the fallback (flatter prose).

**Prompt structure**:
- Per-topic stats computed server-side from question correctness (aced + slipped lists)
- Wrong-question detail with student's pick + correct answer + explanation
- Strict 3-paragraph output format (~100-130 words total)

**Cost**: ~₹0.05 per debrief at gpt-4o-mini pricing.

**Frontend rendering**: response split on blank lines into paragraphs; per-topic stat chips above the prose; Listen button reads aloud (LaTeX-free unparsed); Pa mascot bobs while audio plays.

---

## Daily Pledge & Re-plan Check-in

**What it does**: At onboarding step 3, students pledge an XP target (15/35/60/100) and which weekdays they'll show up. The home screen goal ring uses their pledge as the daily goal (overrides admin's `config.dailyGoal`). When they miss 3+ pledged days, a soft amber banner appears on home: "Pa wants to check in — let's re-plan your week."

**Tables**: `profiles.daily_pledge_xp` + `profiles.study_days` (mig 010), `student_streaks.pledged_days_missed` (mig 011)

**Endpoints**:
- Set/edit pledge: `POST /api/user/onboarding` (also reused by `/settings`)
- Acknowledge check-in: `POST /api/user/replan-acknowledged` (resets `pledged_days_missed` to 0)

**UI surfaces**:
- Onboarding step 3: pledge XP tile picker + day picker
- Settings (`/settings`): edit pledge + days independently
- Home banner: shown when `streak.pledged_days_missed >= 3`

---

## Settings (`/settings`)

**What it does**: Edit daily pledge, study days, goal track, and subjects after onboarding. Each section saves independently — the partial-update-safe `/api/user/onboarding` endpoint persists only the fields explicitly sent.

**Class + board are read-only** (changing mid-year would invalidate XP/mastery — points to support email).

**Entry points**:
- HomeTopNav user-chip dropdown → "Settings & plan"
- Home re-plan check-in banner → "Re-plan my week" CTA

---

## What Remains (Phase 2 / not built)

- Parent dashboard v4 (`/parent` is currently `Navigate to /home` placeholder)
- Teacher v4 UI rebuild (backend complete; visuals are still v3)
- JEE/NEET/CA tracks (disabled at signup with "Coming soon")
- Class 6-7 support (picker is 8-12 only)
- Real-time descriptive answer evaluation (`POST /api/ai/evaluate` is 501 stub)
- Gamification celebrations (level-up overlay, badge unlock animation)
- Quality metrics dashboard (helpful_rate / flag_rate per subject)
- PostHog + Sentry integration
- Automated nightly cron for recommendation recompute (currently manual admin trigger)
- Parent OTP verification (DPDP-grade) — currently self-attestation
- Deployment to Vercel + Railway
