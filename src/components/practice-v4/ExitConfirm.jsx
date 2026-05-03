// "Discard progress?" modal shown when student clicks Exit mid-quiz.
export default function ExitConfirm({ open, onStay, onLeave }) {
  if (!open) return null
  return (
    <div className="practice-modal-backdrop" onClick={onStay}>
      <div className="practice-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Leave practice?</h3>
        <p className="modal-sub">Your progress in this round won't be saved. You'll lose any XP earned so far.</p>
        <div className="modal-actions">
          <button className="pd-btn ghost" onClick={onStay}>Keep going</button>
          <button className="pd-btn primary" onClick={onLeave}>Leave anyway</button>
        </div>
      </div>
    </div>
  )
}
