import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import 'dotenv/config'

import health from './routes/health.js'
import user from './routes/user.js'
import ai from './routes/ai.js'
import admin from './routes/admin.js'
import test from './routes/test.js'
import concepts from './routes/concepts.js'
import recommendations from './routes/recommendations.js'
import teacher from './routes/teacher.js'
import { loadExistingLog } from './lib/llmLog.js'

const app = new Hono()

// Middleware
app.use('*', logger())

// CORS — origins driven by env so prod (Vercel) doesn't need a code change.
// `ALLOWED_ORIGINS` is a comma-separated list; the localhost defaults below
// keep dev (vite picks 5173/5174/5175 depending on what's free) frictionless.
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
]
const allowedOrigins = (process.env.ALLOWED_ORIGINS || DEFAULT_DEV_ORIGINS.join(','))
  .split(',').map(s => s.trim()).filter(Boolean)
app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
}))

// Mount routes
app.route('/api', health)
app.route('/api/user', user)
app.route('/api/ai', ai)
// Mount /api/admin/concepts BEFORE /api/admin so concepts (which has its own
// dual-auth: X-Admin-Password OR Bearer token w/ teacher role) wins the prefix
// match. Otherwise /api/admin/* middleware would gate teachers out with 401.
app.route('/api/admin/concepts', concepts)
app.route('/api/admin', admin)
app.route('/api/test', test)
app.route('/api/recommendations', recommendations)
app.route('/api/teacher', teacher)

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT) || 3001
console.log(`Padee.ai backend starting on port ${port}`)

// Load prior LLM audit log into memory buffer (for fast admin reads)
loadExistingLog().catch(() => {})

serve({ fetch: app.fetch, port })
