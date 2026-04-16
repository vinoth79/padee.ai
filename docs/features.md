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

**What it does**: After an AI doubt response, students can tap "Quiz me" to get an MCQ based on the concept just explained. Appears inline in the chat.

**Endpoints**: `POST /api/ai/practice`

**Tables read/written**: None for generation. Completion handled by practice/complete.

**LLM model**: Groq `llama-3.1-8b-instant` with `response_format: json_object` (max_tokens: 500, temperature: 0.4)

**Data flow**: Context (AI's last response) + subject -> MCQ system prompt -> Groq JSON response -> validate structure (4 options, valid correctIndex) -> return questions

**Key behaviours**:
- Strict validation: exactly 4 options, correctIndex 0-3, mutually exclusive options
- `count` parameter controls number of questions (default 1 for inline quiz)
- Frontend shows Try another / Done / Close buttons

---

## Practice MCQ Screen (Full Flow)

**What it does**: Dedicated practice screen at `/practice` with multi-question MCQ sessions, progress tracking, and results.

**Endpoints**: `POST /api/ai/practice` (generate), `POST /api/ai/practice/complete` (save results)

**Tables written (on complete)**: `practice_sessions`, `student_xp`, `student_streaks`, `subject_mastery`

**LLM model**: Same as Quiz Me (Groq `llama-3.1-8b-instant`)

**Data flow**:
1. Home screen pre-generates questions in background, stores in localStorage
2. Practice screen reads cache first for instant start
3. Student answers questions with A/B/C/D cards
4. On finish: `POST /api/ai/practice/complete` with results
5. Backend saves `practice_sessions`, awards XP (admin-configurable, default 15), updates streak
6. `subject_mastery` updated with running average: `new_accuracy = (total_correct / total_questions) * 100`
7. Results screen shows accuracy ring, correct/wrong/XP stats

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
| Practice session | 15 | `practice` | `POST /api/ai/practice/complete` |
| Test completion | 25 | `test` | Not yet wired |
| Streak bonus | 5 | `streak` | Once per day when streak >= 2 |

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

## Streak Automation

**How `updateStreak` works** (in `server/routes/ai.ts`):
1. Called after every XP award (doubt, photo doubt, practice complete)
2. Fetch `student_streaks` row for the user
3. If `last_active_date` is already today: no-op (already counted)
4. If `last_active_date` is yesterday: increment `current_streak` by 1
5. If `last_active_date` is null (first activity): set streak to 1
6. If missed a day (any other case): reset streak to 1
7. Update `longest_streak` if new streak exceeds it
8. **Streak bonus**: if new streak >= 2, check if streak XP already awarded today. If not, insert streak bonus XP row (default 5 XP, admin-configurable)

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

## What Remains (Phase 1)

- Test mode (`/tests/active`) -- timed exam with AI insights
- Gamification celebrations -- level-up overlay, badge unlock animation
- Worksheet generator (POST /api/ai/worksheet)
- Worksheet validation agent
- Teacher command centre (currently mock)
- Teacher review queue for flagged responses
- Quality metrics dashboard
- PostHog + Sentry integration
- Deployment to Vercel + Railway
