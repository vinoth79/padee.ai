import { Hono } from 'hono'
import { supabase, getUserFromToken } from '../lib/supabase.js'
import { logLLMCall } from '../lib/llmLog.js'
import { getAppConfig } from './admin.js'
import { detectConcept, validateConceptSlug } from '../lib/conceptDetection.js'
import { recomputeForStudent } from '../cron/recompute-recommendations.js'
import Groq from 'groq-sdk'
import OpenAI from 'openai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const test = new Hono()

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

async function generateTestQuestions(params: {
  subject: string
  classLevel: number
  count: number
  difficulty: 'easy' | 'medium' | 'hard'
  userId: string
}): Promise<any[]> {
  const { subject, classLevel, count, difficulty, userId } = params

  const systemPrompt = `You are a CBSE Class ${classLevel} ${subject} teacher creating a ${difficulty} difficulty test.
Generate ${count} multiple-choice questions covering the key concepts from the NCERT syllabus.

STRICT JSON output format ONLY -- no markdown, no preamble, no explanation outside the JSON.
Schema:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Brief reason why the correct answer is right",
      "topic": "Short topic/chapter name"
    }
  ]
}

CRITICAL QUALITY RULES:
1. Exactly 4 options per question, exactly ONE correct answer (correctIndex 0-3).
2. Options MUST be mutually exclusive -- no two should both be correct or partially correct.
3. Distractors must be plausible but clearly wrong to someone who understands the concept.
4. ${difficulty === 'easy' ? 'Easy: test direct recall of definitions, formulas, basic concepts.' : ''}
   ${difficulty === 'medium' ? 'Medium: test application of concepts to simple problems.' : ''}
   ${difficulty === 'hard' ? 'Hard: test deeper reasoning, multi-step problems, edge cases, comparison of scenarios.' : ''}
5. Cover DIFFERENT topics across the ${count} questions -- do not repeat the same concept.
6. Use CBSE terminology exactly as in the NCERT textbook.
7. Question under 50 words. Options under 15 words each. Explanation under 40 words.
8. Randomise correctIndex across questions (do not always put the answer at index 0).
9. No LaTeX syntax. Use Unicode for symbols (θ, Ω, °, ×, ÷, π, etc.).`

  const userPrompt = `Create ${count} ${difficulty}-difficulty MCQs for a CBSE Class ${classLevel} ${subject} test. Cover different topics/chapters.`

  const t0 = Date.now()
  const model = process.env.LLM_PRACTICE_GEN?.replace('groq/', '') || 'llama-3.3-70b-versatile'

  // Use Groq → OpenAI fallback chain so test generation is resilient to rate limits
  const { completeWithFallback } = await import('../lib/llmFallback.js')
  const { content: raw, modelUsed, fallbackFired } = await completeWithFallback({
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt,
    primaryModel: model,
    maxTokens: 2500,
    temperature: 0.5,
    jsonMode: true,
  })

  logLLMCall({
    timestamp: new Date().toISOString(),
    endpoint: 'test_generate',
    userId,
    model: modelUsed,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    response: raw,
    latencyMs: Date.now() - t0,
    metadata: { subject, classLevel, count, difficulty, fallbackFired },
  }).catch(() => {})

  const parsed = JSON.parse(raw)
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Invalid LLM output')
  }
  const valid = parsed.questions.filter((q: any) =>
    q.question && Array.isArray(q.options) && q.options.length === 4
    && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
  )
  if (valid.length === 0) throw new Error('LLM produced no valid questions')
  return valid
}

async function updateStreak(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: streak } = await supabase
      .from('student_streaks').select('*').eq('student_id', userId).single()
    if (!streak) return
    if (streak.last_active_date === today) return
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    let newStreak: number
    if (streak.last_active_date === yesterdayStr) newStreak = (streak.current_streak || 0) + 1
    else if (!streak.last_active_date) newStreak = 1
    else newStreak = 1
    await supabase.from('student_streaks').update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak || 0),
      last_active_date: today,
      updated_at: new Date().toISOString(),
    }).eq('student_id', userId)
  } catch {}
}

// ─────────────────────────────────────────────────────────
// STUDENT: list available + completed tests
// ─────────────────────────────────────────────────────────
test.get('/list', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  // Profile (for class_level + selected subjects)
  const { data: profile } = await supabase
    .from('profiles').select('class_level').eq('id', u.id).single()
  const classLevel = profile?.class_level || 10

  const { data: subjectRows } = await supabase
    .from('student_subjects').select('subject_code').eq('student_id', u.id)
  const selectedSubjects = (subjectRows || []).map((s: any) => s.subject_code)

  // Teacher-assigned tests for this class
  const { data: assignments } = await supabase
    .from('test_assignments')
    .select('id, title, subject, question_count, difficulty, seconds_per_question, deadline, teacher_id, created_at')
    .eq('class_level', classLevel)
    .eq('active', true)
    .order('created_at', { ascending: false })

  // Student's completed tests (last 10)
  const { data: completed } = await supabase
    .from('test_sessions')
    .select('id, title, subject, score, total_marks, correct_count, difficulty, source, assignment_id, time_taken_seconds, completed_at, created_at')
    .eq('student_id', u.id)
    .eq('completed', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const completedAssignmentIds = new Set(
    (completed || []).filter((t: any) => t.assignment_id).map((t: any) => t.assignment_id)
  )

  const pendingAssignments = (assignments || []).map((a: any) => ({
    ...a,
    completed: completedAssignmentIds.has(a.id),
  }))

  // AI recommendation: pick weakest subject
  const { data: mastery } = await supabase
    .from('subject_mastery')
    .select('subject, accuracy_percent, total_questions')
    .eq('student_id', u.id)

  let aiRecommendation: any = null
  if (selectedSubjects.length > 0) {
    const masteryMap = new Map((mastery || []).map((m: any) => [m.subject, m]))
    // Find weakest subject the student has attempted, else first unattempted one
    const attempted = (mastery || [])
      .filter((m: any) => selectedSubjects.includes(m.subject))
      .sort((a: any, b: any) => a.accuracy_percent - b.accuracy_percent)

    let recSubject = attempted[0]?.subject
    let reason = ''
    if (attempted[0]) {
      reason = `Your ${attempted[0].subject} accuracy is ${attempted[0].accuracy_percent}%. Let's strengthen it.`
    } else {
      // No mastery data — pick first selected subject
      recSubject = selectedSubjects[0]
      reason = `Start with a quick ${recSubject} test to see where you stand.`
    }
    const recDifficulty: 'easy' | 'medium' | 'hard' =
      attempted[0]?.accuracy_percent < 50 ? 'easy'
      : attempted[0]?.accuracy_percent < 75 ? 'medium'
      : 'hard'

    aiRecommendation = {
      subject: recSubject,
      questionCount: 10,
      difficulty: recDifficulty,
      reason,
    }
  }

  return c.json({
    classLevel,
    selectedSubjects,
    aiRecommendation,
    assignments: pendingAssignments,
    completedTests: completed || [],
  })
})

// ─────────────────────────────────────────────────────────
// STUDENT: start a test — returns questions + test metadata
//   body: { mode: 'self'|'ai_recommended'|'teacher', subject?, classLevel?, questionCount?, difficulty?, assignmentId? }
// ─────────────────────────────────────────────────────────
test.post('/start', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const mode = body.mode || 'self'
  const config = await getAppConfig()
  const testCfg = config.test || {}
  const secondsPerQuestion = testCfg.secondsPerQuestion || 60

  try {
    if (mode === 'teacher') {
      const assignmentId = body.assignmentId
      if (!assignmentId) return c.json({ error: 'assignmentId required' }, 400)
      const { data: assignment, error } = await supabase
        .from('test_assignments').select('*').eq('id', assignmentId).single()
      if (error || !assignment) return c.json({ error: 'Assignment not found' }, 404)

      return c.json({
        mode: 'teacher',
        assignmentId: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        classLevel: assignment.class_level,
        difficulty: assignment.difficulty,
        questions: assignment.questions,
        secondsPerQuestion: assignment.seconds_per_question || secondsPerQuestion,
        totalSeconds: (assignment.questions?.length || 0) * (assignment.seconds_per_question || secondsPerQuestion),
      })
    }

    // Self-pick or AI-recommended — generate questions on the fly
    const subject = body.subject || 'Physics'
    const classLevel = body.classLevel || 10
    const questionCount = Math.min(body.questionCount || 10, 20)
    const difficulty = body.difficulty || 'medium'

    const questions = await generateTestQuestions({
      subject, classLevel, count: questionCount, difficulty, userId: u.id,
    })

    return c.json({
      mode,
      title: `${subject} Test (${difficulty})`,
      subject,
      classLevel,
      difficulty,
      questions,
      secondsPerQuestion,
      totalSeconds: questions.length * secondsPerQuestion,
    })
  } catch (err: any) {
    console.error('[Test] start error:', err)
    return c.json({ error: err.message || 'Failed to start test' }, 500)
  }
})

// ─────────────────────────────────────────────────────────
// STUDENT: complete a test — save, award XP, generate AI insights
// ─────────────────────────────────────────────────────────
test.post('/complete', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const {
    mode, subject, classLevel, difficulty, title,
    questions, answers, // answers: [{ questionIdx, selectedIdx, correct }]
    timeTakenSeconds, assignmentId,
  } = body

  if (!subject || !questions || !answers) return c.json({ error: 'Missing fields' }, 400)

  const correctCount = answers.filter((a: any) => a.correct).length
  const totalQuestions = questions.length
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  // Merge answers into questions for persistence
  const questionsWithAnswers = questions.map((q: any, i: number) => {
    const a = answers.find((x: any) => x.questionIdx === i)
    return {
      ...q,
      studentAnswer: a?.selectedIdx ?? null,
      correct: a?.correct ?? false,
    }
  })

  // Generate AI insights (fast, single call)
  let aiInsights: any = {}
  try {
    const wrongQuestions = questionsWithAnswers
      .filter((q: any) => !q.correct)
      .map((q: any) => `- ${q.question} (topic: ${q.topic || 'unknown'})`)
      .slice(0, 8)
      .join('\n')

    if (wrongQuestions.length > 0) {
      const prompt = `A CBSE Class ${classLevel} student took a ${subject} test and scored ${accuracy}%.
They got these questions WRONG:
${wrongQuestions}

Write a short encouraging analysis for the student (under 80 words):
- 1-2 sentence assessment
- 2-3 specific topics they should revise
- One concrete next-step suggestion

Plain text only, no markdown headers. Warm, direct, brief.`

      // Use fallback chain for AI insights too (non-critical but nice to have resilience)
      const { completeWithFallback } = await import('../lib/llmFallback.js')
      const { content } = await completeWithFallback({
        messages: [{ role: 'user', content: prompt }],
        primaryModel: process.env.LLM_PRACTICE_GEN?.replace('groq/', '') || 'llama-3.3-70b-versatile',
        maxTokens: 200,
        temperature: 0.6,
      })
      aiInsights = {
        summary: content.trim() || '',
        weakTopics: [...new Set(questionsWithAnswers.filter((q: any) => !q.correct).map((q: any) => q.topic).filter(Boolean))],
      }
    } else {
      aiInsights = { summary: `Outstanding! You got all ${totalQuestions} questions right. Ready to try a harder test?`, weakTopics: [] }
    }
  } catch (err) {
    console.warn('[Test] AI insights generation failed:', err)
  }

  // Save test session
  const testTitle = title || `${subject} Test`
  const { data: session } = await supabase.from('test_sessions').insert({
    student_id: u.id,
    title: testTitle,
    subject,
    class_level: classLevel || 10,
    total_marks: totalQuestions,
    score: correctCount,
    correct_count: correctCount,
    difficulty: difficulty || null,
    source: mode === 'teacher' ? 'teacher' : mode === 'ai_recommended' ? 'ai_recommended' : 'self',
    assignment_id: assignmentId || null,
    time_limit_minutes: null,
    time_taken_seconds: timeTakenSeconds || 0,
    questions: questionsWithAnswers,
    ai_insights: aiInsights,
    completed: true,
    completed_at: new Date().toISOString(),
  }).select('id').single()

  // Award XP
  const config = await getAppConfig()
  const baseXp = config.test?.baseXp || config.xpRewards?.testCompletion || 50
  const bonusThreshold = config.test?.bonusXpThreshold || 80
  const bonusXp = config.test?.bonusXp || 20
  const xpAwarded = baseXp + (accuracy >= bonusThreshold ? bonusXp : 0)

  await supabase.from('student_xp').insert({
    student_id: u.id,
    amount: xpAwarded,
    source: 'test',
    metadata: { session_id: session?.id, subject, accuracy, correctCount, totalQuestions, mode },
  })

  // Update streak
  updateStreak(u.id).catch(() => {})

  // Update subject_mastery (running average)
  const { data: existing } = await supabase
    .from('subject_mastery')
    .select('*').eq('student_id', u.id).eq('subject', subject).single()

  if (existing) {
    const newTotal = existing.total_questions + totalQuestions
    const newCorrect = existing.correct_answers + correctCount
    await supabase.from('subject_mastery').update({
      accuracy_percent: Math.round((newCorrect / newTotal) * 100),
      total_questions: newTotal,
      correct_answers: newCorrect,
      last_updated: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('subject_mastery').insert({
      student_id: u.id,
      subject,
      accuracy_percent: accuracy,
      total_questions: totalQuestions,
      correct_answers: correctCount,
    })
  }

  // Update concept_mastery per question
  try {
    for (const q of questionsWithAnswers as any[]) {
      let slug: string | null = q.concept_slug || null
      if (slug) {
        const valid = await validateConceptSlug(slug)
        if (!valid) slug = null
      }
      if (!slug) {
        const detected = await detectConcept({
          text: q.question || '',
          subject,
          classLevel: classLevel || 10,
        })
        if (detected) slug = detected.concept_slug
      }
      if (slug) {
        await supabase.rpc('update_concept_mastery', {
          p_student_id: u.id,
          p_concept_slug: slug,
          p_correct: !!q.correct,
        })
      }
    }
  } catch (err) {
    console.warn('[test/complete] concept_mastery update failed (non-fatal):', err)
  }

  // Trigger mid-session recomputation
  recomputeForStudent(u.id).catch(e => console.warn('[test/complete] recompute failed:', e))

  return c.json({
    ok: true,
    sessionId: session?.id,
    accuracy,
    correctCount,
    totalQuestions,
    xpAwarded,
    bonusAwarded: accuracy >= bonusThreshold,
    aiInsights,
    questions: questionsWithAnswers,
  })
})

// ─────────────────────────────────────────────────────────
// STUDENT: fetch a completed test session (for review)
// ─────────────────────────────────────────────────────────
test.get('/session/:id', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const { data, error } = await supabase
    .from('test_sessions').select('*').eq('id', id).eq('student_id', u.id).single()
  if (error || !data) return c.json({ error: 'Not found' }, 404)
  return c.json(data)
})

// ─────────────────────────────────────────────────────────
// TEACHER: create assignment (pre-generates questions)
// ─────────────────────────────────────────────────────────
test.post('/assign', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  // Verify role is teacher
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', u.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return c.json({ error: 'Only teachers can assign tests' }, 403)
  }

  const body = await c.req.json()
  const {
    title, subject, classLevel, questionCount = 10,
    difficulty = 'medium', deadline, questions: preGeneratedQuestions,
  } = body

  if (!title || !subject || !classLevel) {
    return c.json({ error: 'title, subject, classLevel required' }, 400)
  }

  try {
    // Use pre-generated questions if supplied (for regen flow), else generate
    const questions = preGeneratedQuestions && preGeneratedQuestions.length > 0
      ? preGeneratedQuestions
      : await generateTestQuestions({
          subject, classLevel, count: questionCount, difficulty, userId: u.id,
        })

    const config = await getAppConfig()
    const secondsPerQuestion = config.test?.secondsPerQuestion || 60

    const { data, error } = await supabase.from('test_assignments').insert({
      teacher_id: u.id,
      title,
      subject,
      class_level: classLevel,
      question_count: questions.length,
      difficulty,
      seconds_per_question: secondsPerQuestion,
      questions,
      deadline: deadline || null,
      active: true,
    }).select('*').single()

    if (error) throw error
    return c.json({ ok: true, assignment: data })
  } catch (err: any) {
    console.error('[Test] assign error:', err)
    return c.json({ error: err.message || 'Failed to create assignment' }, 500)
  }
})

// ─────────────────────────────────────────────────────────
// TEACHER: preview questions (generate without saving)
// ─────────────────────────────────────────────────────────
test.post('/assign/preview', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', u.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return c.json({ error: 'Only teachers can preview tests' }, 403)
  }

  const { subject, classLevel, questionCount = 10, difficulty = 'medium' } = await c.req.json()
  try {
    const questions = await generateTestQuestions({
      subject, classLevel, count: questionCount, difficulty, userId: u.id,
    })
    return c.json({ questions })
  } catch (err: any) {
    return c.json({ error: err.message || 'Preview failed' }, 500)
  }
})

// ─────────────────────────────────────────────────────────
// TEACHER: list own assignments + completion stats
// ─────────────────────────────────────────────────────────
test.get('/assignments', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const { data: assignments } = await supabase
    .from('test_assignments')
    .select('*')
    .eq('teacher_id', u.id)
    .order('created_at', { ascending: false })

  if (!assignments || assignments.length === 0) return c.json({ assignments: [] })

  // Fetch submission counts per assignment
  const ids = assignments.map((a: any) => a.id)
  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('assignment_id, score, total_marks')
    .in('assignment_id', ids)

  const statsByAssignment: Record<string, { submissions: number; avgScore: number }> = {}
  for (const id of ids) statsByAssignment[id] = { submissions: 0, avgScore: 0 }
  if (sessions) {
    const grouped: Record<string, number[]> = {}
    for (const s of sessions) {
      if (!s.assignment_id) continue
      if (!grouped[s.assignment_id]) grouped[s.assignment_id] = []
      const pct = s.total_marks > 0 ? (s.score / s.total_marks) * 100 : 0
      grouped[s.assignment_id].push(pct)
    }
    for (const [id, pcts] of Object.entries(grouped)) {
      statsByAssignment[id] = {
        submissions: pcts.length,
        avgScore: Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length),
      }
    }
  }

  return c.json({
    assignments: assignments.map((a: any) => ({
      ...a,
      stats: statsByAssignment[a.id] || { submissions: 0, avgScore: 0 },
    })),
  })
})

// ─────────────────────────────────────────────────────────
// TEACHER: deactivate an assignment
// ─────────────────────────────────────────────────────────
test.post('/assignments/:id/deactivate', async (c) => {
  const u = await getUserFromToken(c.req.header('Authorization'))
  if (!u) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const { error } = await supabase
    .from('test_assignments')
    .update({ active: false })
    .eq('id', id)
    .eq('teacher_id', u.id)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default test
