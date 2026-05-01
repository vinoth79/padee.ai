// Unit tests for server/lib/conceptDetection.ts → conceptMatchScore.
//
// Covers the three medium-severity hardening fixes:
//   1. Word-boundary regex match (closes "force matches enforce" false-positive)
//   2. ≥3-char cutoff on phrase + token paths (DNA/RNA/Atom/Mole now match)
//   3. Expanded STOPWORDS list (CBSE question-stems excluded from token scoring)
//
// Run: npx tsx tests/conceptDetect.test.mjs

import { conceptMatchScore } from '/Users/admin/padee.ai/server/lib/conceptDetection.ts'

let pass = 0, fail = 0
const failures = []

function expect(actual, label) {
  return {
    eq(expected) {
      if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`  \x1b[32m✓\x1b[0m ${label}`)
        pass++
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${label}`)
        console.log(`    expected: ${JSON.stringify(expected)}`)
        console.log(`    got:      ${JSON.stringify(actual)}`)
        fail++; failures.push(label)
      }
    },
    gte(threshold) {
      if (actual >= threshold) {
        console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${actual.toFixed(2)} ≥ ${threshold})`)
        pass++
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${label}  (got: ${actual.toFixed(2)}, expected ≥ ${threshold})`)
        fail++; failures.push(label)
      }
    },
    lt(threshold) {
      if (actual < threshold) {
        console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${actual.toFixed(2)} < ${threshold})`)
        pass++
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${label}  (got: ${actual.toFixed(2)}, expected < ${threshold})`)
        fail++; failures.push(label)
      }
    },
  }
}

// Concept fixtures — minimal shape, just what conceptMatchScore reads.
const concept = (name, opts = {}) => ({
  concept_slug: 'x',
  concept_name: name,
  subject: 'Physics',
  class_level: 10,
  chapter_no: 1,
  chapter_name: opts.chapter_name || 'Some Chapter',
  brief_summary: opts.brief_summary || null,
  exam_weight_percent: 0,
})

// ─── Short-name concepts (the DNA/RNA/Atom regression class) ──────────
console.log('\n\x1b[36m▶ Short concept names match (≥3 chars, was previously ≥5)\x1b[0m')

expect(conceptMatchScore(concept('DNA'), 'How is DNA replicated?'), 'DNA matches "DNA replicated"').eq(1.0)
expect(conceptMatchScore(concept('RNA'), 'What is the role of RNA in protein synthesis?'), 'RNA matches').eq(1.0)
expect(conceptMatchScore(concept('Atom'), 'Describe the structure of the atom'), 'Atom matches').eq(1.0)
expect(conceptMatchScore(concept('Mole'), 'Calculate the mole ratio in this reaction'), 'Mole matches "mole ratio"').eq(1.0)
expect(conceptMatchScore(concept('Cell'), 'Explain the parts of a plant cell'), 'Cell matches').eq(1.0)

// ─── Word-boundary: "force" doesn't match "enforce" ──────────────────
console.log('\n\x1b[36m▶ Word-boundary match (no false positives from substring)\x1b[0m')

expect(conceptMatchScore(concept('Force'), 'Should we enforce the rule?'),
  'Force does NOT match "enforce"').lt(0.4)
expect(conceptMatchScore(concept('Force'), 'What is the net force on the block?'),
  'Force matches "net force on the block"').gte(0.95)
expect(conceptMatchScore(concept('Cell'), 'How does cellular respiration work?'),
  'Cell does NOT match "cellular" (no word boundary)').lt(0.4)
expect(conceptMatchScore(concept('Cell'), 'Describe a typical cell membrane'),
  'Cell matches "typical cell membrane"').eq(1.0)

// ─── CBSE stop-words excluded from token scoring ──────────────────────
console.log('\n\x1b[36m▶ CBSE stop-words excluded from token-overlap scoring\x1b[0m')

// "Calculate Force" — concept name. Doubts about other things shouldn't get
// tagged with this concept just because they say "calculate".
expect(conceptMatchScore(concept('Calculate Force'),
  'Calculate the area of the rectangle'),
  'doubt about area NOT tagged with "Calculate Force" via "calculate"').lt(0.6)
expect(conceptMatchScore(concept('Calculate Force'),
  'Calculate the net force on this block'),
  'doubt about force IS tagged with "Calculate Force"').gte(0.95)

// "Find Velocity" — same shape. "Find the area" shouldn't trigger.
expect(conceptMatchScore(concept('Find Velocity'),
  'Find the volume of the cube'),
  '"find" alone is not enough for "Find Velocity" match').lt(0.6)

// ─── Multi-word concept name token overlap ────────────────────────────
console.log('\n\x1b[36m▶ Multi-word concept name — partial token overlap\x1b[0m')

const ohms = concept("Ohm's Law", { chapter_name: 'Electricity' })
// Phrase match on "ohm" word boundary fires (after stripping apostrophe in toLowerCase, it's "ohm's law")
// The implementation lowercases name to "ohm's law" then tries word-boundary match.
// "Calculate using Ohm's Law" should match.
expect(conceptMatchScore(ohms, "Calculate the current using Ohm's Law"),
  "Ohm's Law matches verbatim").gte(0.95)
// Just "law" alone — not enough
expect(conceptMatchScore(ohms, "What is the law of conservation?"),
  '"law" alone NOT enough to match "Ohm\'s Law"').lt(0.6)

// "Force on a current-carrying conductor"
const conductor = concept('Force on a current-carrying conductor', { chapter_name: 'Magnetic Effects' })
expect(conceptMatchScore(conductor,
  'Calculate the force on a current-carrying conductor in a magnetic field'),
  'verbatim phrase match').eq(1.0)
expect(conceptMatchScore(conductor,
  'What determines the direction of force on the conductor?'),
  'partial token overlap (force, conductor) gives moderate score').gte(0.4)

// ─── Chapter name boost (when verbatim in text) ───────────────────────
console.log('\n\x1b[36m▶ Chapter name boost\x1b[0m')

const fieldLines = concept('Magnetic Field Lines', { chapter_name: 'Magnetic Effects of Electric Current' })
expect(conceptMatchScore(fieldLines,
  'Question from Magnetic Effects of Electric Current chapter about field lines'),
  'chapter mention adds 0.2 boost').gte(1.0)

// ─── Edge cases ───────────────────────────────────────────────────────
console.log('\n\x1b[36m▶ Edge cases\x1b[0m')

expect(conceptMatchScore(concept('Force'), ''), 'empty text → 0').eq(0)
expect(conceptMatchScore(concept('AB'), 'Some text about AB'),
  '2-char concept name (below cutoff) → 0').eq(0)

// Text that's just stop-words shouldn't match anything
expect(conceptMatchScore(concept('Velocity'),
  'Calculate find determine explain state derive'),
  'all-stopwords doubt → 0').eq(0)

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n\x1b[1m──────────────────────────────────────\x1b[0m')
console.log(`\x1b[1mPASSED: ${pass}  FAILED: ${fail}\x1b[0m`)
if (fail > 0) {
  console.log('\x1b[31mFailures:\x1b[0m')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\x1b[32mAll concept-detect unit tests passed.\x1b[0m')
