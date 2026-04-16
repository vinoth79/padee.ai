-- ============================================================
-- Migration 005: Row Level Security policies
-- Backend uses service_role key (bypasses RLS), but these
-- protect against direct Supabase client access from frontend
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.student_subjects enable row level security;
alter table public.student_xp enable row level security;
alter table public.student_streaks enable row level security;
alter table public.doubt_sessions enable row level security;
alter table public.doubt_feedback enable row level security;
alter table public.flagged_responses enable row level security;
alter table public.response_cache enable row level security;
alter table public.ncert_chunks enable row level security;
alter table public.ncert_uploads enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.test_sessions enable row level security;
alter table public.worksheets enable row level security;
alter table public.subject_mastery enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Student subjects: students manage their own
create policy "Students manage own subjects"
  on public.student_subjects for all using (auth.uid() = student_id);

-- XP: students can read their own, insert handled by backend
create policy "Students read own xp"
  on public.student_xp for select using (auth.uid() = student_id);

-- Streaks: students read their own
create policy "Students read own streaks"
  on public.student_streaks for select using (auth.uid() = student_id);

-- Doubt sessions: students read their own
create policy "Students read own doubts"
  on public.doubt_sessions for select using (auth.uid() = student_id);

-- Feedback: students manage their own
create policy "Students manage own feedback"
  on public.doubt_feedback for all using (auth.uid() = student_id);

-- Flagged: students can insert, teachers can read all
create policy "Students can flag responses"
  on public.flagged_responses for insert with check (auth.uid() = student_id);

create policy "Students read own flags"
  on public.flagged_responses for select using (auth.uid() = student_id);

-- NCERT chunks: anyone authenticated can read (needed for frontend RAG display)
create policy "Authenticated users can read ncert chunks"
  on public.ncert_chunks for select using (auth.role() = 'authenticated');

-- NCERT uploads: admin-only via service_role (no frontend policy needed)

-- Response cache: readable by authenticated users
create policy "Authenticated users can read cache"
  on public.response_cache for select using (auth.role() = 'authenticated');

-- Practice: students manage their own
create policy "Students manage own practice"
  on public.practice_sessions for all using (auth.uid() = student_id);

-- Tests: students manage their own
create policy "Students manage own tests"
  on public.test_sessions for all using (auth.uid() = student_id);

-- Worksheets: teachers manage their own
create policy "Teachers manage own worksheets"
  on public.worksheets for all using (auth.uid() = teacher_id);

-- Subject mastery: students read their own
create policy "Students read own mastery"
  on public.subject_mastery for select using (auth.uid() = student_id);
