import { HomeIcon, AskAIIcon, LearnIcon, ProgressIcon } from './icons/NavIcons'

// Mobile only: 4-tab bottom navigation
export default function BottomNav({ active, onNavigate }) {
  const tabs = [
    { id: 'home',   label: 'Home',   icon: HomeIcon },
    { id: 'ask-ai', label: 'Ask AI', icon: AskAIIcon },
    { id: 'learn',  label: 'Learn',  icon: LearnIcon },
    { id: 'me',     label: 'Me',     icon: ProgressIcon },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 flex justify-around items-center px-1 pt-1 pb-5 z-30">
      {tabs.map(tab => {
        const isActive = active === (tab.id === 'me' ? 'progress' : tab.id)
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-95"
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-primary/10' : ''}`}>
              <Icon active={isActive} />
            </div>
            <span className={`text-[10px] font-medium tracking-wide transition-colors ${
              isActive ? 'text-brand-primary font-semibold' : 'text-brand-slate'
            }`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
