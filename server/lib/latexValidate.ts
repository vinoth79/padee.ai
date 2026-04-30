// ═══════════════════════════════════════════════════════════════════════════
// latexValidate — server-side sanity check for LLM-emitted LaTeX
// ═══════════════════════════════════════════════════════════════════════════
// LLMs occasionally produce malformed LaTeX (unbalanced $, stray \frac
// without args). KaTeX with throwOnError:false will tolerate it on the
// frontend, but ugly red error markers leak through. This module gives us a
// cheap pre-check at the server boundary so we can either sanitise (strip
// LaTeX delimiters → fall back to plain text) or just log a warning.
//
// Validation strategy: count `$` characters. Properly-matched LaTeX has an
// even count of single-`$` delimiters. `$$...$$` blocks come in pairs and
// also balance. Anything else is suspicious.
// ═══════════════════════════════════════════════════════════════════════════

export interface LatexValidationResult {
  ok: boolean
  reason?: string
  inlineCount: number  // number of $...$ pairs detected
  displayCount: number // number of $$...$$ pairs detected
}

export function validateLatex(text: string): LatexValidationResult {
  if (!text || typeof text !== 'string') {
    return { ok: true, inlineCount: 0, displayCount: 0 }
  }

  // First, count $$ pairs (block-style display math)
  const displayMatches = text.match(/\$\$/g) || []
  const displayCount = Math.floor(displayMatches.length / 2)
  if (displayMatches.length % 2 !== 0) {
    return { ok: false, reason: 'Unbalanced $$ delimiters', inlineCount: 0, displayCount }
  }

  // Strip $$...$$ blocks before counting single $ for inline math
  const withoutDisplay = text.replace(/\$\$[\s\S]*?\$\$/g, '')
  const inlineMatchesRaw = withoutDisplay.match(/\$/g) || []

  // Fast path: balanced $ count → valid. Avoid the more lenient retry below
  // unless we'd otherwise flag the response as malformed.
  if (inlineMatchesRaw.length % 2 === 0) {
    return { ok: true, inlineCount: inlineMatchesRaw.length / 2, displayCount }
  }

  // Lenient retry: prose can contain literal `$` that aren't math delimiters
  // (escaped \$, or currency like "$5", "$1,000", "$5.99"). Strip those and
  // re-count — only flag if the imbalance survives that.
  const cleaned = withoutDisplay
    .replace(/\\\$/g, '')                      // escaped: \$ → not a delimiter
    .replace(/\$\d+(?:[.,]\d+)?\b/g, '')       // currency: $5, $5.99, $1,000
  const cleanedMatches = cleaned.match(/\$/g) || []
  if (cleanedMatches.length % 2 !== 0) {
    return {
      ok: false, reason: 'Unbalanced $ delimiters',
      inlineCount: Math.floor(cleanedMatches.length / 2),
      displayCount,
    }
  }
  return { ok: true, inlineCount: cleanedMatches.length / 2, displayCount }
}

/**
 * Strip LaTeX delimiters when validation fails. Leaves the math expressions
 * intact as plain text so the student still sees the formula (just unstyled),
 * rather than a garbled mess of partial math markers.
 */
export function stripLatexDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*?)\$/g, '$1')
}

/**
 * One-shot helper: validate, log if bad, return either the original (when
 * valid) or a sanitised fallback (when invalid). Keeps the call-site small.
 */
export function validateOrSanitise(text: string, endpoint: string, userId?: string): string {
  const result = validateLatex(text)
  if (!result.ok) {
    console.warn(`[LaTeX validation] ${endpoint} returned malformed LaTeX (${result.reason}). user=${userId || 'anon'}. Stripping delimiters as fallback.`)
    return stripLatexDelimiters(text)
  }
  return text
}
