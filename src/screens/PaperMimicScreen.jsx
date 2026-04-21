// ═══════════════════════════════════════════════════════════════════════════
// PaperMimicScreen — upload a past CBSE paper PDF, get a fresh paper with
// the same structure (sections, marks distribution, question types, topics).
// ═══════════════════════════════════════════════════════════════════════════
// Flow: upload → generate (~30s, longer than worksheet because LLM reads full
// paper) → preview (shared with WorksheetGeneratorScreen via WorksheetPreview)
// → save / PDF / DOCX.
//
// Output JSON shape is identical to `/worksheet`, so the save endpoint
// persists it with `mode: 'mimic'` and `source_pdf: <filename>` and it shows
// up in the teacher's worksheet library alongside custom worksheets.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { mimicPaper, saveWorksheet } from '../services/api'
import { useAuth } from '../context/AuthContext'
import WorksheetPreview from '../components/teacher/WorksheetPreview'

export default function PaperMimicScreen() {
  const { token } = useAuth()
  const [phase, setPhase] = useState('input') // input | generating | preview
  const [file, setFile] = useState(null)
  const [hint, setHint] = useState('')
  const [validate, setValidate] = useState(true)
  const [result, setResult] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleFile(f) {
    setError('')
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      setError(`File too large (${Math.round(f.size / 1024 / 1024)} MB). Max 15 MB.`)
      return
    }
    setFile(f)
  }

  async function handleGenerate() {
    if (!file) return
    setError('')
    setSavedId(null)
    setPhase('generating')
    const res = await mimicPaper(token, file, { validate, hint: hint || undefined })
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
    const payload = { worksheet: result.worksheet }
    if (savedId) payload.id = savedId
    const res = await saveWorksheet(token, payload)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSavedId(res.worksheet?.id)
  }

  function reset() {
    setPhase('input')
    setResult(null)
    setSavedId(null)
    setFile(null)
    setHint('')
  }

  // ─── Generating state ───
  if (phase === 'generating') {
    return (
      <div className="max-w-3xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
        <PageHeader />
        <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#E5E7EB' }}>
          <div className="inline-block w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mb-4"
            style={{ borderColor: '#0D9488', borderTopColor: 'transparent' }} />
          <p className="text-[15px] font-semibold" style={{ color: '#111827' }}>
            Reading paper and generating mimic…
          </p>
          <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
            Extracting structure from <b>{file?.name}</b>, writing fresh questions{validate ? ', then quality-checking each one' : ''} (~30s)
          </p>
        </div>
      </div>
    )
  }

  // ─── Preview state (shared component) ───
  if (phase === 'preview' && result?.worksheet) {
    const src = result.meta?.sourcePdf
    const truncated = result.meta?.pdfTruncated
    return (
      <div className="max-w-4xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
        <PageHeader />
        <WorksheetPreview
          worksheet={result.worksheet}
          meta={result.meta}
          onSave={handleSave}
          saving={saving}
          savedId={savedId}
          onNew={reset}
          extraBadges={
            <>
              {src && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#374151' }}>
                  🗂 {src}
                </span>
              )}
              {truncated && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}
                  title="The source paper was longer than the model's input limit; we used the first 24k chars.">
                  ℹ source truncated
                </span>
              )}
            </>
          }
        />
      </div>
    )
  }

  // ─── Input state ───
  return (
    <div className="max-w-3xl mx-auto py-6 lg:py-8 px-4 lg:px-6">
      <PageHeader />

      {error && (
        <div className="mb-4 p-3 rounded-lg text-[13px]" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
          ⚠ {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 lg:p-5" style={{ borderColor: '#E5E7EB' }}>
        {/* File drop / upload */}
        <label className="block text-[13px] font-semibold mb-2" style={{ color: '#374151' }}>
          Upload a past CBSE paper (PDF)
        </label>
        <div
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#F0FDFA' }}
          onDragLeave={e => { e.currentTarget.style.background = '#FFFFFF' }}
          onDrop={e => {
            e.preventDefault(); e.currentTarget.style.background = '#FFFFFF'
            const f = e.dataTransfer.files?.[0]; if (f) handleFile(f)
          }}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
          style={{ borderColor: file ? '#0D9488' : '#D1D5DB', background: '#FFFFFF' }}>
          <input ref={fileInputRef} type="file" accept="application/pdf"
            onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
          {file ? (
            <>
              <p className="text-[30px] mb-1">📄</p>
              <p className="text-[14px] font-semibold" style={{ color: '#0F766E' }}>{file.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                {(file.size / 1024).toFixed(0)} KB · click to change
              </p>
            </>
          ) : (
            <>
              <p className="text-[30px] mb-1">📎</p>
              <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>
                Drop a PDF here or click to browse
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                Max 15 MB · CBSE board papers, prelim papers, sample papers, previous years' exams
              </p>
            </>
          )}
        </div>

        {/* Optional hint */}
        <label className="block text-[13px] font-semibold mt-4 mb-2" style={{ color: '#374151' }}>
          Optional hint <span className="font-normal" style={{ color: '#6B7280' }}>— anything to guide the mimic</span>
        </label>
        <input value={hint} onChange={e => setHint(e.target.value)}
          placeholder="e.g., 'keep same difficulty', 'focus on numerical-heavy questions', 'exclude Chapter 5 content'"
          className="w-full rounded-lg border p-2.5 text-[13px] focus:outline-none focus:ring-2"
          style={{ borderColor: '#D1D5DB' }} />

        {/* Validation toggle */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
          <input type="checkbox" id="validate" checked={validate} onChange={e => setValidate(e.target.checked)}
            className="w-4 h-4 rounded" style={{ accentColor: '#0D9488' }} />
          <label htmlFor="validate" className="text-[13px] flex-1 cursor-pointer" style={{ color: '#374151' }}>
            <span className="font-medium">Quality-check each question</span>
            <span className="text-[11px] block" style={{ color: '#6B7280' }}>
              Second LLM pass catches ambiguous questions and regenerates them. Adds ~8s.
            </span>
          </label>
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={!file}
          className="w-full mt-4 text-[14px] font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
          style={{ background: '#0D9488', color: '#FFFFFF' }}>
          Generate mimicked paper
        </button>

        <p className="text-[11px] mt-3" style={{ color: '#6B7280' }}>
          How it works: we extract the text from your PDF, detect its structure (sections, marks distribution,
          question types, chapters), then generate a brand-new paper with the same structure but entirely
          fresh questions. No source question is reused verbatim.
        </p>
      </div>
    </div>
  )
}

function PageHeader() {
  return (
    <div className="mb-4 px-1">
      <h1 className="text-[20px] lg:text-[22px] font-bold" style={{ color: '#111827' }}>
        CBSE Paper Mimic
      </h1>
      <p className="text-[12px] lg:text-[13px]" style={{ color: '#6B7280' }}>
        Upload a past paper. AI studies the structure and generates a fresh one with the same pattern.
      </p>
    </div>
  )
}
