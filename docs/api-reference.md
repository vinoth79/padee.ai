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

Sets the student's class, subjects, and track after signup.

**Auth**: Bearer token

**Request body**:
```json
{
  "className": 10,
  "subjects": ["Physics", "Chemistry", "Biology", "Mathematics"],
  "track": "school"
}
```

**Response**: `{ "ok": true }`

**Side effects**: Updates `profiles.class_level` and `profiles.active_track`. Deletes existing `student_subjects` rows and inserts new ones.

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

Returns today's doubt count. Phase 1: unlimited (limit: -1 signals no cap).

**Auth**: Bearer token

**Response**: `{ "count": 5, "limit": -1 }`

### POST /api/ai/evaluate

**Status**: 501 Not Implemented (stub for AI evaluation of descriptive answers)

### POST /api/ai/worksheet

**Status**: 501 Not Implemented (stub for worksheet generation)

### POST /api/ai/mimic

**Status**: 501 Not Implemented (stub for CBSE paper mimic)

---

## Admin

All admin endpoints require `X-Admin-Password` header matching `ADMIN_PASSWORD` env var (default: `padee-admin-2026`).

### GET /api/admin/config

Returns the admin-configurable application settings.

**Response**:
```json
{
  "xpRewards": { "textDoubt": 10, "photoDoubt": 10, "practiceSession": 15, "testCompletion": 25, "streakBonus": 5 },
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
