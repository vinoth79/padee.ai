-- ============================================================
-- Migration 006: Fix search_response_cache + search_ncert_chunks RPCs
-- Bug: similarity column declared `real` but cosine expression
-- returns `double precision` -> "structure of query does not match function result type"
-- Fix: cast to real explicitly
-- ============================================================

create or replace function public.search_ncert_chunks(
  query_embedding extensions.vector(1536),
  match_subject text,
  match_class integer,
  match_count integer default 4,
  match_threshold real default 0.7
)
returns table (
  id uuid,
  content text,
  subject text,
  class_level integer,
  chapter_number integer,
  chapter_name text,
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
    (1 - (nc.embedding <=> query_embedding))::real as similarity
  from public.ncert_chunks nc
  where nc.subject = match_subject
    and nc.class_level = match_class
    and 1 - (nc.embedding <=> query_embedding) > match_threshold
  order by nc.embedding <=> query_embedding
  limit match_count;
end;
$$;

create or replace function public.search_response_cache(
  query_embedding extensions.vector(1536),
  match_subject text,
  match_class integer,
  match_threshold real default 0.92
)
returns table (
  id uuid,
  question_text text,
  ai_response text,
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
    (1 - (rc.question_embedding <=> query_embedding))::real as similarity
  from public.response_cache rc
  where rc.subject = match_subject
    and rc.class_level = match_class
    and 1 - (rc.question_embedding <=> query_embedding) > match_threshold
  order by rc.question_embedding <=> query_embedding
  limit 1;
end;
$$;
