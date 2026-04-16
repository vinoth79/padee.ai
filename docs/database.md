# Database Schema

## Overview

15 tables across 6 SQL migrations. All tables have Row Level Security enabled. The backend uses a service role key that bypasses RLS; the frontend Supabase client is restricted by RLS policies.

An auto-profile trigger (`handle_new_user`) fires on every Supabase Auth signup, creating a `profiles` row and a `student_streaks` row automatically.

## Tables

### Core (Migration 001)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **profiles** | `id` (uuid, PK, refs auth.users), `name`, `email`, `class_level` (8-12), `active_track` (school/foundation/ca), `role` (student/teacher/admin), `school_code` | User profile, created on signup |
| **student_subjects** | `student_id`, `subject_code`, unique(student_id, subject_code) | Many-to-many: which subjects a student selected during onboarding |
| **student_xp** | `student_id`, `amount`, `source` (doubt/practice/test/streak/badge/other), `metadata` (jsonb) | XP ledger -- each row is one XP event |
| **student_streaks** | `student_id` (unique), `current_streak`, `longest_streak`, `last_active_date` | One row per student, updated daily by `updateStreak()` |

### AI + Quality (Migration 002)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **doubt_sessions** | `student_id`, `subject`, `class_level`, `question_text`, `ai_response`, `model_used`, `cache_hit`, `ncert_source`, `ncert_confidence`, `session_metadata` (jsonb) | Every AI doubt interaction |
| **doubt_feedback** | `student_id`, `session_id`, `helpful` (boolean), `reason` | Thumbs up/down quality signal |
| **flagged_responses** | `student_id`, `session_id`, `question_text`, `ai_response`, `subject`, `class_level`, `report_text`, `status` (pending/correct/wrong/partial), `teacher_notes`, `reviewed_by` | Student-reported incorrect answers, awaiting teacher review |

### NCERT RAG (Migration 003)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **ncert_chunks** | `subject`, `class_level`, `chapter_number`, `chapter_name`, `content`, `embedding` (vector 1536), `source_pdf`, `chunk_index` | NCERT textbook content chunks with pgvector embeddings for RAG retrieval |
| **response_cache** | `question_text`, `question_embedding` (vector 1536), `subject`, `class_level`, `ai_response`, `model_used`, `hit_count` | Semantic cache for AI responses (both doubt and visual, distinguished by `viz::` prefix) |
| **ncert_uploads** | `subject`, `class_level`, `chapter_number`, `chapter_name`, `filename`, `file_size`, `chunk_count`, `status` (processing/completed/failed), `error_message` | Tracks uploaded PDFs and their processing status |

### Practice + Worksheets (Migration 004)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **practice_sessions** | `student_id`, `subject`, `class_level`, `difficulty`, `total_questions`, `correct_count`, `questions` (jsonb), `completed` | MCQ practice round results |
| **test_sessions** | `student_id`, `title`, `subject`, `class_level`, `total_marks`, `score`, `time_limit_minutes`, `questions` (jsonb), `completed`, `assigned_by` | Timed tests (not yet wired) |
| **worksheets** | `teacher_id`, `title`, `subject`, `class_level`, `mode` (custom/mimic), `total_questions`, `sections` (jsonb), `source_pdf` | Teacher-generated worksheets (not yet wired) |
| **subject_mastery** | `student_id`, `subject`, `accuracy_percent` (0-100), `total_questions`, `correct_answers`, `weak_topics` (jsonb), `strong_topics` (jsonb), unique(student_id, subject) | Running accuracy average per subject, updated by practice/complete |

### RLS Policies (Migration 005)

RLS enabled on all tables. Key policies:
- Users can read/update their own `profiles`
- Students manage their own `student_subjects`, `student_xp`, `student_streaks`
- Students read/insert their own `doubt_sessions`, `doubt_feedback`
- `ncert_chunks` and `ncert_uploads` are read-only for authenticated users
- `response_cache` readable by all authenticated users

### RPC Fix (Migration 006)

Fixes the two RPC functions. See bug explanation below.

## Migration History

| Migration | What it does |
|-----------|-------------|
| **001_core_tables** | Creates `profiles`, `student_subjects`, `student_xp`, `student_streaks` + auto-profile trigger on signup |
| **002_ai_tables** | Creates `doubt_sessions`, `doubt_feedback`, `flagged_responses` + indexes |
| **003_ncert_rag** | Enables pgvector extension, creates `ncert_chunks`, `response_cache`, `ncert_uploads` + RPC functions `search_ncert_chunks` and `search_response_cache` |
| **004_practice_worksheets** | Creates `practice_sessions`, `test_sessions`, `worksheets`, `subject_mastery` |
| **005_rls_policies** | Enables RLS on all 15 tables and creates row-level access policies |
| **006_fix_cache_rpc** | Fixes critical bug in both RPC functions (similarity type cast) |

## RPC Functions

### search_ncert_chunks

```
Parameters:
  query_embedding  vector(1536)  -- the embedded question
  match_subject    text          -- filter by subject
  match_class      integer       -- filter by class level
  match_count      integer       -- max results (default 4)
  match_threshold  real          -- min similarity (default 0.7, backend uses 0.5)

Returns: id, content, subject, class_level, chapter_number, chapter_name, similarity
```

### search_response_cache

```
Parameters:
  query_embedding  vector(1536)  -- the embedded question
  match_subject    text          -- filter by subject
  match_class      integer       -- filter by class level
  match_threshold  real          -- min similarity (default 0.9, backend uses 0.92 for doubts, 0.90 for visuals)

Returns: id, question_text, ai_response, hit_count, similarity
```

## Migration 006 Bug Fix

**The bug**: Migration 003 created both RPC functions with `similarity real` in the return table. However, the PostgreSQL cosine distance expression `1 - (embedding <=> query_embedding)` returns `double precision`, not `real`. This caused the error: "structure of query does not match function result type".

**The impact**: The entire semantic cache silently failed -- every doubt query went through the full LLM pipeline, no cache hits ever occurred.

**The fix**: Migration 006 replaces both functions, adding an explicit `::real` cast on the similarity expression: `(1 - (nc.embedding <=> query_embedding))::real as similarity`.

**Lesson**: Always run migration 006 after 003. Without it, caching is completely broken.
