// SubjectPills — horizontal pill tabs for subject switching.
// Active pill is vermillion; inactive show a coloured dot + subject name.
const SUBJECT_DOT = {
  'Science':          '#E85D3A',
  'Physics':          '#4C7CFF',
  'Chemistry':        '#E85D3A',
  'Biology':          '#36D399',
  'Mathematics':      '#9B5DE5',
  'Maths':            '#9B5DE5',
  'English':          '#36D399',
  'Hindi':            '#FF4D8B',
  'Social Science':   '#FFB547',
  'Social':           '#FFB547',
  'Computer Science': '#2BD3F5',
}

export default function SubjectPills({ subjects = [], active, onChange }) {
  if (!subjects.length) return null
  return (
    <div className="subj-pills">
      {subjects.map(s => {
        const name = typeof s === 'string' ? s : s.name
        const color = SUBJECT_DOT[name] || '#8A8A95'
        const isActive = name === active
        return (
          <button key={name} className={`subj-pill ${isActive ? 'active' : ''}`}
            onClick={() => !isActive && onChange?.(name)}>
            <span className="dot" style={{ background: color }} />
            <span>{name}</span>
          </button>
        )
      })}
    </div>
  )
}
