// ═══════════════════════════════════════════════════════════════════════════
// WorksheetGeneratorScreenV4 — Pa drafts, you polish.
// ═══════════════════════════════════════════════════════════════════════════
// v4 redesign of the worksheet generator. Two-column: structured form on the
// left (Scope / Shape / Personalise), live paper-preview on the right.
//
// Form values are translated into a natural-language prompt and sent to the
// existing /api/ai/worksheet endpoint (free-text-driven). Result renders into
// a print-styled paper preview. Save persists to library; Assign routes the
// teacher to /teacher/test with the worksheet pre-loaded.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import {
  generateWorksheet, saveWorksheet, listConcepts,
} from '../services/api'
import { exportWorksheetPDF } from '../lib/worksheetExport'
import TeacherTopNav from '../components/teacher-v4/TeacherTopNav'
import '../styles/home-v4.css'
import '../styles/teacher-v4.css'

const QUESTION_TYPES = [
  { id: 'mcq',       label: 'MCQ' },
  { id: 'short',     label: 'Short' },
  { id: 'long',      label: 'Long' },
  { id: 'numerical', label: 'Numerical' },
  { id: 'diagram',   label: 'Diagram' },
]

const DIFFICULTY_PRESETS = {
  easy:   { easy: 60, med: 30, hard: 10 },
  mixed:  { easy: 30, med: 50, hard: 20 },
  hard:   { easy: 10, med: 30, hard: 60 },
}

const PAGE_SIZE = 4 // questions per preview page

export default function WorksheetGeneratorScreenV4() {
  const { token } = useAuth()
  const user = useUser()
  const navigate = useNavigate()

  // ─── form state ─────────────────────────────────────────────────────
  const [classLevel, setClassLevel] = useState(user?.studentClass || 10)
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [selectedConcepts, setSelectedConcepts] = useState([])
  const [questionCount, setQuestionCount] = useState(15)
  const [difficultyMode, setDifficultyMode] = useState('mixed')
  const [questionTypes, setQuestionTypes] = useState(['mcq', 'short', 'numerical'])

  // ─── concept catalog ────────────────────────────────────────────────
  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    listConcepts(token).then(res => {
      setCatalogLoading(false)
      if (Array.isArray(res.concepts)) setCatalog(res.concepts.filter(c => c.status === 'published'))
    })
  }, [token])

  // Derived: subjects, chapters, concepts (cascading from current selections)
  const subjects = useMemo(() => {
    const s = new Set()
    catalog.filter(c => c.class_level === classLevel).forEach(c => s.add(c.subject))
    return Array.from(s).sort()
  }, [catalog, classLevel])

  const chapters = useMemo(() => {
    const map = new Map() // key = chapter_no, value = { no, name }
    catalog
      .filter(c => c.class_level === classLevel && c.subject === subject)
      .forEach(c => {
        const key = c.chapter_no || c.chapter_name
        if (!map.has(key)) map.set(key, { no: c.chapter_no, name: c.chapter_name })
      })
    return Array.from(map.values()).sort((a, b) => (a.no || 0) - (b.no || 0))
  }, [catalog, classLevel, subject])

  const chapterConcepts = useMemo(() => {
    return catalog.filter(c =>
      c.class_level === classLevel &&
      c.subject === subject &&
      c.chapter_name === chapter
    )
  }, [catalog, classLevel, subject, chapter])

  // Reset cascading dependents when parent changes
  useEffect(() => { setChapter(''); setSelectedConcepts([]) }, [subject, classLevel])
  useEffect(() => { setSelectedConcepts([]) }, [chapter])

  // Pick first available subject + chapter once catalog loads
  useEffect(() => {
    if (subject || subjects.length === 0) return
    setSubject(subjects[0])
  }, [subjects, subject])

  useEffect(() => {
    if (chapter || chapters.length === 0) return
    setChapter(chapters[0].name)
  }, [chapters, chapter])

  // ─── generation ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState('idle') // idle | generating | preview
  const [result, setResult] = useState(null) // { worksheet, meta }
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [previewPage, setPreviewPage] = useState(0)

  function buildPrompt() {
    const conceptStr = selectedConcepts.length
      ? ` covering ${selectedConcepts.join(', ')}`
      : ''
    const typesStr = questionTypes.length
      ? ` with ${questionTypes.join(', ')} questions`
      : ''
    const diffStr = difficultyMode === 'mixed'
      ? ' mixed difficulty (30% easy, 50% medium, 20% hard)'
      : difficultyMode === 'easy'
        ? ' mostly easy difficulty'
        : ' mostly hard difficulty'
    return `${questionCount} questions on ${chapter || subject} for Class ${classLevel} ${subject}${conceptStr}${typesStr}${diffStr}.`
  }

  async function handleGenerate() {
    if (!chapter && !subject) {
      setError('Pick a subject and chapter first')
      return
    }
    setError('')
    setResult(null)
    setSavedId(null)
    setPreviewPage(0)
    setPhase('generating')
    const res = await generateWorksheet(token, { prompt: buildPrompt(), validate: true })
    if (res.error) {
      setError(res.error)
      setPhase('idle')
      return
    }
    setResult(res)
    setPhase('preview')
  }

  async function handleAssign() {
    if (!result?.worksheet) return
    setSaving(true)
    const res = await saveWorksheet(token, { worksheet: result.worksheet, prompt: buildPrompt(), id: savedId || undefined })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSavedId(res.worksheet?.id)
    // Hand off to assign-test screen with the saved worksheet pre-selected
    navigate('/teacher/test', { state: { fromWorksheet: res.worksheet?.id } })
  }

  function handleSwapAll() {
    handleGenerate()
  }

  const flatQuestions = useMemo(() => {
    if (!result?.worksheet?.sections) return []
    const all = []
    for (const s of result.worksheet.sections) {
      for (const q of (s.questions || [])) {
        all.push({ ...q, section_marks: s.marks_per_question || 1 })
      }
    }
    return all
  }, [result])

  const totalPages = Math.max(1, Math.ceil(flatQuestions.length / PAGE_SIZE))
  const pageQuestions = flatQuestions.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE)

  const stats = result?.stats
  const flagged = stats?.flaggedCount || 0

  return (
    <div className="teacher-v4">
      <TeacherTopNav />

      <div className="pd-page">
        {/* Page head */}
        <div className="page-head">
          <div>
            <div className="head-eyebrow">02 — desktop</div>
            <h2 className="t-h1" style={{ marginTop: 4 }}>Worksheet generator <span style={{ color: 'var(--c-muted)', fontWeight: 600 }}>· Pa drafts, you polish</span></h2>
          </div>
          <div className="head-eyebrow" style={{ color: 'var(--c-muted-2)' }}>draft · preview · assign</div>
        </div>

        {error && (
          <div style={{
            margin: '16px 0',
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FEF2F2', color: '#991B1B',
            border: '1px solid #FECACA',
            fontSize: 13,
          }}>⚠ {error}</div>
        )}

        <div className="worksheet-grid" style={{ marginTop: 18 }}>
          {/* ─── LEFT FORM ─── */}
          <div>
            <ScopeCard
              classLevel={classLevel} setClassLevel={setClassLevel}
              subject={subject} setSubject={setSubject}
              chapter={chapter} setChapter={setChapter}
              subjects={subjects} chapters={chapters}
              chapterConcepts={chapterConcepts}
              selectedConcepts={selectedConcepts} setSelectedConcepts={setSelectedConcepts}
              catalogLoading={catalogLoading}
            />
            <ShapeCard
              questionCount={questionCount} setQuestionCount={setQuestionCount}
              difficultyMode={difficultyMode} setDifficultyMode={setDifficultyMode}
              questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
            />
            <PersonaliseCard onGenerate={handleGenerate} canGenerate={!!chapter || !!subject} generating={phase === 'generating'} />
          </div>

          {/* ─── RIGHT PREVIEW ─── */}
          <div className="ws-preview">
            <div className="ws-preview-head">
              <div>
                <div className="ws-preview-title">
                  Preview {result ? `· Page ${previewPage + 1} of ${totalPages}` : ''}
                </div>
                <div className="ws-preview-sub">
                  {result
                    ? 'Click any question to edit, swap, or ask Pa for a variant.'
                    : 'Pick scope and shape, then generate.'}
                </div>
              </div>
              <div className="ws-preview-actions">
                {result && (
                  <>
                    <button className="link-btn" onClick={handleSwapAll} title="Regenerate the worksheet from scratch">
                      <SwapIcon /> Swap all
                    </button>
                    <button className="link-btn" onClick={() => exportWorksheetPDF(result.worksheet)}>
                      <DownloadIcon /> PDF
                    </button>
                    <button className="pd-btn primary sm" onClick={handleAssign} disabled={saving}>
                      {saving ? 'Saving…' : savedId ? '✓ Assigned' : 'Assign'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {phase === 'idle' && !result && (
              <PaperShell empty>
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <div className="icon">📝</div>
                  <h3>Pa is ready</h3>
                  <p>Set scope and shape on the left, then hit <b>Generate</b> below.</p>
                </div>
              </PaperShell>
            )}

            {phase === 'generating' && (
              <PaperShell>
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '3px solid var(--c-accent)', borderTopColor: 'transparent',
                    margin: '0 auto 12px',
                    animation: 'skel 1s linear infinite',
                  }} />
                  <h3>Pa is drafting…</h3>
                  <p>Writing {questionCount} questions, then quality-checking each one (~20s).</p>
                </div>
              </PaperShell>
            )}

            {phase === 'preview' && result?.worksheet && (
              <>
                <PaperShell>
                  <div className="head">
                    <div>
                      <div className="title">{result.worksheet.title || `Worksheet — ${chapter || subject}`}</div>
                      <div className="sub">
                        Class {result.worksheet.class_level || classLevel}
                        {' · '}{result.worksheet.subject || subject}
                        {result.worksheet.chapter ? ` · ${result.worksheet.chapter}` : ''}
                        {' · '}{result.worksheet.total_marks || 0} marks
                        {' · '}{Math.max(15, Math.round(flatQuestions.length * 2.5))} min
                      </div>
                    </div>
                    <div className="blanks">
                      <div>Name: <span className="line" /></div>
                      <div>Date: <span className="line" /></div>
                    </div>
                  </div>

                  {pageQuestions.map((q, idx) => {
                    const globalIdx = previewPage * PAGE_SIZE + idx + 1
                    const diff = (q.difficulty || 'medium').toLowerCase()
                    const diffLabel = diff === 'easy' ? 'Easy' : diff === 'hard' ? 'Hard' : 'Medium'
                    const diffClass = diff === 'easy' ? 'easy' : diff === 'hard' ? 'hard' : 'med'
                    const typeLabel = q.type === 'mcq' ? 'MCQ' : q.type === 'numerical' ? 'Numerical' : q.type === 'long_answer' ? 'Long' : q.type === 'short_answer' ? 'Short' : 'Q'
                    return (
                      <div key={idx} className="ws-q">
                        <div className="num">{globalIdx}.</div>
                        <div>
                          <div className="text">{q.question}</div>
                          {q.options && (
                            <div className="options">
                              {Object.entries(q.options).map(([key, val]) => (
                                <div key={key}>({key.toLowerCase()}) {val}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="meta">
                          <span className="type">{typeLabel}</span>
                          <span className={`diff ${diffClass}`}>{diffLabel}</span>
                          <span className="marks">[{q.section_marks || 1}]</span>
                        </div>
                      </div>
                    )
                  })}
                </PaperShell>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                    <button className="pd-btn outline sm" onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}>‹ Prev</button>
                    <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--c-muted)' }}>{previewPage + 1} / {totalPages}</span>
                    <button className="pd-btn outline sm" onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))} disabled={previewPage >= totalPages - 1}>Next ›</button>
                  </div>
                )}

                {flagged > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--c-amber)', textAlign: 'center' }}>
                    ⚠ {flagged} question{flagged > 1 ? 's' : ''} flagged by quality check.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// ── Form sub-components ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────

function ScopeCard({
  classLevel, setClassLevel, subject, setSubject, chapter, setChapter,
  subjects, chapters, chapterConcepts, selectedConcepts, setSelectedConcepts,
  catalogLoading,
}) {
  function toggleConcept(c) {
    setSelectedConcepts(prev =>
      prev.includes(c.concept_name)
        ? prev.filter(x => x !== c.concept_name)
        : [...prev, c.concept_name]
    )
  }
  return (
    <div className="ws-form-card">
      <div className="step-eyebrow">1 · Scope</div>
      <div className="ws-field">
        <div className="ws-label">Class</div>
        <select className="ws-select" value={classLevel} onChange={e => setClassLevel(parseInt(e.target.value))}>
          {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>
      <div className="ws-field">
        <div className="ws-label">Subject</div>
        <select className="ws-select" value={subject} onChange={e => setSubject(e.target.value)} disabled={catalogLoading}>
          {catalogLoading && <option>Loading…</option>}
          {!catalogLoading && subjects.length === 0 && <option value="">No published concepts</option>}
          {!catalogLoading && subjects.length > 0 && !subject && <option value="">Select subject</option>}
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="ws-field">
        <div className="ws-label">Chapter</div>
        <select className="ws-select" value={chapter} onChange={e => setChapter(e.target.value)} disabled={!subject}>
          {!subject && <option value="">Pick subject first</option>}
          {chapters.length === 0 && subject && <option value="">No chapters published</option>}
          {chapters.length > 0 && !chapter && <option value="">Select chapter</option>}
          {chapters.map(ch => (
            <option key={ch.name} value={ch.name}>
              {ch.no ? `Ch ${ch.no} · ` : ''}{ch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="ws-field">
        <div className="ws-label">Concepts {selectedConcepts.length > 0 ? `(${selectedConcepts.length} selected)` : '(optional — leave empty for whole chapter)'}</div>
        <div className="ws-chip-row">
          {chapterConcepts.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
              {chapter ? 'No concepts published yet for this chapter' : 'Pick a chapter first'}
            </span>
          )}
          {chapterConcepts.map(c => (
            <button
              key={c.concept_slug}
              className={`ws-chip ${selectedConcepts.includes(c.concept_name) ? 'selected' : ''}`}
              onClick={() => toggleConcept(c)}
              type="button"
            >
              {c.concept_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShapeCard({ questionCount, setQuestionCount, difficultyMode, setDifficultyMode, questionTypes, setQuestionTypes }) {
  function toggleType(id) {
    setQuestionTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const mix = DIFFICULTY_PRESETS[difficultyMode]
  return (
    <div className="ws-form-card">
      <div className="step-eyebrow">2 · Shape</div>
      <div className="ws-field">
        <div className="ws-label">Questions</div>
        <div className="ws-slider-row">
          <input className="ws-slider" type="range" min={5} max={30} step={1}
            value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))} />
          <span className="num">{questionCount}</span>
        </div>
      </div>
      <div className="ws-field">
        <div className="ws-label">Difficulty mix</div>
        <div className="ws-chip-row" style={{ marginBottom: 10 }}>
          {[
            { id: 'easy',  label: 'Mostly easy' },
            { id: 'mixed', label: 'Mixed' },
            { id: 'hard',  label: 'Mostly hard' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              className={`ws-chip ${difficultyMode === m.id ? 'selected' : ''}`}
              onClick={() => setDifficultyMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ws-difficulty-bar">
          <div className="easy" style={{ flex: mix.easy }}>{mix.easy}% easy</div>
          <div className="med"  style={{ flex: mix.med }}>{mix.med}% med</div>
          <div className="hard" style={{ flex: mix.hard }}>{mix.hard}% hard</div>
        </div>
      </div>
      <div className="ws-field">
        <div className="ws-label">Question types</div>
        <div className="ws-chip-row">
          {QUESTION_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`ws-chip ${questionTypes.includes(t.id) ? 'selected' : ''}`}
              onClick={() => toggleType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonaliseCard({ onGenerate, canGenerate, generating }) {
  return (
    <div className="ws-form-card">
      <div className="step-eyebrow">3 · Personalise</div>
      <div className="ws-field" style={{ fontSize: 12.5, color: 'var(--c-muted)', lineHeight: 1.5 }}>
        Pa will use class-level mastery hints automatically — students struggling on the chosen concepts get more attempts at those questions. (Per-student personalisation lands in Phase 2.)
      </div>
      <button
        className="pd-btn primary"
        style={{ width: '100%', marginTop: 8 }}
        onClick={onGenerate}
        disabled={!canGenerate || generating}
      >
        {generating ? 'Generating…' : 'Generate worksheet'}
      </button>
    </div>
  )
}

function PaperShell({ empty, children }) {
  return (
    <div className={`ws-paper${empty ? ' empty' : ''}`}>
      {children}
    </div>
  )
}

// ─── Icons ───
function SwapIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
