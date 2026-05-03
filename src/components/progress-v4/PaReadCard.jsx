// PaReadCard — amber whiteboard-style card with Pa's heuristic summary.
// Copy derived client-side from available signals; render as HTML so highlights
// (<b>) can be bolded inline.
import PaMascot from '../home-v4/PaMascot'

export default function PaReadCard({ html }) {
  return (
    <div className="pa-read-card">
      <div className="mascot"><PaMascot size={40} mood="speaking" /></div>
      <div className="body">
        <div className="eyebrow">Pa's read on you</div>
        <div className="text" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
