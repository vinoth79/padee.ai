// ═══════════════════════════════════════════════════════════════════════════
// ParentDashboardScreen — /parent
// ═══════════════════════════════════════════════════════════════════════════
// Replaces the v4 placeholder (`<Navigate to="/home" />`).
//
// Shows the parent's verified children as a responsive grid of <ChildCard>s.
// Click any card → opens <ChildProgressDetail> modal.
// "Link a new child" CTA → /parent/link.
//
// Read-only floor (PRD v5 §F5): only verified links show up here. Pending
// links are surfaced on the *student's* /home banner, not the parent's
// dashboard, so a parent can't see a child's data until the child confirms.
//
// Polls /api/parent/children every 60s while visible — covers the case where
// a kid confirms a link while the parent has the dashboard open.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { parentApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'
import ChildCard from '../components/parent/ChildCard'
import ChildProgressDetail from '../components/parent/ChildProgressDetail'
import '../styles/parent-v4.css'

const POLL_INTERVAL_MS = 60_000

export default function ParentDashboardScreen() {
  const navigate = useNavigate()
  const { token, signOut } = useAuth()
  const { studentName } = useUser()
  const [children, setChildren] = useState(null)
  const [error, setError] = useState('')
  const [selectedChild, setSelectedChild] = useState(null)
  const mountedRef = useRef(true)

  const fetchChildren = useCallback(async () => {
    if (!token) return
    try {
      const res = await parentApi.children(token)
      if (mountedRef.current) {
        setChildren(res.children || [])
        setError('')
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || 'Could not load your children')
      }
    }
  }, [token])

  // Initial fetch + visibility-aware poll (mirrors SchoolDashboardScreen)
  useEffect(() => {
    mountedRef.current = true
    fetchChildren()
    let timer = null
    function start() {
      stop()
      timer = setInterval(() => {
        if (!document.hidden) fetchChildren()
      }, POLL_INTERVAL_MS)
    }
    function stop() { if (timer) { clearInterval(timer); timer = null } }
    function onVisibility() {
      if (document.hidden) stop()
      else { fetchChildren(); start() }
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mountedRef.current = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchChildren])

  async function handleLogout() {
    try { await signOut() } finally { navigate('/login', { replace: true }) }
  }

  const greetingName = firstNameOf(studentName)

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
        <div className="parent-greeting">
          <div>
            <h1>{greetingName ? `Hi, ${greetingName}` : 'Welcome back'} 👋</h1>
            <div className="sub">
              {children === null
                ? 'Loading your family…'
                : children.length === 0
                  ? 'You haven\'t linked a child yet.'
                  : `Here's how ${children.length === 1 ? children[0].name || 'your child' : 'your children'} ${children.length === 1 ? 'is' : 'are'} doing.`}
            </div>
          </div>
          <button
            className="btn-primary parent-link-cta"
            onClick={() => navigate('/parent/link')}
            type="button"
          >
            + Link a new child
          </button>
        </div>

        {children === null && !error ? (
          <LoadingSkeleton />
        ) : error && (children === null || children.length === 0) ? (
          <ErrorState message={error} onRetry={fetchChildren} />
        ) : children.length === 0 ? (
          <EmptyState onLink={() => navigate('/parent/link')} />
        ) : (
          <div className="parent-children-grid">
            {children.map(child => (
              <ChildCard
                key={child.studentId}
                child={child}
                onClick={setSelectedChild}
              />
            ))}
          </div>
        )}
      </div>

      {selectedChild && (
        <ChildProgressDetail
          child={selectedChild}
          onClose={() => setSelectedChild(null)}
        />
      )}
    </div>
  )
}

function firstNameOf(name) {
  if (!name) return null
  return name.split(/\s+/)[0]
}

function LoadingSkeleton() {
  return (
    <div className="parent-children-grid">
      {[0, 1].map(i => (
        <div key={i} className="child-card-skeleton" aria-hidden>
          <div className="skel-line w-60" />
          <div className="skel-row">
            <div className="skel-block" />
            <div className="skel-block" />
          </div>
          <div className="skel-line w-80" />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="parent-error-card">
      <PaMascot size={36} mood="confused" />
      <div className="parent-error-text">
        <div className="parent-error-title">Couldn't load your dashboard</div>
        <div className="t-sm">{message}</div>
      </div>
      <button className="btn-ghost" onClick={onRetry} type="button">Try again</button>
    </div>
  )
}

function EmptyState({ onLink }) {
  return (
    <div className="parent-empty-card">
      <PaMascot size={56} mood="speaking" />
      <h2 className="parent-empty-title">Let's link your first child</h2>
      <p className="parent-empty-sub">
        We'll ask for your child's Padee email, then give you an 8-character
        code to share with them. Once they enter it on their home screen,
        you'll see their progress here.
      </p>
      <ol className="parent-empty-steps">
        <li>You enter their email — get a code.</li>
        <li>You show them the code (in person, WhatsApp, however).</li>
        <li>They enter it in Padee — link confirmed.</li>
      </ol>
      <button className="btn-primary" onClick={onLink} type="button">
        Link a child →
      </button>
    </div>
  )
}
