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

interface Props {
  text: string
  streaming?: boolean
  className?: string
  /** Inline-only mode — refuse to render display ($$...$$) blocks. */
  inlineOnly?: boolean
}

export default function MathText({ text, streaming, className, inlineOnly }: Props) {
  if (!text) return null

  // Streaming → plain text. Parent flips off streaming when SSE completes.
  if (streaming) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </span>
    )
  }

  const parts = splitMath(text, inlineOnly)
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((p, i) => {
        if (p.kind === 'inline') return <InlineMath key={i} expr={p.value} />
        if (p.kind === 'display') return <DisplayMath key={i} expr={p.value} />
        // Plain text — handle markdown bold/italic inline
        return <Markdown key={i} text={p.value} />
      })}
    </span>
  )
}

// ─── Splitter ─────────────────────────────────────────────────────────────
type Part =
  | { kind: 'text'; value: string }
  | { kind: 'inline'; value: string }
  | { kind: 'display'; value: string }

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
