// ═══════════════════════════════════════════════════════════════════════════
// latexToSpeech — convert LLM LaTeX into something a TTS engine can read.
// ═══════════════════════════════════════════════════════════════════════════
// KaTeX renders math beautifully on screen, but a screen-reader or TTS engine
// (browser speechSynthesis OR Google Cloud TTS) reading the raw KaTeX HTML
// would say "dollar F equals m g sine theta dollar". Ugly + confusing.
//
// This module unparses common K12-level LaTeX patterns into spoken English:
//   $F = mg \sin\theta$        → "F equals m g sine theta"
//   $\frac{a}{b}$              → "a over b"
//   $x^2 + y^2 = z^2$          → "x squared plus y squared equals z squared"
//   $$E = mc^2$$               → "E equals m c squared"
//
// Coverage is good-enough for K12 Maths/Physics/Chemistry; not exhaustive.
// Edge cases (nested fractions, integrals, matrices) get partial coverage.
// ═══════════════════════════════════════════════════════════════════════════

const SYMBOL_MAP: Record<string, string> = {
  // Greek
  '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
  '\\epsilon': 'epsilon', '\\zeta': 'zeta', '\\eta': 'eta', '\\theta': 'theta',
  '\\iota': 'iota', '\\kappa': 'kappa', '\\lambda': 'lambda', '\\mu': 'mu',
  '\\nu': 'nu', '\\xi': 'xi', '\\pi': 'pi', '\\rho': 'rho',
  '\\sigma': 'sigma', '\\tau': 'tau', '\\phi': 'phi', '\\chi': 'chi',
  '\\psi': 'psi', '\\omega': 'omega',
  '\\Gamma': 'gamma', '\\Delta': 'delta', '\\Theta': 'theta',
  '\\Lambda': 'lambda', '\\Xi': 'xi', '\\Pi': 'pi', '\\Sigma': 'sigma',
  '\\Phi': 'phi', '\\Psi': 'psi', '\\Omega': 'omega',
  // Functions
  '\\sin': 'sine', '\\cos': 'cosine', '\\tan': 'tangent',
  '\\arcsin': 'arc sine', '\\arccos': 'arc cosine', '\\arctan': 'arc tangent',
  '\\log': 'log', '\\ln': 'natural log', '\\exp': 'exp',
  '\\sec': 'secant', '\\csc': 'cosecant', '\\cot': 'cotangent',
  // Operators / relations
  '\\times': 'times', '\\cdot': 'times', '\\div': 'divided by',
  '\\pm': 'plus or minus', '\\mp': 'minus or plus',
  '\\leq': 'less than or equal to', '\\geq': 'greater than or equal to',
  '\\neq': 'not equal to', '\\approx': 'approximately equals',
  '\\equiv': 'equivalent to', '\\propto': 'proportional to',
  '\\rightarrow': 'goes to', '\\to': 'to', '\\leftarrow': 'from',
  '\\implies': 'implies', '\\iff': 'if and only if',
  '\\infty': 'infinity', '\\partial': 'partial', '\\nabla': 'del',
  '\\circ': 'degrees',
  // Misc
  '\\sum': 'sum', '\\int': 'integral', '\\prod': 'product', '\\lim': 'limit',
  '\\angle': 'angle', '\\perp': 'perpendicular', '\\parallel': 'parallel',
}

function unparseExpr(expr: string): string {
  let s = expr

  // \frac{a}{b} → "a over b"
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => `${unparseExpr(a)} over ${unparseExpr(b)}`)

  // \sqrt{x} → "square root of x"
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, a) => `square root of ${unparseExpr(a)}`)
  s = s.replace(/\\sqrt\s*([a-zA-Z0-9])/g, (_, a) => `square root of ${a}`)

  // x^{n} or x^n → "x to the n"
  s = s.replace(/(\w|\))\^\s*\{([^{}]*)\}/g, (_, base, exp) => {
    const e = exp.trim()
    if (e === '2') return `${base} squared`
    if (e === '3') return `${base} cubed`
    return `${base} to the ${unparseExpr(e)}`
  })
  s = s.replace(/(\w|\))\^\s*([\w-])/g, (_, base, exp) => {
    if (exp === '2') return `${base} squared`
    if (exp === '3') return `${base} cubed`
    return `${base} to the ${exp}`
  })

  // x_{n} or x_n → "x sub n"
  s = s.replace(/(\w)_\s*\{([^{}]*)\}/g, (_, base, sub) => `${base} sub ${unparseExpr(sub)}`)
  s = s.replace(/(\w)_\s*(\w)/g, (_, base, sub) => `${base} sub ${sub}`)

  // \text{abc} → "abc"
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, (_, a) => a)

  // Symbol substitutions
  for (const [tex, word] of Object.entries(SYMBOL_MAP)) {
    s = s.split(tex).join(` ${word} `)
  }

  // Remaining unknown commands → strip the backslash (best-effort)
  s = s.replace(/\\([a-zA-Z]+)/g, ' $1 ')

  // Operators → words
  s = s.replace(/\s*=\s*/g, ' equals ')
  s = s.replace(/\s*\+\s*/g, ' plus ')
  s = s.replace(/(?<![a-zA-Z0-9])-\s*/g, ' minus ')  // unary/binary minus, but not hyphenated words
  s = s.replace(/\s*\*\s*/g, ' times ')
  s = s.replace(/\s*\/\s*/g, ' over ')
  s = s.replace(/\s*<\s*/g, ' less than ')
  s = s.replace(/\s*>\s*/g, ' greater than ')

  // Braces are no-ops at this stage
  s = s.replace(/[{}]/g, '')

  // Collapse whitespace
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Convert a string with embedded LaTeX (`$...$` or `$$...$$`) into a plain
 * English sentence suitable for TTS. Plain prose between math segments is
 * preserved as-is.
 */
export function latexToSpeech(text: string): string {
  if (!text || typeof text !== 'string') return ''
  // Display math first ($$...$$) — strip surrounding newlines, unparse, wrap
  // with commas so the cadence pauses around the equation.
  let out = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => `, ${unparseExpr(expr)}, `)
  // Then inline ($...$)
  out = out.replace(/\$([^$]+?)\$/g, (_, expr) => unparseExpr(expr))
  return out.replace(/\s+/g, ' ').trim()
}
