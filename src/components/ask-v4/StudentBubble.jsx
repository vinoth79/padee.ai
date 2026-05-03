// StudentBubble — right-aligned dark message from the student.
export default function StudentBubble({ text, imageDataUrl }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div className="student-bubble">
        {imageDataUrl && (
          <img src={imageDataUrl} alt="uploaded" style={{ maxHeight: 220 }} />
        )}
        {text && <div>{text}</div>}
      </div>
    </div>
  )
}
