// SelfPickTestCard — student-generated test (Type 3 of 3 in the v4 Tests
// list). Pick a subject from your enrolled list, pick a length (5/10/15),
// pick a difficulty (easy/medium/hard) → real timed test (mode: 'self').
import { useState } from 'react'
import Ico from '../home-v4/Ico'

const SUBJECT_GLYPH = {
  Physics: '⚡', Chemistry: '🧪', Biology: '🌿', Mathematics: '📐',
  Maths: '📐', Science: '✏', English: '📖',
  'Social Studies': '🌍', 'Social Science': '🌍', Hindi: 'क',
  'Computer Science': '💻', Sanskrit: 'ॐ', '2nd Language': '💬',
  Economics: '📊', 'Business Studies': '💼', Accounts: '📋',
}

const LENGTHS = [5, 10, 15]
const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   dot: '#36D399' },
  { id: 'medium', label: 'Medium', dot: '#FFB547' },
  { id: 'hard',   label: 'Hard',   dot: '#FF4D8B' },
]

export default function SelfPickTestCard({ subjects = [], onStart }) {
  const [subject, setSubject] = useState(null)
  const [length, setLength] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')

  const canStart = !!subject && subjects.length > 0
  const estMinutes = length

  function handleStart() {
    if (!canStart) return
    onStart({ subject, questionCount: length, difficulty })
  }

  return (
    <section className="self-pick-card">
      <header className="self-pick-head">
        <span className="self-pick-icon">🎯</span>
        <div>
          <div className="self-pick-eyebrow">MAKE YOUR OWN</div>
          <h3 className="self-pick-title">Custom test</h3>
        </div>
      </header>

      {/* Subjects */}
      <div className="self-pick-section">
        <span className="self-pick-label">Subject</span>
        {subjects.length === 0 ? (
          <p className="self-pick-empty">Finish onboarding to pick subjects.</p>
        ) : (
          <div className="self-pick-chips">
            {subjects.map(s => (
              <button key={s}
                className={`self-pick-chip ${subject === s ? 'is-active' : ''}`}
                onClick={() => setSubject(s)}>
                <span className="self-pick-chip-glyph">{SUBJECT_GLYPH[s] || '📖'}</span>
                <span className="self-pick-chip-name">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Length */}
      <div className="self-pick-section">
        <span className="self-pick-label">Length</span>
        <div className="self-pick-pills">
          {LENGTHS.map(n => (
            <button key={n}
              className={`self-pick-pill ${length === n ? 'is-active' : ''}`}
              onClick={() => setLength(n)}>
              {n} Qs
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="self-pick-section">
        <span className="self-pick-label">Difficulty</span>
        <div className="self-pick-pills">
          {DIFFICULTIES.map(d => (
            <button key={d.id}
              className={`self-pick-pill ${difficulty === d.id ? 'is-active' : ''}`}
              onClick={() => setDifficulty(d.id)}>
              <span className="diff-dot" style={{ background: d.dot }} />
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="self-pick-est">⏱ ~{estMinutes} min · 60s per question</p>

      <button className="self-pick-cta" disabled={!canStart} onClick={handleStart}>
        {canStart
          ? <>Start test <Ico name="arrow" size={14} color="currentColor" /></>
          : 'Pick a subject to begin'}
      </button>
    </section>
  )
}
