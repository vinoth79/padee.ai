// v2: 3-tab navigation — Today | Learn | Me
export default function BottomNav({ active, onNavigate }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: TodayIcon },
    { id: 'learn', label: 'Learn', icon: LearnIcon },
    { id: 'me',    label: 'Me',    icon: MeIcon },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 flex justify-around items-center px-2 pt-1.5 pb-5 z-30 max-w-sm mx-auto">
      {tabs.map(tab => {
        const isActive = active === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex flex-col items-center gap-0.5 px-8 py-1.5 rounded-2xl transition-all active:scale-95"
          >
            <div className={`p-2 rounded-2xl transition-all duration-200 ${isActive ? 'bg-brand-primary/10' : ''}`}>
              <Icon active={isActive} />
            </div>
            <span className={`text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-brand-primary' : 'text-brand-slate'}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TodayIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={active ? '#7C3AED' : 'none'}
        stroke={active ? '#7C3AED' : '#94a3b8'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function LearnIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={active ? '#7C3AED' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        fill={active ? 'rgba(124,58,237,0.12)' : 'none'}
        stroke={active ? '#7C3AED' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
function MeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4"
        fill={active ? 'rgba(124,58,237,0.12)' : 'none'}
        stroke={active ? '#7C3AED' : '#94a3b8'} strokeWidth="1.8"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={active ? '#7C3AED' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
