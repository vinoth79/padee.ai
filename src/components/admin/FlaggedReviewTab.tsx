// ═══════════════════════════════════════════════════════════════════════════
// FlaggedReviewTab — moderation queue inside the admin panel.
// ═══════════════════════════════════════════════════════════════════════════
// Replaces /teacher/review. Students flag bad AI answers via the "Report
// incorrect" sheet on Ask AI; every flagged row lands here for an admin (or
// teacher) to triage:
//   • correct  — the AI was right, student misunderstood
//   • wrong    — the AI was wrong (add a correction note)
//   • partial  — partially right
// Notes become a training signal we can use to refine prompts later.
//
// Uses the X-Admin-Password header — backend's `requireReviewer` accepts
// EITHER that header OR a Bearer token with role=teacher/admin.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'

interface Props {
  adminHeaders: Record<string, string>
}

interface FlaggedRow {
  id: string
  question_text: string
  ai_response: string
  subject: string | null
  class_level: number | null
  report_text: string | null
  status: 'pending' | 'correct' | 'wrong' | 'partial'
  teacher_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  session_id: string | null
  student?: { id: string; name: string; class_level: number } | null
}

interface SessionMeta {
  ncert_source?: string
  ncert_confidence?: number
  model_used?: string
  cache_hit?: boolean
  created_at?: string
}

interface Detail {
  flagged: FlaggedRow & { reviewer?: { id: string; name: string } | null }
  session: SessionMeta | null
}

interface Summary {
  pending: number; correct: number; wrong: number; partial: number; total: number
}

const TABS = [
  { id: 'pending',  label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'all',      label: 'All' },
] as const

const STATUS_CHIPS: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E', label: 'Pending' },
  wrong:   { bg: '#FEE2E2', fg: '#991B1B', label: 'AI wrong' },
  correct: { bg: '#ECFDF5', fg: '#065F46', label: 'AI correct' },
  partial: { bg: '#E0E7FF', fg: '#3730A3', label: 'Partial' },
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIPS[status] || STATUS_CHIPS.pending
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function timeAgo(iso?: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function FlaggedReviewTab({ adminHeaders }: Props) {
  const [tab, setTab] = useState<'pending' | 'reviewed' | 'all'>('pending')
  const [subject, setSubject] = useState('')
  const [rows, setRows] = useState<FlaggedRow[]>([])
  const [summary, setSummary] = useState<Summary>({ pending: 0, wrong: 0, correct: 0, partial: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const subjects = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.subject) s.add(r.subject) })
    return Array.from(s).sort()
  }, [rows])

  async function reload() {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ status: tab, limit: '200' })
    if (subject) params.set('subject', subject)
    try {
      const r = await fetch(`/api/teacher/flagged?${params}`, { headers: adminHeaders })
      const data = await r.json()
      setLoading(false)
      if (!r.ok) { setError(data.error || 'Failed to load'); return }
      setRows(data.flagged || [])
      if (data.summary) setSummary(data.summary)
    } catch (e: any) {
      setLoading(false)
      setError(e.message || 'Network error')
    }
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, subject])

  async function openDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    setNotes('')
    try {
      const r = await fetch(`/api/teacher/flagged/${id}`, { headers: adminHeaders })
      const data = await r.json()
      setDetailLoading(false)
      if (!r.ok) { setError(data.error || 'Failed to load detail'); return }
      setDetail(data)
      setNotes(data.flagged?.teacher_notes || '')
    } catch (e: any) {
      setDetailLoading(false)
      setError(e.message || 'Network error')
    }
  }

  async function submitReview(status: 'correct' | 'wrong' | 'partial') {
    if (!selectedId) return
    setSaving(true)
    try {
      const r = await fetch(`/api/teacher/flagged/${selectedId}/review`, {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, teacher_notes: notes }),
      })
      const data = await r.json()
      setSaving(false)
      if (!r.ok) { setError(data.error || 'Save failed'); return }
      await reload()
      await openDetail(selectedId)
    } catch (e: any) {
      setSaving(false)
      setError(e.message || 'Network error')
    }
  }

  async function handleReopen() {
    if (!selectedId) return
    if (!window.confirm('Re-open this review? It will move back to pending.')) return
    setSaving(true)
    try {
      await fetch(`/api/teacher/flagged/${selectedId}/reopen`, { method: 'POST', headers: adminHeaders })
      setSaving(false)
      await reload()
      await openDetail(selectedId)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 600 }}>
        {/* LEFT: list + filters */}
        <aside className="lg:w-[380px] flex-shrink-0 bg-white rounded-2xl border flex flex-col" style={{ borderColor: '#E5E7EB', maxHeight: 'calc(100vh - 200px)' }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <h2 className="text-[16px] font-bold mb-1" style={{ color: '#111827' }}>Flagged review queue</h2>
            <p className="text-[12px]" style={{ color: '#6B7280' }}>
              Students flagged these AI responses as incorrect. Triage and add notes — these become training signals.
            </p>

            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>{summary.pending} pending</span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>{summary.wrong} wrong</span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>{summary.correct} correct</span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: '#E0E7FF', color: '#3730A3' }}>{summary.partial} partial</span>
            </div>

            <div className="flex gap-1 mt-3">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={tab === t.id
                    ? { background: '#0D9488', color: '#FFFFFF' }
                    : { background: '#F3F4F6', color: '#374151' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {subjects.length > 0 && (
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full mt-2 text-[12px] px-2 py-1.5 rounded border bg-white"
                style={{ borderColor: '#D1D5DB' }}>
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-[13px]" style={{ color: '#6B7280' }}>Loading…</div>
            ) : error ? (
              <div className="m-4 p-3 rounded text-[12px]" style={{ background: '#FEF2F2', color: '#991B1B' }}>{error}</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[13px] font-semibold mb-1" style={{ color: '#065F46' }}>✓ Nothing to review</p>
                <p className="text-[12px]" style={{ color: '#6B7280' }}>
                  {tab === 'pending' ? 'No pending flags right now.' : 'No items match this filter.'}
                </p>
              </div>
            ) : (
              <ul>
                {rows.map(r => (
                  <li key={r.id}>
                    <button onClick={() => openDetail(r.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      style={selectedId === r.id
                        ? { background: '#F0FDFA', borderLeft: '3px solid #0D9488' }
                        : { borderLeft: '3px solid transparent', borderBottom: '1px solid #F3F4F6' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <StatusChip status={r.status} />
                        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[13px] font-medium line-clamp-2" style={{ color: '#111827' }}>{r.question_text}</p>
                      <p className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
                        {r.subject || '—'} · Class {r.class_level} · {r.student?.name || 'student'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* RIGHT: detail */}
        <main className="flex-1 bg-white rounded-2xl border p-4 lg:p-6" style={{ borderColor: '#E5E7EB', minHeight: 400 }}>
          {!selectedId ? (
            <div className="h-full flex items-center justify-center" style={{ minHeight: 400 }}>
              <div className="text-center max-w-sm">
                <p className="text-[48px] mb-2">📋</p>
                <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>Select an item from the queue</p>
                <p className="text-[12px] mt-1" style={{ color: '#6B7280' }}>
                  Tap any row on the left to see the full question, AI response, student's reason for flagging, and take action.
                </p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="text-[13px]" style={{ color: '#6B7280' }}>Loading detail…</div>
          ) : detail ? (
            <DetailPane detail={detail} notes={notes} setNotes={setNotes} saving={saving} onReview={submitReview} onReopen={handleReopen} />
          ) : null}
        </main>
      </div>
    </div>
  )
}

function DetailPane({ detail, notes, setNotes, saving, onReview, onReopen }: {
  detail: Detail
  notes: string
  setNotes: (v: string) => void
  saving: boolean
  onReview: (s: 'correct' | 'wrong' | 'partial') => void
  onReopen: () => void
}) {
  const f = detail.flagged
  const session = detail.session
  const isReviewed = f.status !== 'pending'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <StatusChip status={f.status} />
        <span className="text-[12px]" style={{ color: '#6B7280' }}>
          {f.subject || '—'} · Class {f.class_level} · by {f.student?.name || 'student'} · {timeAgo(f.created_at)}
        </span>
      </div>

      <Section label="Student's question">
        <p className="text-[14px]" style={{ color: '#111827' }}>{f.question_text}</p>
      </Section>

      <Section label="AI's response (flagged)">
        <div className="p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <p className="text-[14px] whitespace-pre-wrap" style={{ color: '#111827' }}>{f.ai_response}</p>
        </div>
        {session && (
          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
            {session.ncert_source && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>📚 {session.ncert_source}</span>
            )}
            {session.model_used && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>🧠 {session.model_used}</span>
            )}
            {session.cache_hit && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>⚡ cache hit</span>
            )}
          </div>
        )}
      </Section>

      {f.report_text && (
        <Section label="Why the student flagged it">
          <p className="text-[14px] italic" style={{ color: '#374151' }}>{f.report_text}</p>
        </Section>
      )}

      <Section label="Your correction / notes">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional — what's the correct answer? Add anything you'd tell a student who got this wrong. Becomes a training signal for the AI."
          rows={5}
          disabled={saving}
          className="w-full rounded-lg border p-3 text-[14px] focus:outline-none focus:ring-2 disabled:bg-gray-50"
          style={{ borderColor: '#D1D5DB' }}
        />

        {isReviewed ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex-1 text-[11px] flex items-center gap-2" style={{ color: '#6B7280' }}>
              {f.reviewer?.name && <>Reviewed by <b>{f.reviewer.name}</b></>}
              {f.reviewed_at && <> · {new Date(f.reviewed_at).toLocaleString()}</>}
              {!f.reviewer?.name && f.reviewed_at && <>Reviewed via admin · {new Date(f.reviewed_at).toLocaleString()}</>}
            </div>
            <button onClick={onReopen} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border disabled:opacity-60"
              style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}>Re-open</button>
            <button onClick={() => onReview('wrong')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#FEE2E2', color: '#991B1B' }}>Mark AI wrong</button>
            <button onClick={() => onReview('partial')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#E0E7FF', color: '#3730A3' }}>Partial</button>
            <button onClick={() => onReview('correct')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#ECFDF5', color: '#065F46' }}>AI was correct</button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => onReview('wrong')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#DC2626', color: '#FFFFFF' }}>{saving ? 'Saving…' : '✗ AI was wrong'}</button>
            <button onClick={() => onReview('partial')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#E0E7FF', color: '#3730A3' }}>{saving ? 'Saving…' : '~ Partial'}</button>
            <button onClick={() => onReview('correct')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#059669', color: '#FFFFFF' }}>{saving ? 'Saving…' : '✓ AI was correct'}</button>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6B7280' }}>{label}</p>
      {children}
    </div>
  )
}
