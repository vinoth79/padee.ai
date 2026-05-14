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
import { useSpeech, splitSentences } from '../../context/SpeechContext'

interface Props {
  text: string
  streaming?: boolean
  className?: string
  /** Inline-only mode — refuse to render display ($$...$$) blocks. */
  inlineOnly?: boolean
}

export default function MathText({ text, streaming, className, inlineOnly }: Props) {
  // Sprint 3 / F6a — karaoke highlight. If THIS text is currently being read
  // aloud, mark the active sentence's span so the CSS can highlight it.
  // We compare on text identity (===); MathText is always rendered with the
  // same string instance the TTS started with, so this is stable.
  const { activeText, activeSentenceIndex } = useSpeech() as {
    activeText: string | null
    activeSentenceIndex: number
  }
  const isBeingRead = activeText !== null && activeText === text
  const liveSentenceIndex = isBeingRead ? activeSentenceIndex : -1

  if (!text) return null

  // Streaming → plain text. Parent flips off streaming when SSE completes.
  if (streaming) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </span>
    )
  }

  const parts = splitMathWithSentenceIndex(text, inlineOnly)
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((p, i) => {
        const cls = p.sentenceIndex === liveSentenceIndex ? 'tts-sent is-speaking' : 'tts-sent'
        if (p.kind === 'inline') {
          return <span key={i} className={cls} data-sentence={p.sentenceIndex}><InlineMath expr={p.value} /></span>
        }
        if (p.kind === 'display') {
          return <span key={i} className={cls} data-sentence={p.sentenceIndex}><DisplayMath expr={p.value} /></span>
        }
        return <span key={i} className={cls} data-sentence={p.sentenceIndex}><Markdown text={p.value} /></span>
      })}
    </span>
  )
}

// ─── Splitter ─────────────────────────────────────────────────────────────
type Part =
  | { kind: 'text'; value: string }
  | { kind: 'inline'; value: string }
  | { kind: 'display'; value: string }

// Sprint 3 / F6a — Same logic as splitMath() below, but also assigns each
// emitted part a `sentenceIndex` based on its position in `text`. We split
// the source text into sentences (using the same regex as SpeechContext so
// the indices align) and walk a cursor through both streams in parallel.
//
// Math expressions take the sentence index of the sentence they fall inside;
// if a math block straddles a boundary (rare — display math on its own line)
// it gets the index of the sentence it STARTED in.
function splitMathWithSentenceIndex(
  text: string,
  inlineOnly?: boolean,
): Array<Part & { sentenceIndex: number }> {
  const rawParts = splitMath(text, inlineOnly)
  const sentences = splitSentences(text)
  // Build offset map: for each char position in `text`, which sentence is it in?
  // sentenceEnds[i] = end-position of sentence i (exclusive)
  const sentenceEnds: number[] = []
  let pos = 0
  for (const s of sentences) {
    pos += s.length
    sentenceEnds.push(pos)
  }
  const indexAt = (offset: number): number => {
    if (sentenceEnds.length === 0) return 0
    for (let i = 0; i < sentenceEnds.length; i++) {
      if (offset < sentenceEnds[i]) return i
    }
    return sentenceEnds.length - 1
  }
  // Walk parts and assign sentenceIndex based on the running offset in text.
  // Each part's length in the rendered output equals its source-text length
  // for plain text; for inline math `$...$` the source span is value.length + 2,
  // for display math `$$...$$` it's value.length + 4.
  const out: Array<Part & { sentenceIndex: number }> = []
  let cursor = 0
  for (const p of rawParts) {
    const idx = indexAt(cursor)
    out.push({ ...p, sentenceIndex: idx })
    if (p.kind === 'inline') cursor += p.value.length + 2
    else if (p.kind === 'display') cursor += p.value.length + 4
    else cursor += p.value.length
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
