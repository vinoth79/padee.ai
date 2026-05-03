// PaRecommendsCard — AI-recommended test surface (Type 2 of 3 in the v4
// Tests list). Shown when the backend's `aiRecommendation` is non-null.
// Picks the student's weakest attempted subject + auto-tunes difficulty
// and question count. One click → real timed test (mode: 'ai_recommended').
import PaMascot from '../home-v4/PaMascot'
import Ico from '../home-v4/Ico'

const SUBJECT_GLYPH = {
  Physics: '⚡', Chemistry: '🧪', Biology: '🌿', Mathematics: '📐',
  Maths: '📐', Science: '✏', English: '📖',
  'Social Studies': '🌍', 'Social Science': '🌍', Hindi: 'क',
  'Computer Science': '💻',
}

const DIFFICULTY_TONE = {
  easy:   { label: 'Easy',   color: '#36D399' },
  medium: { label: 'Medium', color: '#FFB547' },
  hard:   { label: 'Hard',   color: '#FF4D8B' },
}

export default function PaRecommendsCard({ rec, onStart }) {
  if (!rec) return null
  const tone = DIFFICULTY_TONE[rec.difficulty] || DIFFICULTY_TONE.medium
  const glyph = SUBJECT_GLYPH[rec.subject] || '📖'
  return (
    <section className="pa-recommends-card">
      <div className="rec-mascot"><PaMascot size={48} mood="speaking" /></div>
      <div className="rec-body">
        <div className="rec-eyebrow">PA RECOMMENDS</div>
        <div className="rec-title">
          <span className="rec-glyph">{glyph}</span>
          <span>{rec.subject} · {rec.questionCount} questions</span>
          <span className="rec-diff" style={{ background: `${tone.color}22`, color: tone.color }}>
            {tone.label}
          </span>
        </div>
        <p className="rec-reason">{rec.reason}</p>
      </div>
      <button className="rec-cta" onClick={() => onStart(rec)}>
        Start <Ico name="arrow" size={14} color="currentColor" />
      </button>
    </section>
  )
}
