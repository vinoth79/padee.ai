-- ============================================================
-- Migration 001: Core tables
-- profiles, student_subjects, student_xp, student_streaks
-- ============================================================

-- Profiles: created automatically when a user signs up (see trigger below)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  class_level integer check (class_level between 8 and 12),
  active_track text default 'school' check (active_track in ('school', 'foundation', 'ca')),
  role text default 'student' check (role in ('student', 'teacher', 'admin')),
  school_code text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Student subject selections (many-to-many)
create table if not exists public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_code text not null,
  created_at timestamptz default now(),
  unique(student_id, subject_code)
);

-- XP ledger: each row is an XP event (doubt solved, practice done, streak bonus, etc.)
create table if not exists public.student_xp (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  source text not null check (source in ('doubt', 'practice', 'test', 'streak', 'badge', 'other')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Streaks: one row per student, updated daily
create table if not exists public.student_streaks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique not null references public.profiles(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_student_subjects_student on public.student_subjects(student_id);
create index if not exists idx_student_xp_student on public.student_xp(student_id);
create index if not exists idx_student_xp_created on public.student_xp(created_at);

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, school_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'school_code'
  );

  -- Also create a streak row
  insert into public.student_streaks (student_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at auto-update
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger streaks_updated_at
  before update on public.student_streaks
  for each row execute function public.update_updated_at();
