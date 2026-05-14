// Unit tests for server/lib/pdfExtract.ts (Sprint 3 / F6b).
//
// Covers the Devanagari-detection heuristic — the gate that decides whether
// extraction succeeded or we need to fall through to a higher tier. Full
// end-to-end PDF extraction is tested separately via the admin upload
// integration path.
//
// Run: npx tsx tests/pdfExtract.test.mjs

import { isProbablyDevanagari, devanagariRatio } from '../server/lib/pdfExtract.ts'

let pass = 0, fail = 0
const failures = []

function expect(actual, label) {
  return {
    toEqual(expected) {
      const ok = actual === expected
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${JSON.stringify(actual)})`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}  (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`); fail++; failures.push(label) }
    },
    toBeApprox(expected, epsilon = 0.05) {
      const ok = Math.abs(actual - expected) < epsilon
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${actual.toFixed(3)}, expected ${expected.toFixed(3)} ± ${epsilon})`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}  (got: ${actual.toFixed(3)}, expected ${expected.toFixed(3)} ± ${epsilon})`); fail++; failures.push(label) }
    },
  }
}

console.log('\n\x1b[36m▶ isProbablyDevanagari — clean Hindi text\x1b[0m')
{
  const cleanHindi = `सूरदास जी एक महान भक्त कवि थे।
उन्होंने भगवान कृष्ण की भक्ति में कई रचनाएँ लिखीं।
उनकी रचनाओं में मुख्य रूप से भजन हैं।`
  expect(isProbablyDevanagari(cleanHindi), 'clean Hindi → true').toEqual(true)
  expect(devanagariRatio(cleanHindi), 'clean Hindi ratio ~ 1.0').toBeApprox(1.0)
}

console.log('\n\x1b[36m▶ isProbablyDevanagari — Krutidev gibberish\x1b[0m')
{
  // The actual output from pdf-parse on the user's Surdas PDF
  const krutidev = `dkO; [kaM
ân; fla/q efr lhi lekukA
Lokfr lkjnk dgfga lqtkukA
tks cj"kb cj ckfj fopk:A
gksafg dfor eqDrkefu pk:AA
& rqylhnkl`
  expect(isProbablyDevanagari(krutidev), 'Krutidev-encoded ASCII → false').toEqual(false)
  expect(devanagariRatio(krutidev), 'Krutidev ratio ~ 0').toBeApprox(0)
}

console.log('\n\x1b[36m▶ isProbablyDevanagari — plain English\x1b[0m')
{
  const english = `Surdas was a great devotional poet who wrote many works in praise of Krishna.`
  expect(isProbablyDevanagari(english), 'pure English → false').toEqual(false)
  expect(devanagariRatio(english), 'English ratio = 0').toEqual(0)
}

console.log('\n\x1b[36m▶ isProbablyDevanagari — mixed (60% Hindi, 40% English)\x1b[0m')
{
  // 60% above the 30% threshold → should pass
  const mixed = `सूरदास जी एक महान भक्त कवि थे his works include many bhajans`
  expect(isProbablyDevanagari(mixed), 'majority-Hindi mixed → true (above 30%)').toEqual(true)
}

console.log('\n\x1b[36m▶ isProbablyDevanagari — mostly English with sprinkled Hindi\x1b[0m')
{
  // ~7% Devanagari — well under threshold; should fall through
  const mostlyEnglish = `Surdas was a devotional poet कवि who composed many works.`
  expect(isProbablyDevanagari(mostlyEnglish), 'sprinkled Hindi → false (below 30%)').toEqual(false)
}

console.log('\n\x1b[36m▶ Edge cases\x1b[0m')
{
  expect(isProbablyDevanagari(''), 'empty string → false').toEqual(false)
  expect(isProbablyDevanagari('     '), 'whitespace-only → false').toEqual(false)
  expect(isProbablyDevanagari(null), 'null → false').toEqual(false)
  expect(isProbablyDevanagari(undefined), 'undefined → false').toEqual(false)
  expect(devanagariRatio(''), 'empty string ratio = 0').toEqual(0)
}

console.log('\n\x1b[36m▶ Threshold parameter\x1b[0m')
{
  const mixed = `सूरदास Surdas`  // ~50% Devanagari
  expect(isProbablyDevanagari(mixed, 0.3), '50% text with threshold 0.3 → true').toEqual(true)
  expect(isProbablyDevanagari(mixed, 0.7), '50% text with threshold 0.7 → false').toEqual(false)
}

console.log('\n\x1b[1m──────────────────────────────────────\x1b[0m')
console.log(`\x1b[1mPASSED: ${pass}  FAILED: ${fail}\x1b[0m`)
if (fail > 0) { failures.forEach(f => console.log(`  ✗ ${f}`)); process.exit(1) }
console.log('\x1b[32mAll pdfExtract validation tests passed.\x1b[0m')
