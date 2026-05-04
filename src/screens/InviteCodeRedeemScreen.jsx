// ═══════════════════════════════════════════════════════════════════════════
// InviteCodeRedeemScreen — /onboarding/invite-code
// ═══════════════════════════════════════════════════════════════════════════
// Where students + teachers without a school_id land. Three outcomes:
//   1. Enter valid code  → join school, redirect by role (teacher → /teacher,
//                          student → /home or /onboarding/class)
//   2. Skip               → go to default destination for their role (B2C)
//   3. Bad code           → cells flash pink + shake, error message
//
// The code input auto-submits on the 6th digit. Hyphens are stripped server-
// side so "042-195" and "042195" both work.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { authApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'
import InviteCodeInput from '../components/ui/InviteCodeInput'
import '../styles/school-v4.css'

export default function InviteCodeRedeemScreen() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const ctx = useUser()
  const { role, refreshUser } = ctx
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState(0) // bumps to retrigger shake

  const handleComplete = useCallback(async (code) => {
    if (!token || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await authApi.redeemInvite(token, code)
      // Successfully joined. Refresh profile in context so the redirect
      // logic below sees the new school_id + (potentially) promoted role.
      await refreshUser()
      // Route by the now-current role (server may have promoted student → teacher
      // if a teacher code was used).
      const newRole = res.role || role
      if (newRole === 'teacher') {
        navigate('/teacher', { replace: true })
      } else if (newRole === 'student') {
        // If they haven't completed onboarding yet, go there; otherwise /home.
        const next = ctx.studentClass ? '/home' : '/onboarding/class'
        navigate(next, { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    } catch (err) {
      setError(err?.message || 'That code didn\'t match a school. Check with your teacher?')
      setErrorKey(k => k + 1)
    } finally {
      setLoading(false)
    }
  }, [token, loading, role, navigate, refreshUser, ctx.studentClass])

  const handleSkip = useCallback(() => {
    if (role === 'teacher') {
      navigate('/teacher', { replace: true })
    } else {
      // Student or anyone else → default flow
      navigate(ctx.studentClass ? '/home' : '/onboarding/class', { replace: true })
    }
  }, [role, navigate, ctx.studentClass])

  return (
    <div className="school-v4">
      <header className="school-topbar">
        <div className="brand">
          <PaMascot size={32} mood={loading ? 'thinking' : 'idle'} />
          <span className="logo">Padee<span className="ai">.ai</span></span>
        </div>
      </header>

      <div className="focus-shell">
        <div className="focus-pa">
          <PaMascot size={56} mood="idle" />
          <div className="copy">
            <h1>Got a code from your school?</h1>
            <div className="sub">
              Enter the 6-digit code you received from your teacher or principal.
            </div>
          </div>
        </div>

        <div className="focus-card" style={{ textAlign: 'center' }}>
          <InviteCodeInput
            key={errorKey} // remount on error to clear cells
            length={6}
            onComplete={handleComplete}
            error={!!error}
            disabled={loading}
            autoFocus
          />

          {loading && (
            <p className="t-sm" style={{ marginTop: 12 }}>
              Joining your school…
            </p>
          )}

          {error && (
            <div className="focus-error" style={{ textAlign: 'left' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button className="focus-skip" onClick={handleSkip} disabled={loading}>
              I don't have a code — I'm learning on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
