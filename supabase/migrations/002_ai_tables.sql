-- ============================================================
-- Migration 002: AI doubt solving + quality control tables
-- doubt_sessions, doubt_feedback, flagged_responses, response_cache
-- ============================================================

-- Doubt sessions: every AI doubt interaction
create table if not exists public.doubt_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  class_level integer not null,
  question_text text not null,
  ai_response text,
  model_used text,
  tokens_used integer,
  cache_hit boolean default false,
  ncert_source text,              -- e.g. "Class 10 Physics, Chapter 12 -- Electricity"
  ncert_confidence real,          -- RAG retrieval similarity score
  session_metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Doubt feedback: thumbs up/down per AI response (Layer 4 quality signal)
create table if not exists public.doubt_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.doubt_sessions(id) on delete set null,
  helpful boolean not null,
  reason text,                    -- 'unclear', 'inaccurate', 'not_ncert', or free text
  created_at timestamptz default now()
);

-- Flagged responses: student reports "incorrect answer" (Layer 5 quality signal)
create table if not exists public.flagged_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.doubt_sessions(id) on delete set null,
  question_text text not null,
  ai_response text not null,
  subject text not null,
  class_level integer not null,
  report_text text,               -- student's description of what's wrong
  status text default 'pending' check (status in ('pending', 'correct', 'wrong', 'partial')),
  teacher_notes text,             -- teacher's correction / explanation
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Semantic response cache: cache AI responses by question embedding
-- Requires pgvector extension (enabled in migration 003)
-- This table is created in 003 after pgvector is enabled

-- Indexes
create index if not exists idx_doubt_sessions_student on public.doubt_sessions(student_id);
create index if not exists idx_doubt_sessions_created on public.doubt_sessions(created_at);
create index if not exists idx_doubt_sessions_subject on public.doubt_sessions(subject, class_level);
create index if not exists idx_doubt_feedback_session on public.doubt_feedback(session_id);
create index if not exists idx_flagged_responses_status on public.flagged_responses(status);
create index if not exists idx_flagged_responses_subject on public.flagged_responses(subject, class_level);
