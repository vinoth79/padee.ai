// ═══════════════════════════════════════════════════════════════════════════
// ParentLinkScreen — /parent/link
// ═══════════════════════════════════════════════════════════════════════════
// Single-page form for a parent to start a link with their child:
//   1. Enter the child's email
//   2. Backend looks them up + creates a pending row, returns 8-char code
//   3. Parent sees the code with copy button + "show this to your child"
//      instructions
//   4. "Done — back to dashboard" returns to /parent (the dashboard polls
//      so the verified link will show automatically once the kid confirms)
//
// Race / repeat behaviours:
//   - Already verified-linked: backend returns alreadyLinked:true → we
//     show "You're already linked to <name>" and link back to dashboard.
//   - Already pending: backend overwrites + returns a fresh code (parents
//     who lost the previous code don't get stuck).
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { parentApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'
import '../styles/parent-v4.css'

export default function ParentLinkScreen() {
  const navigate = useNavigate()
  const { token, signOut } = useAuth()
  const { studentName } = useUser()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { linkCode?, studentName, alreadyLinked? }
  const [copied, setCopied] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    if (!token || submitting) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await parentApi.link(token, trimmed)
      setResult(res)
    } catch (err) {
      setError(err?.message || 'Could not start the link. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [token, email, submitting])

  const handleCopy = useCallback(async () => {
    if (!result?.linkCode) return
    try {
      await navigator.clipboard.writeText(result.linkCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available — leave it; the code is visible.
    }
  }, [result])

  async function handleLogout() {
    try { await signOut() } finally { navigate('/login', { replace: true }) }
  }

  return (
    <div className="parent-v4">
      <header className="parent-topbar">
        <div className="brand">
          <PaMascot size={32} mood="idle" />
          <span className="logo">Padee<span className="ai">.ai</span></span>
          <span className="parent-pill" style={{ marginLeft: 12 }}>PARENT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-sm">{studentName}</span>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="parent-shell">
        <button className="parent-back" onClick={() => navigate('/parent')} type="button">
          ← Back to dashboard
        </button>

        {!result ? (
          <div className="parent-link-card">
            <div className="parent-link-eyebrow">LINK A NEW CHILD</div>
            <h1 className="parent-link-title">What's your child's email?</h1>
            <p className="parent-link-sub">
              The same email your child uses to sign in to Padee. We'll give you
              a one-time code to share with them — your link is confirmed only
              after they enter it.
            </p>

            <form className="parent-link-form" onSubmit={handleSubmit}>
              <label className="parent-link-label" htmlFor="parent-link-email">
                Child's email address
              </label>
              <input
                id="parent-link-email"
                type="email"
                className="parent-link-input"
                placeholder="kid@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                autoFocus
                autoComplete="off"
                required
              />
              {error && <div className="parent-link-error">{error}</div>}
              <button
                type="submit"
                className="btn-primary parent-link-submit"
                disabled={submitting || !email.includes('@')}
              >
                {submitting ? 'Working…' : 'Get link code'}
              </button>
            </form>
          </div>
        ) : result.alreadyLinked ? (
          <div className="parent-link-card success">
            <div className="parent-link-eyebrow">ALREADY LINKED</div>
            <h1 className="parent-link-title">
              You're already connected to {result.studentName}
            </h1>
            <p className="parent-link-sub">
              They already confirmed your link earlier. Head back to the
              dashboard to see their latest progress.
            </p>
            <button
              className="btn-primary parent-link-submit"
              onClick={() => navigate('/parent')}
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <div className="parent-link-card">
            <div className="parent-link-eyebrow">NEXT STEP — SHARE THIS CODE</div>
            <h1 className="parent-link-title">
              Show this code to {result.studentName}
            </h1>
            <p className="parent-link-sub">
              They'll see a banner on their Padee home screen. Once they enter
              the code there, your link is confirmed and they'll appear on
              your dashboard.
            </p>

            <div className="link-code-display">
              <code className="link-code-text tabular">{result.linkCode}</code>
              <button
                className={`link-code-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                type="button"
                aria-label="Copy code to clipboard"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <ol className="parent-link-steps">
              <li>Open Padee on your child's phone, tablet, or laptop.</li>
              <li>They'll see <b>"{studentName || 'You'} wants to see your study progress"</b> at the top of their home screen.</li>
              <li>They type the 8-character code into that banner.</li>
              <li>Done! Their progress will start showing on your dashboard.</li>
            </ol>

            <div className="parent-link-actions">
              <button
                className="btn-ghost"
                onClick={() => { setResult(null); setEmail('') }}
                type="button"
              >
                Link another child
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate('/parent')}
                type="button"
              >
                Done — back to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
