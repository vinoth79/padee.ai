// ═══════════════════════════════════════════════════════════════════════════
// WorksheetPreview — shared preview UI used by both:
//   - WorksheetGeneratorScreen (free-text worksheet generator)
//   - PaperMimicScreen         (CBSE past-paper mimic)
//
// Both pipelines produce the same { worksheet, meta } shape, so this component
// encapsulates the full preview experience: summary card + action buttons +
// validation badges + Questions/Answer Key tabs + the rendered questions.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { exportWorksheetPDF, exportWorksheetDOCX } from '../../lib/worksheetExport'

export default function WorksheetPreview({
  worksheet, meta,
  onSave, saving, savedId,
  onNew,
  extraBadges = null,   // e.g. mimic screen passes <span>🗂 source.pdf</span>
}) {
  const [activeTab, setActiveTab] = useState('questions')
  const w = worksheet
  const m = meta || {}

  return (
    <>
      {/* Summary card */}
      <div className="bg-white rounded-xl border p-4 lg:p-5 mb-4" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold" style={{ color: '#111827' }}>{w.title}</h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
              Class {w.class_level} · {w.subject}{w.chapter ? ` · ${w.chapter}` : ''}
              {' · '}{(w.sections || []).reduce((n, s) => n + (s.questions?.length || 0), 0)} questions
              {' · '}{w.total_marks} marks
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {onSave && (
              <button onClick={onSave} disabled={saving}
                className="text-[13px] font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                style={{ background: savedId ? '#ECFDF5' : '#0D9488', color: savedId ? '#0F766E' : '#FFFFFF' }}>
                {saving ? 'Saving…' : savedId ? '✓ Saved' : 'Save to library'}
              </button>
            )}
            <button onClick={() => exportWorksheetPDF(w)}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border"
              style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}
              title="Print-ready PDF with separate answer key page">
              ↓ PDF
            </button>
            <button onClick={() => exportWorksheetDOCX(w)}
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border"
              style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}
              title="Editable Word document">
              ↓ DOCX
            </button>
            {onNew && (
              <button onClick={onNew}
                className="text-[13px] font-semibold px-3 py-2 rounded-lg border"
                style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}>
                New
              </button>
            )}
          </div>
        </div>

        {(m.validationRan || extraBadges) && (
          <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
            {m.validationRan && (
              <>
                <span className="px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#0F766E' }}>
                  ✓ Validated
                </span>
                {m.flaggedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    {m.flaggedCount} flagged
                  </span>
                )}
                {m.regeneratedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: '#E0E7FF', color: '#3730A3' }}>
                    ⟳ {m.regeneratedCount} regenerated
                  </span>
                )}
              </>
            )}
            {extraBadges}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {['questions', 'answers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors"
            style={activeTab === tab
              ? { background: '#0D9488', color: '#FFFFFF' }
              : { background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' }}>
            {tab === 'questions' ? 'Questions' : 'Answer Key'}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {(w.sections || []).map((section, si) => (
          <div key={si} className="bg-white rounded-xl border p-4 lg:p-5" style={{ borderColor: '#E5E7EB' }}>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: '#0F766E' }}>{section.name}</h3>
            {section.instructions && (
              <p className="text-[12px] italic mb-3" style={{ color: '#6B7280' }}>{section.instructions}</p>
            )}
            <ol className="space-y-4">
              {(section.questions || []).map((q, qi) => (
                <li key={qi} className="flex gap-3">
                  <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: '#374151' }}>
                    {qi + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1.5">
                      <p className="text-[14px] flex-1 min-w-0" style={{ color: '#111827' }}>
                        {q.question}
                      </p>
                      {q.validated === false && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: '#FEF3C7', color: '#92400E' }}
                          title={(q.validation_issues || []).join(' · ') || 'Flagged by validator'}>
                          ⚠ flagged
                        </span>
                      )}
                      {q.regenerated && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: '#E0E7FF', color: '#3730A3' }}>
                          ⟳ regenerated
                        </span>
                      )}
                    </div>

                    {q.type === 'mcq' && q.options && (
                      <ul className="space-y-0.5 ml-1">
                        {Object.entries(q.options).map(([k, v]) => (
                          <li key={k} className="text-[13px]" style={{ color: '#374151' }}>
                            <span className="font-semibold">{k})</span> {v}
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeTab === 'answers' && (
                      <div className="mt-2 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                        <p className="text-[12px] font-semibold mb-1" style={{ color: '#0F766E' }}>Answer</p>
                        <p className="text-[13px]" style={{ color: '#111827' }}>
                          {typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer)}
                        </p>
                        {q.answer_explanation && (
                          <p className="text-[12px] mt-1.5" style={{ color: '#4B5563' }}>
                            {q.answer_explanation}
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'questions' && q.validated === false && (q.validation_issues || []).length > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: '#92400E' }}>
                        ⓘ {q.validation_issues.join(' · ')}
                      </p>
                    )}

                    <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                      [{section.marks_per_question || 1} mark{(section.marks_per_question || 1) > 1 ? 's' : ''}]
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </>
  )
}
