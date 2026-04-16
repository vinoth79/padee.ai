import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { logLLMCall } from '../lib/llmLog.js'
import { getAppConfig } from './admin.js'
import { detectConcept, validateConceptSlug } from '../lib/conceptDetection.js'
import { recomputeForStudent } from '../cron/recompute-recommendations.js'
import Groq from 'groq-sdk'
import OpenAI from 'openai'

// ═══ Streak updater — called after any XP award ═══
async function updateStreak(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: streak } = await supabase
      .from('student_streaks')
      .select('*')
      .eq('student_id', userId)
      .single()

    if (!streak) return

    const lastActive = streak.last_active_date
    if (lastActive === today) return // already updated today

    // Calculate if yesterday was the last active day
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newStreak: number
    if (lastActive === yesterdayStr) {
      // Consecutive day — increment streak
      newStreak = (streak.current_streak || 0) + 1
    } else if (!lastActive) {
      // First ever activity
      newStreak = 1
    } else {
      // Missed a day — reset to 1
      newStreak = 1
    }

    const longestStreak = Math.max(newStreak, streak.longest_streak || 0)

    await supabase.from('student_streaks').update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    }).eq('student_id', userId)

    // Award streak bonus XP if streak >= 2
    if (newStreak >= 2) {
      const config = await getAppConfig()
      const bonus = config.xpRewards?.streakBonus || 5
      // Only award once per day — check if streak XP already given today
      const { count } = await supabase
        .from('student_xp')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId)
        .eq('source', 'streak')
        .gte('created_at', `${today}T00:00:00`)
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

  try {
    const embeddingRes = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: question,
    })
    const queryEmbedding = embeddingRes.data[0].embedding

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

    // Step 3: Retrieve NCERT chunks via pgvector cosine similarity
    const { data: chunks } = await supabase.rpc('search_ncert_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_subject: subject || 'Physics',
      match_class: className || 10,
      match_count: 4,
      match_threshold: 0.5,
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

  // Step 5: Build the prompt with memory injection
  const systemPrompt = buildSystemPrompt(subject, className, ncertContext, memory)

  // Step 5: Stream LLM response via Groq (Llama-70B)
  const fullMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  let fullResponse = ''
  const t0 = Date.now()

  return streamSSE(c, async (stream) => {
    try {
      const completion = await groq.chat.completions.create({
        model: process.env.LLM_DOUBT_SIMPLE?.replace('groq/', '') || 'llama-3.3-70b-versatile',
        messages: fullMessages,
        stream: true,
        max_tokens: 800,
        temperature: 0.3,
      })

      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          fullResponse += text
          await stream.writeSSE({ data: JSON.stringify({ text }) })
        }
      }

      // Detect memory usage once, reuse across audit log + cache decision + SSE metadata
      const memoryUsedDecisionEarly = detectMemoryUsage(fullResponse, memoryObj.tokens)

      // Log the LLM call for audit
      logLLMCall({
        timestamp: new Date().toISOString(),
        endpoint: 'doubt',
        userId: u.id,
        model: process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile',
        systemPrompt,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        response: fullResponse,
        latencyMs: Date.now() - t0,
        cacheHit: false,
        ncertChunksUsed: ncertContext ? ncertContext.split('[Source').length - 1 : 0,
        ncertSource: ncertSource || undefined,
        metadata: { subject, className, ncertConfidence, memoryUsed: memoryUsedDecisionEarly, memoryTokens: memoryObj.tokens },
      }).catch(() => {})

      // Save the session and response
      const { data: session } = await supabase.from('doubt_sessions').insert({
        student_id: u.id,
        subject: subject || 'Physics',
        class_level: className || 10,
        question_text: question,
        ai_response: fullResponse,
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
      if (fullResponse.length > 50 && !memoryUsedDecision) {
        try {
          const respEmbedding = await openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
            input: question,
          })
          await supabase.from('response_cache').insert({
            question_text: question,
            question_embedding: JSON.stringify(respEmbedding.data[0].embedding),
            subject: subject || 'Physics',
            class_level: className || 10,
            ai_response: fullResponse,
            model_used: process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile',
          })
        } catch {}
      }

      // Send metadata as final SSE event (reuse the memory detection from cache decision)
      await stream.writeSSE({
        data: JSON.stringify({
          sessionId: session?.id,
          ncertSource: ncertConfidence > 0.55 ? ncertSource : '',
          cacheHit: false,
          memoryUsed: memoryUsedDecision,
        })
      })
      await stream.writeSSE({ data: '[DONE]' })
    } catch (err: any) {
      console.error('[AI] LLM streaming error:', err)
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
          fullResponse += text
          await stream.writeSSE({ data: JSON.stringify({ text }) })
        }
      }

      // Save session (store a truncated image reference -- data URL is too large)
      const { data: session } = await supabase.from('doubt_sessions').insert({
        student_id: userId,
        subject: subject || 'Physics',
        class_level: className || 10,
        question_text: `[PHOTO] ${question || '(no text)'}`,
        ai_response: fullResponse,
        model_used: `groq/${visionModel}`,
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
        model: `groq/${visionModel}`,
        systemPrompt,
        messages: [
          ...priorTurns,
          { role: 'user', content: `[IMAGE ${Math.round(imageDataUrl.length / 1024)}KB] ${question || '(no text)'}` },
        ],
        response: fullResponse,
        latencyMs: Date.now() - t0,
        cacheHit: false,
        metadata: { subject, className, photo: true },
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

FORMATTING RULES (CRITICAL -- the frontend does NOT render LaTeX):
- DO NOT use LaTeX syntax like $F = BIL \\sin \\theta$. It will show as raw text to the student.
- Use plain text with Unicode symbols: θ (theta), °, Ω (ohm), × (multiply), ÷, √, π, α, β, Δ, ≈, ≤, ≥, ², ³
- Example GOOD: "F = BIL sin θ where B is the magnetic field in tesla"
- Example BAD: "$F = BIL \\sin \\theta$ where \\(B\\) is..."
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

function buildSystemPrompt(subject: string, className: number, ncertContext: string, memory: string): string {
  let prompt = `You are Padee, an AI tutor for CBSE Class ${className} ${subject || 'students'}.
You help Indian students understand their NCERT textbook content.

Rules:
- Answer using ONLY the NCERT content provided below. If the NCERT context doesn't cover the topic, say so honestly.
- Use step-by-step explanations with CBSE terminology.
- Keep responses under 400 words. Be concise but thorough.
- Use simple English appropriate for Class ${className} students.
- Include relevant formulas, definitions, and examples from NCERT.
- Temperature: be factual for definitions, slightly creative for analogies only.`

  if (memory) {
    prompt += `\n\n--- STUDENT CONTEXT ---\n${memory}\n--- END STUDENT CONTEXT ---

PERSONALISATION RULE:
If the current question is related to anything in the Recent questions list, START your response with a brief acknowledgement that connects to it.
Examples (use this exact pattern when relevant):
- "Building on what you asked about [topic] earlier, ..."
- "Since you recently asked about [topic], let's now look at ..."
- "Following up on [topic], ..."

If the question is on a weak subject for the student, gently note it (e.g. "I see you've been working on [subject] -- here's a clearer take").

If there is NO meaningful connection, do NOT force one -- just answer normally. Forced personalisation is worse than none.`
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

  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('doubt_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', u.id)
    .gte('created_at', `${today}T00:00:00`)

  // Phase 1: unlimited (limit: -1 signals no cap to frontend)
  return c.json({ count: count || 0, limit: -1 })
})

// Stub routes -- to be implemented

// ═══ POST /api/ai/visual -- Generate HTML/SVG visualisation (UI spec Screen 19) ═══
ai.post('/visual', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

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
    return c.json({ error: err.message || 'Visual generation failed', fallback: true }, 500)
  }
})

// ═══ POST /api/ai/practice -- Generate a single MCQ on a given topic/context ═══
ai.post('/practice', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { topic, context, subject, className, count = 1 } = await c.req.json()

  if (!topic && !context) {
    return c.json({ error: 'Provide either topic or context' }, 400)
  }

  const systemPrompt = `You are a CBSE Class ${className || 10} ${subject || 'Physics'} teacher creating practice MCQs.
Generate ${count} multiple-choice question${count > 1 ? 's' : ''} on the given topic/context.

STRICT JSON output format ONLY -- no markdown, no preamble, no explanation outside the JSON.
Schema:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Brief reason why the correct answer is right"
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
7. Randomise correctIndex across questions (do not always put the answer at index 0).`

  const userPrompt = context
    ? `Create an MCQ based on this explanation:\n\n${context}\n\nFocus on the core concept a Class ${className || 10} student just learnt.`
    : `Create an MCQ on: ${topic}`

  const tPractice0 = Date.now()
  const practiceModel = process.env.LLM_PRACTICE_GEN?.replace('groq/', '') || 'llama-3.1-8b-instant'

  try {
    const completion = await groq.chat.completions.create({
      model: practiceModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'practice',
      userId: u.id,
      model: `groq/${practiceModel}`,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      response: raw,
      latencyMs: Date.now() - tPractice0,
      metadata: { subject: subject || 'Physics', className: className || 10 },
    }).catch(() => {})

    const parsed = JSON.parse(raw)

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return c.json({ error: 'Invalid LLM output' }, 500)
    }
    const valid = parsed.questions.filter((q: any) =>
      q.question && Array.isArray(q.options) && q.options.length === 4
      && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
    )
    if (valid.length === 0) {
      return c.json({ error: 'LLM produced no valid questions' }, 500)
    }

    return c.json({ questions: valid })
  } catch (err: any) {
    console.error('[AI] Practice generation error:', err)
    return c.json({ error: err.message || 'Practice generation failed' }, 500)
  }
})
// ═══ POST /api/ai/practice/complete — Save results + award XP + update mastery ═══
ai.post('/practice/complete', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { subject, className, questions, correctCount, totalQuestions } = await c.req.json()
  if (!subject || !questions || !totalQuestions) return c.json({ error: 'Missing fields' }, 400)

  // Save practice session
  const { data: session } = await supabase.from('practice_sessions').insert({
    student_id: u.id,
    subject,
    class_level: className || 10,
    difficulty: 'mixed',
    total_questions: totalQuestions,
    correct_count: correctCount || 0,
    questions,
    completed: true,
  }).select('id').single()

  // Award XP from admin config
  const config = await getAppConfig()
  const xpAmount = config.xpRewards?.practiceSession || 15
  await supabase.from('student_xp').insert({
    student_id: u.id,
    amount: xpAmount,
    source: 'practice',
    metadata: { session_id: session?.id, subject, correctCount, totalQuestions },
  })

  // Update streak
  updateStreak(u.id).catch(() => {})

  // Update subject_mastery (running average)
  const accuracy = Math.round((correctCount / totalQuestions) * 100)
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

  // Update concept_mastery for each question (if we can detect the concept)
  try {
    for (const q of questions as any[]) {
      // Prefer explicit concept_slug on question (LLM-provided); else detect from question text
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
        const wasCorrect = typeof q.correct === 'boolean' ? q.correct : (q.studentAnswer === q.correctIndex)
        await supabase.rpc('update_concept_mastery', {
          p_student_id: u.id,
          p_concept_slug: slug,
          p_correct: !!wasCorrect,
        })
      }
    }
  } catch (err) {
    console.warn('[practice/complete] concept_mastery update failed (non-fatal):', err)
  }

  // Trigger mid-session recomputation (async, non-blocking)
  recomputeForStudent(u.id).catch(e => console.warn('[practice/complete] recompute failed:', e))

  return c.json({ ok: true, sessionId: session?.id, xpAwarded: xpAmount, accuracy })
})

ai.post('/evaluate', async (c) => c.json({ error: 'Not implemented yet' }, 501))
ai.post('/worksheet', async (c) => c.json({ error: 'Not implemented yet' }, 501))
ai.post('/mimic', async (c) => c.json({ error: 'Not implemented yet' }, 501))

export default ai
