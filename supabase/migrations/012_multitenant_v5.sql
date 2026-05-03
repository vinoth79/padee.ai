-- ============================================================
-- Migration 012: Multi-tenancy v5 (B2B + parents + Hindi)
-- ============================================================
-- The first schema change since 011 that touches multiple tables. It
-- introduces the multi-tenant foundation Padee.ai needs to graduate from
-- a single-school pilot to a B2B-friendly platform:
--
--   1. `schools` table (multi-tenant root) with self-serve invite codes
--   2. `profiles.school_id` (NULL = B2C / individual user)
--   3. `profiles.tutor_language` ('en' | 'hi') — Hindi tutoring v1
--   4. `teacher_classes` (a teacher can teach multiple classes/sections)
--   5. `parent_student_links` (one parent ↔ many students, M:N)
--   6. Role expansion: + 'school_admin', + 'super_admin'
--   7. RLS hardening: teachers see only their school's students
--
-- Backwards compatibility:
--   - All existing profiles get `school_id = NULL` (B2C grandfathered).
--   - All existing teacher rows get a single teacher_classes row mirroring
--     their current `profiles.class_level` so /api/teacher/students keeps
--     working without any code change on day 1.
--   - `tutor_language` defaults to 'en' so every existing user keeps the
--     same experience until they explicitly switch.
--
-- Operational notes:
--   - Backend uses service_role (bypasses RLS). New policies protect
--     against accidental anon-key access from the frontend; they are
--     defence-in-depth, not the primary access control.
--   - Invite codes are 6-digit numeric strings. Collision rate at 100
--     schools = 0.01% per generation; the UNIQUE constraint catches it
--     and the app retries. No db-level retry loop needed.
-- ============================================================

-- ─── 1. Schools (multi-tenant root) ─────────────────────────────────────
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Two separate codes so a leaked student code doesn't let randoms
  -- self-promote to teacher. Either is regenerable from /school dashboard.
  invite_code_student text unique not null,
  invite_code_teacher text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Free-tier abuse fuses (school_admin can't change; super_admin can).
  -- 500 students keeps Supabase free tier comfortable; 5000 doubts/day
  -- caps LLM spend at roughly $5/school/day worst case.
  max_students integer not null default 500 check (max_students > 0),
  max_doubts_per_day integer not null default 5000 check (max_doubts_per_day > 0)
);

create trigger schools_updated_at
  before update on public.schools
  for each row execute function public.update_updated_at();

create index if not exists idx_schools_invite_student
  on public.schools(invite_code_student);
create index if not exists idx_schools_invite_teacher
  on public.schools(invite_code_teacher);

comment on table public.schools is
  'Multi-tenant root. profiles.school_id NULL = B2C user (no school).';
comment on column public.schools.invite_code_student is
  '6-digit numeric. Students enter at signup or via /onboarding/invite-code.';
comment on column public.schools.invite_code_teacher is
  '6-digit numeric. Teachers enter at signup. Separate from student code so a leaked student code does not let randoms become teachers.';
comment on column public.schools.max_students is
  'Soft cap enforced at /api/auth/redeem-invite. School admin sees current count vs cap on /school dashboard.';
comment on column public.schools.max_doubts_per_day is
  'Soft cap enforced at /api/ai/doubt. Counts doubts across all students in this school in the last 24h IST.';

-- ─── 2. Profile extensions ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists school_id uuid references public.schools(id) on delete set null;

alter table public.profiles
  add column if not exists tutor_language text not null default 'en'
    check (tutor_language in ('en', 'hi'));

create index if not exists idx_profiles_school on public.profiles(school_id);

comment on column public.profiles.school_id is
  'NULL = B2C / individual user. NOT NULL = belongs to a school.';
comment on column public.profiles.tutor_language is
  'Language Pa responds in. UI stays English in v5; only LLM output + TTS voice change.';

-- ─── 3. Role expansion ──────────────────────────────────────────────────
-- Existing CHECK was: role in ('student','teacher','admin').
-- Add: 'parent' (was implicit but never declared), 'school_admin', 'super_admin'.
-- 'admin' stays = legacy ops admin (Vinoth / dev team) for the /admin panel.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'parent', 'admin', 'school_admin', 'super_admin'));

comment on column public.profiles.role is
  'student | teacher | parent | admin (legacy ops) | school_admin (per-school) | super_admin (Padee staff)';

-- ─── 4. Multi-class teachers ────────────────────────────────────────────
-- Today: profiles.class_level is a single int — fine for a teacher who
-- teaches one class. v5 lets a Maths teacher teach Class 9 + 10 + 11.
-- profiles.class_level is kept as the PRIMARY class for back-compat with
-- existing screens (HomeTopNav, settings, etc).
create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_level integer not null check (class_level between 6 and 12),
  primary key (teacher_id, class_level)
);

create index if not exists idx_teacher_classes_class
  on public.teacher_classes(class_level);

-- Backfill: every existing teacher gets one row matching their class_level.
-- (Run-once; the WHERE NOT EXISTS makes it idempotent on re-run.)
insert into public.teacher_classes (teacher_id, class_level)
select p.id, p.class_level
from public.profiles p
where p.role = 'teacher'
  and p.class_level is not null
  and not exists (
    select 1 from public.teacher_classes tc where tc.teacher_id = p.id
  );

comment on table public.teacher_classes is
  'Many-to-many: a teacher can teach multiple class levels. profiles.class_level is the primary/default class for UI display.';

-- ─── 5. Parent ↔ student linkage ────────────────────────────────────────
create table if not exists public.parent_student_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  -- 8-char alphanumeric code parent gives student to confirm the link.
  -- Cleared once verified_at is set (no stale codes lying around).
  link_code text,
  verified_at timestamptz,
  created_at timestamptz default now(),
  primary key (parent_id, student_id),
  -- Prevent self-linking (a student linking themselves as parent)
  check (parent_id <> student_id)
);

create index if not exists idx_psl_parent on public.parent_student_links(parent_id);
create index if not exists idx_psl_student on public.parent_student_links(student_id);
create index if not exists idx_psl_pending on public.parent_student_links(link_code)
  where verified_at is null;

comment on table public.parent_student_links is
  'Many-to-many: one parent can link N students (siblings); two parents can link the same student. verified_at IS NULL = pending student confirmation.';

-- ─── 6. RLS policies ────────────────────────────────────────────────────
-- Backend uses service_role (bypasses all RLS). These policies protect
-- against direct anon-key access from the frontend, e.g. if a teacher's
-- frontend bundle is reverse-engineered to query Supabase directly.
alter table public.schools enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.parent_student_links enable row level security;

-- Schools: members of a school read their own school. Super_admin reads all.
create policy "School members read own school"
  on public.schools for select
  using (
    id in (select school_id from public.profiles where id = auth.uid())
  );

create policy "Super admin reads all schools"
  on public.schools for select
  using (
    exists (
      select 1 from public.profiles
       where id = auth.uid() and role = 'super_admin'
    )
  );

-- teacher_classes: a teacher reads + manages their own rows.
create policy "Teachers manage own class assignments"
  on public.teacher_classes for all
  using (auth.uid() = teacher_id);

-- parent_student_links: parent reads own; student reads links pointing at them.
create policy "Parent reads own links"
  on public.parent_student_links for select
  using (auth.uid() = parent_id);

create policy "Student reads links pointing at them"
  on public.parent_student_links for select
  using (auth.uid() = student_id);

create policy "Parent inserts own links"
  on public.parent_student_links for insert
  with check (auth.uid() = parent_id);

create policy "Student verifies links pointing at them"
  on public.parent_student_links for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Cross-school teacher visibility — defence-in-depth.
-- The existing "Users can read own profile" policy from migration 005
-- restricts a profile read to auth.uid() = id. Add a parallel policy
-- so a teacher can read profiles of students in their own school.
-- (Service-role-bound backend already enforces this; this is anon-key safety.)
drop policy if exists "Teachers read same-school profiles" on public.profiles;
create policy "Teachers read same-school profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles me
       where me.id = auth.uid()
         and me.role in ('teacher', 'school_admin')
         and me.school_id is not null
         and me.school_id = public.profiles.school_id
    )
  );

drop policy if exists "Super admin reads all profiles" on public.profiles;
create policy "Super admin reads all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
       where id = auth.uid() and role = 'super_admin'
    )
  );

-- ─── 7. Helper: invite code generator ───────────────────────────────────
-- Generates a 6-digit numeric code that's unique across both invite_code
-- columns. Loops on collision. Used by /api/school/create and
-- /api/school/regenerate-code in the application layer.
--
-- NB: this is a convenience; the app can equally generate + retry on
-- UNIQUE-violation insert. Provided here so the logic lives in one place.
create or replace function public.generate_school_invite_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  loop
    -- 6-digit code, leading zeros preserved.
    candidate := lpad((floor(random() * 1000000))::int::text, 6, '0');

    if not exists (
      select 1 from public.schools
       where invite_code_student = candidate
          or invite_code_teacher = candidate
    ) then
      return candidate;
    end if;

    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Could not generate unique invite code after 100 attempts';
    end if;
  end loop;
end;
$$;

comment on function public.generate_school_invite_code() is
  'Returns a 6-digit numeric string unique across both invite_code columns. Used by /api/school/create.';
