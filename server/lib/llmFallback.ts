// ═══ LLM fallback helper ═══
// Primary: Groq (fast + free tier). Fallback: OpenAI GPT-4o-mini on any
// Groq failure (rate limit, timeout, 5xx). Goal: student rarely sees an error.
//
// Two modes:
//   • streamWithFallback — for SSE streaming endpoints (doubt, vision)
//   • completeWithFallback — for one-shot JSON completions (practice, test)
//
// Fallback only fires if the PRIMARY call throws BEFORE returning any content.
// If Groq starts streaming successfully and then fails mid-way, we don't
// swap providers (that would produce garbled output).
import Groq from 'groq-sdk'
import OpenAI from 'openai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface FallbackResult {
  modelUsed: string
  fallbackFired: boolean
  primaryError?: string
}

/**
 * Streaming completion with automatic OpenAI fallback.
 * Caller provides onChunk callback that receives each text delta.
 * Returns metadata about which model served the response.
 */
export async function streamWithFallback(params: {
  messages: { role: string; content: string }[]
  systemPrompt?: string
  primaryModel?: string
  fallbackModel?: string
  maxTokens?: number
  temperature?: number
  onChunk: (text: string) => void | Promise<void>
}): Promise<FallbackResult> {
  const {
    messages,
    systemPrompt,
    primaryModel = (process.env.LLM_DOUBT_SIMPLE || 'groq/llama-3.3-70b-versatile').replace('groq/', ''),
    fallbackModel = process.env.LLM_FALLBACK || 'gpt-4o-mini',
    maxTokens = 800,
    temperature = 0.3,
    onChunk,
  } = params

  const chatMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  // Track whether ANY content was already streamed to the caller. If Groq
  // emits chunks then errors mid-stream, falling back to OpenAI would re-stream
  // a fresh full answer on top of the partial one — the student would see
  // garbled output. Only fall back when the primary failed before any output.
  let firstChunkDelivered = false

  // ─── Try Groq first ───
  try {
    const completion = await groq.chat.completions.create({
      model: primaryModel,
      messages: chatMessages as any,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    })
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        firstChunkDelivered = true
        await onChunk(text)
      }
    }
    return { modelUsed: `groq/${primaryModel}`, fallbackFired: false }
  } catch (primaryErr: any) {
    const primaryMsg = primaryErr.message || String(primaryErr)
    if (firstChunkDelivered) {
      console.error(`[LLM fallback] Groq failed AFTER streaming started (${primaryMsg.slice(0, 120)}). Re-streaming on OpenAI would garble output — surfacing primary error.`)
      throw primaryErr
    }
    console.warn(`[LLM fallback] Groq failed (${primaryMsg.slice(0, 120)}), trying OpenAI ${fallbackModel}...`)

    // ─── Fallback to OpenAI ───
    try {
      const completion = await openai.chat.completions.create({
        model: fallbackModel,
        messages: chatMessages as any,
        stream: true,
        max_tokens: maxTokens,
        temperature,
      })
      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) await onChunk(text)
      }
      return {
        modelUsed: `openai/${fallbackModel}`,
        fallbackFired: true,
        primaryError: primaryMsg,
      }
    } catch (fallbackErr: any) {
      // Both providers failed — surface the primary error (more informative) to caller.
      const fallbackMsg = fallbackErr.message || String(fallbackErr)
      console.error('[LLM fallback] Both providers failed:', { primary: primaryMsg, fallback: fallbackMsg })
      const composite = new Error(`Primary (${primaryModel}) failed: ${primaryMsg}. Fallback (${fallbackModel}) failed: ${fallbackMsg}`)
      ;(composite as any).primaryError = primaryMsg
      ;(composite as any).fallbackError = fallbackMsg
      throw composite
    }
  }
}

/**
 * One-shot JSON completion with automatic OpenAI fallback.
 * Returns the parsed JSON + metadata.
 */
export async function completeWithFallback(params: {
  messages: { role: string; content: string }[]
  systemPrompt?: string
  primaryModel?: string
  fallbackModel?: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}): Promise<{ content: string } & FallbackResult> {
  const {
    messages,
    systemPrompt,
    primaryModel = (process.env.LLM_PRACTICE_GEN || 'groq/llama-3.3-70b-versatile').replace('groq/', ''),
    fallbackModel = process.env.LLM_FALLBACK || 'gpt-4o-mini',
    maxTokens = 1500,
    temperature = 0.4,
    jsonMode = false,
  } = params

  const chatMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  try {
    const completion = await groq.chat.completions.create({
      model: primaryModel,
      messages: chatMessages as any,
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    })
    const content = (completion as any).choices[0]?.message?.content || ''
    return { content, modelUsed: `groq/${primaryModel}`, fallbackFired: false }
  } catch (primaryErr: any) {
    const primaryMsg = primaryErr.message || String(primaryErr)
    console.warn(`[LLM fallback] Groq failed (${primaryMsg.slice(0, 120)}), trying OpenAI ${fallbackModel}...`)
    try {
      const completion = await openai.chat.completions.create({
        model: fallbackModel,
        messages: chatMessages as any,
        max_tokens: maxTokens,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      })
      const content = completion.choices[0]?.message?.content || ''
      return {
        content,
        modelUsed: `openai/${fallbackModel}`,
        fallbackFired: true,
        primaryError: primaryMsg,
      }
    } catch (fallbackErr: any) {
      const fallbackMsg = fallbackErr.message || String(fallbackErr)
      console.error('[LLM fallback] Both providers failed:', { primary: primaryMsg, fallback: fallbackMsg })
      const composite = new Error(`Primary (${primaryModel}) failed: ${primaryMsg}. Fallback (${fallbackModel}) failed: ${fallbackMsg}`)
      ;(composite as any).primaryError = primaryMsg
      ;(composite as any).fallbackError = fallbackMsg
      throw composite
    }
  }
}
