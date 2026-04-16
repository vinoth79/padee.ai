# Architecture

## System Diagram

```
Browser (React SPA)
  |
  |-- Supabase Auth (signup/login, JWT tokens)
  |-- Vite dev server (port 5173)
  |
  v
Hono Backend (port 3001)
  |
  |-- /api/user/*    -->  Supabase PostgreSQL (profiles, xp, streaks, subjects, mastery)
  |-- /api/ai/doubt  -->  OpenAI Embeddings --> Supabase pgvector (cache + RAG) --> Groq LLM
  |-- /api/ai/visual -->  OpenAI GPT-4o (HTML/SVG generation) --> Supabase pgvector (cache)
  |-- /api/ai/practice -> Groq LLM (JSON MCQ generation)
  |-- /api/admin/*   -->  Supabase + pdf-parse + OpenAI Embeddings (NCERT ingestion)
  |
  v
Supabase (PostgreSQL + pgvector + Auth)
  |-- 15 tables (profiles, doubt_sessions, ncert_chunks, response_cache, ...)
  |-- 2 RPC functions (search_ncert_chunks, search_response_cache)
  |-- Row Level Security on all tables
  |
LLM Providers
  |-- Groq: llama-3.3-70b-versatile (text doubts), llama-4-scout-17b (vision), llama-3.1-8b-instant (MCQs)
  |-- OpenAI: text-embedding-3-small (embeddings), gpt-4o (visual explanations)
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 4 + TypeScript | Tailwind CSS + Framer Motion + React Router v7 |
| Backend | Hono + TypeScript | Runs on port 3001, `tsx watch` for dev |
| Database | Supabase (PostgreSQL + pgvector) | Project ref `ifxekwenhidotyqlrpty`, region `us-east-1` |
| Auth | Supabase Auth | Email/password, autoconfirm enabled |
| LLM (text) | Groq SDK | llama-3.3-70b-versatile for doubts |
| LLM (vision) | Groq SDK | meta-llama/llama-4-scout-17b-16e-instruct |
| LLM (visual) | OpenAI SDK | gpt-4o for HTML/SVG generation |
| LLM (MCQ) | Groq SDK | llama-3.1-8b-instant with JSON mode |
| Embeddings | OpenAI SDK | text-embedding-3-small (1536 dims) |
| Deploy target | Vercel (frontend) + Railway (backend) | Not yet deployed |

## Request Lifecycles

### (a) Text Doubt (POST /api/ai/doubt)

1. Frontend sends `{ messages, subject, className }` with Bearer token
2. Backend validates JWT via `getUserFromToken()`
3. Embed the question using OpenAI `text-embedding-3-small`
4. **Semantic cache check**: RPC `search_response_cache` with 0.92 threshold
   - Cache hit: stream cached response word-by-word via SSE, save session, done
5. **RAG retrieval**: RPC `search_ncert_chunks` with 0.5 threshold, top 4 chunks
6. **Memory context**: fetch student name, weak subjects (<70% mastery), last 3 doubts
7. **Build system prompt**: CBSE persona + NCERT context + memory injection + no-LaTeX rule
8. **Stream Groq llama-3.3-70b**: SSE chunks sent to frontend in real-time
9. **Post-stream**: save to `doubt_sessions`, award XP, update streak, detect memory usage
10. **Cache write**: if response is not memory-personalised, embed and cache for future use
11. **Final SSE event**: `{ sessionId, ncertSource, cacheHit, memoryUsed }`

### (b) Photo Doubt (POST /api/ai/doubt with imageDataUrl)

1. Frontend sends `{ messages, subject, className, imageDataUrl }` (base64)
2. Routed to `handleVisionDoubt()` -- skips cache and RAG entirely
3. Build vision system prompt with 3 cases (full problem, diagram, conceptual)
4. Send image + text to Groq `llama-4-scout-17b-16e-instruct` via multimodal content blocks
5. Stream response via SSE
6. Save session with `session_metadata: { photo: true }`, award XP, update streak
7. No cache write (image understanding is per-image)

### (c) Practice MCQ (POST /api/ai/practice)

1. Frontend sends `{ topic, context, subject, className, count }`
2. Build MCQ system prompt with strict JSON schema and quality rules
3. Call Groq `llama-3.1-8b-instant` with `response_format: json_object`
4. Validate JSON structure (4 options, valid correctIndex, etc.)
5. Return `{ questions: [...] }`
6. On completion: `POST /api/ai/practice/complete` saves session, awards XP, updates `subject_mastery`

## Caching Strategy

| Cache Type | Storage | Key Strategy | Threshold | Notes |
|-----------|---------|-------------|-----------|-------|
| Doubt response | `response_cache` (pgvector) | Question text embedding | 0.92 similarity | Skipped if response uses memory personalisation |
| Visual explanation | `response_cache` (pgvector) | `viz::question::context` prefix | 0.90 similarity | `force=true` bypasses cache (Regenerate button) |
| Practice pre-load | localStorage (frontend) | Subject key | N/A | Home screen generates MCQs in background |
| Messages | localStorage (frontend) | N/A | Last 30 messages | Per-session conversation persistence |

Cache writes are **best-effort and async** -- they never block the response stream.

## Security Model

- **Authentication**: Supabase Auth issues JWTs. Backend validates via `getUserFromToken()` on every request.
- **RLS**: Row Level Security enabled on all 15 tables. Users can only read/write their own data.
- **Service role**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) for admin operations and cross-user queries.
- **Admin auth**: Separate `X-Admin-Password` header checked against `ADMIN_PASSWORD` env var.
- **Iframe sandbox**: Visual explanations rendered in `sandbox="allow-scripts"` (no `allow-same-origin`), preventing cookie/storage access.
- **Frontend auth guard**: `ProtectedRoute` component wraps all authenticated routes, redirects to `/login` if no session.
