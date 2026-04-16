-- ============================================================
-- Migration 008: Personalised Recommendation Engine (PRD v4.3 Section 8)
--
-- Introduces concept-level knowledge state tracking and the tables that
-- power student home cards + teacher alerts.
--
-- Prerequisites: NOT tracked in Phase 1 (column kept for future).
-- Priority order used: exam_weight → score_gap → recency.
-- ============================================================

-- ═══ 1. concept_catalog ═══
-- Founder/admin-maintained list of concepts. AI-seeded from uploaded NCERT
-- content, reviewed and published by admin.
create table if not exists public.concept_catalog (
  concept_slug        text primary key,                -- e.g. "ch11-ohms-law-application"
  concept_name        text not null,                   -- human-readable
  subject             text not null,
  class_level         integer not null,
  chapter_no          integer not null,
  chapter_name        text not null,
  syllabus_order      integer not null default 0,      -- global position (for "next to learn")
  exam_weight_percent real default 0,                  -- % of chapter marks; admin-editable
  prerequisites       text[] default array[]::text[],  -- unused in Phase 1 (reserved)
  brief_summary       text,                            -- one-liner shown in admin + teacher view
  status              text default 'draft' check (status in ('draft', 'published', 'archived')),
  source              text default 'ai_extracted' check (source in ('ai_extracted', 'admin_manual')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_cc_subject_class on public.concept_catalog(subject, class_level);
create index if not exists idx_cc_chapter on public.concept_catalog(subject, class_level, chapter_no);
create index if not exists idx_cc_status on public.concept_catalog(status);

-- ═══ 2. concept_mastery ═══
-- One row per (student, concept). Operational core of the engine.
-- composite_score = accuracy × 0.5 + recency × 0.3 + consistency × 0.2
create table if not exists public.concept_mastery (
  student_id          uuid not null references public.profiles(id) on delete cascade,
  concept_slug        text not null references public.concept_catalog(concept_slug) on delete cascade,
  attempt_count       integer default 0,
  correct_count       integer default 0,
  -- Score components (all 0-1)
  accuracy_score      real default 0,
  recency_score       real default 0,
  consistency_score   real default 1,   -- 1 = unknown/default
  composite_score     real default 0,
  -- Rolling window of last 5 results for consistency calc (1=correct, 0=wrong)
  last_5_results      integer[] default array[]::integer[],
  -- Timing
  last_practiced_at   timestamptz,
  first_attempted_at  timestamptz default now(),
  updated_at          timestamptz default now(),
  -- Modifiers (do NOT affect composite_score; used for priority tiebreaking)
  doubt_count         integer default 0,
  primary key (student_id, concept_slug)
);

create index if not exists idx_cm_student_score on public.concept_mastery(student_id, composite_score);
create index if not exists idx_cm_concept on public.concept_mastery(concept_slug);

-- ═══ update_concept_mastery() ═══
-- Called after every practice/test answer and every doubt session.
-- Updates accuracy + rolling window + consistency + recency + composite.
create or replace function public.update_concept_mastery(
  p_student_id uuid,
  p_concept_slug text,
  p_correct boolean
) returns void as $$
declare
  v_row public.concept_mastery%rowtype;
  v_new_results integer[];
  v_mean real;
  v_variance real;
  v_stddev real;
  v_recency real := 1.0;  -- just practised = full score
  v_accuracy real;
  v_consistency real := 1.0;
  v_composite real;
begin
  -- Insert or fetch existing row
  insert into public.concept_mastery (student_id, concept_slug, attempt_count, correct_count,
    accuracy_score, recency_score, consistency_score, composite_score,
    last_5_results, last_practiced_at, first_attempted_at, updated_at)
  values (p_student_id, p_concept_slug, 0, 0, 0, 1, 1, 0,
    array[]::integer[], now(), now(), now())
  on conflict (student_id, concept_slug) do nothing;

  select * into v_row from public.concept_mastery
    where student_id = p_student_id and concept_slug = p_concept_slug;

  -- Update counts
  v_row.attempt_count := v_row.attempt_count + 1;
  if p_correct then v_row.correct_count := v_row.correct_count + 1; end if;

  -- Rolling window: append new result, keep last 5
  v_new_results := v_row.last_5_results || (case when p_correct then 1 else 0 end);
  if array_length(v_new_results, 1) > 5 then
    v_new_results := v_new_results[array_length(v_new_results,1)-4:array_length(v_new_results,1)];
  end if;

  -- Accuracy
  v_accuracy := v_row.correct_count::real / greatest(v_row.attempt_count, 1);

  -- Consistency: 1 - stddev(last 5). Only meaningful with >=3 samples.
  if array_length(v_new_results, 1) >= 3 then
    select avg(x) into v_mean from unnest(v_new_results) x;
    select avg((x - v_mean) * (x - v_mean)) into v_variance from unnest(v_new_results) x;
    v_stddev := sqrt(v_variance);
    -- stddev of 0/1 values is at most 0.5, so multiply by 2 to normalise to 0-1
    v_consistency := greatest(0, 1 - (v_stddev * 2));
  end if;

  -- Recency = 1 (just now). Nightly job applies decay.
  v_recency := 1.0;

  -- Composite
  v_composite := (v_accuracy * 0.5) + (v_recency * 0.3) + (v_consistency * 0.2);

  update public.concept_mastery set
    attempt_count = v_row.attempt_count,
    correct_count = v_row.correct_count,
    accuracy_score = v_accuracy,
    recency_score = v_recency,
    consistency_score = v_consistency,
    composite_score = v_composite,
    last_5_results = v_new_results,
    last_practiced_at = now(),
    updated_at = now()
  where student_id = p_student_id and concept_slug = p_concept_slug;
end; $$ language plpgsql;

-- ═══ 3. student_recommendations ═══
-- One row per student. Cached daily + refreshed mid-session.
-- Home screen reads from here — no live LLM call on page open.
create table if not exists public.student_recommendations (
  student_id          uuid primary key references public.profiles(id) on delete cascade,
  -- Hero card
  hero_type           text check (hero_type in ('fix_critical', 'fix_attention', 'revise', 'next_chapter', 'none')),
  hero_concept_slug   text references public.concept_catalog(concept_slug) on delete set null,
  hero_copy           text,           -- AI-generated 1-sentence recommendation
  hero_detail         jsonb default '{}'::jsonb,
  -- Supporting cards: array of { type, concept_slug, concept_name, score, days, copy }
  supporting_cards    jsonb default '[]'::jsonb,
  -- Metadata
  generated_at        timestamptz default now(),
  expires_at          timestamptz,
  acted_on            boolean default false,
  acted_on_at         timestamptz
);

create index if not exists idx_sr_expires on public.student_recommendations(expires_at);

-- ═══ 4. class_concept_health ═══
-- Aggregated per class per concept. Written by the recompute job.
create table if not exists public.class_concept_health (
  class_level         integer not null,
  subject             text not null,
  concept_slug        text not null references public.concept_catalog(concept_slug) on delete cascade,
  students_total      integer default 0,
  students_attempted  integer default 0,
  students_below_50   integer default 0,   -- red alert trigger: >40% of class
  students_below_65   integer default 0,   -- amber watch
  students_above_70   integer default 0,   -- green readiness
  class_avg_score     real default 0,
  last_calculated_at  timestamptz default now(),
  primary key (class_level, subject, concept_slug)
);

create index if not exists idx_cch_class on public.class_concept_health(class_level, subject);

-- ═══ 5. teacher_alerts ═══
-- Pre-generated alerts. Teacher dashboard reads this on load.
create table if not exists public.teacher_alerts (
  id                  uuid primary key default gen_random_uuid(),
  teacher_id          uuid references public.profiles(id) on delete cascade,
  class_level         integer,
  subject             text,
  alert_type          text not null check (alert_type in ('red', 'amber', 'green')),
  alert_key           text,              -- deduplication: e.g. "red:ch11-ohms-law:2026-04-15"
  concept_slug        text references public.concept_catalog(concept_slug) on delete set null,
  student_id          uuid references public.profiles(id) on delete cascade,  -- for amber
  title               text not null,
  message             text not null,
  action_label        text,              -- "Create remedial worksheet"
  action_type         text,              -- "create_test" | "view_student" | "generate_chapter_test"
  action_payload      jsonb default '{}'::jsonb,
  generated_at        timestamptz default now(),
  expires_at          timestamptz,       -- 48h
  dismissed_at        timestamptz,
  acted_on_at         timestamptz
);

create index if not exists idx_ta_teacher_active on public.teacher_alerts(teacher_id, expires_at);
create index if not exists idx_ta_class on public.teacher_alerts(class_level, subject, expires_at);
create unique index if not exists idx_ta_alert_key on public.teacher_alerts(alert_key) where dismissed_at is null;

-- ═══ RLS ═══
alter table public.concept_catalog enable row level security;
alter table public.concept_mastery enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.class_concept_health enable row level security;
alter table public.teacher_alerts enable row level security;

-- Concept catalog: readable by all authenticated users (students see concept names via cards)
drop policy if exists "concept_catalog_read" on public.concept_catalog;
create policy "concept_catalog_read" on public.concept_catalog
  for select using (auth.uid() is not null);

-- Concept mastery: students see own only
drop policy if exists "concept_mastery_student" on public.concept_mastery;
create policy "concept_mastery_student" on public.concept_mastery
  for all using (auth.uid() = student_id);

-- Student recommendations: students see own only
drop policy if exists "student_recommendations_student" on public.student_recommendations;
create policy "student_recommendations_student" on public.student_recommendations
  for select using (auth.uid() = student_id);

-- Class health: teachers see own class only
drop policy if exists "class_concept_health_teacher" on public.class_concept_health;
create policy "class_concept_health_teacher" on public.class_concept_health
  for select using (
    class_level = (select class_level from public.profiles where id = auth.uid())
    or exists(select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
  );

-- Teacher alerts: teacher sees own alerts
drop policy if exists "teacher_alerts_owner" on public.teacher_alerts;
create policy "teacher_alerts_owner" on public.teacher_alerts
  for all using (auth.uid() = teacher_id or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
