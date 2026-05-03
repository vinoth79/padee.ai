# API Reference

Base URL: `http://localhost:3001` (dev) or your Railway deployment URL.

All endpoints except Health and Admin require a `Authorization: Bearer <supabase_jwt>` header.
Admin endpoints require `X-Admin-Password: <password>` header instead.

---

## Health

### GET /api/health

Returns server status. No auth required.

**Response**: `{ "status": "ok", "timestamp": "..." }`

---

## User

### GET /api/user/profile

Returns the authenticated user's profile.

**Auth**: Bearer token

**Response**:
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "class_level": 10,
  "active_track": "school",
  "role": "student",
  "school_code": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### POST /api/user/onboarding

Saves onboarding choices. **Partial-update safe** — only fields explicitly sent are persisted, so `/settings` reuses this endpoint to update one section at a time without nuking the rest.

**Auth**: Bearer token

**Request body** (all fields optional, but at least one needed for the call to do anything):
```json
{
  "className": 10,
  "board": "CBSE",
  "subjects": ["Mathematics", "Science", "English", "Social Studies", "Hindi"],
  "track": "school",
  "dailyPledgeXp": 35,
  "studyDays": ["mon", "tue", "wed", "thu", "fri"]
}
```

**Validation**:
- `board` ∈ {CBSE, ICSE, IGCSE, IB, STATE, OTHER}
- `dailyPledgeXp` ∈ [5, 500]
- `studyDays` filtered to valid weekday codes (mon..sun); empty → NULL

**Response**: `{ "ok": true }`

**Side effects**: Updates `profiles` (only the fields sent). Replaces `student_subjects` rows when `subjects` is sent (otherwise leaves them untouched).

### POST /api/user/replan-acknowledged

Resets `student_streaks.pledged_days_missed` to 0 — called when the student dismisses the home re-plan check-in banner ("Got it"). Idempotent.

**Auth**: Bearer token

**Response**: `{ "ok": true }`

### GET /api/user/home-data

Returns ALL data the home screen needs in a single call. This is the primary data source for the entire student experience.

**Auth**: Bearer token

**Response**:
```json
{
  "profile": { "id": "...", "name": "...", "class_level": 10, "role": "student" },
  "ncertContent": [{ "subject": "Physics", "chapter_number": 1, "chapter_name": "...", "chunk_count": 15, "status": "completed" }],
  "totalXP": 250,
  "todayXP": 30,
  "dailyGoal": 50,
  "xpBreakdown": { "doubts": 20, "practice": 10, "test": 0, "streak": 0, "other": 0 },
  "streak": { "current_streak": 5, "longest_streak": 12 },
  "mastery": [{ "subject": "Physics", "accuracy_percent": 75, "total_questions": 20 }],
  "subjectHealth": [{ "subject": "Physics", "accuracy": 75, "totalQuestions": 20, "trend": "up" }],
  "selectedSubjects": ["Physics", "Chemistry", "Biology", "Mathematics"],
  "recentDoubts": [{ "id": "uuid", "subject": "Physics", "topic": "Explain Ohm's Law...", "createdAt": "timestamp" }],
  "todayActivity": { "doubts": 3, "questions": 5, "tests": 0 },
  "feedbackStats": { "total": 10, "helpful": 8 },
  "badges": [{ "id": "first_doubt", "name": "First Doubt", "icon": "..." }],
  "badgeStats": { "doubts": 15, "photoDoubts": 2, "streak": 5, "xp": 250, "subjects": 3 },
  "dailyChallenge": { "subject": "Chemistry", "questionCount": 3, "xpReward": 30 },
  "weakTopicThreshold": 70
}
```

---

## AI

### POST /api/ai/doubt

The core product endpoint. Returns a streaming SSE response.

**Auth**: Bearer token

**Request body**:
```json
{
  "messages": [{ "role": "user", "content": "Explain Ohm's Law" }],
  "subject": "Physics",
  "className": 10,
  "imageDataUrl": null
}
```

- `messages`: conversation history (last 6 turns recommended). Each has `role` (user/assistant) and `content`.
- `subject`: auto-detected by frontend from question keywords
- `className`: student's class level from UserContext
- `imageDataUrl`: base64 data URI (e.g. `data:image/jpeg;base64,...`). If present, routes to vision model.

**Response**: Server-Sent Events stream.
- Data events: `{ "text": "chunk of response text" }`
- Final metadata event: `{ "sessionId": "uuid", "ncertSource": "NCERT Class 10 Physics, Chapter 12 -- Electricity", "cacheHit": false, "memoryUsed": true }`
- End marker: `[DONE]`
- Error event: `{ "error": "message" }`

### POST /api/ai/visual

Generates a self-contained HTML/SVG visual explanation.

**Auth**: Bearer token

**Request body**:
```json
{
  "concept": "Magnetic field lines",
  "context": "Optional: the AI tutor's previous text response",
  "question": "Optional: the student's original question",
  "subject": "Physics",
  "className": 10,
  "force": false
}
```

- Either `concept` or `context` is required.
- `force: true` bypasses cache (used by the Regenerate button).

**Response**: `{ "html": "<div>...</div>", "cached": false }`

On error: `{ "error": "message", "fallback": true }` (status 500)

### POST /api/ai/practice

Generates MCQ questions.

**Auth**: Bearer token

**Request body**:
```json
{
  "topic": "Ohm's Law",
  "context": "Optional: AI explanation text to base questions on",
  "subject": "Physics",
  "className": 10,
  "count": 1
}
```

- Either `topic` or `context` is required.
- `count`: number of questions to generate (default 1).

**Response**:
```json
{
  "questions": [{
    "question": "What happens to current when resistance doubles?",
    "options": ["Doubles", "Halves", "Stays same", "Quadruples"],
    "correctIndex": 1,
    "explanation": "By Ohm's Law, I = V/R, so doubling R halves I"
  }]
}
```

### POST /api/ai/practice/complete

Saves practice session results, awards XP, and updates subject mastery.

**Auth**: Bearer token

**Request body**:
```json
{
  "subject": "Physics",
  "className": 10,
  "questions": [{ "question": "...", "options": ["..."], "correctIndex": 1, "selected": 1 }],
  "correctCount": 3,
  "totalQuestions": 5
}
```

**Response**: `{ "ok": true, "sessionId": "uuid", "xpAwarded": 15, "accuracy": 60 }`

**Side effects**: Inserts `practice_sessions` row, inserts `student_xp` row, calls `updateStreak()`, upserts `subject_mastery` with running average.

### POST /api/ai/feedback

Submit thumbs up/down on an AI response.

**Auth**: Bearer token

**Request body**: `{ "sessionId": "uuid", "helpful": true, "reason": "unclear" }`

Reason values: `unclear`, `inaccurate`, `not_ncert`, or free text.

**Response**: `{ "ok": true }`

### POST /api/ai/flag

Report an incorrect AI answer for teacher review.

**Auth**: Bearer token

**Request body**:
```json
{
  "sessionId": "uuid",
  "questionText": "...",
  "aiResponse": "...",
  "subject": "Physics",
  "classLevel": 10,
  "reportText": "The formula is wrong"
}
```

**Response**: `{ "ok": true }`

### GET /api/ai/usage

Returns today's doubt count (IST-bound day window). Phase 1: unlimited (limit: -1 signals no cap).

**Auth**: Bearer token

**Response**: `{ "count": 5, "limit": -1 }`

### POST /api/ai/tts

Server proxy to Google Cloud Text-to-Speech. Returns raw `audio/mpeg`. In-memory LRU cache (500 entries, keyed by `sha256(text::voice)`). Cached entries are served immediately with `X-TTS-Cache: hit`. 5000-char per-call cap.

**Auth**: Bearer token

**Request body**:
```json
{
  "text": "Newton's third law states...",
  "voice": "en-IN-Wavenet-D"  // optional, defaults to LLM_TTS_VOICE env var
}
```

**Response (success)**: `audio/mpeg` body. Headers: `X-TTS-Cache: hit | miss`, `Cache-Control: public, max-age=3600`.

**Response (`GOOGLE_TTS_API_KEY` unset)**: 501 with `{ "error": "TTS not configured", "fallbackToBrowser": true }` — frontend `useSpeech` hook falls back to `window.speechSynthesis`.

### GET /api/ai/tts/stats

Cache + cost telemetry. Useful for tracking Google TTS spend.

**Auth**: Bearer token

**Response**:
```json
{
  "cacheEntries": 137,
  "cacheCap": 500,
  "totalCacheHits": 412,
  "totalBytesServed": 9382711,
  "totalCharsBilled": 84210,
  "voice": "en-IN-Wavenet-D",
  "configured": true
}
```

### POST /api/ai/evaluate

**Status**: 501 Not Implemented (stub for AI evaluation of descriptive answers)

### POST /api/ai/worksheet

Generates a structured worksheet from a free-text teacher brief. Optional `validate=true` (default) runs each question through a Llama-8b validator and regenerates flagged ones via gpt-4o-mini.

**Auth**: Bearer token

**Request body**: `{ "prompt": "10 questions on Ohm's Law for Class 10, mixed difficulty", "validate": true }`

**Response**: `{ "worksheet": { ...structured sections... }, "validationStats": { "total": 10, "regenerated": 1 } }`

### POST /api/ai/mimic

CBSE Paper Mimic — upload a past paper PDF, infer structure, generate a fresh paper of the same shape.

### POST /api/ai/worksheet/save | GET /api/ai/worksheet/list | GET /api/ai/worksheet/:id

Teacher worksheet library — save, list, and fetch saved worksheets (teacher-scoped). All bearer-auth.

---

## Test mode

### GET /api/test/list

Returns the student's available tests (teacher-assigned upcoming, completed history) + AI recommendation. **Auth**: Bearer.

**Response**:
```json
{
  "classLevel": 10,
  "selectedSubjects": ["Physics", "Chemistry", "Biology"],
  "aiRecommendation": { "subject": "Physics", "questionCount": 10, "difficulty": "easy", "reason": "Your Physics accuracy is 43%..." },
  "assignments": [{ "id": "...", "title": "...", "subject": "Physics", "question_count": 10, "difficulty": "medium", "deadline": "...", "completed": false }],
  "completedTests": [{ "id": "...", "title": "...", "score": 7, "total_marks": 10, "completed_at": "..." }]
}
```

### POST /api/test/start

Starts a timed test session. Returns questions + total seconds. **Auth**: Bearer.

**Request body** (one of three modes):
- `{ mode: 'teacher', assignmentId: '...' }` — assignment-driven (questions come from the assignment row)
- `{ mode: 'self', subject, classLevel, questionCount, difficulty }` — student-picked, generates fresh questions
- `{ mode: 'ai_recommended', subject, classLevel, questionCount, difficulty }` — Pa-recommended

**Response**: `{ mode, title, subject, classLevel, difficulty, questions, secondsPerQuestion, totalSeconds, assignmentId? }`

### POST /api/test/complete

Submits answers, scores, awards XP, generates Pa's Debrief. **Auth**: Bearer.

**Request body**: `{ mode, subject, classLevel, difficulty, title, assignmentId?, questions, answers, timeTakenSeconds }`

**Response**: `{ sessionId, accuracy, correctCount, totalQuestions, xpAwarded, bonusAwarded, aiInsights: { summary, topicStats[], weakTopics[] }, questions }`

**Side effects**: writes `test_sessions` row, awards XP via `student_xp`, updates `subject_mastery`, calls `update_concept_mastery()` per question, triggers `recomputeForStudent()` async.

### GET /api/test/session/:id

Returns a completed session for review. **Auth**: Bearer.

### POST /api/test/assign | GET /api/test/assignments | POST /api/test/assignments/:id/deactivate | POST /api/test/assign/preview

Teacher-side endpoints for assigning tests to a class. All teacher-role gated.

---

## Recommendations

### GET /api/recommendations/today

Returns the student's cached daily recommendation (Boss Quest hero + supporting cards). **Auth**: Bearer.

**Response**: `{ hero_type, hero_concept_slug, hero_copy, hero_detail, supporting_cards }`. Hero types: `fix_critical | fix_attention | revise | next_chapter | none`.

### POST /api/recommendations/acted-on

Marks today's recommendation as acted-on (won't re-surface). **Auth**: Bearer.

### POST /api/recommendations/recompute

Admin-only. Triggers `recomputeAll()` — recomputes recommendations for every active student, aggregates class concept health, writes teacher alerts. Use the `X-Admin-Password` header OR a teacher/admin Bearer token.

---

## Teacher

All endpoints below are teacher-role gated.

### GET /api/teacher/dashboard

Top stats + concept hotspots + recent activity for the command-centre dashboard.

### GET /api/teacher/alerts | POST /api/teacher/alerts/:id/dismiss | POST /api/teacher/alerts/:id/acted-on

Real-time alert feed (red/amber/green) — read, dismiss, mark acted-on.

### GET /api/teacher/students | GET /api/teacher/student/:id

Class roster + individual student profile (mastery, weak concepts, recent activity).

### GET /api/teacher/review-queue | POST /api/teacher/review/:id

Flagged-response review queue for triaging student reports.

---

## Concept catalog (admin)

### POST /api/concepts/extract | GET /api/concepts/list | PATCH /api/concepts/:slug | POST /api/concepts/:slug/publish | POST /api/concepts/bulk-publish | DELETE /api/concepts/:slug | POST /api/concepts/manual

Concept catalog CRUD + AI extraction from NCERT chapters. Either `X-Admin-Password` header (admin panel) OR Bearer token with `role=admin/teacher`.

---

## Admin

All admin endpoints require `X-Admin-Password` header matching `ADMIN_PASSWORD` env var (default: `padee-admin-2026`).

### GET /api/admin/config

Returns the admin-configurable application settings.

**Response**:
```json
{
  "xpRewards": {
    "textDoubt": 10,
    "photoDoubt": 10,
    "practiceSession": 15,
    "practiceDifficulty": { "easy": 3, "medium": 6, "hard": 10 },
    "practiceHintPenalty": 2,
    "testCompletion": 25,
    "streakBonus": 5
  },
  "dailyGoal": 50,
  "dailyChallenge": { "questionCount": 3, "xpReward": 30, "preferWeakSubject": true },
  "badges": [{ "id": "first_doubt", "name": "First Doubt", "icon": "...", "condition": "doubts >= 1" }],
  "weakTopicThreshold": 70
}
```

### PUT /api/admin/config

Overwrites the entire config. Send the complete config object (partial updates are not supported).

**Request body**: Same shape as GET response.

**Response**: `{ "ok": true }`

### GET /api/admin/content

Lists all NCERT uploads with total chunk count.

**Response**: `{ "uploads": [{ "id": "...", "subject": "Physics", "chapter_name": "Electricity", "status": "completed", "chunk_count": 15 }], "totalChunks": 150 }`

### POST /api/admin/upload

Upload and process an NCERT PDF. Processing happens in the background.

**Content-Type**: `multipart/form-data`

**Fields**:
- `pdf` (file, required)
- `subject` (string, required)
- `classLevel` (number, required)
- `chapterNumber` (number, optional)
- `chapterName` (string, optional)

**Response**: `{ "upload": { "id": "...", "status": "processing" }, "message": "Processing started" }`

### DELETE /api/admin/content/:id

Deletes an upload record and all associated chunks from `ncert_chunks`.

**Response**: `{ "ok": true }`

### POST /api/admin/content/:id/reindex

Deletes existing chunks for this upload and re-processes with a new PDF.

**Content-Type**: `multipart/form-data`

**Fields**: `pdf` (file, required)

**Response**: `{ "ok": true, "message": "Re-indexing started" }`

### GET /api/admin/llm-log

Returns recent LLM call audit entries from the in-memory ring buffer.

**Query params**:
- `limit` (number, default 50)
- `endpoint` (string, filter by: doubt, visual, practice, evaluate, worksheet)

**Response**: `{ "calls": [{ "timestamp": "...", "endpoint": "doubt", "userId": "...", "model": "...", "latencyMs": 450, "cacheHit": false, "ncertChunksUsed": 3, ... }] }`

### GET /api/admin/users

Lists all users with aggregated stats.

**Response**:
```json
{
  "users": [{
    "id": "uuid",
    "name": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "class_level": 10,
    "totalXP": 250,
    "totalDoubts": 15,
    "currentStreak": 5,
    "created_at": "timestamp"
  }]
}
```

### POST /api/admin/set-role

Change a user's role by email.

**Request body**: `{ "email": "user@example.com", "role": "teacher" }`

Valid roles: `student`, `teacher`, `parent`, `admin`

**Response**: `{ "ok": true, "profile": { "id": "...", "email": "...", "role": "teacher" } }`

### GET /api/admin/upload/:id/status

Check processing status of a specific upload.

**Response**: Full `ncert_uploads` row or `{ "error": "Not found" }`
