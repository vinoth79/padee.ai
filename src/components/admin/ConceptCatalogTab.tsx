import { useEffect, useState } from 'react'

interface Concept {
  concept_slug: string
  concept_name: string
  subject: string
  class_level: number
  chapter_no: number
  chapter_name: string
  syllabus_order: number
  exam_weight_percent: number
  brief_summary: string | null
  status: 'draft' | 'published' | 'archived'
  source: 'ai_extracted' | 'admin_manual'
  mastery_row_count: number
  updated_at: string
}

interface Props {
  adminHeaders: Record<string, string>
}

const SUBJECT_ICONS: Record<string, string> = {
  Physics: '⚡', Chemistry: '🧪', Mathematics: '📐', Biology: '🌿',
  'Computer Science': '💻', English: '📖',
}

export default function ConceptCatalogTab({ adminHeaders }: Props) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState<string>('')   // chapter key that's expanded
  const [editing, setEditing] = useState<string | null>(null)  // concept_slug being edited
  const [editDraft, setEditDraft] = useState<Partial<Concept>>({})
  const [extracting, setExtracting] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeMsg, setRecomputeMsg] = useState('')

  async function recomputeRecommendations() {
    setRecomputing(true); setRecomputeMsg('')
    try {
      const r = await fetch('/api/recommendations/recompute', {
        method: 'POST',
        headers: adminHeaders,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      setRecomputeMsg(`✓ Recomputed ${data.students} students, generated ${data.alerts} alerts`)
      setTimeout(() => setRecomputeMsg(''), 8000)
    } catch (e: any) {
      setRecomputeMsg(`✗ ${e.message}`)
    }
    setRecomputing(false)
  }

  async function load() {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/concepts/list', { headers: adminHeaders })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to load')
      setConcepts(data.concepts || [])
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Group: subject → class → chapter
  const tree: Record<string, Record<number, Record<string, Concept[]>>> = {}
  for (const c of concepts) {
    const chapterKey = `${c.chapter_no}. ${c.chapter_name}`
    tree[c.subject] ??= {}
    tree[c.subject][c.class_level] ??= {}
    tree[c.subject][c.class_level][chapterKey] ??= []
    tree[c.subject][c.class_level][chapterKey].push(c)
  }

  function startEdit(c: Concept) {
    setEditing(c.concept_slug)
    setEditDraft({
      concept_name: c.concept_name,
      exam_weight_percent: c.exam_weight_percent,
      brief_summary: c.brief_summary || '',
    })
  }

  async function saveEdit(slug: string) {
    setBusy(slug)
    try {
      const r = await fetch(`/api/admin/concepts/${slug}`, {
        method: 'PATCH',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      setEditing(null)
      await load()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(null) }
  }

  async function publishConcept(slug: string) {
    setBusy(slug)
    await fetch(`/api/admin/concepts/${slug}/publish`, { method: 'POST', headers: adminHeaders })
    await load()
    setBusy(null)
  }

  async function bulkPublishChapter(subject: string, classLevel: number, chapterNo: number) {
    setBusy(`bulk-${subject}-${classLevel}-${chapterNo}`)
    await fetch('/api/admin/concepts/bulk-publish', {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, classLevel, chapterNo }),
    })
    await load()
    setBusy(null)
  }

  async function deleteConcept(slug: string, masteryRows: number) {
    const warn = masteryRows > 0
      ? `This concept has ${masteryRows} student mastery rows. It will be archived (hidden) to preserve history. Continue?`
      : 'Delete this concept permanently?'
    if (!confirm(warn)) return
    setBusy(slug)
    await fetch(`/api/admin/concepts/${slug}`, { method: 'DELETE', headers: adminHeaders })
    await load()
    setBusy(null)
  }

  async function extractChapter(subject: string, classLevel: number, chapterNo: number, chapterName: string) {
    const key = `ex-${subject}-${classLevel}-${chapterNo}`
    setExtracting(key); setErr('')
    try {
      const r = await fetch('/api/admin/concepts/extract', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, classLevel, chapterNo, chapterName }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Extraction failed')
      await load()
    } catch (e: any) { setErr(e.message) }
    finally { setExtracting(null) }
  }

  const statusColor = (s: string) =>
    s === 'published' ? { bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' }
    : s === 'draft' ? { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' }
    : { bg: '#F3F4F6', fg: '#6B7280', border: '#D1D5DB' }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Concept Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Concepts auto-extracted by GPT-4o from uploaded NCERT chapters. Review, edit, and publish to power the recommendation engine.
          </p>
        </div>
        <button onClick={load} className="text-xs font-semibold text-teal-700 hover:underline">
          ↻ Refresh
        </button>
      </div>

      {/* Recompute recommendations banner */}
      <div className="rounded-2xl p-4 border flex items-center gap-3"
        style={{ background: '#F0F9FF', borderColor: '#BAE6FD' }}>
        <span className="text-2xl">🔄</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#0C4A6E' }}>Recompute recommendations</p>
          <p className="text-xs" style={{ color: '#075985' }}>
            Recalculate all student concept scores (applies recency decay), regenerate hero cards, and write teacher alerts.
            Simulates the nightly job. Cost: ~Rs 0.002 per active student.
          </p>
          {recomputeMsg && (
            <p className="text-xs mt-1 font-medium" style={{ color: recomputeMsg.startsWith('✓') ? '#065F46' : '#991B1B' }}>
              {recomputeMsg}
            </p>
          )}
        </div>
        <button onClick={recomputeRecommendations} disabled={recomputing}
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: recomputing ? '#9CA3AF' : '#0284C7' }}>
          {recomputing ? 'Running...' : 'Run now'}
        </button>
      </div>

      {err && <div className="rounded-xl p-3 text-sm bg-red-50 text-red-800 border border-red-200">{err}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : concepts.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center">
          <p className="text-sm text-gray-500 mb-2">No concepts yet.</p>
          <p className="text-xs text-gray-400">Upload an NCERT PDF (NCERT Content tab) — concepts are auto-extracted on completion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(tree).map(([subject, byClass]) => (
            <div key={subject} className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
                <span className="text-xl">{SUBJECT_ICONS[subject] || '📖'}</span>
                <h3 className="text-sm font-semibold text-gray-900">{subject}</h3>
              </div>
              <div className="divide-y">
                {Object.entries(byClass).map(([cls, byChapter]) => (
                  <div key={cls} className="px-5 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Class {cls}</p>
                    <div className="space-y-2">
                      {Object.entries(byChapter).map(([chapterKey, chConcepts]) => {
                        const chapterNo = chConcepts[0].chapter_no
                        const chapterName = chConcepts[0].chapter_name
                        const exKey = `ex-${subject}-${cls}-${chapterNo}`
                        const bulkKey = `bulk-${subject}-${cls}-${chapterNo}`
                        const isExpanded = expanded === `${subject}-${cls}-${chapterNo}`
                        const draftCount = chConcepts.filter(c => c.status === 'draft').length
                        return (
                          <div key={chapterKey} className="border rounded-xl">
                            <button
                              onClick={() => setExpanded(isExpanded ? '' : `${subject}-${cls}-${chapterNo}`)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
                              <span className="text-gray-400 text-sm" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
                              <span className="text-sm font-medium text-gray-900 flex-1">{chapterKey}</span>
                              <span className="text-xs text-gray-500">{chConcepts.length} concepts</span>
                              {draftCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: '#FEF3C7', color: '#92400E' }}>
                                  {draftCount} draft
                                </span>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="border-t bg-gray-50/50 p-3 space-y-2">
                                {/* Action bar */}
                                <div className="flex gap-2 mb-2">
                                  <button
                                    onClick={() => extractChapter(subject, Number(cls), chapterNo, chapterName)}
                                    disabled={extracting === exKey}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                                    style={{ background: '#FFFFFF', color: '#0F766E', borderColor: '#CCFBF1' }}>
                                    {extracting === exKey ? 'Extracting...' : '🔄 Re-extract from NCERT'}
                                  </button>
                                  {draftCount > 0 && (
                                    <button
                                      onClick={() => bulkPublishChapter(subject, Number(cls), chapterNo)}
                                      disabled={busy === bulkKey}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                                      style={{ background: '#0D9488' }}>
                                      Publish all drafts ({draftCount})
                                    </button>
                                  )}
                                </div>

                                {/* Concept rows */}
                                {chConcepts.map(c => {
                                  const sc = statusColor(c.status)
                                  const isEditing = editing === c.concept_slug
                                  return (
                                    <div key={c.concept_slug} className="bg-white border rounded-xl p-3">
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <input
                                            value={editDraft.concept_name || ''}
                                            onChange={e => setEditDraft({ ...editDraft, concept_name: e.target.value })}
                                            className="w-full px-2 py-1.5 text-sm border rounded-lg"
                                            placeholder="Concept name" />
                                          <div className="grid grid-cols-[1fr_100px] gap-2">
                                            <input
                                              value={editDraft.brief_summary || ''}
                                              onChange={e => setEditDraft({ ...editDraft, brief_summary: e.target.value })}
                                              className="px-2 py-1.5 text-sm border rounded-lg"
                                              placeholder="Brief summary" />
                                            <div className="flex items-center gap-1">
                                              <input type="number" min={0} max={100}
                                                value={editDraft.exam_weight_percent || 0}
                                                onChange={e => setEditDraft({ ...editDraft, exam_weight_percent: +e.target.value })}
                                                className="w-14 px-2 py-1.5 text-sm border rounded-lg" />
                                              <span className="text-xs text-gray-500">%</span>
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <button onClick={() => saveEdit(c.concept_slug)}
                                              disabled={busy === c.concept_slug}
                                              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                                              style={{ background: '#0D9488' }}>
                                              Save
                                            </button>
                                            <button onClick={() => setEditing(null)}
                                              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                                              style={{ background: '#F3F4F6', color: '#374151' }}>
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-start gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-sm font-semibold text-gray-900">{c.concept_name}</span>
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                                style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}>
                                                {c.status}
                                              </span>
                                              <span className="text-[10px] text-gray-400 font-mono">· {c.exam_weight_percent}% marks</span>
                                              {c.source === 'ai_extracted' && (
                                                <span className="text-[10px] text-gray-400">· AI</span>
                                              )}
                                              {c.mastery_row_count > 0 && (
                                                <span className="text-[10px] text-gray-400">· {c.mastery_row_count} student attempts</span>
                                              )}
                                            </div>
                                            {c.brief_summary && <p className="text-xs text-gray-600">{c.brief_summary}</p>}
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.concept_slug}</p>
                                          </div>
                                          <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => startEdit(c)}
                                              className="text-xs font-semibold px-2 py-1 rounded-lg"
                                              style={{ background: '#F9FAFB', color: '#374151' }}>
                                              Edit
                                            </button>
                                            {c.status === 'draft' && (
                                              <button onClick={() => publishConcept(c.concept_slug)}
                                                disabled={busy === c.concept_slug}
                                                className="text-xs font-semibold px-2 py-1 rounded-lg text-white"
                                                style={{ background: '#0D9488' }}>
                                                Publish
                                              </button>
                                            )}
                                            <button onClick={() => deleteConcept(c.concept_slug, c.mastery_row_count)}
                                              disabled={busy === c.concept_slug}
                                              className="text-xs font-semibold px-2 py-1 rounded-lg"
                                              style={{ background: '#FEF2F2', color: '#991B1B' }}>
                                              ×
                                            </button>
                                          </div>
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
