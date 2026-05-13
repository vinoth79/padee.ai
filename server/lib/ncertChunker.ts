// ═══════════════════════════════════════════════════════════════════════════
// NCERT chunker — language-aware text chunking for the RAG index (Sprint 3).
// ═══════════════════════════════════════════════════════════════════════════
// Two chunking strategies:
//
//   • chunkEnglishText (the original, kept for backwards compat) — 800-char
//     window with 100-char word-overlap. Works fine for English Sci / Maths /
//     CS / SS chapters where content is dense prose.
//
//   • chunkHindiText (new in Sprint 3 / F6b) — unit-aware. CBSE Hindi NCERT
//     books are a mix of poems (Vasant, Sparsh — short-line verses), prose
//     (Kshitij, Aroh — chapter-style narratives), and grammar (Vyakaran —
//     rules + examples). A flat 800-char window splits poems mid-couplet
//     and destroys meaning. The Hindi chunker:
//
//     1. Splits on STRONG markers first (★, ●, ◆, ❖, numbered headings,
//        chapter-titles). These almost always denote unit boundaries.
//     2. Keeps multi-line verse blocks together — a "verse block" is a run
//        of paragraphs where every line is < 60 chars (poem heuristic).
//        Splitting these inside a chunk destroys metre + rhyme.
//     3. Falls back to paragraph-grouped chunks up to 1500 chars (larger
//        than the English default — Hindi prose paragraphs are denser per
//        char and we want to keep semantic units intact).
//
// This is heuristic, not perfect. Manual QA during the F6b ingest pass
// catches misses; admins can re-upload with chunkOverride params if a
// specific book chunks badly.
//
// Future work (Phase 2): integrate with the planned Tesseract OCR fallback
// for older NCERT Hindi PDFs that pdf-parse returns mangled. The chunker
// just sees text; whether that text came from pdf-parse or OCR is the
// caller's concern.
// ═══════════════════════════════════════════════════════════════════════════

export interface Chunk {
  text: string
  page: number | null
}

const STRONG_MARKERS_RE = /^\s*[★●◆❖■▪]\s+|^\s*(?:अध्याय|पाठ|भाग|खंड|प्रश्न)\s+\d+|^\s*\d+\.\s+|^\s*\(\d+\)\s+/

const SHORT_LINE_THRESHOLD = 60        // verse-line heuristic (chars)
const HINDI_CHUNK_MAX = 1500            // softer than English; respects unit boundaries
const ENGLISH_CHUNK_MAX = 800
const ENGLISH_OVERLAP = 100

/**
 * Public entry point — dispatches to language-specific chunker.
 * Existing callers in `server/routes/admin.ts` continue to use 'en'
 * (the default) so nothing breaks.
 */
export function chunkText(text: string, language: 'en' | 'hi' = 'en'): Chunk[] {
  return language === 'hi'
    ? chunkHindiText(text)
    : chunkEnglishText(text, ENGLISH_CHUNK_MAX, ENGLISH_OVERLAP)
}

// ─── English chunker — preserves the original behaviour ─────────────────
export function chunkEnglishText(
  text: string,
  chunkSize: number = ENGLISH_CHUNK_MAX,
  overlap: number = ENGLISH_OVERLAP,
): Chunk[] {
  const chunks: Chunk[] = []
  const clean = text.replace(/\n{3,}/g, '\n\n').trim()
  const paragraphs = clean.split(/\n\n+/)

  let current = ''
  let pageNum: number | null = null

  for (const para of paragraphs) {
    const pageMatch = para.match(/^\s*(\d{1,3})\s*$/)
    if (pageMatch && para.trim().length <= 3) {
      pageNum = parseInt(pageMatch[1])
      continue
    }

    if (current.length + para.length > chunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), page: pageNum })
      const words = current.split(' ')
      const overlapWords = words.slice(-Math.ceil(overlap / 5))
      current = overlapWords.join(' ') + ' ' + para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), page: pageNum })
  }

  return chunks.filter(c => c.text.length > 50)
}

// ─── Hindi chunker — unit-aware ────────────────────────────────────────
export function chunkHindiText(text: string): Chunk[] {
  const clean = text.replace(/\n{3,}/g, '\n\n').trim()
  const paragraphs = clean.split(/\n\n+/)
  const chunks: Chunk[] = []
  let pageNum: number | null = null

  // First pass: classify each paragraph
  type Block = { kind: 'page' | 'marker' | 'verse' | 'prose'; text: string }
  const blocks: Block[] = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Page-number paragraph (just a number on its own line)
    if (/^\s*\d{1,3}\s*$/.test(trimmed) && trimmed.length <= 3) {
      blocks.push({ kind: 'page', text: trimmed })
      continue
    }

    // Strong-marker first line (★ / ● / "1." / "(2)" / "अध्याय 5" / etc.)
    // → start of a new unit, but the paragraph itself is content
    if (STRONG_MARKERS_RE.test(trimmed.split('\n')[0])) {
      blocks.push({ kind: 'marker', text: trimmed })
      continue
    }

    // Verse-block heuristic: every line in this paragraph is short and the
    // paragraph has at least 2 lines. Poems in NCERT Hindi books extract this
    // way — short rhyming lines, blank line between stanzas.
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0)
    if (lines.length >= 2 && lines.every(l => l.trim().length < SHORT_LINE_THRESHOLD)) {
      blocks.push({ kind: 'verse', text: trimmed })
      continue
    }

    // Default: prose paragraph
    blocks.push({ kind: 'prose', text: trimmed })
  }

  // Second pass: group blocks into chunks honouring unit boundaries
  let current = ''
  let currentHasVerse = false

  const flush = () => {
    if (current.trim().length > 50) {
      chunks.push({ text: current.trim(), page: pageNum })
    }
    current = ''
    currentHasVerse = false
  }

  for (const block of blocks) {
    if (block.kind === 'page') {
      const n = parseInt(block.text)
      if (!Number.isNaN(n)) pageNum = n
      continue
    }

    // Strong marker forces a chunk break — the new unit starts here
    if (block.kind === 'marker' && current.length > 0) {
      flush()
    }

    // Verse block: prefer to keep whole verses intact. If adding this verse
    // would exceed the cap by a wide margin (>1.5x), flush first; otherwise
    // include it in the current chunk even if it slightly overflows.
    if (block.kind === 'verse') {
      if (current.length > 0 && (current.length + block.text.length) > HINDI_CHUNK_MAX * 1.5) {
        flush()
      }
      current += (current ? '\n\n' : '') + block.text
      currentHasVerse = true
      // After a verse block, the next prose paragraph often closes the
      // poem-section — let the regular cap handle that.
      continue
    }

    // Prose: standard cap. Don't break inside a chunk that contains a verse
    // (keep verse + its short commentary together if we can).
    if (
      current.length > 0 &&
      (current.length + block.text.length) > HINDI_CHUNK_MAX &&
      !currentHasVerse
    ) {
      flush()
    }
    current += (current ? '\n\n' : '') + block.text

    // Mega-prose block (>HINDI_CHUNK_MAX on its own) — emit immediately,
    // then start a fresh chunk. This handles rare long chapter intros.
    if (current.length > HINDI_CHUNK_MAX * 1.8) {
      flush()
    }
  }

  flush()
  return chunks
}
