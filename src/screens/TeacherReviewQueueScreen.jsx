// ═══════════════════════════════════════════════════════════════════════════
// TeacherReviewQueueScreen — triage student-flagged AI responses.
// ═══════════════════════════════════════════════════════════════════════════
// Students flag bad AI answers via the "Report incorrect" sheet on Ask AI.
// Every flagged row lands here. Teacher decides:
//   • correct  — the AI was right, student misunderstood
//   • wrong    — the AI was wrong (add a correction note)
//   • partial  — the AI was partially right (add a clarifying note)
// Reviewed items can be re-opened if the teacher mis-clicked.
// Notes become a training signal we can use to fine-tune or build a response
// correction layer later.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import { listFlagged, getFlagged, reviewFlagged, reopenFlagged } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'pending',  label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'all',      label: 'All' },
]

const STATUS_CHIPS = {
  pending: { bg: '#FEF3C7', fg: '#92400E', label: 'Pending' },
  wrong:   { bg: '#FEE2E2', fg: '#991B1B', label: 'AI wrong' },
  correct: { bg: '#ECFDF5', fg: '#065F46', label: 'AI correct' },
  partial: { bg: '#E0E7FF', fg: '#3730A3', label: 'Partial' },
}

function StatusChip({ status }) {
  const s = STATUS_CHIPS[status] || STATUS_CHIPS.pending
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function timeAgo(iso) {
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

export default function TeacherReviewQueueScreen() {
  const { token } = useAuth()
  const [tab, setTab] = useState('pending')
  const [subject, setSubject] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ pending: 0, wrong: 0, correct: 0, partial: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null) // { flagged, session }
  const [detailLoading, setDetailLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const subjects = useMemo(() => {
    const s = new Set(rows.map(r => r.subject).filter(Boolean))
    return Array.from(s).sort()
  }, [rows])

  async function reload() {
    if (!token) return
    setLoading(true)
    setError('')
    const res = await listFlagged(token, { status: tab, subject: subject || undefined, limit: 200 })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setRows(res.flagged || [])
    if (res.summary) setSummary(res.summary)
  }

  useEffect(() => { reload() }, [token, tab, subject])

  async function openDetail(id) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    setNotes('')
    const res = await getFlagged(token, id)
    setDetailLoading(false)
    if (res.error) { setError(res.error); return }
    setDetail(res)
    setNotes(res.flagged?.teacher_notes || '')
  }

  async function submitReview(status) {
    if (!selectedId) return
    setSaving(true)
    const res = await reviewFlagged(token, selectedId, { status, teacher_notes: notes })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    // Refresh both the list and the open detail panel
    await reload()
    await openDetail(selectedId)
  }

  async function handleReopen() {
    if (!selectedId) return
    if (!confirm('Re-open this review? It will move back to pending.')) return
    setSaving(true)
    await reopenFlagged(token, selectedId)
    setSaving(false)
    await reload()
    await openDetail(selectedId)
  }

  // ─── Layout: two-column (list ← detail). Collapses to stacked on mobile. ───
  return (
    <div className="w-full h-screen lg:h-auto flex flex-col lg:flex-row" style={{ background: '#F8F7F4' }}>
      {/* LEFT: list + filters */}
      <aside className="lg:w-[380px] flex-shrink-0 bg-white lg:h-screen flex flex-col" style={{ borderRight: '0.5px solid #E5E7EB' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
          <h1 className="text-[18px] font-bold" style={{ color: '#111827' }}>Review queue</h1>
          <p className="text-[12px]" style={{ color: '#6B7280' }}>
            Students flagged these AI responses as incorrect. Review and add notes.
          </p>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
              {summary.pending} pending
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              {summary.wrong} wrong
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
              {summary.correct} correct
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: '#E0E7FF', color: '#3730A3' }}>
              {summary.partial} partial
            </span>
          </div>

          {/* Tabs */}
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

          {/* Subject filter */}
          {subjects.length > 0 && (
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full mt-2 text-[12px] px-2 py-1.5 rounded border"
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
                    style={selectedId === r.id ? { background: '#F0FDFA', borderLeft: '3px solid #0D9488' } : { borderLeft: '3px solid transparent', borderBottom: '0.5px solid #F3F4F6' }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <StatusChip status={r.status} />
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-[13px] font-medium line-clamp-2" style={{ color: '#111827' }}>
                      {r.question_text}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
                      {r.subject} · Class {r.class_level} · {r.student?.name || 'student'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* RIGHT: detail */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        {!selectedId ? (
          <div className="h-full flex items-center justify-center">
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
          <DetailPane
            detail={detail}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            onReview={submitReview}
            onReopen={handleReopen}
          />
        ) : null}
      </main>
    </div>
  )
}

function DetailPane({ detail, notes, setNotes, saving, onReview, onReopen }) {
  const f = detail.flagged
  const session = detail.session
  const isReviewed = f.status !== 'pending'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <StatusChip status={f.status} />
        <span className="text-[12px]" style={{ color: '#6B7280' }}>
          {f.subject} · Class {f.class_level} · by {f.student?.name || 'student'} · {timeAgo(f.created_at)}
        </span>
      </div>

      {/* Student's question */}
      <Section label="Student's question">
        <p className="text-[14px]" style={{ color: '#111827' }}>{f.question_text}</p>
      </Section>

      {/* AI's response */}
      <Section label="AI's response (flagged)">
        <div className="p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <p className="text-[14px] whitespace-pre-wrap" style={{ color: '#111827' }}>{f.ai_response}</p>
        </div>
        {session && (
          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
            {session.ncert_source && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>
                📚 {session.ncert_source}
              </span>
            )}
            {session.model_used && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>
                🧠 {session.model_used}
              </span>
            )}
            {session.cache_hit && (
              <span className="px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>
                ⚡ cache hit
              </span>
            )}
          </div>
        )}
      </Section>

      {/* Why student flagged it */}
      {f.report_text && (
        <Section label="Why the student flagged it">
          <p className="text-[14px] italic" style={{ color: '#374151' }}>{f.report_text}</p>
        </Section>
      )}

      {/* Teacher notes + action buttons */}
      <Section label="Your correction / notes">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional — what's the correct answer? Add anything you'd tell a student who got this wrong. This becomes a training signal for the AI."
          rows={5}
          disabled={saving}
          className="w-full rounded-lg border p-3 text-[14px] focus:outline-none focus:ring-2"
          style={{ borderColor: '#D1D5DB' }}
        />

        {isReviewed ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex-1 text-[11px] flex items-center gap-2" style={{ color: '#6B7280' }}>
              {f.reviewer?.name && <>Reviewed by <b>{f.reviewer.name}</b></>}
              {f.reviewed_at && <> · {new Date(f.reviewed_at).toLocaleString()}</>}
            </div>
            <button onClick={onReopen} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border disabled:opacity-60"
              style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}>
              Re-open
            </button>
            {/* Re-reviewing while already reviewed: show the 3 outcome buttons so teacher can change */}
            <button onClick={() => onReview('wrong')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#FEE2E2', color: '#991B1B' }}>
              Mark AI wrong
            </button>
            <button onClick={() => onReview('partial')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#E0E7FF', color: '#3730A3' }}>
              Partial
            </button>
            <button onClick={() => onReview('correct')} disabled={saving}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: '#ECFDF5', color: '#065F46' }}>
              AI was correct
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => onReview('wrong')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#DC2626', color: '#FFFFFF' }}>
              {saving ? 'Saving…' : '✗ AI was wrong'}
            </button>
            <button onClick={() => onReview('partial')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#E0E7FF', color: '#3730A3' }}>
              {saving ? 'Saving…' : '~ Partial'}
            </button>
            <button onClick={() => onReview('correct')} disabled={saving}
              className="text-[14px] font-semibold px-4 py-2.5 rounded-lg flex-1 disabled:opacity-60"
              style={{ background: '#059669', color: '#FFFFFF' }}>
              {saving ? 'Saving…' : '✓ AI was correct'}
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6B7280' }}>
        {label}
      </p>
      {children}
    </div>
  )
}
