// Unit tests for server/lib/latexValidate.ts → safeParseLLMJson + reescapeLatexInJson.
//
// These cover the LaTeX-JSON-mangling fix from commit f6ef605. LLMs in JSON
// mode sometimes emit `\frac{a}{b}` without double-escaping, and JSON.parse
// then treats `\f` as form-feed and silently strips the backslash.
//
// Run: npx tsx tests/safeParseLLMJson.test.mjs

import { safeParseLLMJson, reescapeLatexInJson } from '/Users/admin/padee.ai/server/lib/latexValidate.ts'

let pass = 0
let fail = 0
const failures = []

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
    pass++
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`)
    console.log(`    expected: ${JSON.stringify(expected)}`)
    console.log(`    got:      ${JSON.stringify(actual)}`)
    fail++
    failures.push(label)
  }
}

console.log('\n\x1b[36m▶ safeParseLLMJson — the LaTeX-JSON-mangling fix\x1b[0m')

// 1. The core bug: single-backslash \frac in JSON. Vanilla JSON.parse would
//    interpret \f as form-feed, leaving "rac{a}{b}". We restore \frac.
{
  const raw = '{"q":"P = \\frac{W}{t}"}'
  eq(safeParseLLMJson(raw).q, 'P = \\frac{W}{t}',
    'single-backslash \\frac restored to \\frac (form-feed avoided)')
}

// 2. Already double-escaped \\frac stays \\frac after parse (idempotent).
//    The negative-lookbehind in the regex prevents over-escaping.
{
  const raw = '{"q":"P = \\\\frac{W}{t}"}'
  eq(safeParseLLMJson(raw).q, 'P = \\frac{W}{t}',
    'pre-double-escaped \\\\frac stays \\frac (idempotent)')
}

// 3. \theta (which would otherwise mangle as tab + "heta")
{
  const raw = '{"q":"angle is \\theta = 30 degrees"}'
  eq(safeParseLLMJson(raw).q, 'angle is \\theta = 30 degrees',
    '\\theta restored (tab-escape avoided)')
}

// 4. CRITICAL: legitimate \n newline must be preserved. The regex must NOT
//    treat \n as a LaTeX command — we only re-escape KNOWN_LATEX_CMDS.
{
  const raw = '{"q":"line1\\nline2"}'
  eq(safeParseLLMJson(raw).q, 'line1\nline2',
    'real \\n newline preserved (not mangled by re-escape)')
}

// 5. The hardest case: real \n + LaTeX \frac in the SAME string.
{
  const raw = '{"q":"line1\\nresult: \\frac{1}{2}"}'
  const expected = 'line1\nresult: \\frac{1}{2}'
  eq(safeParseLLMJson(raw).q, expected,
    'real \\n + \\frac coexist correctly in one string')
}

// 6. Greek letter sweep — common physics / maths commands.
{
  const raw = '{"q":"\\alpha + \\beta = \\gamma; integral \\int from \\pi to \\infty"}'
  const expected = '\\alpha + \\beta = \\gamma; integral \\int from \\pi to \\infty'
  eq(safeParseLLMJson(raw).q, expected, 'Greek/operator commands (\\alpha, \\beta, \\gamma, \\int, \\pi, \\infty) all restored')
}

// 7. Nested objects + arrays — the helper walks string values, not just top-level.
//    (Actually it doesn't walk — it operates on the raw JSON STRING before parse,
//    so this works automatically. Verify nested.)
{
  const raw = '{"questions":[{"q":"\\frac{a}{b}","options":["\\sqrt{x}","\\theta"]}]}'
  const parsed = safeParseLLMJson(raw)
  eq(parsed.questions[0].q, '\\frac{a}{b}', 'nested .questions[0].q restored')
  eq(parsed.questions[0].options[0], '\\sqrt{x}', 'nested array element [0] restored')
  eq(parsed.questions[0].options[1], '\\theta', 'nested array element [1] restored')
}

// 8. Unknown command (NOT in KNOWN_LATEX_CMDS) is left alone — JSON parse
//    will then either interpret it as an escape or throw. We don't try to
//    fix things we don't recognise.
{
  // \z is invalid JSON escape AND not a known LaTeX command. Vanilla
  // JSON.parse would error. safeParse falls back to the raw parse on its
  // own internal error.
  const raw = '{"q":"\\zfoo bar"}'
  let threw = false
  try {
    safeParseLLMJson(raw)
  } catch (e) {
    threw = true
  }
  eq(threw, true, 'unknown command \\z is left alone (JSON.parse errors)')
}

// 9. reescapeLatexInJson is the lower-level helper; verify it returns a
//    string with backslashes properly doubled and is idempotent.
{
  const a = reescapeLatexInJson('"\\frac{1}{2}"')
  // The result should be the JSON-string form: "\\\\frac{1}{2}" as raw chars
  // (3 chars: \, \, f, ...). Length: opening quote + 2 backslashes + 'frac{1}{2}' + closing quote = 14
  eq(a, '"\\\\frac{1}{2}"', 'reescapeLatexInJson doubles the backslash on \\frac')

  const b = reescapeLatexInJson(a)
  eq(b, a, 'reescapeLatexInJson is idempotent on already-doubled \\\\frac')
}

console.log('\n\x1b[1m──────────────────────────────────────\x1b[0m')
console.log(`\x1b[1mPASSED: ${pass}  FAILED: ${fail}\x1b[0m`)
if (fail > 0) {
  console.log('\x1b[31mFailures:\x1b[0m')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\x1b[32mAll safeParseLLMJson unit tests passed.\x1b[0m')
