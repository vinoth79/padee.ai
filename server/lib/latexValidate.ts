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

// ─── JSON-safe LaTeX parsing ──────────────────────────────────────────────
// LLMs in JSON mode often emit single-backslash LaTeX commands like
// `\frac{a}{b}` instead of double-escaping them. JSON.parse then interprets
// `\f` as form-feed (an actual control char) and silently drops the
// backslash, leaving "rac{a}{b}" — which renders as a red KaTeX error in
// the student's browser.
//
// Known cases that bite (control char emitted before the rest of the word):
//   \frac → \f   + rac     (form feed + "rac")
//   \beta → \b   + eta     (backspace + "eta")
//   \nabla → \n  + abla    (newline + "abla")
//   \nu, \neq    same prefix
//   \theta, \tau, \times, \text → \t + suffix
//   \rho, \rceil → \r + suffix
//
// We can't auto-fix \n/\t/\r blindly because they're legitimate whitespace
// in real prose (paragraph breaks, indent). Strategy: re-double the
// backslash for *known* LaTeX commands BEFORE JSON.parse runs. This is a
// curated list — additions are cheap.
const KNOWN_LATEX_CMDS = [
  // Fractions / roots / powers
  'frac', 'sqrt', 'binom', 'cfrac', 'dfrac', 'tfrac',
  // Trig
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  // Greek (lowercase)
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'omicron', 'pi', 'varpi', 'rho', 'varrho',
  'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  // Greek (uppercase)
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  // Operators
  'sum', 'prod', 'int', 'oint', 'iint', 'iiint', 'partial', 'nabla', 'infty',
  'lim', 'log', 'ln', 'exp', 'min', 'max',
  // Relations
  'leq', 'geq', 'neq', 'approx', 'equiv', 'cong', 'sim', 'simeq',
  'propto', 'parallel', 'perp',
  // Operators 2
  'pm', 'mp', 'times', 'cdot', 'div', 'ast', 'star', 'circ', 'bullet',
  // Brackets / sizing
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  'lfloor', 'rfloor', 'lceil', 'rceil', 'langle', 'rangle',
  // Sets
  'cup', 'cap', 'setminus', 'subset', 'supset', 'subseteq', 'supseteq',
  'in', 'notin', 'ni', 'emptyset', 'forall', 'exists',
  // Arrows
  'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
  'leftrightarrow', 'Leftrightarrow', 'mapsto', 'to',
  // Decoration / accents
  'overline', 'underline', 'overrightarrow', 'vec', 'hat', 'bar',
  'tilde', 'dot', 'ddot', 'widehat', 'widetilde',
  // Font / text
  'mathbb', 'mathbf', 'mathcal', 'mathrm', 'mathit', 'mathsf', 'mathtt',
  'text', 'textit', 'textbf', 'textrm', 'mbox',
  // Misc
  'boxed', 'frac', 'over', 'choose', 'pmod', 'bmod',
]

/**
 * Pre-parse safety net for JSON output that contains LaTeX. Doubles the
 * backslash on known LaTeX commands so JSON.parse doesn't treat `\f` etc.
 * as control-char escapes. Caller still uses regular JSON.parse afterward.
 *
 * Idempotent: a string that already has `\\frac` won't get further doubled
 * because the leading `\\` is matched as the JSON escape `\\`, not as a
 * LaTeX command.
 */
export function reescapeLatexInJson(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw
  // Build pattern only once per call; the list is short enough.
  const pattern = new RegExp(
    `(^|[^\\\\])\\\\(${KNOWN_LATEX_CMDS.join('|')})\\b`,
    'g',
  )
  // Replacement keeps the leading "guard" char (anything but a backslash) and
  // prepends an extra backslash to the command. So `... \frac` → `... \\frac`,
  // while `... \\frac` is left alone (the second \ is preceded by another \).
  return raw.replace(pattern, (_m, lead, cmd) => `${lead}\\\\${cmd}`)
}

/**
 * Drop-in replacement for `JSON.parse(raw)` when the raw might contain
 * LaTeX. Falls back to vanilla parse if reescape fails.
 */
export function safeParseLLMJson(raw: string): any {
  try {
    return JSON.parse(reescapeLatexInJson(raw))
  } catch {
    // Fall back: maybe reescape introduced a problem. Try the unmodified raw.
    return JSON.parse(raw)
  }
}
