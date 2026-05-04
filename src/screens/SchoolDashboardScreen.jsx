// ═══════════════════════════════════════════════════════════════════════════
// SchoolDashboardScreen — /school
// ═══════════════════════════════════════════════════════════════════════════
// School admin's home. Shows live counts, both invite codes (copyable +
// regenerable), recent signups, and top weak concepts across the school.
//
// Auth: gated by <RoleRoute allowed={['school_admin']}>.
//
// Polls /api/school/dashboard every 60s while the page is visible. Pauses
// when the tab is hidden so we don't burn quota for nothing.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { schoolApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'
import InviteCodeCard from '../components/school/InviteCodeCard'
import SchoolStatsTiles from '../components/school/SchoolStatsTiles'
import RecentSignupsList from '../components/school/RecentSignupsList'
import TopWeakConceptsPanel from '../components/school/TopWeakConceptsPanel'
import '../styles/school-v4.css'

const POLL_INTERVAL_MS = 60_000

export default function SchoolDashboardScreen() {
  const navigate = useNavigate()
  const { token, signOut } = useAuth()
  const { studentName } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mountedRef = useRef(true)

  const fetchDashboard = useCallback(async () => {
    if (!token) return
    try {
      const res = await schoolApi.dashboard(token)
      if (mountedRef.current) {
        setData(res)
        setError('')
      }
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Could not load dashboard')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [token])

  // Initial fetch + visibility-aware poll
  useEffect(() => {
    mountedRef.current = true
    fetchDashboard()
    let timer = null

    function start() {
      stop()
      timer = setInterval(() => {
        if (!document.hidden) fetchDashboard()
      }, POLL_INTERVAL_MS)
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null }
    }
    function onVisibility() {
      if (document.hidden) stop()
      else { fetchDashboard(); start() }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mountedRef.current = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchDashboard])

  // Regenerate handler — passed to InviteCodeCard
  const handleRegenerate = useCallback(async (type) => {
    if (!token) return
    const res = await schoolApi.regenerateCode(token, type)
    // Refetch dashboard so the new code shows up
    await fetchDashboard()
    return res
  }, [token, fetchDashboard])

  async function handleLogout() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="school-v4">
      <header className="school-topbar">
        <div className="brand">
          <PaMascot size={32} mood="idle" />
          <span className="logo">Padee<span className="ai">.ai</span></span>
          {data?.school?.name && (
            <span className="school-pill" style={{ marginLeft: 12 }}>
              {data.school.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-sm">{studentName}</span>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="school-shell">
        {loading && !data ? (
          <LoadingState />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : data ? (
          <Loaded data={data} onRegenerate={handleRegenerate} adminName={studentName} />
        ) : null}
      </div>
    </div>
  )
}

// ─── Loaded state ──────────────────────────────────────────────────────
function Loaded({ data, onRegenerate, adminName }) {
  const { school, counts, recentSignups, topWeakConcepts } = data
  const isEmpty = (counts.students ?? 0) === 0 && (counts.teachers ?? 0) === 0

  return (
    <>
      <div className="school-greeting">
        <div>
          <h1>Welcome back, {firstNameOf(adminName)} 👋</h1>
          <div className="sub">
            Here's what's happening at <b style={{ color: '#13131A' }}>{school.name}</b>.
          </div>
        </div>
      </div>

      <SchoolStatsTiles
        counts={counts}
        maxStudents={school.maxStudents}
        maxDoubtsPerDay={school.maxDoubtsPerDay}
      />

      <div className="school-row">
        <div className="codes-row">
          <InviteCodeCard
            label="STUDENT CODE"
            code={school.inviteCodeStudent}
            used={counts.students}
            max={school.maxStudents}
            type="student"
            onRegenerate={onRegenerate}
          />
          <InviteCodeCard
            label="TEACHER CODE"
            code={school.inviteCodeTeacher}
            used={counts.teachers}
            type="teacher"
            onRegenerate={onRegenerate}
            showUsage={false}
          />
        </div>
        <TopWeakConceptsPanel concepts={topWeakConcepts || []} />
      </div>

      {isEmpty ? (
        <EmptyState
          studentCode={school.inviteCodeStudent}
          teacherCode={school.inviteCodeTeacher}
        />
      ) : (
        <RecentSignupsList signups={recentSignups || []} />
      )}
    </>
  )
}

// ─── Empty state (school has 0 members) ────────────────────────────────
function EmptyState({ studentCode, teacherCode }) {
  return (
    <div className="recent-signups" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <PaMascot size={36} mood="speaking" />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Quiet so far. Share your codes!</div>
          <div className="t-sm" style={{ marginTop: 2 }}>
            Once students sign up, you'll see live stats here.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Loading + error states ────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <PaMascot size={40} mood="thinking" />
      <p className="t-sm" style={{ marginTop: 12 }}>Loading your school dashboard…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="focus-card" style={{ maxWidth: 480, margin: '60px auto' }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        Pa couldn't reach the server
      </h3>
      <p className="t-sm" style={{ marginBottom: 14 }}>{message}</p>
      <button className="btn-primary" onClick={onRetry}>Try again</button>
    </div>
  )
}

function firstNameOf(name) {
  if (!name) return 'there'
  return name.split(' ')[0]
}
