// TabRow — Upcoming / Past / JEE-NEET pill tabs.
// Active tab = dark ink pill with white text. JEE/NEET tab is hidden unless
// student's active_track is 'jee' or 'neet' (Q6 default).
export default function TabRow({ active, onChange, showJeeNeet = false }) {
  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past',     label: 'Past' },
    ...(showJeeNeet ? [{ id: 'jeeneet', label: 'JEE / NEET' }] : []),
  ]
  return (
    <div className="tab-row">
      {tabs.map(t => (
        <button key={t.id}
          className={`tab-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange?.(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
