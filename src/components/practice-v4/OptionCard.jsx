// A/B/C/D option button. States:
//   idle | selected | correct (post-submit) | wrong (post-submit, student picked this) | revealed (post-submit, correct answer but student missed)
import Ico from '../home-v4/Ico'
import MathText from '../ui/MathText'

const LABELS = ['A', 'B', 'C', 'D']

export default function OptionCard({ idx, text, selected, submitted, isCorrect, isStudentChoice, onClick }) {
  let state = 'idle'
  if (!submitted && selected) state = 'selected'
  else if (submitted) {
    if (isCorrect) state = isStudentChoice ? 'correct-picked' : 'correct-revealed'
    else if (isStudentChoice) state = 'wrong-picked'
  }

  return (
    <button
      type="button"
      className={`practice-option state-${state}`}
      onClick={() => !submitted && onClick?.(idx)}
      disabled={submitted}>
      <span className="option-letter">{LABELS[idx]}</span>
      <span className="option-text"><MathText text={text} inlineOnly /></span>
      {state === 'selected' && <span className="option-badge your-pick">YOUR PICK</span>}
      {state === 'correct-picked' && <span className="option-badge correct"><Ico name="check" size={12} /> CORRECT</span>}
      {state === 'wrong-picked' && <span className="option-badge wrong"><Ico name="x" size={12} /> YOUR PICK</span>}
      {state === 'correct-revealed' && <span className="option-badge correct"><Ico name="check" size={12} /> ANSWER</span>}
    </button>
  )
}
