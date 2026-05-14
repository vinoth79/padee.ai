// ═══════════════════════════════════════════════════════════════════════════
// MathText — render a string with embedded LaTeX (`$...$` or `$$...$$`).
// ═══════════════════════════════════════════════════════════════════════════
// Splits the input on math delimiters, renders math segments via KaTeX, and
// emits text segments as plain spans. Markdown bold/italic alongside math is
// honoured (KaTeX handles its own; surrounding text gets a tiny inline parser).
//
// Streaming-aware: when `streaming` is true, renders as plain pre-wrap text
// (no math). Reason — partial mid-stream content (`$F = mg \sin\th`) would
// produce garbled half-rendered KaTeX. After the stream completes, the parent
// flips `streaming` to false and the math pops in.
//
// Errors: KaTeX is configured with `throwOnError: false`. Malformed LaTeX
// renders with a faint error tint. Server-side validateLatex() upstream
// strips delimiters from known-bad responses, so the visible error rate
// should be near-zero in practice.
// ═══════════════════════════════════════════════════════════════════════════
import katex from 'katex'
import { useSpeech, splitSentences, tokenizeWords } from '../../context/SpeechContext'

interface Props {
  text: string
  streaming?: boolean
  className?: string
  /** Inline-only mode — refuse to render display ($$...$$) blocks. */
  inlineOnly?: boolean
}

export default function MathText({ text, streaming, className, inlineOnly }: Props) {
  // Sprint 3 / F6a — karaoke highlight. If THIS text is currently being read
  // aloud, mark the active word's span. We compare on text identity (===);
  // MathText is always rendered with the same string instance the TTS
  // started with, so this is stable.
  const { activeText, activeWordIndex } = useSpeech() as {
    activeText: string | null
    activeWordIndex: number
  }
  const isBeingRead = activeText !== null && activeText === text
  const liveWordIndex = isBeingRead ? activeWordIndex : -1

  if (!text) return null

  // Streaming → plain text. Parent flips off streaming when SSE completes.
  if (streaming) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </span>
    )
  }

  const parts = splitMathWithWordIndex(text, inlineOnly)
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((p, i) => renderPart(p, i, liveWordIndex))}
    </span>
  )
}

// Render one part. Plain-text parts emit one <span class="tts-word"> per
// WORD (whitespace stays as plain whitespace text nodes). Math parts emit
// one wrapper span with the word-index of their starting word.
function renderPart(
  p: Part & { wordIndexAtStart: number; wordIndices: number[] },
  key: number,
  liveWordIndex: number,
) {
  if (p.kind === 'inline') {
    const cls = p.wordIndexAtStart === liveWordIndex ? 'tts-word is-speaking' : 'tts-word'
    return <span key={key} className={cls} data-word={p.wordIndexAtStart}><InlineMath expr={p.value} /></span>
  }
  if (p.kind === 'display') {
    const cls = p.wordIndexAtStart === liveWordIndex ? 'tts-word is-speaking' : 'tts-word'
    return <span key={key} className={cls} data-word={p.wordIndexAtStart}><DisplayMath expr={p.value} /></span>
  }
  // Plain text — tokenise into word + whitespace runs; wrap each word in a span
  const tokens = tokenizeWords(p.value)
  let wi = 0
  return (
    <span key={key}>
      {tokens.map((t, j) => {
        if (!t.isWord) return <span key={j}>{t.text}</span>
        const myIdx = p.wordIndices[wi++]
        const cls = myIdx === liveWordIndex ? 'tts-word is-speaking' : 'tts-word'
        return <span key={j} className={cls} data-word={myIdx}>{t.text}</span>
      })}
    </span>
  )
}

// ─── Splitter ─────────────────────────────────────────────────────────────
type Part =
  | { kind: 'text'; value: string }
  | { kind: 'inline'; value: string }
  | { kind: 'display'; value: string }

// Sprint 3 / F6a — assigns a `wordIndex` to each split part. Per-word
// tokenisation aligns with SpeechContext's tokenizeWords() — exact same
// list of word tokens, so index N here matches index N there.
//
// For plain-text parts we precompute the wordIndices array (one entry
// per WORD token in the part, in order). For math parts we emit a single
// wrapper with the wordIndex of the first word that follows the math
// (or precedes if math is at the very end).
function splitMathWithWordIndex(
  text: string,
  inlineOnly?: boolean,
): Array<Part & { wordIndexAtStart: number; wordIndices: number[] }> {
  const rawParts = splitMath(text, inlineOnly)
  // Tokenise the WHOLE source text once. Word index N is consistent across
  // both this rendering and the audio-tick's index for the same text.
  const allTokens = tokenizeWords(text)
  // Map: char offset in `text` → cumulative word count up to that offset.
  // We'll walk the rawParts cursor and for each part figure out which word
  // indices fall inside its character range.
  const wordEnds: { wordIdx: number; charEnd: number }[] = []
  let wi = 0
  for (const t of allTokens) {
    if (t.isWord) {
      wordEnds.push({ wordIdx: wi, charEnd: t.end })
      wi++
    }
  }

  const out: Array<Part & { wordIndexAtStart: number; wordIndices: number[] }> = []
  let cursor = 0
  for (const p of rawParts) {
    let segLen: number
    if (p.kind === 'inline') segLen = p.value.length + 2
    else if (p.kind === 'display') segLen = p.value.length + 4
    else segLen = p.value.length
    const segStart = cursor
    const segEnd = cursor + segLen
    // Word indices whose end falls within [segStart, segEnd]
    const wordIndices: number[] = []
    for (const w of wordEnds) {
      if (w.charEnd > segStart && w.charEnd <= segEnd) wordIndices.push(w.wordIdx)
    }
    // For math parts: their "anchor" word is the first one in their range
    // (or, if empty, the next word after the math block — covers display
    // math on its own line surrounded by whitespace).
    let anchor = wordIndices[0]
    if (anchor === undefined) {
      const nxt = wordEnds.find(w => w.charEnd > segStart)
      anchor = nxt ? nxt.wordIdx : -1
    }
    out.push({ ...p, wordIndexAtStart: anchor, wordIndices })
    cursor = segEnd
  }
  return out
}

function splitMath(text: string, inlineOnly?: boolean): Part[] {
  const out: Part[] = []
  let i = 0
  while (i < text.length) {
    if (!inlineOnly && text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) {
        // Unbalanced — bail to plain text for the rest
        out.push({ kind: 'text', value: text.slice(i) })
        break
      }
      out.push({ kind: 'display', value: text.slice(i + 2, end) })
      i = end + 2
      continue
    }
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1)
      if (end === -1) {
        out.push({ kind: 'text', value: text.slice(i) })
        break
      }
      out.push({ kind: 'inline', value: text.slice(i + 1, end) })
      i = end + 1
      continue
    }
    // Walk forward to next $ or end
    let next = text.indexOf('$', i)
    if (next === -1) next = text.length
    out.push({ kind: 'text', value: text.slice(i, next) })
    i = next
  }
  return out
}

// ─── KaTeX renderers ──────────────────────────────────────────────────────
function InlineMath({ expr }: { expr: string }) {
  const html = renderKatex(expr, false)
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function DisplayMath({ expr }: { expr: string }) {
  const html = renderKatex(expr, true)
  return <div className="katex-display-wrap" dangerouslySetInnerHTML={{ __html: html }} />
}

function renderKatex(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
      trust: false,
    })
  } catch {
    // Last-resort fallback — render as plain code-style text
    return `<code class="math-fallback">${escapeHtml(expr)}</code>`
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─── Tiny markdown for **bold** / *italic* / `code` between math segments ─
function Markdown({ text }: { text: string }) {
  // Build a token stream: bold > code > italic > text
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code class="md-code">$1</code>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
