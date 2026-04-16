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
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
}))

// Mount routes
app.route('/api', health)
app.route('/api/user', user)
app.route('/api/ai', ai)
app.route('/api/admin', admin)
app.route('/api/test', test)
app.route('/api/admin/concepts', concepts)
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
