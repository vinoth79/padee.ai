-- ============================================================
-- Migration 009: Onboarding extensions
-- ============================================================
-- New onboarding step 1 captures the student's board (CBSE/ICSE/IGCSE/IB/State/Other)
-- so syllabus matching, NCERT content visibility, and AI prompts can scope
-- to the correct curriculum. Phase 1 prompts already reference NCERT/CBSE — this
-- column lets us extend without a backwards-incompatible change.
--
-- Daily-pledge XP and study-days are kept in localStorage for now (no consumer
-- yet); they'll be promoted to DB columns once a feature reads them.
-- ============================================================

alter table public.profiles
  add column if not exists board text
    check (board in ('CBSE', 'ICSE', 'IGCSE', 'IB', 'STATE', 'OTHER'));

-- Backfill existing students with a sensible default — the platform was CBSE-only
-- in Phase 1, so existing rows are CBSE.
update public.profiles set board = 'CBSE' where board is null and role = 'student';

comment on column public.profiles.board is
  'Student curriculum board. NULL for non-students or not-yet-onboarded.';
