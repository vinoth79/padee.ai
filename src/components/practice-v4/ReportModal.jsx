// Compact modal for flagging a practice question. Writes to flagged_responses
// via the existing /api/ai/flag endpoint (reused from Ask AI quality signals).
import { useState } from 'react'

const REASONS = [
  { id: 'wrong_answer', label: 'Wrong answer' },
  { id: 'unclear', label: 'Unclear question' },
  { id: 'off_syllabus', label: 'Off-syllabus' },
  { id: 'bad_options', label: 'Options not mutually exclusive' },
  { id: 'other', label: 'Other' },
]

export default function ReportModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)
    try { await onSubmit?.({ reason, note: note.trim() }) } finally { setSubmitting(false) }
    setReason(null); setNote('')
    onClose?.()
  }

  return (
    <div className="practice-modal-backdrop" onClick={onClose}>
      <div className="practice-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Report this question</h3>
        <p className="modal-sub">Help us improve — what's wrong?</p>
        <div className="reason-chips">
          {REASONS.map(r => (
            <button key={r.id}
              className={`reason-chip ${reason === r.id ? 'active' : ''}`}
              onClick={() => setReason(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          className="reason-note"
          placeholder="Add details (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={300}
        />
        <div className="modal-actions">
          <button className="pd-btn ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn primary" disabled={!reason || submitting} onClick={handleSubmit}>
            {submitting ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  )
}
