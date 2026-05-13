// Unit tests for server/routes/concepts.ts → buildConceptRows + toSlug.
//
// Locks the two high-severity safeguards added in this change:
//   1. Empty/short concept_name values are filtered out (prevents the
//      `ch12-` collision trap)
//   2. Within-batch slug collisions are deduped via -2/-3 suffix (prevents
//      silent overwrite when LLM produces duplicate-slug names)
//
// Run: npx tsx tests/conceptExtract.test.mjs

import { buildConceptRows, toSlug } from '../server/lib/conceptHelpers.ts'

let pass = 0, fail = 0
const failures = []
function eq(actual, expected, label) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
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

console.log('\n\x1b[36m▶ toSlug — kebab-case + chapter-prefixed\x1b[0m')

eq(toSlug(12, "Ohm's Law"), 'ch12-ohms-law', 'apostrophe stripped, lowercase')
eq(toSlug(5, 'Force on a current-carrying conductor'),
   'ch5-force-on-a-current-carrying-conductor',
   'multi-word with hyphens preserved')
eq(toSlug(11, 'Photosynthesis  in  Plants'),
   'ch11-photosynthesis-in-plants',
   'multiple spaces collapsed to single hyphen')
eq(toSlug(3, ''), 'ch3-', 'empty name → bare prefix (caller must filter)')
eq(toSlug(7, 'जीवन'), 'ch7-', 'Devanagari → bare prefix (Hindi support gap, documented)')

console.log('\n\x1b[36m▶ buildConceptRows — empty-name filter\x1b[0m')

// 3 of 5 valid; 2 dropped (empty + 2-char)
{
  const out = buildConceptRows({
    extracted: [
      { concept_name: 'Ohm\'s Law', exam_weight_percent: 20 },
      { concept_name: '', exam_weight_percent: 15 },           // empty → drop
      { concept_name: 'AC', exam_weight_percent: 10 },         // 2 chars → drop
      { concept_name: 'Heating Effect', exam_weight_percent: 18 },
      { concept_name: '   ', exam_weight_percent: 5 },         // whitespace-only → drop
    ],
    subject: 'Physics', classLevel: 10,
    chapterNo: 12, chapterName: 'Electricity',
    startingOrder: 1200,
  })
  eq(out.length, 2, '5 inputs → 2 valid (empty/short/whitespace dropped)')
  eq(out.map(r => r.concept_name), ["Ohm's Law", 'Heating Effect'], 'survivors are the named concepts')
  eq(out.map(r => r.concept_slug), ['ch12-ohms-law', 'ch12-heating-effect'], 'slugs computed only for survivors')
}

// Non-string concept_name (LLM hallucinates)
{
  const out = buildConceptRows({
    extracted: [
      { concept_name: 'Valid Concept' },
      { concept_name: null },
      { concept_name: 42 },
      { concept_name: { nested: 'object' } },
      {},
    ],
    subject: 'Physics', classLevel: 10,
    chapterNo: 12, chapterName: 'Electricity',
    startingOrder: 1200,
  })
  eq(out.length, 1, 'non-string concept_name values dropped (null, number, object, missing)')
  eq(out[0].concept_name, 'Valid Concept', 'only the string-named survivor remains')
}

console.log('\n\x1b[36m▶ buildConceptRows — slug collision dedupe\x1b[0m')

// THE bug: LLM returns three names that all slugify identically.
// Without dedupe, upsert silently overwrites — 3 in, 1 stored.
{
  const out = buildConceptRows({
    extracted: [
      { concept_name: "Ohm's Law" },
      { concept_name: 'Ohms Law' },           // apostrophe stripped → same slug
      { concept_name: 'OHM\'S    LAW' },      // case + extra spaces → same slug
    ],
    subject: 'Physics', classLevel: 10,
    chapterNo: 12, chapterName: 'Electricity',
    startingOrder: 1200,
  })
  eq(out.length, 3, 'all 3 collision-named concepts kept (none silently dropped)')
  eq(out.map(r => r.concept_slug),
     ['ch12-ohms-law', 'ch12-ohms-law-2', 'ch12-ohms-law-3'],
     'collisions get -2, -3 suffixes')
  eq(out.map(r => r.concept_name),
     ["Ohm's Law", 'Ohms Law', "OHM'S    LAW"],
     'names preserved verbatim (only slugs are deduped)')
}

// Mixed: some collide, others unique
{
  const out = buildConceptRows({
    extracted: [
      { concept_name: 'Force' },
      { concept_name: 'Acceleration' },
      { concept_name: 'force' },              // same slug as #0
      { concept_name: 'Mass' },
      { concept_name: 'FORCE' },              // same slug as #0
    ],
    subject: 'Physics', classLevel: 9,
    chapterNo: 9, chapterName: 'Force and Laws of Motion',
    startingOrder: 900,
  })
  eq(out.map(r => r.concept_slug),
     ['ch9-force', 'ch9-acceleration', 'ch9-force-2', 'ch9-mass', 'ch9-force-3'],
     'mixed batch: only collisions get suffixes, unique slugs untouched')
}

console.log('\n\x1b[36m▶ buildConceptRows — syllabus_order monotonic\x1b[0m')

{
  const out = buildConceptRows({
    extracted: [
      { concept_name: 'A' },     // 1 char → drop
      { concept_name: 'Beta' },
      { concept_name: 'Gamma' },
    ],
    subject: 'Physics', classLevel: 10,
    chapterNo: 5, chapterName: 'X',
    startingOrder: 500,
  })
  eq(out.map(r => r.syllabus_order), [500, 501],
     'syllabus_order increments only for survivors (skipping filtered "A")')
}

console.log('\n\x1b[36m▶ buildConceptRows — exam_weight + summary clamping\x1b[0m')

{
  const out = buildConceptRows({
    extracted: [
      { concept_name: 'Test',
        exam_weight_percent: 'not-a-number',
        brief_summary: 'x'.repeat(500) },
    ],
    subject: 'P', classLevel: 10,
    chapterNo: 1, chapterName: 'Y',
    startingOrder: 100,
  })
  eq(out[0].exam_weight_percent, 0, 'non-numeric exam_weight_percent → 0')
  eq(out[0].brief_summary.length, 300, 'brief_summary clamped to 300 chars')
}

{
  const out = buildConceptRows({
    extracted: [{ concept_name: 'x'.repeat(200) }],
    subject: 'P', classLevel: 10,
    chapterNo: 1, chapterName: 'Y',
    startingOrder: 100,
  })
  eq(out[0].concept_name.length, 120, 'concept_name clamped to 120 chars')
}

// ─── Summary ─────────────────────────────────────────────────────────────
console.log('\n\x1b[1m──────────────────────────────────────\x1b[0m')
console.log(`\x1b[1mPASSED: ${pass}  FAILED: ${fail}\x1b[0m`)
if (fail > 0) {
  console.log('\x1b[31mFailures:\x1b[0m')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\x1b[32mAll concept-extract unit tests passed.\x1b[0m')
