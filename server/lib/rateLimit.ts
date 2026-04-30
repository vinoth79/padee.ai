// ═══════════════════════════════════════════════════════════════════════════
// rateLimit — in-memory sliding-window per-key rate limiter
// ═══════════════════════════════════════════════════════════════════════════
// Keeps cost-runaway in check on the paid LLM endpoints (/visual, /practice,
// /worksheet, /mimic, /tts). A leaked or compromised auth token can otherwise
// loop a route at hundreds of req/sec and run up the OpenAI/Groq/Google bill.
//
// Strategy: in-memory Map<key, timestamps[]>. Each call records `now`, prunes
// timestamps older than `windowMs`, and rejects if the count is at `max`.
// Sliding window (not fixed bucket) so a burst at the boundary doesn't double.
//
// Trade-offs / non-goals (Phase 1):
//   • Process-local. Two server instances behind a load balancer would each
//     have their own counter — effective limit doubles. We're single-instance
//     on Railway, so fine.
//   • No persistence — restart wipes the window. Acceptable; the goal is to
//     stop runaway loops, not to bill students by the request.
//   • Not a security boundary. Intentional. A rate limiter caps blast radius;
//     auth + role checks gate access.
// ═══════════════════════════════════════════════════════════════════════════

const buckets = new Map<string, number[]>()

/**
 * Returns true if the call is allowed (and records it). Returns false to
 * indicate the caller should respond with 429.
 */
export function rateLimitOk(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs
  const arr = buckets.get(key) || []
  // Prune in place, then check.
  let writeIdx = 0
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > cutoff) arr[writeIdx++] = arr[i]
  }
  arr.length = writeIdx
  if (arr.length >= max) {
    buckets.set(key, arr)
    return false
  }
  arr.push(now)
  buckets.set(key, arr)
  return true
}

/**
 * Time in ms until the next allowed call for this key, given the same
 * (max, windowMs). Useful for the Retry-After header. Returns 0 if currently
 * allowed.
 */
export function rateLimitRetryAfterMs(key: string, max: number, windowMs: number): number {
  const arr = buckets.get(key) || []
  if (arr.length < max) return 0
  // Earliest-of-the-current-window timestamp + windowMs = when it falls out
  // of the sliding window, freeing a slot.
  const oldest = arr[arr.length - max] // index of the (max-from-end)th call
  const freeAt = oldest + windowMs
  return Math.max(0, freeAt - Date.now())
}

/**
 * Hono-friendly wrapper. Returns a 429 Response (with Retry-After) when the
 * call should be rejected, or null when allowed. Caller pattern:
 *
 *   const limited = checkRateLimit(c, `visual:${u.id}`, 20, 60_000)
 *   if (limited) return limited
 */
export function checkRateLimit(c: any, key: string, max: number, windowMs: number): Response | null {
  if (rateLimitOk(key, max, windowMs)) return null
  const retrySec = Math.max(1, Math.ceil(rateLimitRetryAfterMs(key, max, windowMs) / 1000))
  c.header('Retry-After', String(retrySec))
  return c.json({
    error: 'Rate limit exceeded — slow down a moment.',
    retryAfterSec: retrySec,
  }, 429)
}

// Periodic cleanup: drop keys whose latest timestamp is older than 24h. Keeps
// the Map from growing unboundedly when many users hit briefly and stop.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000  // hourly
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000  // 24h
setInterval(() => {
  const cutoff = Date.now() - CLEANUP_AGE_MS
  for (const [key, arr] of buckets.entries()) {
    if (arr.length === 0 || arr[arr.length - 1] < cutoff) buckets.delete(key)
  }
}, CLEANUP_INTERVAL_MS).unref?.()  // .unref so this timer doesn't block exit
