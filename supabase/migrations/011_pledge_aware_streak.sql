-- ============================================================
-- Migration 011: Pledge-aware streak — track missed pledged days
-- ============================================================
-- The Apr 25 onboarding rebrand let students pledge specific days they'd
-- show up (`profiles.study_days`). Migration 010 stored that pledge.
--
-- This migration adds the counter that drives the streak engine's
-- "miss 3 pledged days → Pa checks in to re-plan" promise:
--
--   pledged_days_missed: int, increments when updateStreak() detects the
--   student was absent on one or more pledged days since their last active
--   day. Resets to 0 when they return on a pledged day with no misses
--   in between (i.e. they kept the rhythm, only rest days passed).
--
-- The frontend reads this from /api/user/home-data → streak.pledged_days_missed
-- and surfaces a soft check-in prompt when value >= 3.
-- ============================================================

alter table public.student_streaks
  add column if not exists pledged_days_missed integer not null default 0
    check (pledged_days_missed >= 0);

comment on column public.student_streaks.pledged_days_missed is
  'Consecutive pledged days the student missed since their last on-time return. >=3 triggers a re-plan check-in. Resets to 0 on a clean comeback.';
