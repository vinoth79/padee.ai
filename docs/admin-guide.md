# Admin Guide

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. Enter the admin password (default: `padee-admin-2026`, configurable via `ADMIN_PASSWORD` env var)
3. The panel has 5 tabs: **NCERT Content**, **LLM Audit**, **Concept Catalog**, **Users**, **Config**

---

## NCERT Content Tab

### Uploading Content

1. Click the "Upload PDF" button
2. Fill in the form:
   - **Subject**: e.g. Physics, Chemistry, Biology, Mathematics
   - **Class Level**: 8-12
   - **Chapter Number**: optional but recommended for citation
   - **Chapter Name**: optional but recommended for citation
   - **PDF File**: select the NCERT chapter PDF
3. Click Upload. Processing starts in the background.
4. The status column shows `processing` -> `completed` or `failed`

**What happens behind the scenes**:
- PDF text extracted via `pdf-parse`
- Text split into 800-character chunks with 100-character overlap
- Each chunk embedded via OpenAI `text-embedding-3-small` (batches of 20)
- Chunks + embeddings stored in `ncert_chunks` table

### Re-indexing Content

Use when the original PDF was updated or embeddings need regeneration.

1. Find the upload row in the content list
2. Click "Re-index"
3. Upload the new PDF
4. Existing chunks are deleted and the pipeline runs again

### Deleting Content

1. Find the upload row
2. Click "Delete"
3. Both the `ncert_uploads` record and all associated `ncert_chunks` are removed

---

## LLM Audit Tab

Every LLM call is logged. This tab shows recent calls from the in-memory ring buffer (last 500 entries, also persisted to `logs/llm-calls.jsonl`).

### Fields

| Field | Meaning |
|-------|---------|
| **Timestamp** | When the call was made |
| **Endpoint** | Which API route: `doubt`, `visual`, `practice` |
| **Model** | LLM model used (e.g. `groq/llama-3.3-70b-versatile`, `gpt-4o`, `cache`) |
| **User ID** | The Supabase auth user ID |
| **Latency** | Round-trip time in milliseconds (0 for cache hits) |
| **Cache Hit** | Whether the response came from semantic cache |
| **NCERT Chunks** | Number of RAG chunks retrieved (0 for vision/practice) |
| **NCERT Source** | Citation string if RAG was used |

### Filtering

- Use the endpoint dropdown to filter by `doubt`, `visual`, or `practice`
- The list auto-refreshes every 3 seconds

### Expanding a Row

Click any row to see:
- **Full system prompt** sent to the LLM
- **All messages** (conversation history)
- **Full response** text
- **Metadata** (subject, className, memory tokens, etc.)

### Spotting Issues

- **High latency** (>5s): model may be overloaded or prompt too long
- **Cache hit rate near 0%**: check that migration 006 has been applied
- **Repeated similar questions with no cache hits**: embedding quality issue or threshold too high
- **Memory-personalised responses**: these are intentionally not cached

---

## Concept Catalog Tab

The CBSE syllabus represented as a flat list of concepts. Each concept maps to a chapter and has an `exam_weight_percent`, a `brief_summary`, and a `status` (draft / published / archived).

### How concepts get added

Three paths:

1. **Auto-extract on NCERT upload** (most common) — when a chapter PDF is uploaded, after pdf-parse + embeddings succeed, `extractConceptsFromChapter()` calls GPT-4o on the chapter chunks and inserts concepts as `draft`. Admin sees them on this tab.
2. **Re-extract** — re-run the AI extraction for a chapter (uses the existing chunks, no PDF re-upload needed).
3. **Manual** — type a concept directly via the "+" button at the chapter level.

### Lifecycle

- **draft** — visible only to admin. Doesn't drive recommendations.
- **published** — used by the recommendation engine + practice/test concept tagging.
- **archived** — soft-deleted (kept if any students have `concept_mastery` rows referencing it).

### Editing a concept

Click the concept row → inline edit name, exam_weight_percent (0-100), brief_summary. Save.

### Bulk publish

At the chapter level, "Publish all drafts" promotes every draft in that chapter to published.

### Recompute recommendations

Top of the tab: "Recompute recommendations" button. Triggers `POST /api/recommendations/recompute` which:
- Recalculates `composite_score` for every active student's concepts (recency decay applied)
- Picks each student's hero concept (priority: exam_weight → score_gap → recency)
- Generates hero copy via gpt-4o-mini, caches to `student_recommendations`
- Aggregates `class_concept_health`, writes red/amber/green `teacher_alerts`

Use this after major changes (new chapter published, exam_weights edited). Phase 2 will move this to a Railway scheduled job.

---

## Users Tab

Displays all registered users with:
- Name, email, role, class level, active track
- Total XP, total doubts asked, current streak
- Account creation date

### Changing a User's Role

1. Find the user's email
2. Use the "Set Role" feature (or API: `POST /api/admin/set-role`)
3. Valid roles: `student` (default), `teacher`, `parent`, `admin`

**When to change roles**:
- Promote a user to `teacher` so they can access `/teacher` dashboard
- Set `parent` role for parent summary view at `/parent`
- All new signups default to `student`

---

## Config Tab

Admin-configurable settings stored in `server/config.json`. Changes take effect immediately (in-memory cache is updated).

### XP Rewards

| Setting | Default | Description |
|---------|---------|-------------|
| `xpRewards.textDoubt` | 10 | XP awarded per text doubt |
| `xpRewards.photoDoubt` | 10 | XP awarded per photo doubt |
| `xpRewards.practiceSession` | 15 | Legacy flat reward — still applied as fallback when no per-difficulty math computes a value |
| `xpRewards.practiceDifficulty.easy` | 3 | XP per CORRECT answer at easy difficulty |
| `xpRewards.practiceDifficulty.medium` | 6 | XP per correct answer at medium |
| `xpRewards.practiceDifficulty.hard` | 10 | XP per correct answer at hard |
| `xpRewards.practiceHintPenalty` | 2 | Currently unused (hints are free in v4); reserved for "Show hint (-2 XP)" UX if you ever switch hints to opt-in |
| `xpRewards.testCompletion` | 25 | Test base XP |
| `xpRewards.streakBonus` | 5 | Bonus XP awarded once per day when streak >= 2 (only fires when streak grew, not when frozen) |

### Daily Goal

| Setting | Default | Description |
|---------|---------|-------------|
| `dailyGoal` | 50 | XP target shown on home screen progress ring |

### Daily Challenge

| Setting | Default | Description |
|---------|---------|-------------|
| `dailyChallenge.questionCount` | 3 | MCQs in the daily challenge |
| `dailyChallenge.xpReward` | 30 | XP for completing the challenge |
| `dailyChallenge.preferWeakSubject` | true | Pick the student's weakest subject |

### Badges

Each badge in the `badges` array has:
- `id`: unique identifier (e.g. `"first_doubt"`)
- `name`: display name (e.g. `"First Doubt"`)
- `icon`: emoji or icon string
- `condition`: evaluation expression in format `"field >= N"`

**Adding a badge**: Add a new object to the `badges` array with the fields above.

**Editing a badge**: Modify the existing object (change name, icon, or condition threshold).

**Removing a badge**: Remove the object from the array.

**Supported condition fields**: `doubts`, `photoDoubts`, `streak`, `xp`, `subjects`

**Example**: `{ "id": "streak_30", "name": "Monthly Warrior", "icon": "...", "condition": "streak >= 30" }`

### Weak Topic Threshold

| Setting | Default | Description |
|---------|---------|-------------|
| `weakTopicThreshold` | 70 | Subjects below this accuracy % are flagged as weak |

---

## Common Admin Tasks

### Creating a Teacher Account

1. Ask the teacher to sign up at `/login` (creates a student account by default)
2. Go to Admin panel -> Users tab
3. Set their role to `teacher` using their email
4. They can now access `/teacher` after logging in

### Creating a Parent Account

Same process as teacher, but set role to `parent`. They will be routed to `/parent`.

### Creating a Test Student Account

1. Sign up with a test email (e.g. `teststudent@padee.ai`)
2. Use password `TestPass123!` (or any strong password)
3. Complete onboarding (class, subjects, track)
4. The existing test account is `teststudent@padee.ai` / `TestPass123!`
