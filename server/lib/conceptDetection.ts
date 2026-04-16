// Concept detection helpers — used by practice/test/doubt endpoints to tag
// questions and doubts with a concept_slug from concept_catalog.
import { supabase } from './supabase.js'

export interface PublishedConcept {
  concept_slug: string
  concept_name: string
  subject: string
  class_level: number
  chapter_no: number
  chapter_name: string
  brief_summary: string | null
  exam_weight_percent: number
}

// Fetch all published concepts for a subject+class (cached in-memory, 5 min TTL)
const cache = new Map<string, { data: PublishedConcept[]; expires: number }>()
const TTL_MS = 5 * 60 * 1000

export async function getPublishedConceptsForSubject(subject: string, classLevel: number): Promise<PublishedConcept[]> {
  const key = `${subject}:${classLevel}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data

  const { data } = await supabase
    .from('concept_catalog')
    .select('concept_slug, concept_name, subject, class_level, chapter_no, chapter_name, brief_summary, exam_weight_percent')
    .eq('subject', subject)
    .eq('class_level', classLevel)
    .eq('status', 'published')
    .order('syllabus_order', { ascending: true })

  const result = (data || []) as PublishedConcept[]
  cache.set(key, { data: result, expires: Date.now() + TTL_MS })
  return result
}

export function clearConceptCache() {
  cache.clear()
}

// Score how well a concept matches a keyword set (doubt text OR rag chunk text).
// Simple overlap scoring — good enough for Phase 1. Returns 0-1.
function conceptMatchScore(concept: PublishedConcept, text: string): number {
  const t = text.toLowerCase()
  const name = concept.concept_name.toLowerCase()
  const summary = (concept.brief_summary || '').toLowerCase()

  // Full phrase match on name wins big
  if (name.length > 4 && t.includes(name)) return 1.0

  // Tokenise concept name into meaningful words (≥4 chars, not stopwords)
  const stopwords = new Set(['and', 'the', 'with', 'from', 'that', 'this', 'what', 'which', 'their', 'these', 'those', 'into', 'between', 'through'])
  const tokens = name.split(/[\s\-]+/).filter(w => w.length >= 4 && !stopwords.has(w))
  if (tokens.length === 0) return 0

  let hits = 0
  for (const tok of tokens) if (t.includes(tok)) hits++
  const ratio = hits / tokens.length

  // Boost if chapter_name mentioned
  const chapterBoost = t.includes(concept.chapter_name.toLowerCase()) ? 0.2 : 0

  // Slight boost for summary word overlap
  let summaryHits = 0
  if (summary) {
    const sTokens = summary.split(/\s+/).filter(w => w.length >= 5)
    for (const tok of sTokens) if (t.includes(tok)) summaryHits++
  }
  const summaryBoost = summaryHits > 2 ? 0.1 : 0

  return Math.min(1, ratio + chapterBoost + summaryBoost)
}

// Given a question/doubt text + subject/class, find the best-matching published concept.
// Returns null if no concept scores above threshold.
export async function detectConcept(params: {
  text: string
  subject: string
  classLevel: number
  chapterName?: string   // optional: if we know the chapter (e.g. from RAG), boost that chapter's concepts
  minScore?: number
}): Promise<PublishedConcept | null> {
  const { text, subject, classLevel, chapterName, minScore = 0.4 } = params
  const concepts = await getPublishedConceptsForSubject(subject, classLevel)
  if (concepts.length === 0) return null

  let best: PublishedConcept | null = null
  let bestScore = 0
  for (const c of concepts) {
    let score = conceptMatchScore(c, text)
    if (chapterName && c.chapter_name.toLowerCase() === chapterName.toLowerCase()) {
      score += 0.3  // strong boost when chapter is known from RAG
    }
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  if (bestScore < minScore) return null
  return best
}

// Validate a concept_slug was returned by an LLM — ensures it exists and is published.
export async function validateConceptSlug(slug: string | null | undefined): Promise<PublishedConcept | null> {
  if (!slug) return null
  const { data } = await supabase
    .from('concept_catalog')
    .select('concept_slug, concept_name, subject, class_level, chapter_no, chapter_name, brief_summary, exam_weight_percent')
    .eq('concept_slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return (data as PublishedConcept) || null
}
