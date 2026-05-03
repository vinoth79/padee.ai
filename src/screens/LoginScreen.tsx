// ═══════════════════════════════════════════════════════════════════════════
// LoginScreen — v4 redesign (Apr 25 mockup).
// ═══════════════════════════════════════════════════════════════════════════
// Layout: two-column on desktop. Left = dark "welcome back" panel with stats
// + Pa quote. Right = login form (Google + email/password). Top-right swap to
// /signup. Mobile = stacks (form first, dark panel collapses to a banner).
//
// Behavior unchanged from v3: signs in via supabase.auth, then routes by role:
//   teacher → /teacher · parent → /parent · student → /home (or onboarding)
// Signup moved to its own /signup route — no longer toggled inside this view.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import PaMascot from '../components/home-v4/PaMascot'

export default function LoginScreen() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: profile } = await supabase
        .from('profiles')
        .select('class_level, role')
        .single()
      if (profile?.role === 'teacher') nav('/teacher', { replace: true })
      else if (profile?.role === 'parent') nav('/parent', { replace: true })
      else nav(profile?.class_level ? '/home' : '/onboarding/class', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    setError('Google sign-in is coming soon — please use email + password for now.')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF8F4',
      fontFamily: "'Lexend Deca', -apple-system, system-ui, sans-serif",
      color: '#13131A',
      WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ─── Top nav ─── */}
      <header style={{
        background: 'rgba(250,248,244,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #ECECEE',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-7 flex items-center justify-between h-[60px]">
          <button onClick={() => nav('/')} className="flex items-center gap-2.5">
            <PaMascot size={32} mood="idle" />
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Padee<span style={{ color: '#E85D3A' }}>.ai</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, color: '#8A8A95' }}>New here?</span>
            <button onClick={() => nav('/signup')}
              style={{
                fontSize: 14, fontWeight: 600, color: '#13131A',
                background: '#F1EDE2',
                padding: '9px 16px', borderRadius: 12,
              }}>
              Create account
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body: two-column ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">

        {/* ── LEFT: Dark welcome-back panel ── */}
        <div className="relative overflow-hidden p-7 lg:p-12 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(165deg, #13131A 0%, #2A1A14 65%, #6B2D17 100%)',
            color: '#fff',
            minHeight: 320,
          }}>
          {/* Faded mascot watermark */}
          <div aria-hidden style={{
            position: 'absolute', right: -20, top: 30, opacity: 0.12, pointerEvents: 'none',
          }}>
            <PaMascot size={260} mood="idle" />
          </div>

          {/* Top: welcome copy + stats */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
              color: '#FFB547', textTransform: 'uppercase', marginBottom: 14,
            }}>
              Welcome back
            </p>
            <h1 style={{
              fontSize: 36, fontWeight: 700, lineHeight: 1.12,
              letterSpacing: '-0.8px', marginBottom: 14,
            }}
              className="lg:text-[42px]">
              Pa is ready.<br />
              Your streak is waiting.
            </h1>
            <p style={{
              fontSize: 14, lineHeight: 1.55,
              color: 'rgba(255,255,255,0.72)', marginBottom: 30,
              maxWidth: 380,
            }}>
              You closed yesterday at <b style={{ color: '#fff' }}>7 days, 1,840 XP, Level 6</b>.
              Let's keep it moving.
            </p>

            <div className="space-y-4" style={{ maxWidth: 360 }}>
              <Stat number="340 Q" color="#FFB547" label="asked this month" />
              <Stat number="84%" color="#36D399" label="accuracy on Physics practice" />
              <Stat number="12 mins" color="#A5B4FC" label="average daily study time" />
            </div>
          </div>

          {/* Bottom: Pa quote pill */}
          <div style={{
            position: 'relative', zIndex: 1, marginTop: 28,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            maxWidth: 460,
          }}>
            <PaMascot size={32} mood="speaking" />
            <p style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)' }}>
              <i>"Aarav, I spotted 2 weak concepts yesterday."</i>
              <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 6 }}>— Pa, 9 min ago</span>
            </p>
          </div>
        </div>

        {/* ── RIGHT: Login form ── */}
        <div className="flex items-center justify-center px-6 sm:px-10 py-10 lg:py-16">
          <div className="w-full" style={{ maxWidth: 380 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>
              Log in
            </h2>
            <p style={{ fontSize: 13, color: '#8A8A95', marginBottom: 22, lineHeight: 1.5 }}>
              Pick up where you left off — your dashboard is ready.
            </p>

            {/* Google */}
            <button onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform"
              style={{
                background: '#fff', border: '1px solid #ECECEE',
                borderRadius: 12, padding: '12px 16px',
                fontSize: 14, fontWeight: 600, color: '#13131A',
              }}>
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div style={{ flex: 1, height: 1, background: '#ECECEE' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#B8B8C0', letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#ECECEE' }} />
            </div>

            {/* Email/password */}
            <form onSubmit={handleSubmit}>
              <Label>Email</Label>
              <Input type="email" placeholder="you@school.edu.in" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />

              <div className="flex items-center justify-between mt-4 mb-1.5">
                <Label inline>Password</Label>
                <button type="button" onClick={() => alert('Password reset coming soon — contact support.')}
                  style={{ fontSize: 12, fontWeight: 600, color: '#E85D3A' }}>
                  Forgot?
                </button>
              </div>
              <Input type="password" placeholder="••••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />

              <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: keepSignedIn ? '#E85D3A' : '#fff',
                  border: keepSignedIn ? 'none' : '1.5px solid #B8B8C0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {keepSignedIn && <CheckIcon />}
                </span>
                <input type="checkbox" checked={keepSignedIn}
                  onChange={e => setKeepSignedIn(e.target.checked)}
                  style={{ display: 'none' }} />
                <span style={{ fontSize: 13, color: '#3A3A45' }}>Keep me signed in on this device</span>
              </label>

              {error && (
                <p style={{
                  fontSize: 12.5, color: '#E85D3A', marginTop: 14,
                  background: '#FFE7DD', padding: '8px 12px', borderRadius: 8,
                }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full active:translate-y-[1px] transition-transform"
                style={{
                  marginTop: 18,
                  background: '#E85D3A', color: '#fff',
                  borderRadius: 12, padding: '14px 18px',
                  fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 0 #B2381B',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}>
                {loading ? 'Signing in…' : <>Continue to Pa <ArrowRight size={16} /></>}
              </button>
            </form>

            <p style={{ fontSize: 13, color: '#8A8A95', textAlign: 'center', marginTop: 22 }}>
              New to Padee?{' '}
              <button onClick={() => nav('/signup')}
                style={{ color: '#E85D3A', fontWeight: 600 }}>
                Create a free account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline atoms (kept here so the screen is self-contained) ──

function Stat({ number, color, label }: { number: string; color: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span style={{
        fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.5px',
        minWidth: 110, fontVariantNumeric: 'tabular-nums',
      }}>
        {number}
      </span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
    </div>
  )
}

function Label({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      color: '#8A8A95', textTransform: 'uppercase',
      display: 'block', marginBottom: inline ? 0 : 6,
    }}>
      {children}
    </span>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      style={{
        width: '100%',
        padding: '12px 14px', borderRadius: 10,
        border: '1px solid #ECECEE', background: '#fff',
        fontSize: 14, fontFamily: 'inherit', color: '#13131A',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = '#E85D3A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,93,58,0.15)' }}
      onBlur={e => { e.currentTarget.style.borderColor = '#ECECEE'; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.4-4.3 5.9l6.3 5.3c-.4.4 6.7-4.9 6.7-15.2 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12 10 18 20 6" />
    </svg>
  )
}
