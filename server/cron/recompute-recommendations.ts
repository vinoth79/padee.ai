// Nightly recommendation recomputation job.
// Runs the full pipeline:
//   1. Recalculate composite scores for every active student (applies recency decay)
//   2. Pick hero concept + generate 1-line hero copy via GPT-4o-mini
//   3. Cache to student_recommendations
//   4. Aggregate class_concept_health
//   5. Write teacher_alerts (red/amber/green)
//
// Can also be run per-student via recomputeForStudent(userId) — triggered
// inline after practice/test complete for instant feedback.
//
// Entry points:
//   • recomputeAll()             -- full nightly pass
//   • recomputeForStudent(id)    -- single-student refresh (mid-session)
//   • recomputeClassHealth()     -- class-level aggregation + alerts
import { supabase } from '../lib/supabase.js'
import OpenAI from 'openai'
import { logLLMCall } from '../lib/llmLog.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Recency decay ────────────────────────────────────────────
// PRD 8C: 7 days = 0.5, 30 days = 0.2
function recencyFromDaysAgo(days: number): number {
  if (days <= 0) return 1.0
  if (days <= 1) return 0.95
  if (days <= 3) return 0.85
  if (days <= 7) return 0.50
  if (days <= 14) return 0.30
  if (days <= 30) return 0.20
  return 0.10
}

// ─── Composite score calculator ──────────────────────────────
function calculateComposite(accuracy: number, recency: number, consistency: number): number {
  return (accuracy * 0.5) + (recency * 0.3) + (consistency * 0.2)
}

// ─── Priority order (Phase 1: no prerequisites) ───────────────
// PRD 8D: exam_weight → score_gap → recency
interface ConceptRow {
  concept_slug: string
  concept_name: string
  subject: string
  class_level: number
  chapter_no: number
  chapter_name: string
  syllabus_order: number
  exam_weight_percent: number
}
interface MasteryRow {
  concept_slug: string
  composite_score: number
  accuracy_score: number
  attempt_count: number
  correct_count: number
  last_practiced_at: string | null
}

function sortByPriority(
  candidates: (MasteryRow & { concept: ConceptRow; days_since_practice: number })[],
): typeof candidates {
  return [...candidates].sort((a, b) => {
    // Top rule: higher exam_weight_percent first
    const weightDiff = (b.concept.exam_weight_percent || 0) - (a.concept.exam_weight_percent || 0)
    if (Math.abs(weightDiff) > 0.5) return weightDiff
    // Tiebreaker: larger score gap from 0.65 first (i.e. lower composite_score first)
    const scoreDiff = a.composite_score - b.composite_score
    if (Math.abs(scoreDiff) > 0.05) return scoreDiff
    // Last: longest since practised first
    return b.days_since_practice - a.days_since_practice
  })
}

// ─── Hero copy LLM ────────────────────────────────────────────
async function generateHeroCopy(params: {
  concept: ConceptRow
  mastery: MasteryRow
  classLevel: number
  failureCount: number
  recType: string
  daysSince: number
  studentId: string
}): Promise<string> {
  const { concept, mastery, classLevel, failureCount, recType, daysSince, studentId } = params
  const model = process.env.LLM_RECOMMENDATION || 'gpt-4o-mini'

  let systemPrompt = ''
  let userPrompt = ''
  if (recType === 'fix_critical' || recType === 'fix_attention') {
    systemPrompt = `You are writing a single-sentence recommendation for a Class ${classLevel} CBSE student. Be specific, use the concrete numbers provided, and communicate urgency without being negative. Under 28 words. No preamble. No quotes.`
    userPrompt = `Concept: ${concept.concept_name}
Chapter: ${concept.chapter_name}
Student has failed this ${failureCount} times across ${mastery.attempt_count} attempts.
This concept is ${concept.exam_weight_percent}% of ${concept.chapter_name} marks in CBSE boards.

Write ONE sentence recommending the student fix this concept now. Mention the failure count and exam weight. Suggest a specific action ("fix in X questions").`
  } else if (recType === 'revise') {
    systemPrompt = `You are writing a single-sentence revision nudge for a Class ${classLevel} student. Keep it warm, brief, emphasise speed (2 minutes). Under 22 words. No preamble. No quotes.`
    userPrompt = `Concept: ${concept.concept_name}
Student knows this well (score ${(mastery.composite_score).toFixed(2)}) but hasn't practised in ${daysSince} days.

Write ONE sentence suggesting a 2-minute revision.`
  } else {
    systemPrompt = `You are writing a single-sentence forward-looking suggestion for a Class ${classLevel} student. Positive tone. Under 22 words.`
    userPrompt = `Student is ready for the next chapter: ${concept.chapter_name}. Write ONE sentence encouraging them to start.`
  }

  const t0 = Date.now()
  try {
    const resp = await openai.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 80,
      temperature: 0.7,
    })
    const copy = resp.choices[0]?.message?.content?.trim() || ''
    logLLMCall({
      timestamp: new Date().toISOString(),
      endpoint: 'other',
      userId: studentId,
      model,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      response: copy,
      latencyMs: Date.now() - t0,
      metadata: { action: 'hero_copy', concept: concept.concept_slug, recType },
    }).catch(() => {})
    return copy
  } catch (err) {
    console.warn('[recompute] hero copy LLM failed, using template:', err)
    // Fallback template
    if (recType === 'fix_critical') {
      return `${concept.concept_name} — failed ${failureCount} times. Worth ${concept.exam_weight_percent}% of chapter marks. Fix this in 5 questions.`
    }
    if (recType === 'fix_attention') {
      return `${concept.concept_name} needs more practice. Let's sharpen this in a short session.`
    }
    if (recType === 'revise') {
      return `${concept.concept_name} — not revised in ${daysSince} days. 2-minute refresh to keep it sharp.`
    }
    return `${concept.chapter_name} — the next step in your journey. Ready to start?`
  }
}

// ─── Per-student recompute ────────────────────────────────────
export async function recomputeForStudent(studentId: string): Promise<void> {
  // Get student's profile (class, subjects)
  const { data: profile } = await supabase
    .from('profiles').select('class_level, role').eq('id', studentId).single()
  if (!profile || profile.role !== 'student') return
  const classLevel = profile.class_level || 10

  // Get selected subjects (student_subjects)
  const { data: subs } = await supabase
    .from('student_subjects').select('subject_code').eq('student_id', studentId)
  const selectedSubjects = (subs || []).map((s: any) => s.subject_code)
  if (selectedSubjects.length === 0) return

  // Fetch all published concepts for student's subjects+class
  const { data: concepts } = await supabase
    .from('concept_catalog')
    .select('concept_slug, concept_name, subject, class_level, chapter_no, chapter_name, syllabus_order, exam_weight_percent')
    .in('subject', selectedSubjects)
    .eq('class_level', classLevel)
    .eq('status', 'published')
  if (!concepts || concepts.length === 0) {
    // No published concepts yet — clear the recommendation
    await supabase.from('student_recommendations').upsert({
      student_id: studentId,
      hero_type: 'none',
      hero_concept_slug: null,
      hero_copy: '',
      hero_detail: {},
      supporting_cards: [],
      generated_at: new Date().toISOString(),
      expires_at: nextMidnightIST().toISOString(),
    })
    return
  }

  const conceptMap = new Map<string, ConceptRow>(concepts.map(c => [c.concept_slug, c]))

  // Fetch this student's mastery rows for those concepts
  const slugs = concepts.map(c => c.concept_slug)
  const { data: mastery } = await supabase
    .from('concept_mastery')
    .select('concept_slug, composite_score, accuracy_score, attempt_count, correct_count, last_practiced_at')
    .eq('student_id', studentId)
    .in('concept_slug', slugs)

  const now = Date.now()
  const enriched = (mastery || []).map((m: MasteryRow) => {
    const concept = conceptMap.get(m.concept_slug)!
    const daysSince = m.last_practiced_at
      ? Math.floor((now - new Date(m.last_practiced_at).getTime()) / (1000 * 60 * 60 * 24))
      : 9999
    // Apply recency decay (accuracy stays, but recency component ages)
    const recency = recencyFromDaysAgo(daysSince)
    const composite = calculateComposite(m.accuracy_score || 0, recency, 1.0 /* consistency stored separately, approximate */)
    return { ...m, composite_score: composite, concept, days_since_practice: daysSince }
  })

  // Update composite_score in DB (decay applied)
  for (const e of enriched) {
    await supabase.from('concept_mastery').update({
      composite_score: e.composite_score,
      recency_score: recencyFromDaysAgo(e.days_since_practice),
    }).eq('student_id', studentId).eq('concept_slug', e.concept_slug)
  }

  // Classify into bands
  const critical = enriched.filter(e => e.composite_score < 0.45 && e.attempt_count >= 3)
  const needsAttention = enriched.filter(e => e.composite_score >= 0.45 && e.composite_score < 0.65 && e.attempt_count >= 2)
  const strong = enriched.filter(e => e.composite_score >= 0.65 && e.days_since_practice >= 7)

  // Pick hero
  let heroType: string = 'none'
  let heroConcept: typeof enriched[0] | null = null
  if (critical.length > 0) {
    heroType = 'fix_critical'
    heroConcept = sortByPriority(critical)[0]
  } else if (needsAttention.length > 0) {
    heroType = 'fix_attention'
    heroConcept = sortByPriority(needsAttention)[0]
  } else if (strong.length > 0) {
    heroType = 'revise'
    heroConcept = strong.sort((a, b) => b.days_since_practice - a.days_since_practice)[0]
  } else {
    // Next to learn: find first unstarted chapter by syllabus_order
    const attemptedSlugs = new Set(enriched.map(e => e.concept_slug))
    const unstarted = concepts.filter(c => !attemptedSlugs.has(c.concept_slug))
    if (unstarted.length > 0) {
      const next = [...unstarted].sort((a, b) => a.syllabus_order - b.syllabus_order)[0]
      heroType = 'next_chapter'
      heroConcept = {
        composite_score: 0,
        accuracy_score: 0,
        attempt_count: 0,
        correct_count: 0,
        last_practiced_at: null,
        concept_slug: next.concept_slug,
        concept: next,
        days_since_practice: 9999,
      }
    }
  }

  let heroCopy = ''
  let heroDetail: any = {}
  if (heroConcept && heroType !== 'none') {
    const failureCount = heroConcept.attempt_count - heroConcept.correct_count
    heroCopy = await generateHeroCopy({
      concept: heroConcept.concept,
      mastery: heroConcept,
      classLevel,
      failureCount,
      recType: heroType,
      daysSince: heroConcept.days_since_practice,
      studentId,
    })
    heroDetail = {
      subject: heroConcept.concept.subject,
      chapter: heroConcept.concept.chapter_name,
      chapter_no: heroConcept.concept.chapter_no,
      composite_score: Math.round(heroConcept.composite_score * 100) / 100,
      exam_weight: heroConcept.concept.exam_weight_percent,
      attempt_count: heroConcept.attempt_count,
      failure_count: failureCount,
      days_since_practice: heroConcept.days_since_practice,
    }
  }

  // Supporting cards: weak (amber) + revision (teal), excluding the hero
  const supporting: any[] = []
  for (const e of critical.slice(0, 3)) {
    if (heroConcept && e.concept_slug === heroConcept.concept_slug) continue
    supporting.push({
      type: 'weak',
      concept_slug: e.concept_slug,
      concept_name: e.concept.concept_name,
      subject: e.concept.subject,
      score: e.composite_score,
      failure_count: e.attempt_count - e.correct_count,
      copy: `${e.concept.concept_name} — failed ${e.attempt_count - e.correct_count} times. Fix in 5 questions →`,
    })
  }
  for (const e of strong.slice(0, 2)) {
    if (heroConcept && e.concept_slug === heroConcept.concept_slug) continue
    supporting.push({
      type: 'revise',
      concept_slug: e.concept_slug,
      concept_name: e.concept.concept_name,
      subject: e.concept.subject,
      score: e.composite_score,
      days_since_practice: e.days_since_practice,
      copy: `${e.concept.concept_name} — not revised in ${e.days_since_practice} days. 2-min refresh →`,
    })
  }

  // Cache
  await supabase.from('student_recommendations').upsert({
    student_id: studentId,
    hero_type: heroType,
    hero_concept_slug: heroConcept?.concept_slug || null,
    hero_copy: heroCopy,
    hero_detail: heroDetail,
    supporting_cards: supporting,
    generated_at: new Date().toISOString(),
    expires_at: nextMidnightIST().toISOString(),
    acted_on: false,
    acted_on_at: null,
  })
}

// ─── Full nightly pass ────────────────────────────────────────
export async function recomputeAll(): Promise<{ students: number; alerts: number }> {
  // Find active students (any activity in last 30 days)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeStudents } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .gte('updated_at', cutoff)

  const ids = (activeStudents || []).map((p: any) => p.id)
  let processed = 0
  for (const id of ids) {
    try {
      await recomputeForStudent(id)
      processed++
    } catch (err) {
      console.warn(`[recompute] student ${id} failed:`, err)
    }
  }

  const alertsCount = await recomputeClassHealth()
  return { students: processed, alerts: alertsCount }
}

// ─── Class health aggregation + teacher alerts ────────────────
export async function recomputeClassHealth(): Promise<number> {
  // Get all published concepts grouped by class+subject
  const { data: concepts } = await supabase
    .from('concept_catalog')
    .select('concept_slug, concept_name, subject, class_level, chapter_no, chapter_name, exam_weight_percent')
    .eq('status', 'published')
  if (!concepts || concepts.length === 0) return 0

  let alertsWritten = 0
  const now = new Date()
  const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  for (const c of concepts) {
    // Count students in class
    const { count: totalStudents } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('class_level', c.class_level)
    const students_total = totalStudents || 0
    if (students_total === 0) continue

    // Count students by score bands for this concept
    const { data: masteryRows } = await supabase
      .from('concept_mastery')
      .select('student_id, composite_score')
      .eq('concept_slug', c.concept_slug)

    let below50 = 0, below65 = 0, above70 = 0, sum = 0, attempted = 0
    if (masteryRows) {
      for (const m of masteryRows) {
        // Only count students actually in this class
        const { data: sp } = await supabase
          .from('profiles').select('class_level').eq('id', m.student_id).maybeSingle()
        if (!sp || sp.class_level !== c.class_level) continue
        attempted++
        sum += m.composite_score || 0
        if (m.composite_score < 0.50) below50++
        if (m.composite_score < 0.65) below65++
        if (m.composite_score >= 0.70) above70++
      }
    }
    const avg = attempted > 0 ? sum / attempted : 0

    await supabase.from('class_concept_health').upsert({
      class_level: c.class_level,
      subject: c.subject,
      concept_slug: c.concept_slug,
      students_total,
      students_attempted: attempted,
      students_below_50: below50,
      students_below_65: below65,
      students_above_70: above70,
      class_avg_score: avg,
      last_calculated_at: now.toISOString(),
    })

    // Red alert: >40% of class below 0.50
    if (students_total > 0 && (below50 / students_total) > 0.40) {
      const alertKey = `red:${c.concept_slug}:${now.toISOString().slice(0, 10)}`
      // Find all teachers for this class (role=teacher, same class_level)
      const { data: teachers } = await supabase
        .from('profiles').select('id').eq('role', 'teacher').eq('class_level', c.class_level)
      for (const t of teachers || []) {
        try {
          await supabase.from('teacher_alerts').insert({
            teacher_id: t.id,
            class_level: c.class_level,
            subject: c.subject,
            alert_type: 'red',
            alert_key: alertKey + `:${t.id}`,
            concept_slug: c.concept_slug,
            title: `Class intervention: ${c.concept_name}`,
            message: `${below50} of ${students_total} students scored below 50% on "${c.concept_name}". Class average ${Math.round(avg * 100)}%.`,
            action_label: 'Create remedial worksheet',
            action_type: 'create_test',
            action_payload: {
              subject: c.subject,
              classLevel: c.class_level,
              title: `Remedial: ${c.concept_name}`,
              questionCount: 10,
              difficulty: 'medium',
              concept_slug: c.concept_slug,
            },
            expires_at: expiry.toISOString(),
          })
          alertsWritten++
        } catch {}  // dedup constraint catches repeat inserts
      }
    }

    // Green alert: >80% of class above 0.70 (per-concept version; teacher sees at chapter level too)
    if (students_total > 0 && (above70 / students_total) > 0.80 && attempted >= Math.ceil(students_total * 0.5)) {
      const alertKey = `green:${c.concept_slug}:${now.toISOString().slice(0, 10)}`
      const { data: teachers } = await supabase
        .from('profiles').select('id').eq('role', 'teacher').eq('class_level', c.class_level)
      for (const t of teachers || []) {
        try {
          await supabase.from('teacher_alerts').insert({
            teacher_id: t.id,
            class_level: c.class_level,
            subject: c.subject,
            alert_type: 'green',
            alert_key: alertKey + `:${t.id}`,
            concept_slug: c.concept_slug,
            title: `Ready to move forward: ${c.concept_name}`,
            message: `${above70} of ${students_total} students have mastered "${c.concept_name}". Class is ready for the next chapter.`,
            action_label: 'Generate chapter test',
            action_type: 'generate_chapter_test',
            action_payload: {
              subject: c.subject,
              classLevel: c.class_level,
              title: `Chapter test: ${c.chapter_name}`,
              chapter_no: c.chapter_no,
              questionCount: 15,
              difficulty: 'medium',
            },
            expires_at: expiry.toISOString(),
          })
          alertsWritten++
        } catch {}
      }
    }
  }

  // Amber alerts: individual student risk
  // Rule 1: student inactive 5+ days AND has upcoming test within 7 days
  // Rule 2: student accuracy dropped >15pp in past week
  // For Phase 1: only Rule 1 (simpler; we don't have historical daily snapshots yet)
  const inactiveSince = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const testWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: inactiveStudents } = await supabase
    .from('profiles')
    .select('id, name, class_level, updated_at')
    .eq('role', 'student')
    .lt('updated_at', inactiveSince)

  if (inactiveStudents) {
    for (const s of inactiveStudents) {
      // Check if they have an upcoming test
      const { count: upcomingTests } = await supabase
        .from('test_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('class_level', s.class_level)
        .eq('active', true)
        .not('deadline', 'is', null)
        .lte('deadline', testWindow)
        .gte('deadline', now.toISOString())
      if (!upcomingTests || upcomingTests < 1) continue

      const daysInactive = Math.floor((Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      const alertKey = `amber:${s.id}:${now.toISOString().slice(0, 10)}`
      const { data: teachers } = await supabase
        .from('profiles').select('id').eq('role', 'teacher').eq('class_level', s.class_level)
      for (const t of teachers || []) {
        try {
          await supabase.from('teacher_alerts').insert({
            teacher_id: t.id,
            class_level: s.class_level,
            alert_type: 'amber',
            alert_key: alertKey + `:${t.id}`,
            student_id: s.id,
            title: `${s.name || 'Student'} at risk`,
            message: `${s.name || 'Student'} hasn't studied in ${daysInactive} days. Test coming up in this window.`,
            action_label: 'View student profile',
            action_type: 'view_student',
            action_payload: { student_id: s.id },
            expires_at: expiry.toISOString(),
          })
          alertsWritten++
        } catch {}
      }
    }
  }

  return alertsWritten
}

function nextMidnightIST(): Date {
  // IST = UTC+5:30. Get today's midnight IST in UTC terms.
  const now = new Date()
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const nextMidnightIST = new Date(istNow)
  nextMidnightIST.setUTCHours(24, 0, 0, 0)  // next UTC midnight in IST offset-adjusted space
  return new Date(nextMidnightIST.getTime() - 5.5 * 60 * 60 * 1000)
}
