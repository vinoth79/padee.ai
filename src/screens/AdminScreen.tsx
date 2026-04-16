import { useState, useEffect, useRef } from 'react'
import ConceptCatalogTab from '../components/admin/ConceptCatalogTab'

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English', 'Social Science', 'Economics', 'Accounts', 'Business Studies']
const CLASSES = [8, 9, 10, 11, 12]

interface Upload {
  id: string
  subject: string
  class_level: number
  chapter_number: number | null
  chapter_name: string | null
  filename: string
  file_size: number
  chunk_count: number
  status: 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
}

interface LLMCall {
  timestamp: string
  endpoint: string
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

export default function AdminScreen() {
  const [tab, setTab] = useState<'content' | 'audit' | 'users' | 'config' | 'catalog'>('content')
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')

  // User management state
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  // Config state
  const [appConfig, setAppConfig] = useState<any>(null)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg] = useState('')

  // LLM audit state
  const [llmCalls, setLlmCalls] = useState<LLMCall[]>([])
  const [llmFilter, setLlmFilter] = useState<string>('')
  const [expandedCall, setExpandedCall] = useState<number | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Upload state
  const [subject, setSubject] = useState('Physics')
  const [classLevel, setClassLevel] = useState(10)
  const [chapterNumber, setChapterNumber] = useState('')
  const [chapterName, setChapterName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Content library
  const [uploads, setUploads] = useState<Upload[]>([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [loadingContent, setLoadingContent] = useState(false)

  const adminHeaders = { 'X-Admin-Password': password }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    try {
      const r = await fetch('/api/admin/content', { headers: { 'X-Admin-Password': password } })
      if (r.ok) {
        setAuthed(true)
        setAuthError('')
        loadContent()
      } else {
        setAuthError('Incorrect admin password')
      }
    } catch {
      setAuthError('Server not reachable')
    }
  }

  async function loadContent() {
    setLoadingContent(true)
    try {
      const r = await fetch('/api/admin/content', { headers: adminHeaders })
      const data = await r.json()
      setUploads(data.uploads || [])
      setTotalChunks(data.totalChunks || 0)
    } finally {
      setLoadingContent(false)
    }
  }

  // Poll for processing status
  useEffect(() => {
    if (!authed) return
    const processing = uploads.filter(u => u.status === 'processing')
    if (processing.length === 0) return
    const interval = setInterval(loadContent, 3000)
    return () => clearInterval(interval)
  }, [uploads, authed])

  // Load LLM audit log
  async function loadLLMLog() {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (llmFilter) params.set('endpoint', llmFilter)
      const r = await fetch(`/api/admin/llm-log?${params}`, { headers: adminHeaders })
      const data = await r.json()
      setLlmCalls(data.calls || [])
    } catch {}
  }

  // Load users
  async function loadUsers() {
    setUsersLoading(true)
    try {
      const r = await fetch('/api/admin/users', { headers: adminHeaders })
      const data = await r.json()
      setUsers(data.users || [])
    } finally { setUsersLoading(false) }
  }

  async function changeRole(email: string, newRole: string) {
    setRoleChanging(email)
    try {
      await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole }),
      })
      await loadUsers()
    } finally { setRoleChanging(null) }
  }

  // Auto-load users when tab is active
  useEffect(() => {
    if (!authed || tab !== 'users') return
    loadUsers()
  }, [authed, tab])

  // Load config when tab is active
  async function loadConfig() {
    try {
      const r = await fetch('/api/admin/config', { headers: adminHeaders })
      setAppConfig(await r.json())
    } catch {}
  }

  async function saveConfig() {
    if (!appConfig) return
    setConfigSaving(true); setConfigMsg('')
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(appConfig),
      })
      setConfigMsg('Saved!')
      setTimeout(() => setConfigMsg(''), 2000)
    } catch { setConfigMsg('Failed to save') }
    finally { setConfigSaving(false) }
  }

  useEffect(() => {
    if (!authed || tab !== 'config') return
    loadConfig()
  }, [authed, tab])

  // Auto-refresh log when on audit tab
  useEffect(() => {
    if (!authed || tab !== 'audit') return
    loadLLMLog()
    if (!autoRefresh) return
    const interval = setInterval(loadLLMLog, 3000)
    return () => clearInterval(interval)
  }, [authed, tab, llmFilter, autoRefresh])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadStatus('Uploading PDF...')

    const form = new FormData()
    form.append('pdf', file)
    form.append('subject', subject)
    form.append('classLevel', classLevel.toString())
    if (chapterNumber) form.append('chapterNumber', chapterNumber)
    if (chapterName) form.append('chapterName', chapterName)

    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: adminHeaders,
        body: form,
      })
      const data = await r.json()
      if (r.ok) {
        setUploadStatus('Processing... Extracting text and generating embeddings.')
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        setChapterNumber('')
        setChapterName('')
        loadContent()
      } else {
        setUploadStatus(`Error: ${data.error}`)
      }
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this content and all its chunks?')) return
    await fetch(`/api/admin/content/${id}`, { method: 'DELETE', headers: adminHeaders })
    loadContent()
  }

  async function handleReindex(id: string) {
    // Open a hidden file input to get the PDF
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const form = new FormData()
      form.append('pdf', f)
      await fetch(`/api/admin/content/${id}/reindex`, {
        method: 'POST',
        headers: adminHeaders,
        body: form,
      })
      loadContent()
    }
    input.click()
  }

  // Auth screen
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <form onSubmit={handleAuth} className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm">
          <h1 className="text-xl font-semibold text-teal-600 mb-1">Padee.ai Admin</h1>
          <p className="text-sm text-gray-500 mb-6">NCERT Content Management</p>
          <input type="password" placeholder="Admin password" value={password}
            onChange={e => setPassword(e.target.value)} autoFocus
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button type="submit"
            className="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 transition-colors">
            Enter
          </button>
        </form>
      </div>
    )
  }

  // Main admin panel
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Padee.ai Admin</h1>
            <p className="text-sm text-gray-500">
              {tab === 'content' ? 'NCERT Content Upload'
                : tab === 'audit' ? 'LLM Audit Log'
                : tab === 'users' ? 'User Management'
                : tab === 'catalog' ? 'Concept Catalog'
                : 'App Configuration'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {tab === 'content' && (
              <div className="text-sm text-gray-500">
                Total indexed: <span className="font-semibold text-teal-600">{uploads.filter(u => u.status === 'completed').length} PDFs</span>
                {' | '}
                <span className="font-semibold text-teal-600">{totalChunks} passages</span>
              </div>
            )}
            {tab === 'audit' && (
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-teal-600">{llmCalls.length} recent calls</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {[
            { id: 'content' as const, label: 'NCERT Content' },
            { id: 'catalog' as const, label: 'Concept Catalog' },
            { id: 'audit' as const, label: 'LLM Audit' },
            { id: 'users' as const, label: 'Users' },
            { id: 'config' as const, label: 'Config' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'audit' ? (
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Audit toolbar */}
          <div className="bg-white border rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filter:</span>
            {['', 'doubt', 'visual', 'practice'].map(f => (
              <button key={f || 'all'} onClick={() => setLlmFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  llmFilter === f
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}>
                {f || 'All'}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                Auto-refresh (3s)
              </label>
              <button onClick={loadLLMLog}
                className="text-xs font-medium text-teal-700 hover:underline">
                Refresh now
              </button>
            </div>
          </div>

          {/* Calls list */}
          {llmCalls.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-400">
              No LLM calls yet. Ask a doubt or click "Explain visually" in the student app.
            </div>
          ) : (
            <div className="space-y-2">
              {llmCalls.map((call, i) => {
                const isOpen = expandedCall === i
                const endpointColors: Record<string, string> = {
                  doubt: 'bg-blue-50 text-blue-700 border-blue-200',
                  visual: 'bg-purple-50 text-purple-700 border-purple-200',
                  practice: 'bg-orange-50 text-orange-700 border-orange-200',
                }
                const color = endpointColors[call.endpoint] || 'bg-gray-50 text-gray-700 border-gray-200'
                return (
                  <div key={i} className="bg-white border rounded-xl overflow-hidden">
                    {/* Row header */}
                    <button onClick={() => setExpandedCall(isOpen ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>
                        {call.endpoint}
                      </span>
                      {call.cacheHit && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          Cached
                        </span>
                      )}
                      {call.error && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Error
                        </span>
                      )}
                      <span className="text-xs font-mono text-gray-500">{call.model}</span>
                      <span className="text-xs text-gray-400">{call.latencyMs}ms</span>
                      <span className="flex-1 truncate text-sm text-gray-700">
                        {call.messages?.[call.messages.length - 1]?.content?.slice(0, 100) || '(no user message)'}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                        {new Date(call.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-gray-400 text-sm flex-shrink-0">{isOpen ? '▾' : '▸'}</span>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t bg-gray-50 px-4 py-4 space-y-3 text-xs font-mono">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mb-1">Metadata</div>
                          <div className="bg-white border rounded p-2 text-gray-700 space-y-0.5">
                            <div>User: {call.userId || '-'}</div>
                            <div>Latency: {call.latencyMs} ms</div>
                            <div>Model: {call.model}</div>
                            {call.ncertChunksUsed !== undefined && <div>NCERT chunks used: {call.ncertChunksUsed}</div>}
                            {call.ncertSource && <div>NCERT source: {call.ncertSource}</div>}
                            {call.metadata && <div>Extra: {JSON.stringify(call.metadata)}</div>}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mb-1">System prompt</div>
                          <pre className="bg-white border rounded p-2 text-gray-700 whitespace-pre-wrap max-h-80 overflow-auto">{call.systemPrompt}</pre>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mb-1">Messages ({call.messages?.length || 0})</div>
                          <div className="space-y-1">
                            {call.messages?.map((m, mi) => (
                              <div key={mi} className="bg-white border rounded p-2">
                                <div className="text-[10px] uppercase font-bold text-teal-700 mb-1">{m.role}</div>
                                <pre className="text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">{m.content}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mb-1">Response</div>
                          <pre className="bg-white border rounded p-2 text-gray-700 whitespace-pre-wrap max-h-80 overflow-auto">{call.response || '(no response / error)'}</pre>
                        </div>
                        {call.error && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-red-600 tracking-wide mb-1">Error</div>
                            <pre className="bg-red-50 border border-red-200 rounded p-2 text-red-700">{call.error}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : tab === 'config' ? (
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {!appConfig ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-400">Loading config...</div>
          ) : (
            <>
              {/* XP Rewards */}
              <div className="bg-white border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">XP Rewards</h2>
                <p className="text-xs text-gray-500 mb-3">Points awarded for each student action.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'textDoubt', label: 'Text Doubt', default: 10 },
                    { key: 'photoDoubt', label: 'Photo Doubt', default: 10 },
                    { key: 'practiceSession', label: 'Practice Session', default: 15 },
                    { key: 'testCompletion', label: 'Test Completion', default: 25 },
                    { key: 'streakBonus', label: 'Streak Bonus (per day)', default: 5 },
                  ].map(item => (
                    <div key={item.key}>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{item.label}</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min={0} max={1000}
                          value={appConfig.xpRewards?.[item.key] ?? item.default}
                          onChange={e => setAppConfig({
                            ...appConfig,
                            xpRewards: { ...appConfig.xpRewards, [item.key]: +e.target.value }
                          })}
                          className="w-full border rounded-lg px-3 py-2 text-sm" />
                        <span className="text-xs text-gray-400 whitespace-nowrap">XP</span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Daily XP Goal</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="number" min={10} max={500}
                        value={appConfig.dailyGoal ?? 50}
                        onChange={e => setAppConfig({ ...appConfig, dailyGoal: +e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Challenge */}
              <div className="bg-white border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Daily Challenge</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Questions</label>
                    <input type="number" min={1} max={50} value={appConfig.dailyChallenge?.questionCount || 5}
                      onChange={e => setAppConfig({...appConfig, dailyChallenge: {...appConfig.dailyChallenge, questionCount: +e.target.value}})}
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">XP Reward</label>
                    <input type="number" min={0} max={500} value={appConfig.dailyChallenge?.xpReward || 30}
                      onChange={e => setAppConfig({...appConfig, dailyChallenge: {...appConfig.dailyChallenge, xpReward: +e.target.value}})}
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={appConfig.dailyChallenge?.preferWeakSubject ?? true}
                        onChange={e => setAppConfig({...appConfig, dailyChallenge: {...appConfig.dailyChallenge, preferWeakSubject: e.target.checked}})} />
                      Prefer weak subject
                    </label>
                  </div>
                </div>
              </div>

              {/* Test Settings */}
              <div className="bg-white border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Test Settings</h2>
                <p className="text-xs text-gray-500 mb-3">Timer, XP rewards, and available lengths for timed tests.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col text-xs">
                    <span className="text-gray-600 mb-1">Seconds per question</span>
                    <input type="number" min={15} max={300}
                      value={appConfig.test?.secondsPerQuestion || 60}
                      onChange={e => setAppConfig({...appConfig, test: { ...(appConfig.test || {}), secondsPerQuestion: +e.target.value }})}
                      className="px-2 py-1.5 border rounded-lg" />
                  </label>
                  <label className="flex flex-col text-xs">
                    <span className="text-gray-600 mb-1">Base XP per test</span>
                    <input type="number" min={0} max={500}
                      value={appConfig.test?.baseXp || 50}
                      onChange={e => setAppConfig({...appConfig, test: { ...(appConfig.test || {}), baseXp: +e.target.value }})}
                      className="px-2 py-1.5 border rounded-lg" />
                  </label>
                  <label className="flex flex-col text-xs">
                    <span className="text-gray-600 mb-1">Bonus threshold (%)</span>
                    <input type="number" min={50} max={100}
                      value={appConfig.test?.bonusXpThreshold || 80}
                      onChange={e => setAppConfig({...appConfig, test: { ...(appConfig.test || {}), bonusXpThreshold: +e.target.value }})}
                      className="px-2 py-1.5 border rounded-lg" />
                  </label>
                  <label className="flex flex-col text-xs">
                    <span className="text-gray-600 mb-1">Bonus XP</span>
                    <input type="number" min={0} max={200}
                      value={appConfig.test?.bonusXp || 20}
                      onChange={e => setAppConfig({...appConfig, test: { ...(appConfig.test || {}), bonusXp: +e.target.value }})}
                      className="px-2 py-1.5 border rounded-lg" />
                  </label>
                </div>
              </div>

              {/* Weak Topic Threshold */}
              <div className="bg-white border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Weak Topic Threshold</h2>
                <p className="text-xs text-gray-500 mb-2">Subjects with accuracy below this % will show as "weak" on the student dashboard.</p>
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={100} value={appConfig.weakTopicThreshold || 70}
                    onChange={e => setAppConfig({...appConfig, weakTopicThreshold: +e.target.value})}
                    className="flex-1" />
                  <span className="text-lg font-bold font-mono text-teal-700 w-14 text-right">{appConfig.weakTopicThreshold || 70}%</span>
                </div>
              </div>

              {/* Badges */}
              <div className="bg-white border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900">Badges</h2>
                  <button onClick={() => setAppConfig({...appConfig, badges: [...(appConfig.badges || []), { id: `badge_${Date.now()}`, name: 'New Badge', icon: '🏅', condition: 'doubts >= 1' }]})}
                    className="text-xs font-semibold text-teal-600 hover:underline">+ Add badge</button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Conditions: <code className="bg-gray-100 px-1">doubts &gt;= N</code>, <code className="bg-gray-100 px-1">photoDoubts &gt;= N</code>, <code className="bg-gray-100 px-1">streak &gt;= N</code>, <code className="bg-gray-100 px-1">xp &gt;= N</code>, <code className="bg-gray-100 px-1">subjects &gt;= N</code>
                </p>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="py-2 font-medium">Icon</th>
                      <th className="py-2 font-medium">Name</th>
                      <th className="py-2 font-medium">Condition</th>
                      <th className="py-2 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(appConfig.badges || []).map((badge: any, i: number) => (
                      <tr key={badge.id || i} className="border-b last:border-b-0">
                        <td className="py-2 pr-2">
                          <input value={badge.icon} onChange={e => {
                            const b = [...appConfig.badges]; b[i] = {...b[i], icon: e.target.value}; setAppConfig({...appConfig, badges: b})
                          }} className="w-12 border rounded px-2 py-1 text-center" />
                        </td>
                        <td className="py-2 pr-2">
                          <input value={badge.name} onChange={e => {
                            const b = [...appConfig.badges]; b[i] = {...b[i], name: e.target.value}; setAppConfig({...appConfig, badges: b})
                          }} className="w-full border rounded px-2 py-1 text-sm" />
                        </td>
                        <td className="py-2 pr-2">
                          <input value={badge.condition} onChange={e => {
                            const b = [...appConfig.badges]; b[i] = {...b[i], condition: e.target.value}; setAppConfig({...appConfig, badges: b})
                          }} className="w-full border rounded px-2 py-1 text-sm font-mono" />
                        </td>
                        <td className="py-2">
                          <button onClick={() => {
                            const b = appConfig.badges.filter((_:any, j:number) => j !== i); setAppConfig({...appConfig, badges: b})
                          }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3">
                <button onClick={saveConfig} disabled={configSaving}
                  className="bg-teal-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {configSaving ? 'Saving...' : 'Save Config'}
                </button>
                {configMsg && <span className="text-sm text-teal-600 font-medium">{configMsg}</span>}
              </div>
            </>
          )}
        </div>
      ) : tab === 'catalog' ? (
        <ConceptCatalogTab adminHeaders={adminHeaders} />
      ) : tab === 'users' ? (
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{users.length} registered users</p>
            <button onClick={loadUsers} className="text-xs text-teal-600 font-medium hover:underline">Refresh</button>
          </div>

          {usersLoading ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-sm text-gray-400">No users registered yet.</div>
          ) : (
            <div className="bg-white border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Track</th>
                    <th className="px-4 py-3 font-medium text-right">XP</th>
                    <th className="px-4 py-3 font-medium text-right">Doubts</th>
                    <th className="px-4 py-3 font-medium text-right">Streak</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => {
                    const roleColors: Record<string, string> = {
                      student: 'bg-blue-50 text-blue-700 border-blue-200',
                      teacher: 'bg-purple-50 text-purple-700 border-purple-200',
                      parent: 'bg-amber-50 text-amber-700 border-amber-200',
                      admin: 'bg-red-50 text-red-700 border-red-200',
                    }
                    return (
                      <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{u.name || '—'}</div>
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role || 'student'}
                            onChange={e => changeRole(u.email, e.target.value)}
                            disabled={roleChanging === u.email}
                            className={`text-[11px] font-semibold px-2 py-1 rounded border cursor-pointer ${roleColors[u.role] || roleColors.student} ${roleChanging === u.email ? 'opacity-50' : ''}`}
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="parent">Parent</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{u.class_level ? `Class ${u.class_level}` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{u.active_track || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-900 font-mono text-right">{u.totalXP}</td>
                        <td className="px-4 py-3 text-xs text-gray-900 font-mono text-right">{u.totalDoubts}</td>
                        <td className="px-4 py-3 text-xs text-gray-900 font-mono text-right">{u.currentStreak}d</td>
                        <td className="px-4 py-3 text-[11px] text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Upload panel */}
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Upload NCERT PDF</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Class</label>
              <select value={classLevel} onChange={e => setClassLevel(Number(e.target.value))}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chapter # (optional)</label>
                <input type="number" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)}
                  placeholder="e.g. 12" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chapter name (optional)</label>
                <input type="text" value={chapterName} onChange={e => setChapterName(e.target.value)}
                  placeholder="e.g. Electricity" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PDF File</label>
              <div className="mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Drop NCERT PDF here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PDF only. Max 50MB.</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={!file || uploading}
              className="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {uploading ? 'Processing...' : 'Upload and Process PDF'}
            </button>

            {uploadStatus && (
              <div className={`text-xs p-3 rounded-lg ${uploadStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                <p className="font-medium">{uploadStatus}</p>
                {!uploadStatus.startsWith('Error') && (
                  <p className="text-[10px] mt-1 opacity-70">
                    Pipeline: Extracting text → Splitting into chunks → Generating embeddings → Storing in pgvector
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* RIGHT: Content library */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Content Library</h2>
            <button onClick={loadContent} className="text-xs text-teal-600 font-medium hover:underline">
              Refresh
            </button>
          </div>

          {loadingContent ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading...</p>
          ) : uploads.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No content uploaded yet. Upload your first NCERT PDF.</p>
          ) : (
            <div className="space-y-2">
              {uploads.map(u => (
                <div key={u.id} className="flex items-center gap-3 border rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.subject} Class {u.class_level}
                      {u.chapter_name ? ` - ${u.chapter_name}` : ''}
                      {u.chapter_number ? ` (Ch. ${u.chapter_number})` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {u.filename} | {u.chunk_count} chunks | {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.status === 'processing' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium animate-pulse">
                        Processing... ({u.chunk_count} chunks so far)
                      </span>
                    )}
                    {u.status === 'completed' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                        Done · {u.chunk_count} chunks
                      </span>
                    )}
                    {u.status === 'failed' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 font-medium" title={u.error_message || ''}>
                        Failed
                      </span>
                    )}
                    <button onClick={() => handleReindex(u.id)}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                      Re-index
                    </button>
                    <button onClick={() => handleDelete(u.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
