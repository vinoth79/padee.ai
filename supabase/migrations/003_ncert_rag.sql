-- ============================================================
-- Migration 003: NCERT RAG tables + pgvector
-- ncert_chunks, response_cache (both need vector embeddings)
-- ============================================================

-- Enable pgvector extension (Supabase puts it in 'extensions' schema)
create extension if not exists vector with schema extensions;

-- NCERT content chunks: every passage from uploaded NCERT PDFs
create table if not exists public.ncert_chunks (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  class_level integer not null check (class_level between 8 and 12),
  chapter_number integer,          -- null = full-book upload
  chapter_name text,
  page_number integer,
  content text not null,
  embedding extensions.vector(1536),  -- text-embedding-3-small outputs 1536 dims
  source_pdf text,                 -- original filename
  chunk_index integer,             -- order within the PDF
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Semantic response cache: avoid re-calling LLM for similar questions
create table if not exists public.response_cache (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_embedding extensions.vector(1536),
  subject text not null,
  class_level integer not null,
  ai_response text not null,
  model_used text,
  hit_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- NCERT upload tracking: track what PDFs have been ingested
create table if not exists public.ncert_uploads (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  class_level integer not null,
  chapter_number integer,
  chapter_name text,
  filename text not null,
  file_size integer,
  chunk_count integer default 0,
  status text default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_message text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Vector similarity search indexes
-- IVFFlat requires rows to exist first, so we skip these for now
-- and create them after initial NCERT upload via admin panel
-- For small corpus (<1000 chunks), exact search is fast enough

-- Filter indexes for RAG retrieval (subject + class narrowing before vector search)
create index if not exists idx_ncert_chunks_subject_class on public.ncert_chunks(subject, class_level);
create index if not exists idx_response_cache_subject_class on public.response_cache(subject, class_level);
create index if not exists idx_ncert_uploads_subject_class on public.ncert_uploads(subject, class_level);

-- Helper function: search NCERT chunks by cosine similarity
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
    1 - (nc.embedding <=> query_embedding) as similarity
  from public.ncert_chunks nc
  where nc.subject = match_subject
    and nc.class_level = match_class
    and 1 - (nc.embedding <=> query_embedding) > match_threshold
  order by nc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Helper function: search response cache for similar questions
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
    1 - (rc.question_embedding <=> query_embedding) as similarity
  from public.response_cache rc
  where rc.subject = match_subject
    and rc.class_level = match_class
    and 1 - (rc.question_embedding <=> query_embedding) > match_threshold
  order by rc.question_embedding <=> query_embedding
  limit 1;
end;
$$;
