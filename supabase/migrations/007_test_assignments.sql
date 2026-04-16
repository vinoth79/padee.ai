-- ============================================================
-- Migration 007: Test assignments (teacher-created) + extensions to test_sessions
-- ============================================================

-- Teacher-created test assignments
create table if not exists public.test_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  class_level integer not null,
  question_count integer not null default 10,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  seconds_per_question integer default 60,
  questions jsonb not null default '[]',        -- pre-generated MCQs shared by all students
  deadline timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_test_assignments_class on public.test_assignments(class_level, subject);
create index if not exists idx_test_assignments_teacher on public.test_assignments(teacher_id);
create index if not exists idx_test_assignments_active on public.test_assignments(active, deadline);

-- Extend test_sessions for the new flow
alter table public.test_sessions
  add column if not exists assignment_id uuid references public.test_assignments(id) on delete set null,
  add column if not exists difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  add column if not exists correct_count integer default 0,
  add column if not exists source text default 'self' check (source in ('self', 'ai_recommended', 'teacher'));

create index if not exists idx_test_sessions_assignment on public.test_sessions(assignment_id);

-- RLS
alter table public.test_assignments enable row level security;

-- Students see assignments matching their class_level
drop policy if exists "test_assignments_student_read" on public.test_assignments;
create policy "test_assignments_student_read"
  on public.test_assignments for select
  using (
    active = true
    and class_level = (select class_level from public.profiles where id = auth.uid())
  );

-- Teachers manage their own assignments
drop policy if exists "test_assignments_teacher_manage" on public.test_assignments;
create policy "test_assignments_teacher_manage"
  on public.test_assignments for all
  using (auth.uid() = teacher_id);
