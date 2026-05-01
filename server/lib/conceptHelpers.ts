// ═══════════════════════════════════════════════════════════════════════════
// conceptHelpers — pure functions for concept-row construction.
// ═══════════════════════════════════════════════════════════════════════════
// Lives in lib/ (not in routes/concepts.ts) so unit tests can import the
// transformation logic without dragging in the route handler's transitive
// deps (adminAuth, supabase client, OpenAI). Both functions are referentially
// transparent — same input always produces same output, no I/O.
//
// Used by:
//   • routes/concepts.ts → extractConceptsFromChapter (LLM extract pipeline)
//   • routes/concepts.ts → /manual handler (admin-created concepts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a kebab-case slug for a concept, scoped to its chapter.
 * Format: `ch${chapterNo}-${slugified-name}`
 *
 * Caveats:
 *   • Strips characters outside [a-z0-9\s-]. Devanagari, Greek, accented
 *     letters all get dropped — the slug for a Hindi-only name reduces to
 *     `ch${N}-`. Caller must filter empty/short names before persisting.
 *   • Truncates the slugified portion at 60 chars (some chapter names go
 *     long). The chapter prefix is added on top, so the final slug can run
 *     65-70 chars.
 */
export function toSlug(chapterNo: number, name: string): string {
  const clean = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `ch${chapterNo}-${clean}`
}

/**
 * Transform extracted (LLM-raw) concepts into DB-ready rows.
 *
 * Two safety nets that previously caused silent data loss:
 *
 *   1. Empty/short concept_name values are dropped. Without this,
 *      `c.concept_name || ''` would slugify to `ch${N}-` (just the prefix)
 *      and multiple bad rows would all collide on that one slug.
 *
 *   2. Within-batch slug collisions get suffixed -2, -3, ... Two concepts
 *      named "Ohm's Law" and "Ohms Law" both slugify to `ch12-ohms-law`;
 *      without dedupe, the upsert loop in extractConceptsFromChapter would
 *      silently overwrite the first.
 *
 * `startingOrder` is the syllabus_order to use for the first survivor;
 * subsequent survivors get +1, +2, ... Filtered-out concepts don't consume
 * an order slot.
 */
export function buildConceptRows(params: {
  extracted: any[]
  subject: string
  classLevel: number
  chapterNo: number
  chapterName: string
  startingOrder: number
}): any[] {
  const { extracted, subject, classLevel, chapterNo, chapterName, startingOrder } = params

  const valid = extracted.filter(c =>
    typeof c?.concept_name === 'string' && c.concept_name.trim().length >= 3
  )

  const seen = new Set<string>()
  let order = startingOrder
  return valid.map((c: any) => {
    const baseSlug = toSlug(chapterNo, c.concept_name)
    let slug = baseSlug
    let suffix = 2
    while (seen.has(slug)) {
      slug = `${baseSlug}-${suffix++}`
    }
    seen.add(slug)
    return {
      concept_slug: slug,
      concept_name: String(c.concept_name).trim().slice(0, 120),
      subject,
      class_level: classLevel,
      chapter_no: chapterNo,
      chapter_name: chapterName,
      syllabus_order: order++,
      exam_weight_percent: Number(c.exam_weight_percent) || 0,
      brief_summary: (c.brief_summary || '').slice(0, 300),
      status: 'draft',
      source: 'ai_extracted',
    }
  })
}
