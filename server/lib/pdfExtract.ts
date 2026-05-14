// ═══════════════════════════════════════════════════════════════════════════
// PDF text extraction — multi-tier fallback chain for Sprint 3 / F6b.
// ═══════════════════════════════════════════════════════════════════════════
// Problem: NCERT Hindi PDFs ship with custom Devanagari fonts (Krutidev /
// Shusha family). The underlying character codes are ASCII (`d` renders as
// क, `k` renders as ा, etc.) — pdf-parse reads codes, not glyphs, so the
// extracted text is Krutidev-encoded gibberish that embeds as noise and
// makes the LLM hallucinate.
//
// We don't know up front whether a given PDF uses legacy fonts. So:
//
//   Tier 1: pdf-parse           (fast, no native deps, works for English)
//   Tier 2: pdftotext            (poppler-utils — better Indic font support)
//   Tier 3: Tesseract OCR        (rasterise + OCR — last resort, slow)
//
// After each tier we check the result with isProbablyDevanagari(). If the
// caller said the PDF is Hindi but <30% of non-whitespace chars are in the
// Devanagari Unicode block (U+0900..U+097F), we fall through.
//
// For English PDFs (language='en'), we never fall past Tier 1 — pdf-parse
// is reliable for Latin text.
//
// Tier 3 (Tesseract OCR) lives in this same file but is implemented in a
// separate commit so this one stays focused.
// ═══════════════════════════════════════════════════════════════════════════

import { spawn } from 'node:child_process'
import { writeFile, readFile, unlink, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export type ExtractTier = 'pdf-parse' | 'pdftotext' | 'tesseract' | 'failed'

export interface ExtractResult {
  text: string
  tier: ExtractTier
  charsPerTier: { 'pdf-parse'?: number; pdftotext?: number; tesseract?: number }
  devanagariRatioPerTier: { 'pdf-parse'?: number; pdftotext?: number; tesseract?: number }
}

const DEVANAGARI_RE = /[ऀ-ॿ]/g
const MIN_DEVANAGARI_RATIO = 0.3

/**
 * Returns true if at least `threshold` (default 30%) of the non-whitespace
 * characters in `text` are in the Devanagari Unicode block. Used as the
 * "did extraction succeed for a Hindi PDF?" check between tiers.
 *
 * Exposed so callers (admin upload route, future content validators) can
 * sanity-check arbitrary text without re-running the extractor.
 */
export function isProbablyDevanagari(text: string, threshold: number = MIN_DEVANAGARI_RATIO): boolean {
  if (!text) return false
  const nonWs = text.replace(/\s+/g, '')
  if (nonWs.length === 0) return false
  const matches = nonWs.match(DEVANAGARI_RE)
  const ratio = (matches?.length ?? 0) / nonWs.length
  return ratio >= threshold
}

/**
 * Devanagari-character ratio (0..1). Exposed for telemetry.
 */
export function devanagariRatio(text: string): number {
  if (!text) return 0
  const nonWs = text.replace(/\s+/g, '')
  if (nonWs.length === 0) return 0
  const matches = nonWs.match(DEVANAGARI_RE)
  return (matches?.length ?? 0) / nonWs.length
}

// ─── Tier 1 — pdf-parse ─────────────────────────────────────────────────
async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  // Lazy import — pdf-parse has a known startup quirk that fails if the
  // module imports at top-level under certain conditions (the 'test/data'
  // PDF check). Lazy import isolates it.
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule as any).default || pdfParseModule
  const pdf = await pdfParse(buffer)
  return (pdf?.text || '').toString()
}

// ─── Tier 2 — pdftotext (poppler-utils) ─────────────────────────────────
// Shells out to the `pdftotext` binary. Required on dev: `brew install
// poppler`. On Railway / Docker: `apt-get install -y poppler-utils`.
//
// pdftotext handles Indic font decoding noticeably better than pdf-parse
// for many (not all) legacy NCERT PDFs. When it doesn't, Tier 3 catches.
async function extractWithPdftotext(buffer: Buffer): Promise<string> {
  // Write the buffer to a temp file (pdftotext doesn't read stdin reliably
  // for binary PDFs on macOS — file path is the safe contract).
  const dir = await mkdtemp(path.join(tmpdir(), 'padee-pdf-'))
  const inputPath = path.join(dir, 'in.pdf')
  const outputPath = path.join(dir, 'out.txt')

  try {
    await writeFile(inputPath, buffer)

    // -layout preserves paragraph structure; -nopgbrk drops form-feed page breaks
    // that confuse our paragraph splitter. -enc UTF-8 forces Unicode output
    // regardless of the source PDF's declared encoding.
    await runCommand('pdftotext', ['-layout', '-nopgbrk', '-enc', 'UTF-8', inputPath, outputPath])

    const text = await readFile(outputPath, 'utf-8')
    return text
  } finally {
    // Best-effort cleanup; ignore errors (tmp will get GC'd by the OS).
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}

function runCommand(cmd: string, args: string[], timeoutMs: number = 60_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d.toString() })
    const t = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(t)
      // ENOENT = binary not installed — most likely deployment misconfig.
      // Re-throw with a clearer message so the caller can surface it.
      if ((err as any).code === 'ENOENT') {
        reject(new Error(`${cmd} not found on PATH — install poppler-utils (brew install poppler / apt-get install poppler-utils)`))
      } else {
        reject(err)
      }
    })
    child.on('close', (code) => {
      clearTimeout(t)
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 200)}`))
    })
  })
}

// ─── Tier 3 — Tesseract OCR ─────────────────────────────────────────────
// Last resort for PDFs whose embedded fonts neither pdf-parse nor pdftotext
// can decode (legacy Krutidev / Shusha NCERT books that pdftotext also
// chokes on). Renders each PDF page to a 300-DPI PNG via pdftoppm
// (poppler-utils) and OCRs each image with tesseract.js + Hindi
// traineddata.
//
// Performance: ~5-15s per page for Hindi at 300 DPI. A 20-page chapter
// takes 2-5 minutes. processUpload is already async so this doesn't
// block the response — admin just sees status='processing' for longer.
//
// Memory: rendered PNGs land in /tmp at ~2-3 MB each; cleaned up at the
// end of extraction. tesseract.js worker holds ~50-80 MB in memory while
// active.
//
// First-call warmup: tesseract.js downloads hin.traineddata (~30 MB) from
// the jsdelivr CDN on first use. Subsequent calls in the same process
// hit the worker cache. For Railway / cold starts, consider pre-warming
// or bundling the traineddata as a Phase 2 optimisation.
async function extractWithTesseract(buffer: Buffer, language: 'en' | 'hi'): Promise<string> {
  // Tesseract language code differs from our 'en'/'hi':
  //   'eng' for English, 'hin' for Hindi (Devanagari), 'hin+eng' for mixed.
  // We use 'hin+eng' for Hindi PDFs because NCERT books often mix English
  // labels (page numbers, "Reprint 2026-27" footers, etc.) into Hindi
  // chapters — pure 'hin' would garble those.
  const tessLang = language === 'hi' ? 'hin+eng' : 'eng'

  const dir = await mkdtemp(path.join(tmpdir(), 'padee-ocr-'))
  const inputPath = path.join(dir, 'in.pdf')
  const ppmPrefix = path.join(dir, 'page')

  try {
    await writeFile(inputPath, buffer)

    // Step 1: render PDF → PNG pages at 300 DPI via pdftoppm.
    // Output: <dir>/page-1.png, page-2.png, ... (pdftoppm pads filenames
    // with leading zeros based on total page count).
    await runCommand('pdftoppm', ['-r', '300', '-png', inputPath, ppmPrefix], 120_000)

    // Discover the rendered pages (sorted numerically by suffix).
    const files = (await readdir(dir))
      .filter(f => f.startsWith('page') && f.endsWith('.png'))
      .sort((a, b) => {
        // page-1.png, page-12.png → numeric sort on the suffix
        const ai = parseInt(a.match(/page-?(\d+)/)?.[1] || '0', 10)
        const bi = parseInt(b.match(/page-?(\d+)/)?.[1] || '0', 10)
        return ai - bi
      })

    if (files.length === 0) {
      console.warn('[pdfExtract] Tier 3: pdftoppm produced no images')
      return ''
    }

    console.log(`[pdfExtract] Tier 3 (Tesseract): OCR-ing ${files.length} page(s) with lang=${tessLang}...`)

    // Step 2: spin up a single tesseract.js worker, reuse across pages.
    // Lazy import keeps the cold-start cost out of every backend startup.
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker(tessLang)

    try {
      const pageTexts: string[] = []
      for (let i = 0; i < files.length; i++) {
        const pagePath = path.join(dir, files[i])
        const { data } = await worker.recognize(pagePath)
        pageTexts.push(data.text)
        console.log(`[pdfExtract] Tier 3: page ${i + 1}/${files.length} → ${data.text.length} chars, confidence ${data.confidence.toFixed(1)}`)
      }
      return pageTexts.join('\n\n')
    } finally {
      await worker.terminate()
    }
  } finally {
    // Best-effort cleanup of the entire temp dir (PDF + rendered PNGs).
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────
/**
 * Extract text from a PDF buffer, with language-aware fallback chain.
 *
 *  - language='en' → Tier 1 only (pdf-parse). Latin extraction is reliable.
 *  - language='hi' → Tier 1 → 2 → 3, picking the first tier that produces
 *    text passing isProbablyDevanagari(). Returns the BEST tier's text
 *    (highest ratio) if none pass, with tier='failed' as the signal.
 *
 * Returns {text, tier, charsPerTier, devanagariRatioPerTier} so the caller
 * (admin upload) can log telemetry + surface in the upload status.
 */
export async function extractTextFromPdf(
  buffer: Buffer,
  language: 'en' | 'hi' = 'en',
): Promise<ExtractResult> {
  const charsPerTier: ExtractResult['charsPerTier'] = {}
  const ratioPerTier: ExtractResult['devanagariRatioPerTier'] = {}

  // ── Tier 1: pdf-parse ──
  let t1Text = ''
  try {
    t1Text = await extractWithPdfParse(buffer)
    charsPerTier['pdf-parse'] = t1Text.length
    ratioPerTier['pdf-parse'] = devanagariRatio(t1Text)
  } catch (err: any) {
    console.warn('[pdfExtract] Tier 1 (pdf-parse) failed:', err?.message)
  }

  // English path: Tier 1 is enough, even if extraction was empty (some PDFs
  // are image-only — that's a Tier-3-OCR case we'll handle when an English
  // image-only PDF actually shows up).
  if (language === 'en') {
    return {
      text: t1Text,
      tier: t1Text.trim().length > 0 ? 'pdf-parse' : 'failed',
      charsPerTier,
      devanagariRatioPerTier: ratioPerTier,
    }
  }

  // Hindi path: validate Tier 1's output
  if (t1Text.trim().length > 0 && isProbablyDevanagari(t1Text)) {
    return { text: t1Text, tier: 'pdf-parse', charsPerTier, devanagariRatioPerTier: ratioPerTier }
  }

  // ── Tier 2: pdftotext ──
  let t2Text = ''
  try {
    t2Text = await extractWithPdftotext(buffer)
    charsPerTier.pdftotext = t2Text.length
    ratioPerTier.pdftotext = devanagariRatio(t2Text)
    console.log(`[pdfExtract] Tier 2 (pdftotext) → ${t2Text.length} chars, ${(ratioPerTier.pdftotext * 100).toFixed(1)}% Devanagari`)
  } catch (err: any) {
    console.warn('[pdfExtract] Tier 2 (pdftotext) failed:', err?.message)
  }

  if (t2Text.trim().length > 0 && isProbablyDevanagari(t2Text)) {
    return { text: t2Text, tier: 'pdftotext', charsPerTier, devanagariRatioPerTier: ratioPerTier }
  }

  // ── Tier 3: Tesseract OCR (stub for now) ──
  let t3Text = ''
  try {
    t3Text = await extractWithTesseract(buffer, language)
    charsPerTier.tesseract = t3Text.length
    ratioPerTier.tesseract = devanagariRatio(t3Text)
  } catch (err: any) {
    console.warn('[pdfExtract] Tier 3 (Tesseract) failed:', err?.message)
  }

  if (t3Text.trim().length > 0 && isProbablyDevanagari(t3Text)) {
    return { text: t3Text, tier: 'tesseract', charsPerTier, devanagariRatioPerTier: ratioPerTier }
  }

  // All tiers failed. Return whichever has the highest Devanagari ratio so
  // the caller has SOMETHING to work with (or an empty string).
  const best = [
    { tier: 'pdf-parse' as const, text: t1Text, ratio: ratioPerTier['pdf-parse'] || 0 },
    { tier: 'pdftotext' as const, text: t2Text, ratio: ratioPerTier.pdftotext || 0 },
    { tier: 'tesseract' as const, text: t3Text, ratio: ratioPerTier.tesseract || 0 },
  ].sort((a, b) => b.ratio - a.ratio)[0]

  return {
    text: best.text,
    tier: 'failed',
    charsPerTier,
    devanagariRatioPerTier: ratioPerTier,
  }
}
