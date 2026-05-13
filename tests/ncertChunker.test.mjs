// Unit tests for server/lib/ncertChunker.ts (Sprint 3 / F6b).
//
// Covers the unit-aware Hindi chunker — verse blocks stay intact, strong
// markers force a chunk break, prose paragraphs cap at HINDI_CHUNK_MAX (1500
// chars). Also confirms the English chunker's backwards compatibility.
//
// Run: npx tsx tests/ncertChunker.test.mjs

import { chunkText, chunkHindiText, chunkEnglishText } from '../server/lib/ncertChunker.ts'

let pass = 0, fail = 0
const failures = []

function expect(actual, label) {
  return {
    toEqual(expected) {
      const ok = JSON.stringify(actual) === JSON.stringify(expected)
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}`); console.log(`    expected: ${JSON.stringify(expected)}`); console.log(`    actual:   ${JSON.stringify(actual)}`); fail++; failures.push(label) }
    },
    toBeGreaterThanOrEqual(min) {
      const ok = actual >= min
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${actual} ≥ ${min})`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}  (got: ${actual}, expected ≥ ${min})`); fail++; failures.push(label) }
    },
    toBeLessThanOrEqual(max) {
      const ok = actual <= max
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}  (got: ${actual} ≤ ${max})`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}  (got: ${actual}, expected ≤ ${max})`); fail++; failures.push(label) }
    },
    toContain(substr) {
      const ok = actual.includes(substr)
      if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${label}`); pass++ }
      else { console.log(`  \x1b[31m✗\x1b[0m ${label}  (did not find: ${substr.slice(0, 40)}...)`); fail++; failures.push(label) }
    },
  }
}

console.log('\n\x1b[36m▶ chunkText dispatcher\x1b[0m')
expect(typeof chunkText, 'chunkText is a function').toEqual('function')

console.log('\n\x1b[36m▶ Hindi chunker — verse blocks stay intact\x1b[0m')
{
  const hindiPoem = `सपने का सा दिन

★ कविता

मैंने भी देखा है सपना
मैंने भी देखा है सपना
चांद से थोड़ी सी गप्पें
तारों से कुछ बातें

बहुत कुछ बातें होती हैं
सपनों में ही होती हैं
रात के साये में
दिल की धड़कनें भी होती हैं

★ प्रश्न

प्रश्न 1. कविता का मुख्य भाव क्या है?

उत्तर: कविता का मुख्य भाव सपनों की सुंदरता है।`
  const chunks = chunkHindiText(hindiPoem)
  expect(chunks.length, 'verse + marker section splits into multiple chunks').toBeGreaterThanOrEqual(2)
  // The verse block should NOT be split mid-line — first chunk containing verse has all 4 lines + intro
  const verseChunk = chunks.find(c => c.text.includes('चांद से थोड़ी सी'))
  expect(verseChunk?.text || '', 'verse chunk keeps all 4 verse lines').toContain('दिल की धड़कनें')
}

console.log('\n\x1b[36m▶ Hindi chunker — strong markers force a chunk break\x1b[0m')
{
  const text = `First paragraph of chapter intro material that is reasonably long enough to be meaningful as a standalone unit.

● अध्याय 1 आरंभ

Second unit material starts here. This should land in a separate chunk because the strong marker is a hard boundary.`
  const chunks = chunkHindiText(text)
  const firstChunkText = chunks[0]?.text || ''
  const secondChunkText = chunks[1]?.text || ''
  expect(firstChunkText, 'first chunk has intro').toContain('First paragraph')
  expect(secondChunkText, 'second chunk starts at the strong marker').toContain('अध्याय 1 आरंभ')
}

console.log('\n\x1b[36m▶ Hindi chunker — prose cap respects HINDI_CHUNK_MAX\x1b[0m')
{
  // Build a long prose-only doc (no verses, no markers) that should split
  const longProse = Array(5).fill(0)
    .map((_, i) => `यह पैराग्राफ ${i + 1} है। ` + 'भारत की संस्कृति बहुत समृद्ध है। '.repeat(20))
    .join('\n\n')
  const chunks = chunkHindiText(longProse)
  expect(chunks.length, 'long prose splits into multiple chunks').toBeGreaterThanOrEqual(2)
  for (const ch of chunks) {
    // Allow up to 1.8x because the cap is soft — a mega-paragraph can overflow
    expect(ch.text.length, 'chunk respects soft cap (≤ 2700 = 1500 × 1.8)').toBeLessThanOrEqual(2700)
  }
}

console.log('\n\x1b[36m▶ English chunker — backwards compat\x1b[0m')
{
  const text = `First paragraph here, fairly long with multiple sentences. The chunker should respect blank lines as paragraph separators.

Second paragraph. ` + 'Lorem ipsum dolor sit amet. '.repeat(40) + `

Third paragraph at the end.`
  const chunks = chunkEnglishText(text)
  expect(chunks.length, 'English text produces at least 1 chunk').toBeGreaterThanOrEqual(1)
  // Default cap is 800 chars but chunks can overflow slightly with overlap
  for (const ch of chunks) {
    // English cap is 800 but overlap from the previous chunk can push the next
    // one above the nominal cap. 1400 is the practical ceiling.
    expect(ch.text.length, 'English chunk within 800-char + overlap envelope').toBeLessThanOrEqual(1400)
  }
}

console.log('\n\x1b[36m▶ Page-number detection\x1b[0m')
{
  const text = `First chunk content here, long enough to be a real chunk.

12

After page 12 break, more content goes here. Fairly long too.`
  const chunks = chunkHindiText(text)
  // The page number paragraph itself should NOT appear as a chunk
  const pageChunk = chunks.find(c => c.text.trim() === '12')
  expect(pageChunk, 'standalone page number is not emitted as a chunk').toEqual(undefined)
}

console.log('\n\x1b[1m──────────────────────────────────────\x1b[0m')
console.log(`\x1b[1mPASSED: ${pass}  FAILED: ${fail}\x1b[0m`)
if (fail > 0) { failures.forEach(f => console.log(`  ✗ ${f}`)); process.exit(1) }
console.log('\x1b[32mAll chunker tests passed.\x1b[0m')
