// ═══ Learn Screen v2 ═══
// Transforms the Learn screen from a file-browser into a personalised
// learning path. Four key elements:
//   1. Today's focus hero (top) — driven by recommendation engine
//   2. Recently studied strip — quick return to recent concepts
//   3. Rich subject cards — mastery ring + concept counts + last studied + next up
//   4. Expandable chapters → concept rows, each tappable to stream an explanation
//
// Click concept → /ask?question=Explain <concept> → DoubtSolverScreen
// auto-sends via initialQuestion prop (zero new chat UI needed).
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'

const SUBJECT_ICONS = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖', 'Social Science': '🌍',
  Economics: '📊', Accounts: '📋', 'Business Studies': '💼',
}

const SUBJECT_COLORS = {
  Physics:           { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', ring: '#2563EB' },
  Chemistry:         { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', ring: '#EA580C' },
  Mathematics:       { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', ring: '#7C3AED' },
  Biology:           { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', ring: '#059669' },
  'Computer Science':{ bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490', ring: '#0891B2' },
  English:           { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', ring: '#E11D48' },
  'Social Science':  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', ring: '#D97706' },
  Economics:         { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', ring: '#D97706' },
  Accounts:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', ring: '#2563EB' },
  'Business Studies':{ bg: '#ECFEFF', border: '#A5F3FC', text: '#0E7490', ring: '#0891B2' },
}

const STATUS_META = {
  mastered:    { label: 'Mastered',    bg: '#ECFDF5', text: '#065F46', dot: '#059669', icon: '🟢' },
  learning:    { label: 'Learning',    bg: '#FEF3C7', text: '#92400E', dot: '#D97706', icon: '🟡' },
  weak:        { label: 'Needs work',  bg: '#FEF2F2', text: '#991B1B', dot: '#DC2626', icon: '🔴' },
  not_started: { label: 'Not started', bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF', icon: '⚪' },
}

function getToken() {
  const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try { const s = JSON.parse(localStorage.getItem(key)); return s?.access_token || s?.currentSession?.access_token || null }
  catch { return null }
}

function daysSince(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} wk ago`
  return `${Math.floor(days / 30)} mo ago`
}

export default function LearnScreen({ onNavigate }) {
  const user = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [expandedChapters, setExpandedChapters] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) { setLoading(false); return }
    fetch('/api/user/learn-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json() })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Click handler: "Learn this concept" — auto-streams explanation in Ask AI
  function learnConcept(concept) {
    const q = `Explain ${concept.concept_name} in detail with an example I can follow as a Class ${user.studentClass || 10} student.`
    onNavigate('ask-ai', { question: q, subject: concept.subject || null })
  }

  function toggleChapter(key) {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-2" style={{ background: '#E5E7EB' }} />
        <div className="h-4 w-72 rounded mb-6 animate-pulse" style={{ background: '#F3F4F6' }} />
        <div className="h-32 rounded-2xl animate-pulse mb-4" style={{ background: '#E5E7EB' }} />
        <div className="h-24 rounded-2xl animate-pulse mb-3" style={{ background: '#F3F4F6' }} />
        <div className="h-24 rounded-2xl animate-pulse" style={{ background: '#F3F4F6' }} />
      </div>
    )
  }

  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-red-600">{err}</p>
      </div>
    )
  }

  const subjects = data?.subjects || []
  const todayFocus = data?.todayFocus
  const recentConcepts = data?.recentConcepts || []

  if (subjects.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <div className="bg-white rounded-2xl p-8 border">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Complete onboarding to see your subjects.</p>
          <button onClick={() => onNavigate('home')}
            className="mt-4 text-sm font-semibold underline" style={{ color: '#0D9488' }}>
            Go home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 sm:pb-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>Learn</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>Your personalised learning path — tap any concept to have it explained.</p>
      </div>

      {/* ═══ 1. TODAY'S FOCUS HERO ═══ */}
      {todayFocus && (
        <div className="rounded-2xl p-5 shadow-action relative overflow-hidden"
          style={{ background: '#0F1729' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#5EEAD4' }}>
              ✨ Today's focus
            </p>
            <h2 className="text-[19px] font-bold mb-1" style={{ color: '#FFFFFF' }}>
              {todayFocus.concept_name}
            </h2>
            <p className="text-[13px] mb-3" style={{ color: '#94A3B8' }}>
              {todayFocus.subject} · {todayFocus.chapter_name}
              {todayFocus.exam_weight_percent > 0 && ` · ${todayFocus.exam_weight_percent}% of chapter marks`}
            </p>
            {todayFocus.hero_copy && (
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: '#CBD5E1' }}>
                {todayFocus.hero_copy}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => learnConcept(todayFocus)}
                className="font-semibold py-2.5 px-5 rounded-lg text-[14px] transition-colors"
                style={{ background: '#0D9488', color: '#FFFFFF' }}>
                Start learning →
              </button>
              <button onClick={() => onNavigate('practice', { subject: todayFocus.subject, concept: todayFocus.concept_slug })}
                className="font-medium py-2.5 px-4 rounded-lg text-[14px] transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}>
                Practice it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. RECENTLY STUDIED STRIP ═══ */}
      {recentConcepts.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#6B7280' }}>
            Pick up where you left off
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {recentConcepts.map(rc => {
              const colors = SUBJECT_COLORS[rc.subject] || SUBJECT_COLORS.Physics
              const status = STATUS_META[rc.mastery_status] || STATUS_META.not_started
              return (
                <button key={rc.concept_slug} onClick={() => learnConcept(rc)}
                  className="flex-shrink-0 bg-white rounded-xl px-3 py-2.5 border hover:shadow-card-hover transition-shadow active:scale-95"
                  style={{ borderColor: colors.border, minWidth: 180, maxWidth: 240 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{SUBJECT_ICONS[rc.subject] || '📖'}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.text }}>
                      {rc.subject}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-left truncate" style={{ color: '#111827' }}>
                    {rc.concept_name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: status.dot }}>
                    {status.icon} {status.label} · {daysSince(rc.last_practiced_at)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ 3. SUBJECT CARDS ═══ */}
      <div className="space-y-4">
        {subjects.map(sub => {
          const colors = SUBJECT_COLORS[sub.subject] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', ring: '#6B7280' }
          const icon = SUBJECT_ICONS[sub.subject] || '📖'

          return (
            <div key={sub.subject} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              {/* Subject header: icon + name + mastery ring + counts */}
              <div className="p-4" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold" style={{ color: colors.text }}>{sub.subject}</h2>
                    {sub.no_content ? (
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        Coming soon — your teacher is adding content for this subject.
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {sub.counts.total} concept{sub.counts.total !== 1 ? 's' : ''} · {sub.chapters.length} chapter{sub.chapters.length !== 1 ? 's' : ''}
                        {sub.last_studied_at && ` · last studied ${daysSince(sub.last_studied_at)}`}
                      </p>
                    )}
                  </div>

                  {!sub.no_content && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#F3F4F6" strokeWidth="3.5" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke={colors.ring} strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 16}`}
                          strokeDashoffset={`${2 * Math.PI * 16 * (1 - sub.overall_mastery / 100)}`}
                          className="transition-all duration-700" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono" style={{ color: colors.text }}>
                        {sub.overall_mastery}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Status counts row */}
                {!sub.no_content && sub.counts.total > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {sub.counts.mastered > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: STATUS_META.mastered.bg, color: STATUS_META.mastered.text }}>
                        🟢 {sub.counts.mastered} mastered
                      </span>
                    )}
                    {sub.counts.learning > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: STATUS_META.learning.bg, color: STATUS_META.learning.text }}>
                        🟡 {sub.counts.learning} learning
                      </span>
                    )}
                    {sub.counts.weak > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: STATUS_META.weak.bg, color: STATUS_META.weak.text }}>
                        🔴 {sub.counts.weak} need work
                      </span>
                    )}
                    {sub.counts.not_started > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: STATUS_META.not_started.bg, color: STATUS_META.not_started.text }}>
                        ⚪ {sub.counts.not_started} new
                      </span>
                    )}
                  </div>
                )}

                {/* Next concept CTA */}
                {!sub.no_content && sub.next_concept && (
                  <button onClick={() => learnConcept({ ...sub.next_concept, subject: sub.subject })}
                    className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-left hover:shadow-card transition-shadow"
                    style={{ border: `1px solid ${colors.border}` }}>
                    <span className="text-xs font-semibold" style={{ color: colors.text }}>Next up:</span>
                    <span className="text-xs flex-1 truncate" style={{ color: '#111827' }}>
                      {sub.next_concept.concept_name}
                    </span>
                    <span className="text-sm" style={{ color: colors.text }}>→</span>
                  </button>
                )}
              </div>

              {/* Chapters list */}
              {sub.no_content ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-2xl mb-1">📚</p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>No content uploaded yet</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Ask your teacher or admin to add the {sub.subject} textbook.
                  </p>
                </div>
              ) : sub.chapters.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>No chapters indexed yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {sub.chapters.map((ch) => {
                    const key = `${sub.subject}-${ch.chapter_no}`
                    const isOpen = expandedChapters.has(key)
                    const conceptsCount = ch.concepts.length
                    const masteredInCh = ch.concepts.filter(c => c.mastery_status === 'mastered').length
                    const hasContent = conceptsCount > 0
                    return (
                      <div key={key}>
                        <button onClick={() => hasContent && toggleChapter(key)}
                          disabled={!hasContent}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          style={{ cursor: hasContent ? 'pointer' : 'default' }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: colors.bg, color: colors.text }}>
                            {ch.chapter_no}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                              {ch.chapter_name}
                            </p>
                            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                              {hasContent
                                ? `${conceptsCount} concept${conceptsCount !== 1 ? 's' : ''} · ${masteredInCh} mastered`
                                : `${ch.passage_count} passages · no concepts yet`}
                            </p>
                          </div>
                          {hasContent && (
                            <span style={{ color: '#9CA3AF', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                              ›
                            </span>
                          )}
                        </button>

                        {/* Expanded concepts */}
                        {isOpen && hasContent && (
                          <div className="bg-gray-50/40 divide-y" style={{ borderColor: '#F3F4F6' }}>
                            {ch.concepts.map(concept => {
                              const status = STATUS_META[concept.mastery_status] || STATUS_META.not_started
                              return (
                                <button key={concept.concept_slug}
                                  onClick={() => learnConcept({ ...concept, subject: sub.subject })}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 pl-16 hover:bg-white transition-colors text-left">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.dot }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium truncate" style={{ color: '#111827' }}>
                                      {concept.concept_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] mt-0.5">
                                      <span style={{ color: status.dot }}>{status.label}</span>
                                      {concept.attempt_count > 0 && (
                                        <>
                                          <span style={{ color: '#D1D5DB' }}>·</span>
                                          <span style={{ color: '#9CA3AF' }}>
                                            {concept.attempt_count} attempt{concept.attempt_count !== 1 ? 's' : ''}
                                          </span>
                                        </>
                                      )}
                                      {concept.failure_count > 0 && concept.mastery_status !== 'mastered' && (
                                        <>
                                          <span style={{ color: '#D1D5DB' }}>·</span>
                                          <span style={{ color: '#DC2626' }}>
                                            {concept.failure_count} failure{concept.failure_count !== 1 ? 's' : ''}
                                          </span>
                                        </>
                                      )}
                                      {concept.exam_weight_percent >= 10 && (
                                        <>
                                          <span style={{ color: '#D1D5DB' }}>·</span>
                                          <span className="font-medium" style={{ color: '#0F766E' }}>
                                            {concept.exam_weight_percent}% marks
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                                    style={{ background: '#F0FDFA', color: '#0F766E' }}>
                                    Learn →
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
