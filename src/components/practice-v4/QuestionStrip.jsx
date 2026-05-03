// Progress strip — one tile per question, reflecting state.
// States: correct (green ✓), wrong (red ✗), skipped (grey —), current (ink), upcoming (empty).
import Ico from '../home-v4/Ico'

export default function QuestionStrip({ total, currentIdx, answers }) {
  const tiles = []
  for (let i = 0; i < total; i++) {
    let state = 'upcoming'
    if (i === currentIdx) state = 'current'
    else {
      const a = answers.find(x => x.questionIdx === i)
      if (a) {
        if (a.skipped) state = 'skipped'
        else if (a.correct) state = 'correct'
        else state = 'wrong'
      }
    }
    tiles.push({ i, state })
  }
  return (
    <div className="practice-strip" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemax={total}>
      {tiles.map(({ i, state }) => (
        <span key={i} className={`practice-tile state-${state}`}>
          {state === 'correct' && <Ico name="check" size={12} />}
          {state === 'wrong' && <Ico name="x" size={12} />}
          {state === 'skipped' && <span className="skip-dash">—</span>}
          {state === 'current' && <span className="tabular">{i + 1}</span>}
        </span>
      ))}
    </div>
  )
}
