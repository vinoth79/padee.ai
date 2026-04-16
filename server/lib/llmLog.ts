import { promises as fs } from 'fs'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'llm-calls.jsonl')
const MAX_ENTRIES = 500

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
    // Keep only the last MAX_ENTRIES lines in the file
    const lines = buffer.map(e => JSON.stringify(e))
    await fs.writeFile(LOG_FILE, lines.join('\n') + '\n')
  } catch (err) {
    console.error('[LLM Log] Rotation failed:', err)
  }
}

export function getRecentCalls(limit = 50): LLMCallLog[] {
  return buffer.slice(-limit).reverse()
}

// Load any existing file entries into the buffer on startup
export async function loadExistingLog(): Promise<void> {
  try {
    if (!existsSync(LOG_FILE)) return
    const content = await fs.readFile(LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const entries: LLMCallLog[] = []
    for (const line of lines.slice(-MAX_ENTRIES)) {
      try { entries.push(JSON.parse(line)) } catch {}
    }
    buffer.push(...entries)
    console.log(`[LLM Log] Loaded ${entries.length} prior log entries`)
  } catch (err) {
    console.error('[LLM Log] Failed to load existing log:', err)
  }
}
