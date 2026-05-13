// ═══════════════════════════════════════════════════════════════════════════
// PendingLinkBanner — student-side banner shown on /home when a parent has
// initiated a link to this student but the student hasn't confirmed yet.
// ═══════════════════════════════════════════════════════════════════════════
// Lives at the top of StudentHomeScreenV4 above the hero. Self-fetches its
// data from /api/parent/pending-incoming on mount; renders nothing if there
// are no pending links.
//
// Inline 8-char input + Confirm button. On success → calls onVerified() so
// parent can refresh + dismiss banner.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { parentApi } from '../../services/api'

export default function PendingLinkBanner({ onVerified }) {
  const { token } = useAuth()
  const [pending, setPending] = useState([])
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successName, setSuccessName] = useState(null)
  const mountedRef = useRef(true)

  const fetchPending = useCallback(async () => {
    if (!token) return
    try {
      const res = await parentApi.pendingIncoming(token)
      if (mountedRef.current) setPending(res.pending || [])
    } catch {
      // Silent — pending banner is non-critical, don't disrupt /home if it
      // fails. (E.g. Supabase momentary 5xx — just no banner this render.)
      if (mountedRef.current) setPending([])
    }
  }, [token])

  useEffect(() => {
    mountedRef.current = true
    fetchPending()
    return () => { mountedRef.current = false }
  }, [fetchPending])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    if (!token || submitting) return
    const cleaned = code.replace(/\s+/g, '').toUpperCase()
    if (cleaned.length !== 8) {
      setError('Code must be 8 characters')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await parentApi.verify(token, cleaned)
      if (!mountedRef.current) return
      setSuccessName(res.parentName || 'your parent')
      setCode('')
      // Refresh pending list (the verified row will fall off it)
      fetchPending()
      onVerified?.()
      // Auto-clear success banner after a beat
      setTimeout(() => mountedRef.current && setSuccessName(null), 5000)
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || 'That code didn\'t match. Try again?')
      }
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }, [token, code, submitting, fetchPending, onVerified])

  // Success toast lives one render after pending list goes empty —
  // show it briefly even if there are no more pending links.
  if (successName) {
    return (
      <div className="parent-link-banner success">
        <div className="parent-link-banner-text">
          <b>Linked!</b> {successName} can now see your progress.
        </div>
      </div>
    )
  }

  if (pending.length === 0) return null

  // Most recent pending link (banner shows one at a time — others get
  // surfaced if the parent regenerates / kid receives more later).
  const top = pending[0]

  return (
    <div className="parent-link-banner">
      <div className="parent-link-banner-head">
        <div className="parent-link-banner-text">
          <b>{top.parentName || 'Someone'}</b> wants to see your study progress
          as a parent. Enter the 8-character code they shared with you.
        </div>
      </div>
      <form className="parent-link-banner-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="parent-link-banner-input"
          placeholder="ABCD2345"
          value={code}
          onChange={(e) => {
            // Strip whitespace, force uppercase, cap at 8
            const v = e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 8)
            setCode(v)
            if (error) setError('')
          }}
          maxLength={8}
          spellCheck={false}
          autoComplete="off"
          aria-label="8-character link code from your parent"
        />
        <button
          type="submit"
          className="parent-link-banner-btn"
          disabled={submitting || code.length !== 8}
        >
          {submitting ? '...' : 'Confirm'}
        </button>
      </form>
      {error && <div className="parent-link-banner-error">{error}</div>}
      {pending.length > 1 && (
        <div className="parent-link-banner-multi t-xs">
          {pending.length - 1} more {pending.length === 2 ? 'request' : 'requests'} after this one.
        </div>
      )}
    </div>
  )
}
