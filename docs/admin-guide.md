# Admin Guide

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. Enter the admin password (default: `padee-admin-2026`, configurable via `ADMIN_PASSWORD` env var)
3. The panel has 4 tabs: NCERT Content, LLM Audit, Users, Config

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
| `xpRewards.practiceSession` | 15 | XP awarded on practice completion |
| `xpRewards.testCompletion` | 25 | XP for test completion (not yet wired) |
| `xpRewards.streakBonus` | 5 | Bonus XP per day when streak >= 2 |

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
