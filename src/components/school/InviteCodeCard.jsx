// ═══════════════════════════════════════════════════════════════════════════
// InviteCodeCard — display an invite code with copy + regenerate.
// ═══════════════════════════════════════════════════════════════════════════
// Used twice on /school dashboard (student code + teacher code) and on
// /onboarding/school post-create.
//
// Props:
//   label          — 'STUDENT CODE' | 'TEACHER CODE'
//   code           — the 6-digit code (raw, no hyphen)
//   used           — current count for usage line (e.g. 124 for "124 / 500 used")
//   max            — cap (e.g. 500)
//   onRegenerate   — async callback (returns the new code or throws)
//   showRegenerate — false on /onboarding/school step 2 (don't let admin
//                    regenerate before they've shared the original)
//
// Behaviour:
//   • Copy: writes to clipboard, button shows "✓ Copied!" for 2s.
//   • Regenerate: opens a confirm modal first. On confirm, calls
//     onRegenerate(); old code field flashes amber briefly while new code
//     fades in.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'

export default function InviteCodeCard({
  label,
  code,
  used,
  max,
  onRegenerate,
  showRegenerate = true,
  showUsage = true,
  type, // 'student' | 'teacher' — passed to onRegenerate for clarity
}) {
  const [copied, setCopied] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [flashClass, setFlashClass] = useState('') // 'flash-copy' | 'flash-regen' | ''

  // Format code with a hyphen for readability: 042195 → 042-195
  const display = code && code.length === 6
    ? `${code.slice(0, 3)}-${code.slice(3)}`
    : code || '------'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code) // copy raw, no hyphen
      setCopied(true)
      setFlashClass('flash-copy')
      setTimeout(() => setCopied(false), 2000)
      setTimeout(() => setFlashClass(''), 1700)
    } catch {
      // Fallback: select + execCommand. Skipped — modern browsers all support
      // clipboard API; the only failure mode is non-secure context (http://)
      // which we don't ship.
    }
  }

  async function handleRegenerateConfirm() {
    if (!onRegenerate) return
    setRegenLoading(true)
    setRegenError('')
    try {
      await onRegenerate(type)
      setRegenOpen(false)
      setFlashClass('flash-regen')
      setTimeout(() => setFlashClass(''), 1100)
    } catch (err) {
      setRegenError(err?.message || 'Could not regenerate code. Try again.')
    } finally {
      setRegenLoading(false)
    }
  }

  const usagePercent = (max && used != null) ? (used / max) : 0
  const isAtCap = usagePercent >= 0.9
  const isFull = usagePercent >= 1

  return (
    <>
      <div className="invite-card">
        <div className="label">{label}</div>
        <div className={`code ${flashClass}`} aria-label={`Code ${display}`}>{display}</div>
        {showUsage && max != null && (
          <div className={`usage ${isAtCap ? 'warn' : ''}`}>
            {isFull
              ? `Cap reached — ${used} / ${max}. Contact support to expand.`
              : `${used ?? 0} / ${max} used${isAtCap ? ' — almost full' : ''}`}
          </div>
        )}
        <div className="actions">
          <button className={`btn-ghost ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            disabled={!code}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          {showRegenerate && (
            <button className="btn-ghost"
              onClick={() => setRegenOpen(true)}
              disabled={!onRegenerate}>
              ↻ Regenerate
            </button>
          )}
        </div>
      </div>

      {regenOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="regen-title">
          <div className="modal-card">
            <h3 id="regen-title">Regenerate {type} code?</h3>
            <p className="body">
              The old code <b>{display}</b> will stop working immediately. Anyone you've
              already shared it with will need the new code.
            </p>
            {regenError && (
              <p style={{
                fontSize: 13, color: '#B2381B', background: '#FFE7DD',
                padding: '10px 14px', borderRadius: 12, marginBottom: 12,
              }}>
                {regenError}
              </p>
            )}
            <div className="actions">
              <button className="btn-ghost" onClick={() => setRegenOpen(false)} disabled={regenLoading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleRegenerateConfirm} disabled={regenLoading}>
                {regenLoading ? 'Regenerating…' : 'Yes, regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
