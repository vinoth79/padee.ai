// Amber "Stuck?" hint box with mascot, always visible.
import PaMascot from '../home-v4/PaMascot'
import ListenButton from '../ui/ListenButton'
import MathText from '../ui/MathText'

export default function HintBox({ hint }) {
  if (!hint) return null
  return (
    <div className="practice-hint" role="note">
      <div className="hint-mascot"><PaMascot size={32} mood="idle" syncWithSpeech /></div>
      <p className="hint-copy">
        <b>Stuck? </b><MathText text={hint} inlineOnly />
      </p>
      <ListenButton text={hint} title="Read hint aloud" />
    </div>
  )
}
