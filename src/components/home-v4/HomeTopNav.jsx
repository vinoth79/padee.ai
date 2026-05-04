// HomeTopNav — dark 58px top bar matching reference: pill nav + search + streak + user chip.
// Clicking the user chip opens a small popover with Profile + Logout.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Ico from './Ico'
import PaMascot from './PaMascot'

const NAV_ITEMS = [
  { id: 'home',     label: 'Home',     icon: 'home',     target: 'home' },
  { id: 'ask',      label: 'Ask Pa',   icon: 'ask',      target: 'ask-ai', badge: 'AI' },
  { id: 'learn',    label: 'Learn',    icon: 'learn',    target: 'learn' },
  { id: 'tests',    label: 'Tests',    icon: 'tests',    target: 'tests' },
  { id: 'progress', label: 'Progress', icon: 'progress', target: 'me' },
]

export default function HomeTopNav({ user, streak = 0, onNavigate, active = 'home' }) {
  const name = (user?.name || 'Student').split(' ')[0]
  const grade = user?.class_level ? `Class ${user.class_level}` : 'Class —'
  const level = user?.level ?? 1
  const initial = name.slice(0, 1).toUpperCase()
  // v5 Sprint 1 — B2B users see their school name as a small pill next to
  // the logo. profile.school is hydrated by /api/user/home-data when
  // school_id is set; B2C users (school_id NULL) get nothing.
  const schoolName = user?.school?.name

  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Click-outside to close
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    try {
      // Mirror the v3 logout cleanup
      localStorage.removeItem('padee-user')
      localStorage.removeItem('padee-ask-ai-messages')
      localStorage.removeItem('padee-ask-ai-subject')
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="pd-topnav">
      <div className="brand">
        <PaMascot size={28} mood="idle" />
        <span className="logo-text">Padee<span className="logo-ai">.ai</span></span>
        {schoolName && (
          <span className="school-pill"
            title={schoolName}
            style={{
              marginLeft: 10,
              background: 'rgba(124, 92, 255, 0.15)',
              color: '#A99BFF',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 999,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
            {schoolName}
          </span>
        )}
      </div>

      <div className="nav-pills">
        {NAV_ITEMS.map(it => (
          <button key={it.id}
            className={`nav-pill ${it.id === active ? 'active' : ''}`}
            onClick={() => it.id !== active && onNavigate?.(it.target)}>
            <Ico name={it.icon} size={16} />
            <span>{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        ))}
      </div>

      <button className="search-bar" onClick={() => onNavigate?.('ask-ai')}>
        <Ico name="search" size={14} color="rgba(255,255,255,0.4)" />
        <span>Ask anything from your syllabus…</span>
        <span className="cmdk">⌘K</span>
      </button>

      <div className="streak-badge tabular">
        <Ico name="flame" size={14} color="#fff" />
        <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
      </div>

      <div className="user-mini-wrap" ref={menuRef} style={{ position: 'relative' }}>
        <button className="user-mini"
          onClick={() => setMenuOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>{initial}</div>
          <div style={{ textAlign: 'left' }}>
            <div className="name">{name}</div>
            <div className="sub">{grade} · Lv {level}</div>
          </div>
        </button>

        {menuOpen && (
          <div className="user-menu" role="menu">
            <div className="user-menu-head">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#13131A' }}>{user?.name || 'Student'}</div>
              <div style={{ fontSize: 11, color: '#8A8A95', marginTop: 2 }}>{grade} · Level {level}</div>
            </div>
            <button className="user-menu-item" role="menuitem"
              onClick={() => { setMenuOpen(false); onNavigate?.('me') }}>
              <Ico name="progress" size={14} color="#3A3A45" />
              <span>My profile &amp; progress</span>
            </button>
            <button className="user-menu-item" role="menuitem"
              onClick={() => { setMenuOpen(false); onNavigate?.('settings') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings &amp; plan</span>
            </button>
            <div className="user-menu-divider" />
            <button className="user-menu-item is-danger" role="menuitem" onClick={handleLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
