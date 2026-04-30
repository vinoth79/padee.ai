import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { logLLMCall } from '../lib/llmLog.js'
import { getAppConfig } from './admin.js'
import { detectConcept, validateConceptSlug } from '../lib/conceptDetection.js'
import { recomputeForStudent } from '../cron/recompute-recommendations.js'
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { createHash } from 'node:crypto'
import {
  istTodayStr, istWeekdayCode, istWeekdayForDateStr,
  istTodayStartUTC, istDaysBetween,
} from '../lib/dateIST.js'
import { validateOrSanitise, validateLatex } from '../lib/latexValidate.js'
import { checkRateLimit } from '../lib/rateLimit.js'

// ═══ Streak updater — called after any XP award ═══
// IST-aware (uses lib/dateIST). All "today/yesterday" comparisons are in IST,
// so a 1 AM IST study session correctly counts as the new day, not the old.
//
// Pledge-aware (migrations 010 + 011): respects profiles.study_days.
//
//   • Rest day (today not in pledged days) → no streak change. Activity is
//     still logged elsewhere (XP, doubt, practice). Pa doesn't punish or
//     reward; the row is left alone.
//   • Pledged day with no missed pledged days since last_active → streak +1,
//     pledged_days_missed reset to 0. Streak bonus XP fires when streak >= 2.
//   • Pledged day after missing 1+ pledged days → streak FROZEN (not reset),
//     pledged_days_missed += missedCount. Frontend shows a re-plan check-in
//     when pledged_days_missed >= 3.
//   • If profiles.study_days is NULL/empty (legacy users pre-Apr-25 onboarding),
//     every day is treated as pledged — preserves original behaviour.
async function updateStreak(userId: string) {
  try {
    const todayStr = istTodayStr()        // YYYY-MM-DD in IST
    const todayWeekday = istWeekdayCode() // 'mon'..'sun' in IST

    const [{ data: streak }, { data: profile }] = await Promise.all([
      supabase.from('student_streaks').select('*').eq('student_id', userId).single(),
      supabase.from('profiles').select('study_days').eq('id', userId).single(),
    ])
    if (!streak) return

    // Pledged days. Three cases:
    //   • NULL  → legacy user (pre-onboarding-rebrand). Treat all 7 days as
    //             pledged so existing streaks continue to work.
    //   • []    → user explicitly cleared every pledged day on /settings.
    //             No day is pledged → streak never increments. Honor that.
    //   • [..]  → check membership of today's weekday code.
    const studyDaysRaw = (profile as any)?.study_days
    const isLegacyDefault = studyDaysRaw === null || studyDaysRaw === undefined
    const studyDays: string[] = Array.isArray(studyDaysRaw) ? studyDaysRaw : []
    const isPledgedToday = isLegacyDefault || studyDays.includes(todayWeekday)

    // Rest day → leave streak row alone (last_active_date stays = "last pledged active day")
    if (!isPledgedToday) return

    const lastActive = streak.last_active_date
    if (lastActive === todayStr) return // already counted today

    // ── First ever pledged-day activity → streak = 1 ──
    if (!lastActive) {
      await supabase.from('student_streaks').update({
        current_streak: 1,
        longest_streak: Math.max(1, streak.longest_streak || 0),
        last_active_date: todayStr,
        pledged_days_missed: 0,
        updated_at: new Date().toISOString(),
      }).eq('student_id', userId)
      return // bonus only fires for streak >= 2
    }

    // ── Count pledged days strictly between last_active and today (both IST labels) ──
    let missedPledged = 0
    for (const dayStr of istDaysBetween(lastActive, todayStr)) {
      const wd = istWeekdayForDateStr(dayStr)
      const wasPledged = isLegacyDefault || studyDays.includes(wd)
      if (wasPledged) missedPledged++
    }

    let newStreak: number
    let missedCounter: number
    const isFresh = missedPledged === 0

    if (isFresh) {
      // Kept the rhythm — increment, reset miss counter
      newStreak = (streak.current_streak || 0) + 1
      missedCounter = 0
    } else {
      // Missed pledged day(s) — freeze streak, accumulate misses for re-plan trigger
      newStreak = streak.current_streak || 0
      missedCounter = (streak.pledged_days_missed || 0) + missedPledged
    }

    await supabase.from('student_streaks').update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak || 0),
      last_active_date: todayStr,
      pledged_days_missed: missedCounter,
      updated_at: new Date().toISOString(),
    }).eq('student_id', userId)

    // Streak bonus XP — only when streak actually grew (not when frozen) and >= 2
    if (isFresh && newStreak >= 2) {
      const config = await getAppConfig()
      const bonus = config.xpRewards?.streakBonus || 5
      // Once-per-day guard — bound to IST day window
      const { count } = await supabase
        .from('student_xp')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId)
        .eq('source', 'streak')
        .gte('created_at', istTodayStartUTC())
      if (!count || count === 0) {
        await supabase.from('student_xp').insert({
          student_id: userId,
          amount: bonus,
          source: 'streak',
          metadata: { day: newStreak },
        })
      }
    }
  } catch (err) {
    console.error('[Streak] Update failed:', err)
  }
}

const ai = new Hono()

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Gate teacher-tool endpoints (worksheet generator, paper mimic) so a leaked
// student token can't burn through paid LLM calls. Returns the auth'd user on
// success; a Hono Response on auth/role failure (caller must early-return it).
async function requireTeacher(c: any) {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', u.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return c.json({ error: 'Teacher role required' }, 403)
  }
  return u
}

// ═══ POST /api/ai/doubt -- The core product: RAG-grounded doubt solver ═══
ai.post('/doubt', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  // Phase 1: app is completely free, no daily cap
  const body = await c.req.json()
  const { messages, subject, className, imageDataUrl } = body
  const lastMsg = messages[messages.length - 1]
  const question = (typeof lastMsg?.content === 'string' ? lastMsg.content : '') || ''
  const hasImage = !!imageDataUrl && typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/')

  // Empty question with no image is invalid
  if (!question.trim() && !hasImage) {
    return c.json({ error: 'Empty question and no image' }, 400)
  }

  // Photo doubts: skip cache + RAG (image understanding is per-image), route to vision model
  if (hasImage) {
    return handleVisionDoubt(c, u.id, messages, imageDataUrl, question, subject, className)
  }

  // Step 1: Embed the question for RAG retrieval
  let ncertContext = ''
  let ncertSource = ''
  let ncertConfidence = 0
  let cacheHit = false
  // Hoisted so the cache-write step at the end of the SSE handler can reuse
  // the embedding instead of paying for a second OpenAI embeddings call.
  let queryEmbedding: number[] | null = null

  try {
    const embeddingRes = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: question,
    })
    queryEmbedding = embeddingRes.data[0].embedding

    // Step 2: Check semantic cache (92%+ similarity = cache hit)
    const { data: cached } = await supabase.rpc('search_response_cache', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_subject: subject || 'Physics',
      match_class: className || 10,
      match_threshold: 0.92,
    })

    if (cached && cached.length > 0) {
      cacheHit = true
      // Return cached response as SSE stream
      const cachedResponse = cached[0].ai_response

      // Update hit count
      await supabase.from('response_cache')
        .update({ hit_count: (cached[0].hit_count || 0) + 1 })
        .eq('id', cached[0].id)

      // Save session record
      const { data: session } = await supabase.from('doubt_sessions').insert({
        student_id: u.id,
        subject: subject || 'Physics',
        class_level: className || 10,
        question_text: question,
        ai_response: cachedResponse,
        model_used: 'cache',
        cache_hit: true,
      }).select('id').single()

      // Log cache hit
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId: u.id,
        model: 'cache',
        systemPrompt: '(cached response, no LLM call)',
        messages: [{ role: 'user', content: question }],
        response: cachedResponse,
        latencyMs: 0,
        cacheHit: true,
        metadata: { subject, className },
      }).catch(() => {})

      return streamSSE(c, async (stream) => {
        // Stream cached response word by word for smooth UX
        const words = cachedResponse.split(' ')
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(' ') + ' '
          await stream.writeSSE({ data: JSON.stringify({ text: chunk }) })
        }
        await stream.writeSSE({
          data: JSON.stringify({
            sessionId: session?.id,
            ncertSource: '',
            cacheHit: true,
          })
        })
        await stream.writeSSE({ data: '[DONE]' })
      })
    }

    // Step 3: Retrieve NCERT chunks via pgvector cosine similarity.
    // Threshold 0.35: text-embedding-3-small produces lower similarity scores
    // than raw cosine suggests — real-world NCERT matches score ~0.35-0.50
    // (e.g., a direct "Euclid division" match on a Class 10 chapter chunk
    // that contains mixed intro + content scores ~0.42). Threshold 0.5 rejects
    // all real matches. 0.35 keeps quality matches without adding noise.
    const { data: chunks } = await supabase.rpc('search_ncert_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_subject: subject || 'Physics',
      match_class: className || 10,
      match_count: 4,
      match_threshold: 0.35,
    })

    if (chunks && chunks.length > 0) {
      ncertContext = chunks.map((ch: any, i: number) =>
        `[Source ${i + 1}] ${ch.content}`
      ).join('\n\n')
      ncertSource = chunks[0].chapter_name
        ? `NCERT Class ${chunks[0].class_level} ${chunks[0].subject}, Chapter ${chunks[0].chapter_number} — ${chunks[0].chapter_name}`
        : `NCERT Class ${chunks[0].class_level} ${chunks[0].subject}`
      ncertConfidence = chunks[0].similarity || 0
    }
  } catch (err) {
    console.error('[AI] Embedding/RAG error:', err)
    // Continue without RAG -- still answer the question
  }

  // Step 4: Build student memory context (PRD quality control layer 3)
  const memoryObj = await buildStudentMemoryWithTokens(u.id)
  const memory = memoryObj.text

  // Detect follow-up: if there's prior conversation history, the current question
  // is a follow-up within an ongoing topic. In that case, the "Recent questions"
  // list in memory is actively harmful (it pulls the LLM off the conversation
  // topic — e.g. a chip click on "Real-life example" for Ohm's Law gets answered
  // about Polynomials because Polynomials was in the student's recent-questions
  // memory). We pass isFollowUp through so the system prompt can demote memory
  // context in that case.
  const isFollowUp = Array.isArray(messages) && messages.length > 1

  // Step 5: Build the prompt with memory injection
  const systemPrompt = buildSystemPrompt(subject, className, ncertContext, memory, isFollowUp)

  // Step 5: Stream LLM response via Groq (Llama-70B)
  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  let fullResponse = ''
  const t0 = Date.now()

  return streamSSE(c, async (stream) => {
    let modelUsed = process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile'
    let fallbackFired = false
    try {
      // Stream with automatic Groq → OpenAI fallback on rate-limit/5xx/timeout
      const { streamWithFallback } = await import('../lib/llmFallback.js')
      const result = await streamWithFallback({
        messages: fullMessages.map((m: any) => ({ role: m.role, content: m.content })),
        maxTokens: 800,
        temperature: 0.3,
        onChunk: async (text) => {
          fullResponse += text
          await stream.writeSSE({ data: JSON.stringify({ text }) })
        },
      })
      modelUsed = result.modelUsed
      fallbackFired = result.fallbackFired
      if (fallbackFired) {
        // Let the client know we used the fallback (for subtle UI indicator if desired)
        await stream.writeSSE({ data: JSON.stringify({ fallbackUsed: true, modelUsed }) })
      }

      // Detect memory usage once, reuse across audit log + cache decision + SSE metadata
      const memoryUsedDecisionEarly = detectMemoryUsage(fullResponse, memoryObj.tokens)

      // Log the LLM call for audit
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId: u.id,
        model: modelUsed,
        systemPrompt,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        response: fullResponse,
        latencyMs: Date.now() - t0,
        cacheHit: false,
        ncertChunksUsed: ncertContext ? ncertContext.split('[Source').length - 1 : 0,
        ncertSource: ncertSource || undefined,
        metadata: { subject, className, ncertConfidence, memoryUsed: memoryUsedDecisionEarly, memoryTokens: memoryObj.tokens, fallbackFired },
      }).catch(() => {})

      // Post-stream LaTeX validation — non-blocking. Stream is already
      // delivered, but we log warnings for observability and sanitise the
      // version stored in doubt_sessions / response_cache so future cache
      // hits don't replay malformed math.
      const latexCheck = validateLatex(fullResponse)
      if (!latexCheck.ok) {
        console.warn(`[LaTeX] doubt response had ${latexCheck.reason}. user=${u.id} q="${question.slice(0, 60)}"`)
      }
      const responseToStore = latexCheck.ok
        ? fullResponse
        : validateOrSanitise(fullResponse, 'doubt/post-stream', u.id)

      // Save the session and response
      const { data: session } = await supabase.from('doubt_sessions').insert({
        student_id: u.id,
        subject: subject || 'Physics',
        class_level: className || 10,
        question_text: question,
        ai_response: responseToStore,
        model_used: process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile',
        tokens_used: fullResponse.length, // approximate
        cache_hit: false,
        ncert_source: ncertSource || null,
        ncert_confidence: ncertConfidence || null,
      }).select('id').single()

      // Award XP for asking a doubt (amount from admin config)
      const xpConfig = (await getAppConfig()).xpRewards || {}
      await supabase.from('student_xp').insert({
        student_id: u.id,
        amount: xpConfig.textDoubt || 10,
        source: 'doubt',
        metadata: { session_id: session?.id },
      })

      // Update streak (auto-increment on daily activity)
      updateStreak(u.id).catch(() => {})

      // Concept detection for doubts — boost score if we know the NCERT chapter from RAG.
      // We treat a doubt as a "soft positive" signal (doubt_count++, but no correct/wrong mastery update).
      try {
        // Extract chapter name from ncertSource string (format: "NCERT Class X Subject, Chapter N — ChapterName")
        const chapterMatch = ncertSource.match(/— (.+)$/)
        const chapterHint = chapterMatch ? chapterMatch[1].trim() : undefined
        const detected = await detectConcept({
          text: question,
          subject: subject || 'Physics',
          classLevel: className || 10,
          chapterName: chapterHint,
        })
        if (detected) {
          // Increment doubt_count via direct upsert (modifier only, no composite_score change)
          const { data: existing } = await supabase
            .from('concept_mastery').select('doubt_count')
            .eq('student_id', u.id).eq('concept_slug', detected.concept_slug).maybeSingle()
          if (existing) {
            await supabase.from('concept_mastery')
              .update({ doubt_count: (existing.doubt_count || 0) + 1 })
              .eq('student_id', u.id).eq('concept_slug', detected.concept_slug)
          } else {
            await supabase.from('concept_mastery').insert({
              student_id: u.id,
              concept_slug: detected.concept_slug,
              doubt_count: 1,
            })
          }
        }
      } catch (err) {
        console.warn('[doubt] concept detection failed:', err)
      }

      // (memoryUsedDecisionEarly already computed above for audit log)
      const memoryUsedDecision = memoryUsedDecisionEarly

      // Cache the response only if it does NOT reference the student's memory.
      // Personalised responses are student-specific and shouldn't be reused.
      // Reuse the embedding we already computed for RAG/cache lookup at Step 1
      // — saves a redundant OpenAI embeddings call per non-cache-hit doubt.
      // Falls back to a fresh embed if Step 1 errored before queryEmbedding was set.
      if (fullResponse.length > 50 && !memoryUsedDecision) {
        try {
          let embedToCache = queryEmbedding
          if (!embedToCache) {
            const respEmbedding = await openai.embeddings.create({
              model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
              input: question,
            })
            embedToCache = respEmbedding.data[0].embedding
          }
          await supabase.from('response_cache').insert({
            question_text: question,
            question_embedding: JSON.stringify(embedToCache),
            subject: subject || 'Physics',
            class_level: className || 10,
            ai_response: responseToStore,
            model_used: process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile',
          })
        } catch {}
      }

      // Send metadata as final SSE event (reuse the memory detection from cache decision)
      await stream.writeSSE({
        data: JSON.stringify({
          sessionId: session?.id,
          ncertSource: ncertConfidence > 0.35 ? ncertSource : '',
          ncertConfidence,
          cacheHit: false,
          memoryUsed: memoryUsedDecision,
        })
      })
      await stream.writeSSE({ data: '[DONE]' })
    } catch (err: any) {
      console.error('[AI] LLM streaming error:', err)
      // Log the failure to the audit trail so admin can see rate limits / API errors
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId: u.id,
        model: process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile',
        systemPrompt: systemPrompt || '',
        messages: (messages || []).map((m: any) => ({ role: m.role, content: m.content })),
        response: '',
        latencyMs: Date.now() - t0,
        error: err.message || String(err),
        metadata: { subject, className, failed: true },
      }).catch(() => {})
      await stream.writeSSE({ data: JSON.stringify({ error: err.message }) })
      await stream.writeSSE({ data: '[DONE]' })
    }
  })
})

// ═══ Vision doubt handler (PRD: Llama-3.2-11B Vision via Groq) ═══
// Flow: photo + optional text -> vision LLM -> stream response
// Skips RAG and semantic cache (image understanding is per-image, not cacheable by text)
async function handleVisionDoubt(
  c: any,
  userId: string,
  messages: any[],
  imageDataUrl: string,
  question: string,
  subject: string,
  className: number
) {
  const memory = await buildStudentMemory(userId)
  const systemPrompt = buildVisionSystemPrompt(subject, className, memory)
  const visionModel = process.env.LLM_DOUBT_VISION?.replace('groq/', '')
    || 'meta-llama/llama-4-scout-17b-16e-instruct'

  // Build the message with image content block
  const userContent: any[] = [
    {
      type: 'text',
      text: question.trim() || 'Please read this image from my textbook and explain step by step how to solve it.',
    },
    {
      type: 'image_url',
      image_url: { url: imageDataUrl },
    },
  ]

  // Include prior text-only turns as context (exclude any earlier images)
  const priorTurns = messages.slice(0, -1)
    .filter((m: any) => typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: m.content }))
    .slice(-4)  // keep context compact

  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...priorTurns,
    { role: 'user' as const, content: userContent },
  ]

  let fullResponse = ''
  const t0 = Date.now()

  return streamSSE(c, async (stream) => {
    let modelUsed = `groq/${visionModel}`
    let firstChunkDelivered = false
    try {
      try {
        const completion = await groq.chat.completions.create({
          model: visionModel,
          messages: fullMessages as any,
          stream: true,
          max_tokens: 900,
          temperature: 0.3,
        })
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            firstChunkDelivered = true
            fullResponse += text
            await stream.writeSSE({ data: JSON.stringify({ text }) })
          }
        }
      } catch (groqErr: any) {
        // Same guard as streamWithFallback: don't re-stream on top of partial
        // output. Only fall back if Groq failed before delivering anything.
        if (firstChunkDelivered) throw groqErr
        const fallbackVisionModel = process.env.LLM_VISION_FALLBACK || 'gpt-4o'
        console.warn(`[Vision] Groq vision failed (${(groqErr.message || String(groqErr)).slice(0, 120)}), trying OpenAI ${fallbackVisionModel}...`)
        const completion = await openai.chat.completions.create({
          model: fallbackVisionModel,
          messages: fullMessages as any,
          stream: true,
          max_tokens: 900,
          temperature: 0.3,
        })
        modelUsed = `openai/${fallbackVisionModel}`
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            fullResponse += text
            await stream.writeSSE({ data: JSON.stringify({ text }) })
          }
        }
      }

      // LaTeX sanity-check before persisting — vision system prompt mandates
      // KaTeX-renderable math, but vision models slip up. Without this, broken
      // `$` counts re-render with KaTeX errors when the student reviews the
      // past doubt later.
      const responseToStore = validateOrSanitise(fullResponse, 'doubt/vision', userId)

      // Save session (store a truncated image reference -- data URL is too large)
      const { data: session } = await supabase.from('doubt_sessions').insert({
        student_id: userId,
        subject: subject || 'Physics',
        class_level: className || 10,
        question_text: `[PHOTO] ${question || '(no text)'}`,
        ai_response: responseToStore,
        model_used: modelUsed,
        tokens_used: fullResponse.length,
        cache_hit: false,
        session_metadata: { photo: true, imageBytes: imageDataUrl.length },
      }).select('id').single()

      // XP (amount from admin config)
      const xpCfg = (await getAppConfig()).xpRewards || {}
      await supabase.from('student_xp').insert({
        student_id: userId,
        amount: xpCfg.photoDoubt || 10,
        source: 'doubt',
        metadata: { session_id: session?.id, photo: true },
      })

      // Update streak
      updateStreak(userId).catch(() => {})

      // Audit log (strip the full base64 to keep log readable)
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId,
        model: modelUsed,
        systemPrompt,
        messages: [
          ...priorTurns,
          { role: 'user', content: `[IMAGE ${Math.round(imageDataUrl.length / 1024)}KB] ${question || '(no text)'}` },
        ],
        response: fullResponse,
        latencyMs: Date.now() - t0,
        cacheHit: false,
        metadata: { subject, className, photo: true, fallbackFired: modelUsed !== `groq/${visionModel}` },
      }).catch(() => {})

      await stream.writeSSE({
        data: JSON.stringify({
          sessionId: session?.id,
          ncertSource: '',
          cacheHit: false,
          photo: true,
        }),
      })
      await stream.writeSSE({ data: '[DONE]' })
    } catch (err: any) {
      console.error('[AI Vision] Streaming error:', err)
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId,
        model: `groq/${visionModel}`,
        systemPrompt,
        messages: [{ role: 'user', content: `[IMAGE] ${question}` }],
        response: fullResponse,
        latencyMs: Date.now() - t0,
        error: err.message,
        metadata: { subject, className, photo: true },
      }).catch(() => {})
      await stream.writeSSE({ data: JSON.stringify({ error: err.message }) })
      await stream.writeSSE({ data: '[DONE]' })
    }
  })
}

function buildVisionSystemPrompt(subject: string, className: number, memory: string): string {
  let prompt = `You are Padee, an AI tutor for CBSE Class ${className} ${subject || 'students'}.
The student photographed something from their textbook or worksheet.

YOUR TASK:
Read the image, determine what type of content it is, and respond accordingly:

CASE A -- Image contains a FULL PROBLEM with given values:
- Extract the given values (with units)
- Solve step-by-step using CBSE methods
- End with a clearly labelled final answer

CASE B -- Image shows a DIAGRAM/FIGURE without a specific problem to solve:
- Describe what the diagram shows
- Explain the concept it illustrates
- DO NOT invent numerical values or fabricate an answer
- DO NOT make up a numerical problem that wasn't asked
- You may ask the student what specific question they have about the diagram

CASE C -- Image shows only conceptual content (a theorem, a definition, a list):
- Explain the concept clearly
- Give one real-world example
- DO NOT force it into a "problem + solution" template

ABSOLUTE RULES:
1. NEVER fabricate specific numerical values (B=0.2T, I=2A, etc.) that are not in the image. If values are missing, say so and stop.
2. NEVER write a rigid "Step 1, Step 2... Step 8" template that includes empty placeholder steps like "There are no specific values given" or "There is no specific question".
3. NEVER add unsolicited content: no "similar question for practice", no "real-world examples" unless asked, no "common mistakes" unless asked. The student will use action chips if they want those.
4. Skip steps that don't apply. A good answer may have just 2-3 sections, not 8.

FORMATTING RULES (CRITICAL -- the frontend renders LaTeX via KaTeX):
- USE LaTeX for ALL math expressions, formulas, equations, and Greek letters.
- Inline math: wrap in single dollar signs. Example: "$F = BIL \\sin\\theta$ where $B$ is the magnetic field in tesla."
- Display math (a standalone equation on its own line): wrap in double dollar signs. Example: "$$E = mc^2$$"
- Common commands: \\sin, \\cos, \\tan, \\theta, \\pi, \\alpha, \\beta, \\Delta, \\Omega, \\frac{a}{b}, \\sqrt{x}, x^2, x_{i}, \\leq, \\geq, \\neq, \\approx, \\cdot, \\times.
- DO balance every $ — every opening $ needs a closing $. Unbalanced delimiters render as ugly red errors.
- Plain prose between math segments stays in plain English. e.g. "We use $F = ma$ to find the force, then plug in the values."
- Use **bold** for emphasis (Markdown bold works). Use bullet lists with - or *. Use normal sentences, not numbered step headers, unless truly solving a step-by-step problem.

Keep the whole response under 350 words. Use simple English for Class ${className}.`

  if (memory) {
    prompt += `\n\n--- STUDENT CONTEXT ---\n${memory}\n--- END STUDENT CONTEXT ---\nUse this to personalise if directly relevant. Do NOT force it.`
  }

  return prompt
}

// PRD quality control layer 3: student memory context
async function buildStudentMemory(userId: string): Promise<string> {
  return (await buildStudentMemoryWithTokens(userId)).text
}

async function buildStudentMemoryWithTokens(userId: string): Promise<{
  text: string
  tokens: { weakSubjects: string[]; recentTopics: string[]; name?: string }
}> {
  const result = { text: '', tokens: { weakSubjects: [] as string[], recentTopics: [] as string[], name: undefined as string | undefined } }
  try {
    const [{ data: profile }, { data: recentDoubts }, { data: mastery }] = await Promise.all([
      supabase.from('profiles').select('name, class_level, active_track').eq('id', userId).single(),
      supabase.from('doubt_sessions').select('subject, question_text').eq('student_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('subject_mastery').select('subject, accuracy_percent, weak_topics').eq('student_id', userId).lt('accuracy_percent', 70).limit(2),
    ])

    if (!profile) return result

    const parts: string[] = []
    parts.push(`Student: ${profile.name || 'Student'}, Class ${profile.class_level}, Track: ${profile.active_track || 'school'}`)
    result.tokens.name = profile.name || undefined

    if (mastery && mastery.length > 0) {
      const weakSubjects = mastery.map((m: any) => m.subject)
      result.tokens.weakSubjects = weakSubjects
      parts.push(`Weak areas: ${mastery.map((m: any) => `${m.subject} (${m.accuracy_percent}%)`).join(', ')}`)
    }

    if (recentDoubts && recentDoubts.length > 0) {
      const topics = recentDoubts.map((d: any) => d.question_text?.slice(0, 60)).filter(Boolean) as string[]
      result.tokens.recentTopics = topics
      if (topics.length) parts.push(`Recent questions: ${topics.join(' | ')}`)
    }

    result.text = parts.join('\n')
    return result
  } catch {
    return result
  }
}

// Detect whether the LLM's response genuinely references the student's memory
// (mentions their name, a weak-subject topic, or echoes a recent question)
function detectMemoryUsage(
  response: string,
  tokens: { weakSubjects: string[]; recentTopics: string[]; name?: string }
): boolean {
  if (!response) return false
  // Skip very generic email-prefix names (e.g. "teststudent", "user123")
  const realName = tokens.name && tokens.name.length > 2
    && !/^(test|user|student|admin|guest)/i.test(tokens.name)
    ? tokens.name : null
  const lower = response.toLowerCase()

  // 1. Name mention (only if it looks like a real name, not "teststudent")
  if (realName && lower.includes(realName.toLowerCase())) return true

  // 2. Weak subject + personal context phrase
  for (const subj of tokens.weakSubjects) {
    if (subj && lower.includes(subj.toLowerCase())) {
      if (/weak|struggl|previous|yesterday|earlier|before|recently|you.*asked|you.*got/.test(lower)) return true
    }
  }

  // 3. Reference to a recent question topic (first 2-3 distinctive words)
  for (const topic of tokens.recentTopics) {
    if (!topic) continue
    const keyPhrase = topic.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ')
    if (keyPhrase.length > 8 && lower.includes(keyPhrase)) return true
  }

  // 4. Explicit personalised-opener phrases
  const personalisedOpeners = [
    /\bsince you (recently |last |just |)(asked|wondered|brought up)/i,
    /\byou (previously|earlier|recently|just) asked/i,
    /\bbuilding on (what you|your previous|our earlier)/i,
    /\bcontinuing (from|with) (what you|your|our)/i,
    /\bfollow(ing)? up on (what|your|our)/i,
    /\bas (we|you) (discussed|mentioned|saw) (earlier|before|previously)/i,
    /\b(this connects|this relates|this builds) (to|on) (what you|your previous)/i,
    /\b(remember|recall) (when|how|what) (you|we) (asked|did|saw)/i,
  ]
  for (const re of personalisedOpeners) {
    if (re.test(response)) return true
  }
  return false
}

function buildSystemPrompt(
  subject: string,
  className: number,
  ncertContext: string,
  memory: string,
  isFollowUp: boolean = false,
): string {
  let prompt = `You are Padee, an AI tutor for CBSE Class ${className} ${subject || 'students'}.
You help Indian students understand their NCERT textbook content.

Rules:
- Answer using ONLY the NCERT content provided below. If the NCERT context doesn't cover the topic, say so honestly.
- Use step-by-step explanations with CBSE terminology.
- Keep responses under 400 words. Be concise but thorough.
- Use simple English appropriate for Class ${className} students.
- Include relevant formulas, definitions, and examples from NCERT.
- Temperature: be factual for definitions, slightly creative for analogies only.`

  // Mid-conversation follow-ups: conversation history IS the context. Suppress
  // the topic-switch personalisation rule so the LLM doesn't pivot to a stale
  // topic from memory. Weak-subject awareness is still fine, but we keep it
  // gentle and purely informational — no "Since you've been working on X" lead.
  if (memory && !isFollowUp) {
    prompt += `\n\n--- STUDENT CONTEXT ---\n${memory}\n--- END STUDENT CONTEXT ---

PERSONALISATION RULE:
If the current question is related to anything in the Recent questions list, START your response with a brief acknowledgement that connects to it.
Examples (use this exact pattern when relevant):
- "Building on what you asked about [topic] earlier, ..."
- "Since you recently asked about [topic], let's now look at ..."
- "Following up on [topic], ..."

If the question is on a weak subject for the student, gently note it (e.g. "I see you've been working on [subject] -- here's a clearer take").

If there is NO meaningful connection, do NOT force one -- just answer normally. Forced personalisation is worse than none.`
  } else if (memory && isFollowUp) {
    // Mid-conversation: give the LLM light awareness of student's weak subjects
    // (for calibration) WITHOUT any "Recent questions" list or topic-switch
    // instructions. The conversation history already anchors the topic.
    prompt += `\n\n--- STUDENT CONTEXT (for calibration only, do NOT reference explicitly) ---
${memory}
--- END STUDENT CONTEXT ---

IMPORTANT: This is a follow-up within an ongoing conversation. Stay on the topic the student and you have been discussing. Do NOT pivot to a different subject or concept from the student context above — that context is only for tone calibration, not for redirecting the answer. Treat the conversation history as authoritative for what the topic is.`
  }

  if (ncertContext) {
    prompt += `\n\n--- NCERT REFERENCE CONTENT ---\n${ncertContext}\n--- END NCERT CONTENT ---

Answer using ONLY the content above. CRITICAL presentation rules:
- NEVER write "[Source 1]", "[Source 2]", etc. in your response. The "Source N" labels are internal markers for you only; the student does not see them. If you want to cite, just write naturally (e.g. "According to the NCERT textbook...")
- Do NOT announce which sources you used at the end of your response. The student will see an automatic citation below your answer.
- Do NOT say "This information is found in the reference content" or similar meta-commentary. Answer as a teacher would.`
  } else {
    prompt += `\n\nAnswer based on standard CBSE Class ${className} ${subject} curriculum. Do NOT add disclaimers about the textbook -- just answer directly and confidently.`
  }

  return prompt
}

// ═══ Quality signal routes (already implemented) ═══

// POST /api/ai/feedback -- thumbs up/down on AI response
ai.post('/feedback', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { sessionId, helpful, reason } = await c.req.json()

  await supabase.from('doubt_feedback').insert({
    student_id: u.id,
    session_id: sessionId,
    helpful,
    reason: reason || null,
  })

  return c.json({ ok: true })
})

// POST /api/ai/flag -- report incorrect answer
ai.post('/flag', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { sessionId, questionText, aiResponse, subject, classLevel, reportText } = await c.req.json()

  await supabase.from('flagged_responses').insert({
    student_id: u.id,
    session_id: sessionId || null,
    question_text: questionText,
    ai_response: aiResponse,
    subject,
    class_level: classLevel,
    report_text: reportText,
    status: 'pending',
  })

  return c.json({ ok: true })
})

// GET /api/ai/usage -- daily usage count (Phase 1: unlimited)
ai.get('/usage', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  // "Today" bound to IST day window — students near midnight IST shouldn't
  // see their counter wrongly reset (or fail to reset) due to UTC drift.
  const { count } = await supabase
    .from('doubt_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', u.id)
    .gte('created_at', istTodayStartUTC())

  // Phase 1: unlimited (limit: -1 signals no cap to frontend)
  return c.json({ count: count || 0, limit: -1 })
})

// Stub routes -- to be implemented

// ═══ POST /api/ai/visual -- Generate HTML/SVG visualisation (UI spec Screen 19) ═══
ai.post('/visual', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  // gpt-4o, ~₹0.05-0.10/call. force=true (Regenerate) bypasses the cache so
  // a click-loop can rack up cost fast. 20/min/user is generous for normal
  // use (1 click per concept) and stops accidental loops cold.
  const limited = checkRateLimit(c, `visual:${u.id}`, 20, 60_000)
  if (limited) return limited

  const { concept, context, question, subject, className, force } = await c.req.json()

  if (!concept && !context) {
    return c.json({ error: 'Provide either concept or context' }, 400)
  }

  const subj = subject || 'Physics'
  const cls = className || 10

  // Cache key: prefix with "viz::" so visual entries cluster separately from
  // doubt entries. Include the question so the same answer text with different
  // questions can cache separately (e.g. "properties of field lines" vs "draw field lines").
  const cacheKey = `viz::${(question || '').slice(0, 150)}::${(context || concept).slice(0, 350)}`

  // ── Step 1: Check cache (skip if force=true from Regenerate button) ──
  if (!force) {
    try {
      const embRes = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: cacheKey,
      })
      const queryEmbedding = embRes.data[0].embedding

      const { data: cached } = await supabase.rpc('search_response_cache', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_subject: subj,
        match_class: cls,
        match_threshold: 0.90,  // slightly lower threshold for visuals (text can vary)
      })

      // Only return as cache hit if the matched entry is actually a visual (prefix check)
      if (cached && cached.length > 0 && cached[0].question_text?.startsWith('viz::')) {
        await supabase.from('response_cache')
          .update({ hit_count: (cached[0].hit_count || 0) + 1 })
          .eq('id', cached[0].id)

        logLLMCall({
          timestamp: new Date().toISOString(),
          endpoint: 'visual',
          userId: u.id,
          model: 'cache',
          systemPrompt: '(cached visual, no LLM call)',
          messages: [{ role: 'user', content: cacheKey }],
          response: cached[0].ai_response,
          latencyMs: 0,
          cacheHit: true,
          metadata: { subj, cls, similarity: cached[0].similarity },
        }).catch(() => {})

        return c.json({
          html: cached[0].ai_response,
          cached: true,
          similarity: cached[0].similarity,
        })
      }
    } catch (err) {
      console.error('[AI] Visual cache lookup failed:', err)
      // Fall through to LLM generation
    }
  }

  // Per UI spec 19.3: self-contained HTML, inline CSS + SVG only, no external resources
  const systemPrompt = `You generate small self-contained HTML visualisations for CBSE Class ${className || 10} ${subject || 'Physics'} students.

OUTPUT FORMAT:
- Return ONLY the HTML body content. No <html>, <head>, <body> tags. No markdown fences.
- Top-level wrapper: <div style="max-width:480px; margin:0 auto; font-family:system-ui,sans-serif;">
- End with: <p style="font-size:12px; color:#666; margin-top:8px; line-height:1.4;"> one-sentence caption </p>

SVG RESPONSIVENESS (CRITICAL):
- ALL <svg> elements MUST use viewBox AND width="100%" with NO fixed pixel width attribute
  Example: <svg viewBox="0 0 400 250" width="100%" style="display:block">
- This ensures the diagram scales correctly when expanded to full screen
- Pick a viewBox width that fits all your text labels with margin (do NOT clip text near edges)

LABELLING & POSITIONING (MUST FOLLOW):

Bar magnet:
- Horizontal rectangle. Split into two coloured halves
- LEFT half = blue with white "S" label centered
- RIGHT half = red with white "N" label centered
- The order (S left, N right) matters because field lines flow OUT of N

Magnetic field lines (PHYSICS-CRITICAL):
- Lines must EXIT from the N pole (right side) and ENTER the S pole (left side)
- Arrowheads on each line MUST point in the direction of flow: away from N, into S
- Draw lines on BOTH sides (top AND bottom of the magnet) -- they form closed loops around the magnet
- Use <path> with cubic Bezier (C command) for smooth arcs
- 3-4 arcs above + 3-4 arcs below the magnet. Outermost arcs span widest, innermost arcs hug the magnet
- Define one <marker> with id="arrow" and reference it with marker-end="url(#arrow)" on each path

Compass needle (when the topic involves a compass):
- Draw it as a RHOMBUS or elongated diamond shape (NOT a single triangle)
- Two halves coloured: red half = N pointing one direction, white/blue half = S pointing opposite
- Position it INSIDE the field (e.g., to the right of the magnet's N pole, or above the magnet)
- ROTATE it so the red (N) half points TOWARD the bar magnet's S pole (or aligned with the local field direction)
- Add a small dashed line showing the original "would-have-pointed-here" direction so the deflection is visible
- Animate the rotation with CSS keyframes if possible (rotate from 0deg to deflected angle, looping)

Always keep ALL text labels INSIDE the viewBox with at least 5px margin from any edge.
Title text at top: use text-anchor="middle" and position at viewBox centre.

ALLOWED:
- Inline SVG with <defs>, <marker>, <linearGradient>, <path>, <line>, <rect>, <circle>, <text>, <g>
- Inline CSS via style attribute or <style> block (scoped class names)
- CSS animations/transitions for educational effect (e.g. pulsing field lines)
- <input type="range"> sliders with inline oninput that updates SVG element attributes by id
- Simple <script> blocks that only manipulate elements inside this snippet

FORBIDDEN:
- External resources: no http/https URLs, no CDNs, no <img src>, no @import, no Google Fonts
- localStorage, cookies, fetch, document.cookie
- Fixed pixel widths on outer SVG (must be width="100%")

QUALITY BAR:
- 10-30 SVG elements is the sweet spot (not 4-5 like a stick figure)
- Every important element must have a clear text label with values/units
- Show the PHENOMENON happening, not just static parts. Use animation or before/after panels where it helps
- For interactive concepts (Ohm's Law, parallel circuits, projectile motion, balanced equations), include a slider that changes the diagram

REFERENCE EXAMPLES (DO NOT COPY VERBATIM, but match this quality):

Bar magnet & compass deflection (gold standard):
- Horizontal bar magnet at centre (S blue left, N red right)
- 6-8 curved field lines: 3-4 arcing OVER the magnet (top), 3-4 arcing UNDER the magnet (bottom)
- Each line has an arrowhead pointing AWAY from N (right pole) and INTO S (left pole)
- One compass needle drawn as a rhombus to the RIGHT of the magnet, with:
  * Red half (N) pointing LEFT toward the bar magnet's S pole
  * White/blue half (S) pointing RIGHT
  * A dashed grey line showing where it would point (north) without the magnet
  * CSS animation: rotate from 0deg to -90deg over 2s, infinite loop, so student SEES the deflection happen
- Title at top: "How a Compass Needle Deflects Near a Bar Magnet"

Ohm's Law circuit:
- Battery symbol left, resistor zigzag middle, wires connecting them in a loop
- Ammeter (circle with A) and voltmeter (circle with V) labelled with current values
- Slider 1-20Ω that updates R label and recalculates I=V/R, updating ammeter reading via script

Respond with HTML only. No explanation, no preamble, no markdown.`

  const userPrompt = context
    ? `The student asked: "${question || 'about this concept'}"

The AI tutor answered:
${context.slice(0, 1500)}

Your task: create a single SVG diagram that DIRECTLY illustrates what the AI's answer describes. Visualise the actual phenomenon, entity, or process that is the subject of the answer.

DO NOT pivot to a different topic, related application, or real-world use case. If the answer is about "properties of magnetic field lines", draw the field lines and annotate the properties on the diagram -- do not draw "magnetic fields in the human body" or similar tangential applications.
If the answer lists multiple properties or steps, show them all labelled on one diagram.
Match the scope: answer about Ohm's Law -> circuit. Answer about photosynthesis -> leaf. Answer about field line properties -> bar magnet with labelled field lines showing each property.`
    : `Visualise this concept for a CBSE Class ${className || 10} student: ${concept}`

  const tVisual0 = Date.now()
  const visualModel = (process.env.LLM_VISUAL_EXPLAIN || 'gpt-4o-mini').replace(/^openai\//, '')

  try {
    const completion = await openai.chat.completions.create({
      model: visualModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    })

    let html = completion.choices[0]?.message?.content?.trim() || ''

    // Strip markdown fences if the LLM added them despite instructions
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

    // Basic validation -- must contain at least one SVG or HTML element
    if (!html || html.length < 50 || !/<(div|svg|p|section|article|h[1-6])/i.test(html)) {
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'visual',
        userId: u.id,
        model: visualModel,
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        response: html,
        latencyMs: Date.now() - tVisual0,
        error: 'validation_failed',
        metadata: { subj, cls },
      }).catch(() => {})
      return c.json({ error: 'Visual generation failed', fallback: true }, 500)
    }

    // Log successful generation
    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'visual',
      userId: u.id,
      model: visualModel,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      response: html,
      latencyMs: Date.now() - tVisual0,
      cacheHit: false,
      metadata: { subj, cls, force },
    }).catch(() => {})

    // ── Step 2: Cache the result for future requests (best-effort, don't block response) ──
    ;(async () => {
      try {
        const embRes = await openai.embeddings.create({
          model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
          input: cacheKey,
        })
        await supabase.from('response_cache').insert({
          question_text: cacheKey,
          question_embedding: JSON.stringify(embRes.data[0].embedding),
          subject: subj,
          class_level: cls,
          ai_response: html,
          model_used: 'visual',
        })
      } catch (err) {
        console.error('[AI] Visual cache write failed:', err)
      }
    })()

    return c.json({ html, cached: false })
  } catch (err: any) {
    console.error('[AI] Visual generation error:', err)
    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'visual',
      userId: u.id,
      model: process.env.LLM_VISUAL_EXPLAIN || 'gpt-4o',
      systemPrompt: 'visual explanation (see ai.ts)',
      messages: [{ role: 'user', content: (concept || '') + ' | ' + (context || '').slice(0, 300) }],
      response: '',
      latencyMs: 0,
      error: err.message || String(err),
      metadata: { failed: true },
    }).catch(() => {})
    return c.json({ error: err.message || 'Visual generation failed', fallback: true }, 500)
  }
})

// ═══ POST /api/ai/practice -- Generate a single MCQ on a given topic/context ═══
ai.post('/practice', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  // Groq is cheap but still the highest-volume endpoint by call count
  // (every "Quiz me" chip + every practice round + InlineQuiz). 30/min covers
  // intense legitimate use and caps the runaway loop.
  const limited = checkRateLimit(c, `practice:${u.id}`, 30, 60_000)
  if (limited) return limited

  const { topic, context, subject, className, count = 1, concept } = await c.req.json()

  if (!topic && !context && !concept) {
    return c.json({ error: 'Provide either topic, context, or concept' }, 400)
  }

  // If a concept slug was passed, look up its name + chapter for sharper prompting
  let conceptMeta: { name: string; chapter: string | null } | null = null
  if (concept) {
    const { data } = await supabase
      .from('concept_catalog')
      .select('concept_name, chapter_name')
      .eq('concept_slug', concept)
      .eq('status', 'published')
      .maybeSingle()
    if (data) conceptMeta = { name: data.concept_name, chapter: data.chapter_name }
  }

  const systemPrompt = `You are a CBSE Class ${className || 10} ${subject || 'Physics'} teacher creating practice MCQs.
Generate ${count} multiple-choice question${count > 1 ? 's' : ''} on the given topic/context.

STRICT JSON output format ONLY -- no markdown, no preamble, no explanation outside the JSON.
Schema:
{
  "questions": [
    {
      "question": "The question text",
      "hint_subtitle": "Short one-line instruction under the question (≤12 words). Optional — omit if the question is self-explanatory.",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Brief reason why the correct answer is right",
      "difficulty": "easy|medium|hard",
      "hint": "One-line nudge that points the student toward the right approach WITHOUT revealing the answer or naming the correct option. ≤20 words."
    }
  ]
}

CRITICAL MCQ QUALITY RULES:
1. Exactly 4 options, exactly ONE correct answer (correctIndex 0-3).
2. Options MUST be mutually exclusive -- no two options should both be correct or partially correct. If option A says "due to X" and option C says "due to X and Y", that's WRONG -- rewrite so only one option is defensible.
3. Distractors must be plausible but clearly wrong to someone who understands the concept. Do NOT use obviously-unrelated options like "gravity" or "temperature" unless the question is explicitly about those.
4. Prefer questions that test DEEPER understanding -- numerical application, comparing scenarios, or identifying the subtle correct phrasing -- over surface recall.
5. Use CBSE terminology exactly as in the NCERT textbook.
6. Question under 40 words. Options under 15 words each. Explanation under 35 words.
7. Randomise correctIndex across questions (do not always put the answer at index 0).
8. Mix difficulties when count > 1: roughly 30% easy, 50% medium, 20% hard. Tag each question honestly.
9. Hint must point at the method / formula / principle, not the answer. NEVER say "the answer is X" or reference an option letter.
10. MATH FORMATTING: For any math expression, formula, fraction, exponent, Greek letter, or symbol, USE LaTeX with single $ delimiters. e.g. "What is $F$ if $m = 2$ kg and $a = 3$ m/s$^2$?" — options can include "$F = 6$ N". Balance every $ (every opening needs a closing). Use \\frac{a}{b}, \\sqrt{x}, x^{2}, \\theta, \\pi, \\sin, \\cos, etc. Plain English between math segments — don't wrap whole sentences in $.`

  const conceptLine = conceptMeta
    ? `\n\nFocus specifically on the concept: ${conceptMeta.name}${conceptMeta.chapter ? ` (from chapter: ${conceptMeta.chapter})` : ''}.`
    : ''

  const nQ = `${count} multiple-choice question${count > 1 ? 's' : ''}`
  const userPrompt = context
    ? `Create ${nQ} based on this explanation:\n\n${context}\n\nFocus on the core concept a Class ${className || 10} student just learnt.${conceptLine}\n\nReturn EXACTLY ${count} question${count > 1 ? 's' : ''} in the "questions" array. Not fewer.`
    : `Create ${nQ} on: ${topic || conceptMeta?.name || 'CBSE syllabus'}${conceptLine}\n\nReturn EXACTLY ${count} question${count > 1 ? 's' : ''} in the "questions" array. Not fewer.`

  const tPractice0 = Date.now()
  const practiceModel = process.env.LLM_PRACTICE_GEN?.replace('groq/', '') || 'llama-3.3-70b-versatile'

  try {
    // Use Groq → OpenAI fallback chain for resilience.
    // Token budget: the expanded schema (question + 4 options + explanation +
    // difficulty + hint + hint_subtitle) runs ~250-300 tokens per question.
    // Scale linearly so count=3 doesn't truncate, count=8 doesn't over-allocate.
    const { completeWithFallback } = await import('../lib/llmFallback.js')
    const maxTokens = Math.max(600, count * 320 + 200)
    const { content: raw, modelUsed, fallbackFired } = await completeWithFallback({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt,
      primaryModel: practiceModel,
      maxTokens,
      temperature: 0.4,
      jsonMode: true,
    })

    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'practice',
      userId: u.id,
      model: modelUsed,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      response: raw,
      latencyMs: Date.now() - tPractice0,
      metadata: { subject: subject || 'Physics', className: className || 10, fallbackFired },
    }).catch(() => {})

    const parsed = JSON.parse(raw)

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return c.json({ error: 'Invalid LLM output' }, 500)
    }
    const valid = parsed.questions
      .filter((q: any) =>
        q.question && Array.isArray(q.options) && q.options.length === 4
        && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
      )
      .map((q: any) => ({
        // Each text field gets validated. If unbalanced LaTeX, delimiters are
        // stripped — the formula still reads correctly as plain text rather
        // than rendering as an ugly KaTeX error on the frontend.
        question: validateOrSanitise(q.question, 'practice/question', u.id),
        options: q.options.map((opt: string) => validateOrSanitise(opt, 'practice/option', u.id)),
        correctIndex: q.correctIndex,
        explanation: validateOrSanitise(q.explanation || '', 'practice/explanation', u.id),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        hint: typeof q.hint === 'string' ? validateOrSanitise(q.hint, 'practice/hint', u.id) : '',
        hint_subtitle: typeof q.hint_subtitle === 'string' ? validateOrSanitise(q.hint_subtitle, 'practice/sub', u.id) : '',
        // Tag with concept slug if we targeted one — mastery update uses this
        concept_slug: concept || undefined,
      }))
    if (valid.length === 0) {
      return c.json({ error: 'LLM produced no valid questions' }, 500)
    }
    if (valid.length < count) {
      console.warn(`[AI] Practice: requested ${count}, got ${valid.length} valid (${parsed.questions.length} raw). Subject=${subject} concept=${concept || 'none'}`)
    }

    // Persist a pending practice_sessions row holding the canonical questions
    // (with correctIndex). /practice/complete will fetch by sessionId and
    // grade server-side — we don't trust the client's `correct` flag.
    // We still ship correctIndex back to the browser because practice has
    // per-question instant feedback ("you got it right!"); the security gain
    // is closing the trivial "POST correct: true" XP/mastery exploit.
    const { data: session, error: sessErr } = await supabase
      .from('practice_sessions').insert({
        student_id: u.id,
        subject: subject || 'Physics',
        class_level: className || 10,
        difficulty: 'mixed',
        total_questions: valid.length,
        questions: valid,
        completed: false,
      }).select('id').single()
    if (sessErr || !session) {
      console.error('[AI] Practice: pending session insert failed:', sessErr)
      return c.json({ error: 'Failed to start practice' }, 500)
    }

    return c.json({ sessionId: session.id, questions: valid, requestedCount: count })
  } catch (err: any) {
    console.error('[AI] Practice generation error:', err)
    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'practice',
      userId: u.id,
      model: `groq/${practiceModel}`,
      systemPrompt: systemPrompt || '',
      messages: [{ role: 'user', content: userPrompt || '' }],
      response: '',
      latencyMs: Date.now() - tPractice0,
      error: err.message || String(err),
      metadata: { subject: subject || 'Physics', className: className || 10, failed: true },
    }).catch(() => {})
    return c.json({ error: err.message || 'Practice generation failed' }, 500)
  }
})
// ═══ POST /api/ai/practice/complete — Save results + award XP + update mastery ═══
// Strict server-side grading: client sends only sessionId + selectedIdx values.
// Canonical questions live on practice_sessions.questions (persisted by /practice).
ai.post('/practice/complete', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { sessionId, answers, hintsUsed = 0 } = await c.req.json()
  if (!sessionId || !Array.isArray(answers)) {
    return c.json({ error: 'sessionId and answers[] required' }, 400)
  }

  const { data: pending, error: fetchErr } = await supabase
    .from('practice_sessions')
    .select('id, student_id, subject, class_level, questions, completed')
    .eq('id', sessionId)
    .maybeSingle()
  if (fetchErr || !pending) return c.json({ error: 'Session not found' }, 404)
  if (pending.student_id !== u.id) return c.json({ error: 'Forbidden' }, 403)
  if (pending.completed) return c.json({ error: 'Practice already submitted' }, 409)

  const subject: string = pending.subject
  const className: number = pending.class_level
  const canonicalQuestions: any[] = Array.isArray(pending.questions) ? pending.questions : []
  const totalQuestions = canonicalQuestions.length

  // Server-side grade. selectedIdx is the only client input; correct is
  // re-derived from canonical correctIndex.
  const answerByIdx = new Map<number, { selectedIdx: number | null; skipped: boolean }>()
  for (const a of answers as any[]) {
    if (typeof a?.questionIdx === 'number') {
      answerByIdx.set(a.questionIdx, {
        selectedIdx: typeof a.selectedIdx === 'number' ? a.selectedIdx : null,
        skipped: !!a.skipped,
      })
    }
  }
  const questions = canonicalQuestions.map((q: any, i: number) => {
    const entry = answerByIdx.get(i)
    const sel = entry?.selectedIdx ?? null
    const correct = sel !== null && typeof q.correctIndex === 'number' && sel === q.correctIndex
    return { ...q, studentAnswer: sel, correct, skipped: entry?.skipped ?? false }
  })
  const correctCount = questions.filter(q => q.correct).length

  // Update the pending session to its completed state.
  const { data: session } = await supabase.from('practice_sessions').update({
    correct_count: correctCount,
    questions,
    completed: true,
  }).eq('id', sessionId).select('id').single()

  // Award XP per-question by difficulty (admin-configurable), minus hint penalty.
  // Falls back to flat practiceSession XP if no per-difficulty config (legacy safety).
  const config = await getAppConfig()
  const diffXp = config.xpRewards?.practiceDifficulty || { easy: 3, medium: 6, hard: 10 }
  const hintPenalty = config.xpRewards?.practiceHintPenalty ?? 2
  let xpAmount = 0
  for (const q of questions) {
    if (q.correct) {
      const diff = ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'
      xpAmount += diffXp[diff] ?? diffXp.medium ?? 6
    }
  }
  xpAmount = Math.max(0, xpAmount - (Number(hintsUsed) || 0) * hintPenalty)
  // Legacy fallback: if nothing was computed (e.g. all skipped/wrong + no hints), still give the flat reward for completing the round
  if (xpAmount === 0 && correctCount > 0) {
    xpAmount = config.xpRewards?.practiceSession || 15
  }
  await supabase.from('student_xp').insert({
    student_id: u.id,
    amount: xpAmount,
    source: 'practice',
    metadata: { session_id: session?.id, subject, correctCount, totalQuestions, hintsUsed },
  })

  // Update streak
  updateStreak(u.id).catch(() => {})

  // Update subject_mastery (running average)
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const { data: existing } = await supabase
    .from('subject_mastery')
    .select('*')
    .eq('student_id', u.id)
    .eq('subject', subject)
    .single()

  if (existing) {
    const newTotal = existing.total_questions + totalQuestions
    const newCorrect = existing.correct_answers + correctCount
    await supabase.from('subject_mastery').update({
      accuracy_percent: Math.round((newCorrect / newTotal) * 100),
      total_questions: newTotal,
      correct_answers: newCorrect,
      last_updated: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('subject_mastery').insert({
      student_id: u.id,
      subject,
      accuracy_percent: accuracy,
      total_questions: totalQuestions,
      correct_answers: correctCount,
    })
  }

  // Update concept_mastery for each question (if we can detect the concept).
  // Parallel — N independent RPCs blocked serially otherwise add ~N×100ms.
  try {
    await Promise.all(questions.map(async (q) => {
      let slug: string | null = q.concept_slug || null
      if (slug) {
        const valid = await validateConceptSlug(slug)
        if (!valid) slug = null
      }
      if (!slug) {
        const detected = await detectConcept({
          text: q.question || '',
          subject,
          classLevel: className || 10,
        })
        if (detected) slug = detected.concept_slug
      }
      if (slug) {
        await supabase.rpc('update_concept_mastery', {
          p_student_id: u.id,
          p_concept_slug: slug,
          p_correct: !!q.correct,
        })
      }
    }))
  } catch (err) {
    console.warn('[practice/complete] concept_mastery update failed (non-fatal):', err)
  }

  // Trigger mid-session recomputation (async, non-blocking)
  recomputeForStudent(u.id).catch(e => console.warn('[practice/complete] recompute failed:', e))

  return c.json({ ok: true, sessionId: session?.id, xpAwarded: xpAmount, accuracy, correctCount, totalQuestions })
})

ai.post('/evaluate', async (c) => c.json({ error: 'Not implemented yet' }, 501))

// ═══ POST /api/ai/tts — Google Cloud TTS proxy with in-memory LRU cache ═══
// ─────────────────────────────────────────────────────────────────────────
// Cost control: in-memory LRU cache keyed by sha256(text::voice). Hits return
// cached MP3 (no Google call). 500-entry cap ≈ ~50MB RAM worst case (100KB/clip).
// If `GOOGLE_TTS_API_KEY` is not set the endpoint returns 501 — the frontend
// falls back to browser speechSynthesis (see useSpeech.js).
//
// Voice: defaults to en-IN-Wavenet-D (warm Indian English female). Override
// via env `LLM_TTS_VOICE`. Full list: https://cloud.google.com/text-to-speech/docs/voices
// ─────────────────────────────────────────────────────────────────────────
const TTS_CACHE_MAX = 500
const ttsCache = new Map<string, { audio: Buffer; lastAccess: number; hits: number }>()
let ttsBytesServed = 0
let ttsCharsBilled = 0

ai.post('/tts', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  // Google TTS bills per character (~$16/M chars Wavenet). 60/min/user is
  // ample for one Listen click per bubble in heavy session use; the LRU
  // cache absorbs repeats so this rarely binds in practice.
  const limited = checkRateLimit(c, `tts:${u.id}`, 60, 60_000)
  if (limited) return limited

  const { text, voice: voiceOverride } = await c.req.json<any>()
  if (!text || typeof text !== 'string') {
    return c.json({ error: 'text (non-empty string) is required' }, 400)
  }

  // Cap: 5000 chars per call. Longer answers truncate. Google allows 5000 for plain text.
  const clean = text.trim().slice(0, 5000)
  if (!clean) return c.json({ error: 'text empty after trim' }, 400)

  const voice = voiceOverride || process.env.LLM_TTS_VOICE || 'en-IN-Wavenet-D'
  const langCode = voice.startsWith('en-IN') ? 'en-IN'
                 : voice.startsWith('hi-IN') ? 'hi-IN'
                 : 'en-IN'

  const hash = createHash('sha256').update(`${clean}::${voice}`).digest('hex')

  // Cache hit → serve from memory
  const cached = ttsCache.get(hash)
  if (cached) {
    cached.lastAccess = Date.now()
    cached.hits++
    ttsBytesServed += cached.audio.length
    c.header('Content-Type', 'audio/mpeg')
    c.header('X-TTS-Cache', 'hit')
    c.header('Cache-Control', 'public, max-age=3600')
    return c.body(cached.audio as any)
  }

  // Miss → call Google
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return c.json({ error: 'TTS not configured — GOOGLE_TTS_API_KEY missing', fallbackToBrowser: true }, 501)
  }

  try {
    const t0 = Date.now()
    const resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: clean },
          voice: { languageCode: langCode, name: voice },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0 },
        }),
      }
    )
    if (!resp.ok) {
      const errBody = await resp.text()
      console.error('[TTS] Google error', resp.status, errBody.slice(0, 300))
      return c.json({ error: 'TTS generation failed', status: resp.status, fallbackToBrowser: true }, 502)
    }
    const { audioContent } = await resp.json() as any
    if (!audioContent) {
      return c.json({ error: 'No audio returned', fallbackToBrowser: true }, 502)
    }
    const audio = Buffer.from(audioContent, 'base64')
    const latencyMs = Date.now() - t0
    ttsCharsBilled += clean.length

    // LRU evict: drop oldest entry if at cap
    if (ttsCache.size >= TTS_CACHE_MAX) {
      let oldestKey: string | null = null
      let oldestTime = Infinity
      for (const [k, v] of ttsCache.entries()) {
        if (v.lastAccess < oldestTime) { oldestTime = v.lastAccess; oldestKey = k }
      }
      if (oldestKey) ttsCache.delete(oldestKey)
    }
    ttsCache.set(hash, { audio, lastAccess: Date.now(), hits: 0 })
    ttsBytesServed += audio.length

    console.log(`[TTS] miss: ${clean.length} chars → ${audio.length}B MP3 (${latencyMs}ms, voice=${voice})`)

    c.header('Content-Type', 'audio/mpeg')
    c.header('X-TTS-Cache', 'miss')
    c.header('Cache-Control', 'public, max-age=3600')
    return c.body(audio as any)
  } catch (err: any) {
    console.error('[TTS] fetch failed:', err.message)
    return c.json({ error: 'TTS network error', fallbackToBrowser: true }, 500)
  }
})

// Admin helper: /api/ai/tts/stats — cache size, bytes served, chars billed
ai.get('/tts/stats', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  const totalHits = [...ttsCache.values()].reduce((s, e) => s + e.hits, 0)
  return c.json({
    cacheEntries: ttsCache.size,
    cacheCap: TTS_CACHE_MAX,
    totalCacheHits: totalHits,
    totalBytesServed: ttsBytesServed,
    totalCharsBilled: ttsCharsBilled,
    voice: process.env.LLM_TTS_VOICE || 'en-IN-Wavenet-D',
    configured: Boolean(process.env.GOOGLE_TTS_API_KEY),
  })
})

// ═══ WORKSHEET GENERATOR ═══
// Teacher provides a free-text prompt (e.g. "10 questions on Ohm's Law for
// Class 10, mixed difficulty, MCQs and numericals"). We parse intent + generate
// structured questions in ONE LLM call (gpt-4o-mini — handles JSON well enough
// and keeps latency under 10s). If `validate=true` (default), a second cheap
// LLM pass checks each question; questions flagged as invalid get one
// regeneration attempt before being surfaced with a warning flag.
//
// Returns JSON, not SSE — worksheets are not streamed.
ai.post('/worksheet', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  // gpt-4o-mini generation + validation + per-flagged regen → multi-call cost
  // per request. 10/min/teacher is more than enough for human-paced authoring.
  const limited = checkRateLimit(c, `worksheet:${u.id}`, 10, 60_000)
  if (limited) return limited
  const { prompt, validate = true } = await c.req.json<any>()
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return c.json({ error: 'prompt (free-text brief) is required' }, 400)
  }

  // Get teacher context (class they teach, school — for hints; not strict)
  const { data: profile } = await supabase
    .from('profiles').select('class_level, full_name').eq('id', u.id).single()

  const systemPrompt = `You are a CBSE curriculum expert generating classroom worksheets.
A teacher will give you a brief in natural language. Parse it to determine:
- subject (Physics/Chemistry/Biology/Mathematics/English/etc)
- class_level (8-12; default to the teacher's class if unspecified)
- chapter (NCERT chapter name, best match)
- topic (concept within the chapter)
- question_types (mcq / short_answer / long_answer / numerical / fill_in_blank / true_false)
- difficulty (easy / medium / hard / mixed)
- total_questions (default 10 if unspecified)

Then generate the worksheet as structured JSON. Group questions into sections by type.

Question quality rules:
- Factually accurate, CBSE-aligned
- Use Unicode symbols only (°, ×, ÷, √, π, Ω, α, β, θ, ₂, ²) — NEVER LaTeX ($...$, \\frac, \\sqrt)
- Each question has a complete answer + one-line explanation
- MCQs: exactly 4 options (A, B, C, D), ONE correct, 3 plausible distractors
- Numericals: include step-by-step solution in answer_explanation
- Each question is self-contained (no "refer to diagram above")

OUTPUT JSON SCHEMA (strict):
{
  "title": "Short descriptive title (e.g., 'Ohm's Law Practice — Class 10 Physics')",
  "subject": "Physics",
  "class_level": 10,
  "chapter": "Electricity",
  "topic": "Ohm's Law",
  "difficulty": "mixed",
  "intent_summary": "One sentence describing what you understood from the teacher's brief",
  "sections": [
    {
      "name": "Section A — MCQs (1 mark each)",
      "instructions": "Choose the correct option.",
      "marks_per_question": 1,
      "questions": [
        {
          "question": "Full question text.",
          "type": "mcq",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
          "answer": "B",
          "answer_explanation": "Why B is correct, briefly."
        }
      ]
    },
    {
      "name": "Section B — Numerical Problems (3 marks each)",
      "instructions": "Show your working.",
      "marks_per_question": 3,
      "questions": [
        {
          "question": "A 5Ω resistor has 2A flowing through it. Find the voltage.",
          "type": "numerical",
          "answer": "V = 10 V",
          "answer_explanation": "Using Ohm's law V = IR = 2 × 5 = 10 V"
        }
      ]
    }
  ],
  "total_marks": 40
}

Return ONLY this JSON. No surrounding prose, no markdown fences.`

  const teacherContext = `Teacher: ${profile?.full_name || 'Unknown'}${profile?.class_level ? `, teaches Class ${profile.class_level}` : ''}\n\nTeacher's brief: ${prompt.trim()}`

  // ─── Step 1: Generate ───
  const genStart = Date.now()
  let worksheet: any
  let modelUsed = ''
  let fallbackFired = false
  try {
    const primaryModel = process.env.LLM_WORKSHEET || 'gpt-4o-mini'
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openaiClient.chat.completions.create({
      model: primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: teacherContext },
      ],
      max_tokens: 4000,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    worksheet = JSON.parse(raw)
    modelUsed = `openai/${primaryModel}`
  } catch (err: any) {
    const msg = err.message || String(err)
    console.error('[worksheet] generation failed:', msg)
    await logLLMCall({
      endpoint: 'other',
      userId: u.id,
      model: process.env.LLM_WORKSHEET || 'gpt-4o-mini',
      latencyMs: Date.now() - genStart,
      error: msg,
      metadata: { phase: 'worksheet-generate', prompt: prompt.slice(0, 500) },
    })
    return c.json({ error: `Generation failed: ${msg.slice(0, 200)}` }, 500)
  }

  // Normalise: fill in safe defaults + compute total_marks + stamp validation state
  worksheet.sections = (worksheet.sections || []).map((s: any) => ({
    ...s,
    questions: (s.questions || []).map((q: any) => ({
      ...q,
      validated: null, // null = not checked, true = passed, false = flagged
      validation_issues: [] as string[],
    })),
  }))
  // Always recompute total_marks from actual section content — LLMs regularly
  // miscount (e.g., claims "30 marks" for 4 MCQs + 2 numericals = 10 marks).
  worksheet.total_marks = worksheet.sections.reduce(
    (sum: number, s: any) => sum + (s.questions.length * (s.marks_per_question || 1)), 0
  )

  await logLLMCall({
    endpoint: 'other',
    userId: u.id,
    model: modelUsed,
    latencyMs: Date.now() - genStart,
    metadata: {
      phase: 'worksheet-generate',
      prompt: prompt.slice(0, 500),
      subject: worksheet.subject,
      class: worksheet.class_level,
      totalQuestions: worksheet.sections.reduce((n: number, s: any) => n + s.questions.length, 0),
    },
  })

  // ─── Step 2: Validate (optional) ───
  let validationRan = false
  let flaggedCount = 0
  let regeneratedCount = 0
  if (validate) {
    validationRan = true
    const validationModel = (process.env.LLM_VALIDATION || 'groq/llama-3.1-8b-instant').replace('groq/', '')
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Flatten questions for batch validation, keep back-pointers so we can update in place
    type QRef = { sectionIdx: number, questionIdx: number }
    const refs: QRef[] = []
    const payload: any[] = []
    worksheet.sections.forEach((s: any, si: number) => {
      s.questions.forEach((q: any, qi: number) => {
        refs.push({ sectionIdx: si, questionIdx: qi })
        payload.push({
          idx: refs.length - 1,
          type: q.type,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.answer_explanation,
        })
      })
    })

    // Batch validation — one LLM call for up to 30 questions
    const validationPrompt = `You are a CBSE question-quality auditor. For each question below, decide if it is acceptable for a Class ${worksheet.class_level} ${worksheet.subject} classroom worksheet.

CHECK FOR:
- Factual accuracy (does the stated answer actually follow from the question?)
- Ambiguity (is there exactly ONE defensible answer?)
- For MCQs: is the correct option actually correct? Are distractors plausible but wrong? Are two options accidentally correct?
- Clarity (can a Class ${worksheet.class_level} student understand the wording?)
- Self-containment (does it reference missing diagrams/tables?)

Return JSON with this shape, no surrounding prose:
{
  "results": [
    { "idx": 0, "valid": true, "issues": [] },
    { "idx": 1, "valid": false, "issues": ["Two options could both be correct", "Answer references a diagram not provided"] }
  ]
}

QUESTIONS:
${JSON.stringify(payload, null, 2)}`

    const valStart = Date.now()
    try {
      const valCompletion = await groqClient.chat.completions.create({
        model: validationModel,
        messages: [
          { role: 'system', content: 'You are a strict but fair CBSE question auditor. Return valid JSON only.' },
          { role: 'user', content: validationPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
      const valRaw = valCompletion.choices[0]?.message?.content || '{"results":[]}'
      const parsed = JSON.parse(valRaw)
      const results: any[] = parsed.results || []

      // Apply validation results
      for (const r of results) {
        if (typeof r.idx !== 'number' || !refs[r.idx]) continue
        const ref = refs[r.idx]
        const q = worksheet.sections[ref.sectionIdx].questions[ref.questionIdx]
        q.validated = r.valid === true
        q.validation_issues = Array.isArray(r.issues) ? r.issues : []
        if (!q.validated) flaggedCount++
      }

      await logLLMCall({
        endpoint: 'other',
        userId: u.id,
        model: `groq/${validationModel}`,
        latencyMs: Date.now() - valStart,
        metadata: {
          phase: 'worksheet-validate',
          totalChecked: payload.length,
          flagged: flaggedCount,
        },
      })
    } catch (err: any) {
      console.warn('[worksheet] validation failed, skipping:', err.message)
      // Validation is best-effort — if it fails, return the unvalidated worksheet
    }

    // ─── Step 2b: Regenerate flagged questions (one attempt each) ───
    // Only regenerate if there are flagged questions AND we have the OpenAI key
    if (flaggedCount > 0) {
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const primaryModel = process.env.LLM_WORKSHEET || 'gpt-4o-mini'

      for (const ref of refs) {
        const q = worksheet.sections[ref.sectionIdx].questions[ref.questionIdx]
        if (q.validated === false) {
          try {
            const regenPrompt = `A question was flagged as invalid. Write a REPLACEMENT question.

CONTEXT:
- Subject: ${worksheet.subject}
- Class: ${worksheet.class_level}
- Chapter: ${worksheet.chapter}
- Topic: ${worksheet.topic}
- Section: ${worksheet.sections[ref.sectionIdx].name}
- Question type: ${q.type}
- Marks: ${worksheet.sections[ref.sectionIdx].marks_per_question}

ISSUES WITH THE ORIGINAL (fix these):
${q.validation_issues.map((i: string) => `- ${i}`).join('\n')}

ORIGINAL QUESTION (do not reuse):
${q.question}

Return the replacement as JSON matching the same shape as the original. Use Unicode symbols only. Return ONLY the JSON object, no surrounding prose.

Example shape for MCQ:
{"question":"...","type":"mcq","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"B","answer_explanation":"..."}`

            const completion = await openaiClient.chat.completions.create({
              model: primaryModel,
              messages: [
                { role: 'system', content: 'You are a CBSE question writer. Output valid JSON only.' },
                { role: 'user', content: regenPrompt },
              ],
              max_tokens: 600,
              temperature: 0.7, // higher temp so regen is actually different from original
              response_format: { type: 'json_object' },
            })
            const raw = completion.choices[0]?.message?.content || ''
            const fresh = JSON.parse(raw)
            // Overwrite in place, mark as regenerated so UI can show "⟳ regenerated"
            worksheet.sections[ref.sectionIdx].questions[ref.questionIdx] = {
              ...fresh,
              validated: true, // trust the regen (phase 1 — don't re-validate to cap cost)
              validation_issues: [],
              regenerated: true,
            }
            regeneratedCount++
          } catch (err: any) {
            console.warn('[worksheet] regen failed for question, leaving flagged:', err.message)
          }
        }
      }
    }
  }

  return c.json({
    worksheet,
    meta: {
      modelUsed,
      fallbackFired,
      validationRan,
      flaggedCount,
      regeneratedCount,
      totalGenerationMs: Date.now() - genStart,
    },
  })
})

// ═══ WORKSHEET SAVE / LIST / GET ═══
// Save a generated worksheet to the `worksheets` table. The same endpoint is
// used for "update" — pass an existing `id` and it will overwrite.
ai.post('/worksheet/save', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  const { id, worksheet, prompt } = await c.req.json<any>()
  if (!worksheet || !worksheet.title || !Array.isArray(worksheet.sections)) {
    return c.json({ error: 'worksheet.title and worksheet.sections are required' }, 400)
  }

  // `mode` and `source_pdf` are preserved from the worksheet payload when the
  // upstream generator set them (mimic does; custom generator doesn't).
  const mode: 'custom' | 'mimic' = worksheet.mode === 'mimic' ? 'mimic' : 'custom'
  const row = {
    teacher_id: u.id,
    title: String(worksheet.title).slice(0, 200),
    subject: worksheet.subject || 'General',
    class_level: worksheet.class_level || 10,
    chapter: worksheet.chapter || null,
    mode,
    difficulty: worksheet.difficulty || 'mixed',
    total_questions: worksheet.sections.reduce(
      (n: number, s: any) => n + (s.questions?.length || 0), 0
    ),
    sections: worksheet.sections,
    source_pdf: worksheet.source_pdf || null,
    model_used: worksheet.model_used || null,
  }

  if (id) {
    // Update: only allowed if teacher owns this row
    const { data: existing } = await supabase
      .from('worksheets').select('teacher_id').eq('id', id).single()
    if (!existing || existing.teacher_id !== u.id) {
      return c.json({ error: 'Not found or not yours' }, 404)
    }
    const { data, error } = await supabase
      .from('worksheets').update(row).eq('id', id).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json({ worksheet: data, created: false })
  } else {
    const { data, error } = await supabase
      .from('worksheets').insert(row).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json({ worksheet: data, created: true })
  }
})

ai.get('/worksheet/list', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  const { data, error } = await supabase
    .from('worksheets')
    .select('id, title, subject, class_level, chapter, difficulty, total_questions, created_at, model_used')
    .eq('teacher_id', u.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ worksheets: data || [] })
})

ai.get('/worksheet/:id', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  const id = c.req.param('id')
  const { data, error } = await supabase
    .from('worksheets').select('*').eq('id', id).eq('teacher_id', u.id).single()
  if (error || !data) return c.json({ error: 'Not found' }, 404)
  return c.json({ worksheet: data })
})

ai.delete('/worksheet/:id', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  const id = c.req.param('id')
  const { error } = await supabase
    .from('worksheets').delete().eq('id', id).eq('teacher_id', u.id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ═══ CBSE PAPER MIMIC ═══
// Teacher uploads a past CBSE paper (PDF). We extract text, ask the LLM to
// (a) infer the paper's structure (sections, marks distribution, question
// types, chapters), then (b) generate a BRAND NEW paper with the same
// structure but fresh questions. Output shape matches `/worksheet` so the
// same save/list/preview/export surfaces work — we just stamp `mode: 'mimic'`
// and `source_pdf: <filename>` at save time.
ai.post('/mimic', async (c) => {
  const auth = await requireTeacher(c)
  if (auth instanceof Response) return auth
  const u = auth
  // Heaviest endpoint: PDF parse (up to 15 MB) + gpt-4o-mini @ 6000 tokens
  // + validation + regen. 5/min/teacher matches the human pace of "upload,
  // wait 30s, review, upload again."
  const limited = checkRateLimit(c, `mimic:${u.id}`, 5, 60_000)
  if (limited) return limited

  // Multipart: pdf file + optional validate flag + optional hint text
  const form = await c.req.formData()
  const file = form.get('pdf') as File | null
  const validate = form.get('validate') !== 'false' // default true
  const hint = (form.get('hint') as string | null)?.trim() || ''

  if (!file) return c.json({ error: 'pdf file is required (multipart field "pdf")' }, 400)
  if (file.size > 15 * 1024 * 1024) {
    return c.json({ error: 'PDF too large (max 15 MB)' }, 400)
  }

  // ─── Step 1: Extract text ───
  let pdfText = ''
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const pdf = await pdfParse(buffer)
    pdfText = (pdf.text || '').trim()
  } catch (err: any) {
    return c.json({ error: `PDF parse failed: ${err.message}` }, 500)
  }
  if (!pdfText) return c.json({ error: 'No text found in PDF — is it a scanned image?' }, 400)

  // Truncate if enormous (past papers are usually 5-20k chars; cap at ~24k for the LLM)
  const MAX = 24000
  const truncated = pdfText.length > MAX
  const excerpt = truncated ? pdfText.slice(0, MAX) + '\n\n[...truncated for length]' : pdfText

  // ─── Step 2: Infer structure + generate new paper (single LLM call) ───
  const systemPrompt = `You are a CBSE paper-mimicking expert. You'll be given the text of a past CBSE board paper. Your job:

STEP 1 — ANALYZE the source paper's structure:
- Number of sections and what each is called (e.g. "Section A - MCQs", "Section B - Very Short Answer")
- Question types in each section (mcq, short_answer, long_answer, numerical, fill_in_blank, true_false)
- Marks per question per section
- Chapters / topics covered
- Class level and subject

STEP 2 — GENERATE a brand-new paper with the SAME STRUCTURE but entirely fresh, different questions. Do NOT reuse any question verbatim. Same difficulty range, same chapter coverage, same marks distribution.

Question quality rules (non-negotiable):
- Factually accurate, CBSE-aligned, Class-appropriate wording
- Use Unicode symbols only (°, ×, ÷, √, π, Ω, α, β, θ, ₂, ²) — NEVER LaTeX ($...$, \\frac, \\sqrt)
- Each question has a complete answer + one-line explanation
- MCQs: exactly 4 options (A, B, C, D), ONE correct, 3 plausible distractors
- Numericals: include step-by-step solution in answer_explanation
- Each question self-contained (no "refer to diagram above")

OUTPUT JSON SCHEMA (strict — match this exactly):
{
  "title": "Mimicked paper title (e.g., 'CBSE Class 10 Physics — Practice Paper (mimicked from 2024 paper)')",
  "subject": "Physics",
  "class_level": 10,
  "chapter": "Board exam mix",
  "topic": "Multiple chapters",
  "difficulty": "mixed",
  "intent_summary": "One sentence: what the source paper covered + that you preserved its structure",
  "sections": [
    {
      "name": "Section A — Multiple Choice Questions (1 mark each)",
      "instructions": "Choose the correct option.",
      "marks_per_question": 1,
      "questions": [
        { "question": "...", "type": "mcq", "options": {"A":"...","B":"...","C":"...","D":"..."}, "answer": "B", "answer_explanation": "..." }
      ]
    }
  ],
  "total_marks": 80
}

Return ONLY this JSON. No surrounding prose, no markdown fences.`

  const userMsg = `FILENAME: ${file.name}
${hint ? `\nTEACHER HINT: ${hint}\n` : ''}
SOURCE PAPER TEXT${truncated ? ' (truncated)' : ''}:
${excerpt}`

  const genStart = Date.now()
  let paper: any
  let modelUsed = ''
  try {
    const primaryModel = process.env.LLM_WORKSHEET || 'gpt-4o-mini'
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openaiClient.chat.completions.create({
      model: primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 6000, // papers can be larger than worksheets
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    paper = JSON.parse(raw)
    modelUsed = `openai/${primaryModel}`
  } catch (err: any) {
    const msg = err.message || String(err)
    console.error('[mimic] generation failed:', msg)
    await logLLMCall({
      endpoint: 'other',
      userId: u.id,
      model: process.env.LLM_WORKSHEET || 'gpt-4o-mini',
      latencyMs: Date.now() - genStart,
      error: msg,
      metadata: { phase: 'mimic-generate', filename: file.name, pdfChars: pdfText.length },
    })
    return c.json({ error: `Generation failed: ${msg.slice(0, 200)}` }, 500)
  }

  // Stamp normalisation — same shape as /worksheet expects
  paper.sections = (paper.sections || []).map((s: any) => ({
    ...s,
    questions: (s.questions || []).map((q: any) => ({
      ...q,
      validated: null,
      validation_issues: [] as string[],
    })),
  }))
  paper.total_marks = paper.sections.reduce(
    (sum: number, s: any) => sum + (s.questions.length * (s.marks_per_question || 1)), 0
  )
  paper.mode = 'mimic'
  paper.source_pdf = file.name

  await logLLMCall({
    endpoint: 'other',
    userId: u.id,
    model: modelUsed,
    latencyMs: Date.now() - genStart,
    metadata: {
      phase: 'mimic-generate',
      filename: file.name,
      pdfChars: pdfText.length,
      truncated,
      subject: paper.subject,
      class: paper.class_level,
      totalQuestions: paper.sections.reduce((n: number, s: any) => n + s.questions.length, 0),
    },
  })

  // ─── Step 3: Validate + regenerate (same logic as /worksheet) ───
  let validationRan = false
  let flaggedCount = 0
  let regeneratedCount = 0
  if (validate) {
    validationRan = true
    const validationModel = (process.env.LLM_VALIDATION || 'groq/llama-3.1-8b-instant').replace('groq/', '')
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

    type QRef = { sectionIdx: number, questionIdx: number }
    const refs: QRef[] = []
    const payload: any[] = []
    paper.sections.forEach((s: any, si: number) => {
      s.questions.forEach((q: any, qi: number) => {
        refs.push({ sectionIdx: si, questionIdx: qi })
        payload.push({
          idx: refs.length - 1,
          type: q.type, question: q.question, options: q.options,
          answer: q.answer, explanation: q.answer_explanation,
        })
      })
    })

    const validationPrompt = `You are a CBSE question-quality auditor. For each question below, decide if it is acceptable for a Class ${paper.class_level} ${paper.subject} board-style exam paper.

CHECK FOR:
- Factual accuracy (does the stated answer actually follow from the question?)
- Ambiguity (is there exactly ONE defensible answer?)
- For MCQs: is the correct option actually correct? Are distractors plausible but wrong? Are two options accidentally correct?
- Clarity (can a Class ${paper.class_level} student understand the wording?)
- Self-containment (does it reference missing diagrams/tables?)

Return JSON: {"results":[{"idx":0,"valid":true,"issues":[]}, ...]}

QUESTIONS:
${JSON.stringify(payload, null, 2)}`

    const valStart = Date.now()
    try {
      const valCompletion = await groqClient.chat.completions.create({
        model: validationModel,
        messages: [
          { role: 'system', content: 'You are a strict but fair CBSE question auditor. Return valid JSON only.' },
          { role: 'user', content: validationPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
      const valRaw = valCompletion.choices[0]?.message?.content || '{"results":[]}'
      const parsed = JSON.parse(valRaw)
      const results: any[] = parsed.results || []

      for (const r of results) {
        if (typeof r.idx !== 'number' || !refs[r.idx]) continue
        const ref = refs[r.idx]
        const q = paper.sections[ref.sectionIdx].questions[ref.questionIdx]
        q.validated = r.valid === true
        q.validation_issues = Array.isArray(r.issues) ? r.issues : []
        if (!q.validated) flaggedCount++
      }

      await logLLMCall({
        endpoint: 'other',
        userId: u.id,
        model: `groq/${validationModel}`,
        latencyMs: Date.now() - valStart,
        metadata: { phase: 'mimic-validate', totalChecked: payload.length, flagged: flaggedCount },
      })
    } catch (err: any) {
      console.warn('[mimic] validation failed, skipping:', err.message)
    }

    // Regenerate flagged
    if (flaggedCount > 0) {
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const primaryModel = process.env.LLM_WORKSHEET || 'gpt-4o-mini'

      for (const ref of refs) {
        const q = paper.sections[ref.sectionIdx].questions[ref.questionIdx]
        if (q.validated === false) {
          try {
            const regenPrompt = `A question was flagged as invalid. Write a REPLACEMENT question preserving the exam-paper style.

CONTEXT:
- Subject: ${paper.subject}  | Class: ${paper.class_level}
- Section: ${paper.sections[ref.sectionIdx].name}
- Type: ${q.type}  | Marks: ${paper.sections[ref.sectionIdx].marks_per_question}

ISSUES (fix these):
${q.validation_issues.map((i: string) => `- ${i}`).join('\n')}

ORIGINAL (do not reuse):
${q.question}

Return JSON matching the original shape. Unicode symbols only. Return ONLY the JSON.`

            const completion = await openaiClient.chat.completions.create({
              model: primaryModel,
              messages: [
                { role: 'system', content: 'You are a CBSE question writer. Output valid JSON only.' },
                { role: 'user', content: regenPrompt },
              ],
              max_tokens: 600,
              temperature: 0.7,
              response_format: { type: 'json_object' },
            })
            const fresh = JSON.parse(completion.choices[0]?.message?.content || '{}')
            paper.sections[ref.sectionIdx].questions[ref.questionIdx] = {
              ...fresh,
              validated: true,
              validation_issues: [],
              regenerated: true,
            }
            regeneratedCount++
          } catch (err: any) {
            console.warn('[mimic] regen failed, leaving flagged:', err.message)
          }
        }
      }
    }
  }

  return c.json({
    worksheet: paper, // same shape → same preview/save/export
    meta: {
      modelUsed,
      validationRan,
      flaggedCount,
      regeneratedCount,
      totalGenerationMs: Date.now() - genStart,
      sourcePdf: file.name,
      sourcePdfBytes: file.size,
      pdfTruncated: truncated,
    },
  })
})

export default ai
