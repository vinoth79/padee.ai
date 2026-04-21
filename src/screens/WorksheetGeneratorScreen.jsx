// ═══════════════════════════════════════════════════════════════════════════
// WorksheetGeneratorScreen (v2 — free-text input, real LLM generation)
// ═══════════════════════════════════════════════════════════════════════════
// Teacher workflow:
//   1. Type a natural-language brief ("10 questions on Ohm's Law, Class 10,
//      MCQs + numericals, mixed difficulty")
//   2. Toggle validation (default ON — second LLM pass that checks each Q)
//   3. Generate → ~15-25s wait → preview
//   4. Preview: two tabs (Questions | Answer Key). Flagged questions show a
//      warning chip. Regenerated questions show a "⟳ regenerated" chip.
//   5. Save to library → reusable later
//
// Next chunk will add PDF / DOCX export buttons here.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import {
  generateWorksheet, saveWorksheet, listWorksheets, getWorksheet, deleteWorksheet,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import WorksheetPreview from '../components/teacher/WorksheetPreview'

const SAMPLE_PROMPTS = [
  '10 questions on Ohm\'s Law for Class 10 Physics — mix of MCQs and numericals, mixed difficulty',
  '15 short-answer questions on Acids, Bases and Salts for Class 10 Chemistry',
  '8 long-answer questions on Life Processes for Class 10 Biology, CBSE board-exam style',
  '12 MCQs on Quadratic Equations for Class 10 Maths, 1 mark each',
]

export default function WorksheetGeneratorScreen({ onNavigate }) {
  const { token } = useAuth()
  const [phase, setPhase] = useState('input') // input | generating | preview
  const [prompt, setPrompt] = useState('')
  const [validate, setValidate] = useState(true)
  const [result, setResult] = useState(null) // { worksheet, meta }
  const [savedId, setSavedId] = useState(null) // id after save
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [library, setLibrary] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => {
    if (!token) return
    listWorksheets(token).then(d => { if (Array.isArray(d.worksheets)) setLibrary(d.worksheets) })
  }, [token, savedId])

  async function handleGenerate() {
    if (!prompt.trim()) return
    setError('')
    setResult(null)
    setSavedId(null)
    setPhase('generating')
    const res = await generateWorksheet(token, { prompt: prompt.trim(), validate })
    if (res.error) {
      setError(res.error)
      setPhase('input')
      return
    }
    setResult(res)
    setPhase('preview')
  }

  async function handleSave() {
    if (!result?.worksheet) return
    setSaving(true)
    const payload = { worksheet: result.worksheet, prompt }
    if (savedId) payload.id = savedId
    const res = await saveWorksheet(token, payload)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSavedId(res.worksheet?.id)
  }

  async function openFromLibrary(id) {
    setError('')
    const res = await getWorksheet(token, id)
    if (res.error) { setError(res.error); return }
    const w = res.worksheet
    // `sections` in the DB row is already the JSON we need, but the row wraps
    // extra metadata we should normalise back into the shape generate returns.
    setResult({
      worksheet: {
        title: w.title,
        subject: w.subject,
        class_level: w.class_level,
        chapter: w.chapter,
        difficulty: w.difficulty,
        sections: w.sections,
        total_marks: (w.sections || []).reduce(
          (sum, s) => sum + (s.questions?.length || 0) * (s.marks_per_question || 1), 0
        ),
      },
      meta: { validationRan: false, flaggedCount: 0 },
    })
    setSavedId(w.id)
    setPrompt('')
    setPhase('preview')
    setShowLibrary(false)
  }

  async function handleDeleteFromLibrary(id) {
    if (!confirm('Delete this worksheet permanently?')) return
    await deleteWorksheet(token, id)
    setLibrary(prev => prev.filter(w => w.id !== id))
    if (savedId === id) { setSavedId(null) }
  }

  // ─── Header ───
  function Header() {
    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-[20px] lg:text-[22px] font-bold" style={{ color: '#111827' }}>
            Worksheet Generator
          </h1>
          <p className="text-[12px] lg:text-[13px]" style={{ color: '#6B7280' }}>
            Describe what you want. AI writes + quality-checks the questions.
          </p>
        </div>
        <button
          onClick={() => setShowLibrary(v => !v)}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ background: showLibrary ? '#0D9488' : '#FFFFFF', color: showLibrary ? '#FFFFFF' : '#0F766E', borderColor: '#0D9488' }}>
          {showLibrary ? 'Close' : `Library (${library.length})`}
        </button>
      </div>
    )
  }

  // ─── Library drawer ───
  if (showLibrary) {
    return (
      <div className="max-w-3xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
        <Header />
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#111827' }}>Your saved worksheets</h2>
          {library.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#6B7280' }}>No saved worksheets yet. Generate one first.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
              {library.map(w => (
                <li key={w.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: '#111827' }}>{w.title}</p>
                    <p className="text-[11px]" style={{ color: '#6B7280' }}>
                      Class {w.class_level} {w.subject}
                      {w.chapter ? ` · ${w.chapter}` : ''}
                      {' · '}{w.total_questions} questions
                      {' · '}{new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => openFromLibrary(w.id)}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
                    style={{ background: '#ECFDF5', color: '#0F766E' }}>
                    Open
                  </button>
                  <button onClick={() => handleDeleteFromLibrary(w.id)}
                    className="text-[12px] font-medium px-2 py-1.5 rounded-lg"
                    style={{ color: '#B91C1C' }} title="Delete">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ─── Generating state ───
  if (phase === 'generating') {
    return (
      <div className="max-w-3xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
        <Header />
        <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#E5E7EB' }}>
          <div className="inline-block w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mb-4"
            style={{ borderColor: '#0D9488', borderTopColor: 'transparent' }} />
          <p className="text-[15px] font-semibold" style={{ color: '#111827' }}>
            Writing your worksheet…
          </p>
          <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
            {validate
              ? 'Generating questions, then quality-checking each one (~20s)'
              : 'Generating questions (~15s)'}
          </p>
        </div>
      </div>
    )
  }

  // ─── Preview state ───
  if (phase === 'preview' && result?.worksheet) {
    return (
      <div className="max-w-4xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
        <Header />
        <WorksheetPreview
          worksheet={result.worksheet}
          meta={result.meta}
          onSave={handleSave}
          saving={saving}
          savedId={savedId}
          onNew={() => { setPhase('input'); setResult(null); setSavedId(null) }}
        />
      </div>
    )
  }

  // ─── Input state (default) ───
  return (
    <div className="max-w-3xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
      <Header />

      {error && (
        <div className="mb-4 p-3 rounded-lg text-[13px]" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
          ⚠ {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 lg:p-5" style={{ borderColor: '#E5E7EB' }}>
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#374151' }}>
          Describe the worksheet you want
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g., 10 questions on Ohm's Law for Class 10 Physics — mix of MCQs and numericals, mixed difficulty"
          rows={4}
          className="w-full rounded-lg border p-3 text-[14px] focus:outline-none focus:ring-2"
          style={{ borderColor: '#D1D5DB' }}
        />

        {/* Sample prompts */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold mb-2" style={{ color: '#6B7280' }}>EXAMPLES</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((sp, i) => (
              <button key={i} onClick={() => setPrompt(sp)}
                className="text-[11px] px-2.5 py-1 rounded-md transition-colors"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                {sp.length > 70 ? sp.slice(0, 70) + '…' : sp}
              </button>
            ))}
          </div>
        </div>

        {/* Validation toggle */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
          <input type="checkbox" id="validate" checked={validate} onChange={e => setValidate(e.target.checked)}
            className="w-4 h-4 rounded" style={{ accentColor: '#0D9488' }} />
          <label htmlFor="validate" className="text-[13px] flex-1 cursor-pointer" style={{ color: '#374151' }}>
            <span className="font-medium">Quality-check each question</span>
            <span className="text-[11px] block" style={{ color: '#6B7280' }}>
              Second LLM pass catches ambiguous questions and regenerates them. Adds ~5s.
            </span>
          </label>
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={!prompt.trim()}
          className="w-full mt-4 text-[14px] font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
          style={{ background: '#0D9488', color: '#FFFFFF' }}>
          Generate worksheet
        </button>
      </div>
    </div>
  )
}
