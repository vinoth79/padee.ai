-- ============================================================
-- Migration 013: Hindi-as-a-subject native NCERT support (Sprint 3 / F6b)
-- ============================================================
-- Goal:
--   Let `ncert_chunks` hold both English-medium chunks (default) and
--   Hindi-medium chunks (for CBSE Hindi as a subject: Vasant, Sparsh,
--   Kshitij, Aroh, etc.). RAG retrieval then filters by tutor_language
--   so a Hindi-medium student studying Hindi gets answers grounded in
--   the actual Hindi NCERT textbook — not an English-translated chunk.
--
-- Backwards compatibility:
--   - Existing rows backfill to `language = 'en'` (default + NOT NULL).
--   - `search_ncert_chunks(...)` gets a new optional `match_language`
--     parameter defaulting to 'en' — existing callers don't break.
--   - The single old function signature is dropped and recreated rather
--     than overloaded so the planner picks unambiguously.
--
-- New in this migration:
--   1. ncert_chunks.language    (text, NOT NULL, default 'en', CHECK in/'en'/'hi')
--   2. idx_ncert_chunks_lang_subject_class composite index
--   3. search_ncert_chunks() recreated with match_language param
--   4. response_cache.language (same shape; PRD originally proposed a string
--      suffix hack, but response_cache is embedding-keyed not string-keyed —
--      a real column is the correct contract for cross-language cache
--      separation)
--   5. search_response_cache() recreated with match_language param
-- ============================================================

-- ─── 1. Add language column ────────────────────────────────────────────
-- New rows: language is set by the chunker at ingest time.
-- Existing rows: backfilled to 'en' via the column default.
alter table public.ncert_chunks
  add column if not exists language text not null default 'en'
    check (language in ('en', 'hi'));

comment on column public.ncert_chunks.language is
  'Source language of the chunk content. en = English NCERT books (default — Sci/Maths/CS/SS/English). hi = native Hindi NCERT books (Hindi as a subject — Vasant, Sparsh, Kshitij, Aroh, etc.). RAG retrieval filters by this when tutor_language matches.';

-- ─── 2. Composite index for language-aware RAG ─────────────────────────
-- The retrieval path is (language, subject, class_level) → ANN over embedding.
-- The pre-filter on the first three narrows the vector scan substantially.
create index if not exists idx_ncert_chunks_lang_subject_class
  on public.ncert_chunks (language, subject, class_level);

-- ─── 3. Recreate search_ncert_chunks with language filter ──────────────
-- Drop the old single-language signature first so the new one is unambiguous.
-- We preserve migration 006's ::real cast on similarity (was a real bug —
-- without the cast the RPC silently returns zero rows due to a type mismatch).
drop function if exists public.search_ncert_chunks(
  extensions.vector(1536), text, integer, integer, real
);

create or replace function public.search_ncert_chunks(
  query_embedding extensions.vector(1536),
  match_subject text,
  match_class integer,
  match_count integer default 4,
  match_threshold real default 0.7,
  match_language text default 'en'   -- new in 013; defaults preserve old behaviour
)
returns table (
  id uuid,
  content text,
  subject text,
  class_level integer,
  chapter_number integer,
  chapter_name text,
  language text,            -- exposed so the route can cite "Hindi NCERT" vs "English NCERT"
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    nc.id,
    nc.content,
    nc.subject,
    nc.class_level,
    nc.chapter_number,
    nc.chapter_name,
    nc.language,
    (1 - (nc.embedding <=> query_embedding))::real as similarity   -- ::real preserved from migration 006
  from public.ncert_chunks nc
  where nc.subject = match_subject
    and nc.class_level = match_class
    and nc.language = match_language
    and 1 - (nc.embedding <=> query_embedding) > match_threshold
  order by nc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ─── 4. response_cache.language column ─────────────────────────────────
-- The semantic cache is embedding-keyed (not string-keyed), so the PRD's
-- proposed `::lang::hi` key suffix doesn't apply — we need a real column
-- so the RPC can filter cache rows by the caller's tutor_language. Without
-- this, a Hindi question that happens to embed near an English cache row
-- (at the 0.92 similarity threshold) would serve an English response to a
-- Hindi user.
alter table public.response_cache
  add column if not exists language text not null default 'en'
    check (language in ('en', 'hi'));

comment on column public.response_cache.language is
  'tutor_language the cached response was generated under. RAG / cache lookups filter by this so Hindi and English responses never cross-pollute.';

create index if not exists idx_response_cache_lang_subject_class
  on public.response_cache (language, subject, class_level);

-- ─── 5. Recreate search_response_cache with language filter ────────────
drop function if exists public.search_response_cache(
  extensions.vector(1536), text, integer, real
);

create or replace function public.search_response_cache(
  query_embedding extensions.vector(1536),
  match_subject text,
  match_class integer,
  match_threshold real default 0.92,
  match_language text default 'en'   -- new in 013
)
returns table (
  id uuid,
  question_text text,
  ai_response text,
  language text,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    rc.id,
    rc.question_text,
    rc.ai_response,
    rc.language,
    (1 - (rc.question_embedding <=> query_embedding))::real as similarity   -- ::real preserved from migration 006
  from public.response_cache rc
  where rc.subject = match_subject
    and rc.class_level = match_class
    and rc.language = match_language
    and 1 - (rc.question_embedding <=> query_embedding) > match_threshold
  order by rc.question_embedding <=> query_embedding
  limit 1;
end;
$$;

-- ─── Apply notes ───────────────────────────────────────────────────────
-- Run in Supabase SQL Editor (the project doesn't currently use the CLI
-- migration runner). Verify after apply:
--
--   select count(*) as english_chunks from public.ncert_chunks where language='en';
--   select count(*) as hindi_chunks   from public.ncert_chunks where language='hi';
--   -- (hindi_chunks should be 0 until F6b ingest runs)
--
--   select count(*) as english_cache  from public.response_cache where language='en';
--   select count(*) as hindi_cache    from public.response_cache where language='hi';
--   -- (all existing cache rows are 'en' after backfill)
--
--   -- Sanity probe of the new RPC signatures (will return empty in dev DB):
--   select count(*) from public.search_ncert_chunks(
--     array_fill(0::real, array[1536])::extensions.vector(1536),
--     'Maths', 10, 4, 0.7, 'en'
--   );
--   select count(*) from public.search_response_cache(
--     array_fill(0::real, array[1536])::extensions.vector(1536),
--     'Maths', 10, 0.92, 'en'
--   );
