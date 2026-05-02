import { promises as fs } from 'fs'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'llm-calls.jsonl')
const MAX_ENTRIES = 500
// DPDP retention cap: drop entries older than 7 days from the on-disk
// JSONL on every rotation + at boot. The audit log persists prompts AND
// responses with userId — that's a lot of student-derived data to keep
// indefinitely. Seven days is enough for ops debugging (catch a bug
// reported a few days later) without becoming a long-term PII repository.
const RETENTION_DAYS = 7
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

// Ensure log directory exists (sync - happens once at startup)
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

export interface LLMCallLog {
  timestamp: string
  endpoint: 'doubt' | 'visual' | 'practice' | 'evaluate' | 'worksheet' | 'test_generate' | 'other'
  userId?: string
  model: string
  systemPrompt: string
  messages: { role: string; content: string }[]
  response: string
  latencyMs: number
  cacheHit?: boolean
  ncertChunksUsed?: number
  ncertSource?: string
  error?: string
  metadata?: Record<string, any>
}

// In-memory ring buffer for fast reads (the UI reads from here)
const buffer: LLMCallLog[] = []

export async function logLLMCall(entry: LLMCallLog): Promise<void> {
  // Echo to stdout for dev visibility
  const preview = entry.response ? entry.response.slice(0, 80).replace(/\n/g, ' ') : '(error)'
  console.log(`[LLM ${entry.endpoint}] ${entry.model} ${entry.latencyMs}ms ${entry.cacheHit ? '(cached)' : ''} -> ${preview}...`)

  // Push to in-memory ring buffer
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.shift()

  // Async append to file (non-blocking - don't let logging slow responses)
  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n')
    // Rotate if file exceeds ~5 MB (check size every 10 writes)
    if (buffer.length % 10 === 0) {
      const stat = await fs.stat(LOG_FILE).catch(() => null)
      if (stat && stat.size > 5 * 1024 * 1024) {
        await rotateLog()
      }
    }
  } catch (err) {
    console.error('[LLM Log] Failed to write to file:', err)
  }
}

async function rotateLog() {
  try {
    // Drop entries older than the retention window (DPDP minimisation),
    // then keep at most MAX_ENTRIES of what remains. Buffer is already
    // length-bounded; we filter by timestamp here so rotation also
    // applies the time cap.
    const cutoffMs = Date.now() - RETENTION_MS
    const fresh = buffer.filter(e => {
      const t = Date.parse(e.timestamp)
      return Number.isFinite(t) && t >= cutoffMs
    })
    const lines = fresh.map(e => JSON.stringify(e))
    await fs.writeFile(LOG_FILE, lines.length > 0 ? lines.join('\n') + '\n' : '')
    // Reflect the drop in the in-memory buffer too so /admin/llm-log
    // doesn't surface entries we just expired from disk.
    buffer.length = 0
    buffer.push(...fresh)
  } catch (err) {
    console.error('[LLM Log] Rotation failed:', err)
  }
}

export function getRecentCalls(limit = 50): LLMCallLog[] {
  return buffer.slice(-limit).reverse()
}

// Load any existing file entries into the buffer on startup. Also enforces
// the retention window — entries older than RETENTION_DAYS are dropped at
// boot AND the file is rewritten without them. Without this, the on-disk
// log grows unbounded across deploys (rotation only fires when the file
// crosses 5MB, which can take weeks of low traffic).
export async function loadExistingLog(): Promise<void> {
  try {
    if (!existsSync(LOG_FILE)) return
    const content = await fs.readFile(LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const cutoffMs = Date.now() - RETENTION_MS
    const entries: LLMCallLog[] = []
    let dropped = 0
    for (const line of lines) {
      try {
        const e: LLMCallLog = JSON.parse(line)
        const t = Date.parse(e.timestamp)
        if (Number.isFinite(t) && t < cutoffMs) { dropped++; continue }
        entries.push(e)
      } catch { dropped++ }
    }
    // Trim to MAX_ENTRIES (most recent) for the in-memory buffer.
    const recent = entries.slice(-MAX_ENTRIES)
    buffer.push(...recent)
    // Rewrite the file if we dropped anything — keeps disk in sync with the
    // retention policy, not just the buffer.
    if (dropped > 0) {
      try {
        await fs.writeFile(
          LOG_FILE,
          entries.length > 0 ? entries.map(e => JSON.stringify(e)).join('\n') + '\n' : '',
        )
      } catch (err) {
        console.warn('[LLM Log] retention rewrite failed:', err)
      }
    }
    console.log(`[LLM Log] Loaded ${recent.length} prior log entries${dropped > 0 ? ` (${dropped} expired by retention)` : ''}`)
  } catch (err) {
    console.error('[LLM Log] Failed to load existing log:', err)
  }
}
