-- ============================================================
-- Migration 010: Daily pledge (per-student daily XP target + study days)
-- ============================================================
-- Onboarding step 3 lets each student pledge their daily XP target and which
-- days of the week they'll show up. Without these columns, the home screen
-- would always show the admin-configured global default (50 XP), making the
-- pledge UX a no-op.
--
-- daily_pledge_xp: when NULL, fall back to config.dailyGoal. When set, override.
-- study_days: array of lowercase weekday codes ('mon','tue','wed','thu','fri',
-- 'sat','sun'). NULL = no preference (treated as all 7 days).
-- ============================================================

alter table public.profiles
  add column if not exists daily_pledge_xp integer
    check (daily_pledge_xp is null or daily_pledge_xp between 5 and 500);

alter table public.profiles
  add column if not exists study_days text[]
    check (
      study_days is null or
      study_days <@ array['mon','tue','wed','thu','fri','sat','sun']
    );

comment on column public.profiles.daily_pledge_xp is
  'Per-student daily XP goal pledged at onboarding. Overrides config.dailyGoal when set.';
comment on column public.profiles.study_days is
  'Lowercase weekday codes the student pledged to show up. NULL = all days.';
