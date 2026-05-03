# Architecture

## System Diagram

```
Browser (React SPA, all v4 screens full-bleed)
  |
  |-- Supabase Auth (signup/login, JWT tokens)
  |-- Vite dev server (port 5173)
  |-- KaTeX (math typesetting)
  |-- SpeechContext singleton (TTS audio)
  |
  v
Hono Backend (port 3001)
  |
  |-- /api/user/*           Supabase Postgres (profiles, xp, streaks, subjects, mastery)
  |-- /api/ai/doubt         OpenAI Embeddings → pgvector cache + RAG → Groq LLM
  |-- /api/ai/visual        OpenAI GPT-4o (HTML/SVG) → pgvector cache
  |-- /api/ai/practice      Groq Llama-3.3-70B (JSON MCQ + difficulty + hint + concept slug)
  |-- /api/ai/tts           Google Cloud TTS proxy + in-memory LRU cache
  |-- /api/test/*           start / complete (with Pa's Debrief via gpt-4o-mini), session/:id
  |-- /api/recommendations  today / acted-on / recompute (concept-level engine)
  |-- /api/teacher/*        dashboard, alerts, students, review-queue
  |-- /api/concepts/*       Admin concept catalog CRUD + AI extraction
  |-- /api/admin/*          NCERT ingestion (pdf-parse + embeddings), llm-log, config
  |
  v
Supabase (PostgreSQL + pgvector + Auth)
  |-- 20 tables across 11 migrations
  |-- 3 RPC functions (search_ncert_chunks, search_response_cache, update_concept_mastery)
  |-- Row Level Security on all tables
  |
LLM Providers
  |-- Groq: llama-3.3-70b-versatile (doubts + MCQ), llama-4-scout-17b (vision)
  |-- OpenAI: text-embedding-3-small (embeddings), gpt-4o (visual), gpt-4o-mini (Pa's Debrief, recommendations)
  |-- Google Cloud: text-to-speech en-IN-Wavenet-D (Listen button)
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 4 + TypeScript | Tailwind CSS + Framer Motion + React Router v7. v4 screens scope styles under `.home-v4` (or screen-specific class composing with it). |
| Math rendering | KaTeX | LLM emits `$...$` / `$$...$$`; frontend renders via `MathText` component. Server validates LaTeX delimiter balance post-stream. |
| TTS | Google Cloud Text-to-Speech | en-IN-Wavenet-D default. Browser Web Speech API fallback when `GOOGLE_TTS_API_KEY` unset. Single `SpeechContext` provider drives all in-app audio. |
| Backend | Hono + TypeScript | Runs on port 3001, `tsx watch` for dev |
| Database | Supabase (PostgreSQL + pgvector) | Project ref `ifxekwenhidotyqlrpty`, region `us-east-1` |
| Auth | Supabase Auth | Email/password, autoconfirm enabled |
| LLM (text doubts) | Groq SDK | llama-3.3-70b-versatile |
| LLM (vision) | Groq SDK | meta-llama/llama-4-scout-17b-16e-instruct |
| LLM (visual HTML/SVG) | OpenAI SDK | gpt-4o |
| LLM (MCQ) | Groq SDK | llama-3.3-70b-versatile with JSON mode |
| LLM (Pa's Debrief, recommendations, worksheet) | OpenAI SDK | gpt-4o-mini |
| Embeddings | OpenAI SDK | text-embedding-3-small (1536 dims) |
| LLM fallback chain | Custom (server/lib/llmFallback.ts) | Groq → OpenAI on rate limits / timeouts |
| Day boundaries | server/lib/dateIST.ts | All today / yesterday comparisons use IST midnight |
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
7. **Build system prompt**: CBSE persona + NCERT context + memory injection + **LaTeX permitted** (KaTeX-rendered)
8. **Stream Groq llama-3.3-70b**: SSE chunks sent to frontend in real-time
9. **Post-stream**: validate LaTeX balance + sanitise if needed, save to `doubt_sessions`, award XP, update streak (pledge-aware, IST), detect memory usage
10. **Cache write**: if response is not memory-personalised, embed and cache the *sanitised* version
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

1. Frontend sends `{ topic, context, subject, className, count, concept? }`
2. If `concept` slug supplied, look up concept name + chapter in `concept_catalog` for sharper prompting
3. Build MCQ system prompt with strict JSON schema, quality rules, math-formatting rule (LaTeX), per-question difficulty + hint requirements
4. Call Groq `llama-3.3-70b-versatile` with `response_format: json_object`. Token budget scales with `count` (`max(600, count * 320 + 200)`)
5. Validate JSON structure (4 options, valid correctIndex). Per-question `validateOrSanitise()` strips malformed `$` from question/options/explanation/hint
6. Return `{ questions: [...] }` with each question carrying `difficulty`, `hint`, `hint_subtitle`, `concept_slug`
7. On completion: `POST /api/ai/practice/complete` sums XP per correct by difficulty, updates `subject_mastery`, calls `update_concept_mastery()` per question, triggers `recomputeForStudent()` async

### (d) Test mode (POST /api/test/start, /api/test/complete)

1. Three modes: `teacher` (questions from `test_assignments.questions`), `self` (LLM-generated for picked subject/length/difficulty), `ai_recommended` (weakest-subject auto-pick)
2. `/start` returns questions + `secondsPerQuestion` + `totalSeconds`. Frontend runs countdown timer; auto-submits at 0.
3. `/complete` writes `test_sessions` row, sums XP per-difficulty + bonus if ≥80%, updates `subject_mastery`, calls `update_concept_mastery()` per question
4. Pa's Debrief generated via `gpt-4o-mini` (`LLM_TEST_INSIGHTS`): structured 3-paragraph diagnosis (assessment with topic stats + misconception correction + next-step). Per-topic stats also returned for the chip strip on the results screen.

### (e) TTS (POST /api/ai/tts)

1. Frontend `useSpeech` hook (via `SpeechContext` singleton) prepares text — strips markdown, unparses LaTeX via `latexToSpeech.ts`
2. POST text + voice to `/api/ai/tts`
3. Server: hash `sha256(text::voice)` → check in-memory LRU. Hit → return cached MP3 with `X-TTS-Cache: hit`
4. Miss → call Google Cloud TTS REST API → store MP3 in cache (LRU evict if at 500 cap)
5. Frontend creates `Audio` from blob URL, plays. Pa mascot mood + mouth-bob animation drives off the same SpeechContext speaking state.
6. If server unavailable / 501 → fall back to `window.speechSynthesis` (browser Web Speech API)

## Caching Strategy

| Cache Type | Storage | Key Strategy | Threshold | Notes |
|-----------|---------|-------------|-----------|-------|
| Doubt response | `response_cache` (pgvector) | Question text embedding | 0.92 similarity | Skipped if response uses memory personalisation. Stored copy is sanitised LaTeX. |
| Visual explanation | `response_cache` (pgvector) | `viz::question::context` prefix | 0.90 similarity | `force=true` bypasses cache (Regenerate button) |
| TTS audio | In-memory LRU (server) | `sha256(text::voice)` | exact match | 500-entry cap; ~50MB RAM worst case. `/api/ai/tts/stats` for telemetry |
| Recommendation hero | `student_recommendations` (DB) | per student, expires next IST midnight | exact match | Generated by `recomputeForStudent()` |
| Concept catalog reads | In-memory (server) | per subject+class | 5 min TTL | `server/lib/conceptDetection.ts` |
| Practice pre-load | localStorage (frontend) | Subject key (versioned) | N/A | Home screen generates MCQs in background. Discarded if cached size < requested count. |
| Speech preferences | localStorage (frontend) | `padee-speech-rate` | N/A | Persists rate across sessions |
| Messages | localStorage (frontend) | N/A | Last 30 messages | Per-session conversation persistence |

Cache writes are **best-effort and async** — they never block the response stream.

## Security Model

- **Authentication**: Supabase Auth issues JWTs. Backend validates via `getUserFromToken()` on every request.
- **RLS**: Row Level Security enabled on all 20 tables. Users can only read/write their own data.
- **Service role**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) for admin operations and cross-user queries.
- **Admin auth**: Separate `X-Admin-Password` header checked against `ADMIN_PASSWORD` env var.
- **Iframe sandbox**: Visual explanations rendered in `sandbox="allow-scripts"` (no `allow-same-origin`), preventing cookie/storage access.
- **Frontend auth guard**: `ProtectedRoute` component wraps all authenticated routes, redirects to `/login` if no session.
