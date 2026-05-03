# Database Schema

## Overview

20 tables across 11 SQL migrations. All tables have Row Level Security enabled. The backend uses a service role key that bypasses RLS; the frontend Supabase client is restricted by RLS policies.

An auto-profile trigger (`handle_new_user`) fires on every Supabase Auth signup, creating a `profiles` row and a `student_streaks` row automatically.

## Tables

### Core (Migration 001 + extensions)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **profiles** | `id` (uuid, PK, refs auth.users), `name`, `email`, `class_level` (8-12), `active_track` (school/jee/neet/ca), `role` (student/teacher/parent/admin), `school_code`, **`board`** (CBSE/ICSE/IGCSE/IB/STATE/OTHER, mig 009), **`daily_pledge_xp`** (int, mig 010), **`study_days`** (text[] of mon..sun, mig 010) | User profile, created on signup |
| **student_subjects** | `student_id`, `subject_code`, unique(student_id, subject_code) | Many-to-many: which subjects a student selected during onboarding |
| **student_xp** | `student_id`, `amount`, `source` (doubt/practice/test/streak/badge/other), `metadata` (jsonb) | XP ledger — each row is one XP event |
| **student_streaks** | `student_id` (unique), `current_streak`, `longest_streak`, `last_active_date`, **`pledged_days_missed`** (int, mig 011) | One row per student, updated by IST-aware pledge-aware `updateStreak()` |

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

### Test assignments (Migration 007)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **test_assignments** | `id`, `teacher_id`, `class_level`, `title`, `subject`, `question_count`, `difficulty`, `seconds_per_question`, `deadline`, `questions` (jsonb), `active` | Teacher-created tests assigned to a class |
| **test_sessions** (extended) | + `assignment_id` (refs test_assignments), `correct_count`, `source` ('teacher'/'self'/'ai_recommended') | Existing table extended for the 3 test types |

### Recommendation engine (Migration 008)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **concept_catalog** | `concept_slug` (PK), `subject`, `class_level`, `chapter_no`, `chapter_name`, `concept_name`, `syllabus_order`, `exam_weight_percent`, `brief_summary`, `status` (draft/published/archived) | CBSE syllabus as a flat concept list. Auto-extracted from NCERT uploads via GPT-4o, admin reviews and publishes. |
| **concept_mastery** | `student_id`, `concept_slug`, `accuracy_score`, `recency_score`, `consistency_score`, `composite_score`, `attempt_count`, `correct_count`, `doubt_count`, `last_practiced_at`, unique(student_id, concept_slug) | Per-student per-concept knowledge state. Updated by `update_concept_mastery()` RPC after every practice/test attempt. |
| **student_recommendations** | `student_id` (unique), `hero_type` (fix_critical/fix_attention/revise/next_chapter/none), `hero_concept_slug`, `hero_copy`, `hero_detail` (jsonb), `supporting_cards` (jsonb), `generated_at`, `expires_at`, `acted_on` | Cached daily hero card per student. Generated by `recomputeForStudent()`. |
| **class_concept_health** | `class_level`, `concept_slug`, `attempt_count`, `correct_count`, `student_count`, `avg_score` | Aggregated per-concept stats for teacher alerts. |
| **teacher_alerts** | `teacher_id`, `class_level`, `concept_slug`, `severity` (red/amber/green), `count`, `description`, `expires_at`, `dismissed_at`, `acted_on_at` | Pre-generated teacher alerts (red >40% below 0.5, amber inactive student with upcoming test, green >80% above 0.7). |

### Onboarding extensions (Migrations 009 + 010)

Add columns to `profiles`:
- **`board`** (text, mig 009) — CBSE/ICSE/IGCSE/IB/STATE/OTHER. Used for syllabus matching, NCERT content scoping, AI prompt scoping.
- **`daily_pledge_xp`** (int, mig 010) — per-student XP goal. Overrides `config.dailyGoal` when set.
- **`study_days`** (text[], mig 010) — pledged weekday codes (mon..sun). NULL = all days.

### Pledge-aware streak (Migration 011)

Adds **`pledged_days_missed`** (int, default 0) to `student_streaks`. The pledge-aware `updateStreak()` increments this when the student returns on a pledged day after missing pledged days; resets to 0 on a clean comeback. Drives the home screen "miss 3 → re-plan check-in" prompt.

## Migration History

| Migration | What it does |
|-----------|-------------|
| **001_core_tables** | Creates `profiles`, `student_subjects`, `student_xp`, `student_streaks` + auto-profile trigger on signup |
| **002_ai_tables** | Creates `doubt_sessions`, `doubt_feedback`, `flagged_responses` + indexes |
| **003_ncert_rag** | Enables pgvector extension, creates `ncert_chunks`, `response_cache`, `ncert_uploads` + RPC functions `search_ncert_chunks` and `search_response_cache` |
| **004_practice_worksheets** | Creates `practice_sessions`, `test_sessions`, `worksheets`, `subject_mastery` |
| **005_rls_policies** | Enables RLS on all tables and creates row-level access policies |
| **006_fix_cache_rpc** | Fixes critical bug in both RPC functions (similarity type cast) |
| **007_test_assignments** | Adds `test_assignments` table + extends `test_sessions` (assignment_id, correct_count, source) |
| **008_recommendation_engine** | Adds `concept_catalog`, `concept_mastery`, `student_recommendations`, `class_concept_health`, `teacher_alerts` + `update_concept_mastery()` RPC |
| **009_profile_onboarding_extensions** | Adds `profiles.board` with CHECK constraint |
| **010_daily_pledge** | Adds `profiles.daily_pledge_xp` + `profiles.study_days` (per-student goal override + pledged weekdays) |
| **011_pledge_aware_streak** | Adds `student_streaks.pledged_days_missed` counter |

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

## Critical migrations to apply

If you spin up a fresh Supabase project, run all 11 in order. The platform won't function correctly without:

- **006** — semantic cache silently fails without the type cast.
- **009** — onboarding step 1 writes `board`; absent column → 500.
- **010** — onboarding step 3 writes `daily_pledge_xp` and `study_days`; absent → 500.
- **011** — pledge-aware streak engine writes `pledged_days_missed`; absent → 500 on every XP award.

The migrations are all idempotent (`add column if not exists` / `create table if not exists`), so re-running is safe.
