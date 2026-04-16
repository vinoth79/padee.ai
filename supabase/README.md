# Supabase Migrations

Run these migrations in order in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

## Migration order

| # | File | What it creates |
|---|------|-----------------|
| 1 | `001_core_tables.sql` | profiles, student_subjects, student_xp, student_streaks + auto-profile trigger |
| 2 | `002_ai_tables.sql` | doubt_sessions, doubt_feedback, flagged_responses |
| 3 | `003_ncert_rag.sql` | pgvector extension, ncert_chunks, response_cache, ncert_uploads + search functions |
| 4 | `004_practice_worksheets.sql` | practice_sessions, test_sessions, worksheets, subject_mastery |
| 5 | `005_rls_policies.sql` | Row Level Security on all tables |

## How to run

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste each migration file in order (001 first, then 002, etc.)
4. Click **Run**

## After running migrations

1. Copy your project URL and keys from **Settings > API**
2. Create a `.env` file from `.env.example`:
   ```
   cp .env.example .env
   ```
3. Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Tables overview (14 tables)

- **profiles** -- one per user, auto-created on signup
- **student_subjects** -- which subjects a student selected
- **student_xp** -- XP ledger (append-only)
- **student_streaks** -- current/longest streak per student
- **doubt_sessions** -- every AI doubt interaction
- **doubt_feedback** -- thumbs up/down per response
- **flagged_responses** -- "report incorrect" queue for teacher review
- **ncert_chunks** -- NCERT passages with vector embeddings
- **response_cache** -- cached AI responses by question similarity
- **ncert_uploads** -- tracks which PDFs have been ingested
- **practice_sessions** -- MCQ practice rounds
- **test_sessions** -- timed tests
- **worksheets** -- teacher-generated worksheets
- **subject_mastery** -- per-student per-subject accuracy
