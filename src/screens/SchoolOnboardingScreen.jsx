// ═══════════════════════════════════════════════════════════════════════════
// SchoolOnboardingScreen — /onboarding/school
// ═══════════════════════════════════════════════════════════════════════════
// First screen a school_admin sees post-signup. Two states:
//   1. Form    — collect school name → POST /api/school/create
//   2. Codes   — display the two generated invite codes with copy + CTA
//                to /school dashboard
//
// Auth: gated by <RoleRoute allowed={['school_admin']}>. School_admins
// without a provisioned school land here; ones with a school go straight
// to /school per LoginScreen routeByRole.
//
// On success, applies the new school to UserContext (via refreshUser) so
// the rest of the app picks up profile.school_id without a page reload.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { schoolApi } from '../services/api'
import PaMascot from '../components/home-v4/PaMascot'
import InviteCodeCard from '../components/school/InviteCodeCard'
import '../styles/school-v4.css'

export default function SchoolOnboardingScreen() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { refreshUser } = useUser()
  const [step, setStep] = useState/** @type {'form'|'codes'} */('form')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [school, setSchool] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!token || !name.trim() || loading) return
    if (name.trim().length < 2) {
      setError('School name must be at least 2 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await schoolApi.create(token, name.trim())
      setSchool(res.school)
      setStep('codes')
      // Refresh profile in context so ROUTE_BY_ROLE picks up the new school_id
      refreshUser().catch(() => {})
    } catch (err) {
      setError(err?.message || 'Could not create school. Try again?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="school-v4">
      <header className="school-topbar">
        <div className="brand">
          <PaMascot size={32} mood={loading ? 'thinking' : 'idle'} />
          <span className="logo">Padee<span className="ai">.ai</span></span>
        </div>
      </header>

      <div className="focus-shell">
        {step === 'form' ? (
          <FormStep
            name={name}
            setName={setName}
            error={error}
            loading={loading}
            onSubmit={handleCreate}
          />
        ) : (
          <CodesStep
            school={school}
            onContinue={() => navigate('/school', { replace: true })}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
function FormStep({ name, setName, error, loading, onSubmit }) {
  return (
    <>
      <div className="focus-pa">
        <PaMascot size={56} mood="idle" />
        <div className="copy">
          <h1>Hi, I'm Pa.</h1>
          <div className="sub">Let's get your school onboarded.</div>
        </div>
      </div>

      <form className="focus-card" onSubmit={onSubmit}>
        <div className="focus-step">Step 1 of 1</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 8 }}>
          What's your school's name?
        </h2>
        <p className="t-sm" style={{ marginBottom: 18 }}>
          This is what your students and teachers will see in their app.
          You can rename it later.
        </p>

        <input
          autoFocus
          className="focus-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="DPS Bangalore"
          maxLength={200}
          disabled={loading}
          required
        />

        {error && <div className="focus-error">{error}</div>}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !name.trim()}
          style={{
            marginTop: 18,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          {loading ? 'Creating school…' : <>Create school <ArrowRight size={16} /></>}
        </button>
      </form>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
function CodesStep({ school, onContinue }) {
  if (!school) return null
  return (
    <>
      <div className="focus-pa">
        <PaMascot size={56} mood="celebrate" />
        <div className="copy">
          <h1>✓ {school.name} is ready.</h1>
          <div className="sub">
            Share these codes with your team. They'll enter the code at signup
            to join your school.
          </div>
        </div>
      </div>

      <div className="codes-row" style={{ marginBottom: 22 }}>
        <InviteCodeCard
          label="STUDENT CODE"
          code={school.inviteCodeStudent}
          used={0}
          max={school.maxStudents}
          type="student"
          showRegenerate={false}
          showUsage={false}
        />
        <InviteCodeCard
          label="TEACHER CODE"
          code={school.inviteCodeTeacher}
          type="teacher"
          showRegenerate={false}
          showUsage={false}
        />
      </div>

      <p className="t-sm" style={{ marginBottom: 18 }}>
        You can regenerate either code anytime from your school dashboard.
        Codes are case-insensitive and work with or without the hyphen.
      </p>

      <button className="btn-primary" onClick={onContinue}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Go to school dashboard <ArrowRight size={16} />
      </button>
    </>
  )
}
