// ═══════════════════════════════════════════════════════════════════════════
// Worksheet export — PDF (jspdf) + DOCX (docx) client-side.
// Teacher clicks a button, browser generates file, saves via file-saver.
// No server round-trip — keeps backend simple and lets preview match output.
// ═══════════════════════════════════════════════════════════════════════════
import { jsPDF } from 'jspdf'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak,
} from 'docx'
import { saveAs } from 'file-saver'

// ─── Helpers ──────────────────────────────────────────────────────────────
function slugify(str) {
  return (str || 'worksheet')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function qText(q) {
  return q.question || ''
}

// MCQ options flattened to "A) ..., B) ..., ..."
function mcqOptionLines(q) {
  if (q.type !== 'mcq' || !q.options) return []
  return Object.entries(q.options).map(([k, v]) => `${k}) ${v}`)
}

function marksLabel(section) {
  const m = section.marks_per_question || 1
  return `[${m} mark${m > 1 ? 's' : ''}]`
}

// ─── PDF export ──────────────────────────────────────────────────────────
// Layout:
//   Page 1..N: Title → meta line → sections with questions (no answers)
//   Final page(s): "Answer Key" header → answer per question with explanation
export function exportWorksheetPDF(worksheet, filename) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) // 595 x 842 pt
  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN_X = 48
  const MARGIN_TOP = 56
  const MARGIN_BOTTOM = 56
  const CONTENT_W = PAGE_W - MARGIN_X * 2
  let y = MARGIN_TOP

  function ensureSpace(lines) {
    const needed = lines * 14
    if (y + needed > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage()
      y = MARGIN_TOP
    }
  }
  function writeWrapped(text, { size = 11, bold = false, indent = 0, spacingAfter = 4, color = '#111827' } = {}) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const maxW = CONTENT_W - indent
    const wrapped = doc.splitTextToSize(text || '', maxW)
    ensureSpace(wrapped.length)
    doc.text(wrapped, MARGIN_X + indent, y)
    y += wrapped.length * (size * 1.2) + spacingAfter
  }

  // ─── Header ───
  writeWrapped(worksheet.title || 'Worksheet', { size: 16, bold: true, spacingAfter: 6 })
  const metaBits = [
    `Class ${worksheet.class_level}`,
    worksheet.subject,
    worksheet.chapter,
    `${worksheet.total_marks || 0} marks`,
  ].filter(Boolean).join('  ·  ')
  writeWrapped(metaBits, { size: 10, color: '#6B7280', spacingAfter: 4 })

  // Name / Date / Time row — teacher-editable by hand or in DOCX
  doc.setDrawColor('#D1D5DB')
  doc.setLineWidth(0.5)
  const rowY = y + 8
  doc.setFontSize(10)
  doc.setTextColor('#374151')
  doc.text('Name: ______________________', MARGIN_X, rowY)
  doc.text('Roll No: __________', MARGIN_X + 260, rowY)
  doc.text('Date: __________', MARGIN_X + 400, rowY)
  y = rowY + 14
  doc.setDrawColor('#E5E7EB')
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y)
  y += 18

  // ─── Sections + questions (no answers) ───
  let globalNum = 1
  for (const section of worksheet.sections || []) {
    writeWrapped(section.name || 'Section', { size: 13, bold: true, color: '#0F766E', spacingAfter: 2 })
    if (section.instructions) {
      writeWrapped(section.instructions, { size: 10, color: '#6B7280', spacingAfter: 6 })
    }
    for (const q of section.questions || []) {
      const qLabel = `${globalNum}. `
      const qFull = qLabel + qText(q) + '  ' + marksLabel(section)
      writeWrapped(qFull, { size: 11, spacingAfter: 2 })
      // MCQ options
      for (const line of mcqOptionLines(q)) {
        writeWrapped(line, { size: 11, indent: 18, spacingAfter: 1 })
      }
      // Blank writing lines for short/long answers
      if (q.type === 'short_answer') {
        y += 4
        for (let i = 0; i < 2; i++) {
          ensureSpace(1)
          doc.setDrawColor('#D1D5DB')
          doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y); y += 18
        }
      } else if (q.type === 'long_answer') {
        y += 4
        for (let i = 0; i < 6; i++) {
          ensureSpace(1)
          doc.setDrawColor('#D1D5DB')
          doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y); y += 20
        }
      } else if (q.type === 'numerical' || q.type === 'fill_in_blank') {
        y += 4
        for (let i = 0; i < 3; i++) {
          ensureSpace(1)
          doc.setDrawColor('#D1D5DB')
          doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y); y += 20
        }
      }
      y += 6
      globalNum++
    }
    y += 10
  }

  // ─── Answer Key (new page) ───
  doc.addPage()
  y = MARGIN_TOP
  writeWrapped('Answer Key', { size: 16, bold: true, color: '#0F766E', spacingAfter: 4 })
  writeWrapped(worksheet.title || '', { size: 11, color: '#6B7280', spacingAfter: 12 })

  let ansNum = 1
  for (const section of worksheet.sections || []) {
    writeWrapped(section.name || 'Section', { size: 12, bold: true, color: '#374151', spacingAfter: 4 })
    for (const q of section.questions || []) {
      const a = typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer)
      writeWrapped(`${ansNum}. ${a}`, { size: 11, bold: true, spacingAfter: 2 })
      if (q.answer_explanation) {
        writeWrapped(q.answer_explanation, { size: 10, color: '#4B5563', indent: 14, spacingAfter: 6 })
      } else {
        y += 4
      }
      ansNum++
    }
    y += 6
  }

  doc.save(filename || `${slugify(worksheet.title)}.pdf`)
}

// ─── DOCX export ─────────────────────────────────────────────────────────
// Editable Word doc with same layout. Teacher can tweak wording or add a logo.
export async function exportWorksheetDOCX(worksheet, filename) {
  // --- Questions pages ---
  const questionParas = []
  questionParas.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: worksheet.title || 'Worksheet', bold: true, size: 32 })],
  }))
  const metaBits = [
    `Class ${worksheet.class_level}`,
    worksheet.subject,
    worksheet.chapter,
    `${worksheet.total_marks || 0} marks`,
  ].filter(Boolean).join('  ·  ')
  questionParas.push(new Paragraph({
    children: [new TextRun({ text: metaBits, color: '6B7280', size: 20 })],
    spacing: { after: 120 },
  }))
  questionParas.push(new Paragraph({
    children: [
      new TextRun({ text: 'Name: ______________________    ', size: 20 }),
      new TextRun({ text: 'Roll No: __________    ', size: 20 }),
      new TextRun({ text: 'Date: __________', size: 20 }),
    ],
    spacing: { after: 240 },
  }))

  let globalNum = 1
  for (const section of worksheet.sections || []) {
    questionParas.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: section.name || 'Section', bold: true, color: '0F766E' })],
      spacing: { before: 200, after: 60 },
    }))
    if (section.instructions) {
      questionParas.push(new Paragraph({
        children: [new TextRun({ text: section.instructions, italics: true, color: '6B7280', size: 20 })],
        spacing: { after: 120 },
      }))
    }

    for (const q of section.questions || []) {
      questionParas.push(new Paragraph({
        children: [
          new TextRun({ text: `${globalNum}. `, bold: true }),
          new TextRun({ text: qText(q) + '  ' }),
          new TextRun({ text: marksLabel(section), color: '9CA3AF', size: 18 }),
        ],
        spacing: { after: 80 },
      }))
      for (const line of mcqOptionLines(q)) {
        questionParas.push(new Paragraph({
          children: [new TextRun({ text: line })],
          indent: { left: 400 }, spacing: { after: 40 },
        }))
      }
      // Blank line for writing space
      if (q.type === 'short_answer' || q.type === 'numerical' || q.type === 'fill_in_blank') {
        questionParas.push(new Paragraph({ children: [new TextRun({ text: '_____________________________________________________________________' })] }))
        questionParas.push(new Paragraph({ children: [new TextRun({ text: '_____________________________________________________________________' })] }))
      } else if (q.type === 'long_answer') {
        for (let i = 0; i < 6; i++) {
          questionParas.push(new Paragraph({ children: [new TextRun({ text: '_____________________________________________________________________' })] }))
        }
      }
      questionParas.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 120 } }))
      globalNum++
    }
  }

  // --- Answer key page ---
  questionParas.push(new Paragraph({ children: [new PageBreak()] }))
  questionParas.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: 'Answer Key', bold: true, color: '0F766E' })],
    spacing: { after: 100 },
  }))
  questionParas.push(new Paragraph({
    children: [new TextRun({ text: worksheet.title || '', color: '6B7280', size: 20 })],
    spacing: { after: 200 },
  }))

  let ansNum = 1
  for (const section of worksheet.sections || []) {
    questionParas.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: section.name || 'Section', bold: true, color: '374151' })],
      spacing: { before: 160, after: 80 },
    }))
    for (const q of section.questions || []) {
      const a = typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer)
      questionParas.push(new Paragraph({
        children: [
          new TextRun({ text: `${ansNum}. `, bold: true }),
          new TextRun({ text: a, bold: true }),
        ],
        spacing: { after: 40 },
      }))
      if (q.answer_explanation) {
        questionParas.push(new Paragraph({
          children: [new TextRun({ text: q.answer_explanation, color: '4B5563', size: 20 })],
          indent: { left: 240 }, spacing: { after: 120 },
        }))
      }
      ansNum++
    }
  }

  const doc = new Document({
    sections: [{ children: questionParas }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename || `${slugify(worksheet.title)}.docx`)
}
