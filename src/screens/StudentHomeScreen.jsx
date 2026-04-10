import { useState } from 'react'
import { studentProfile } from '../data/mockData'
import AIOrb from '../components/AIOrb'

// The AI's daily message — changes based on behavior context
const AI_MESSAGES = [
  {
    headline: 'Power Formulas need work.',
    body: "You've got 5 quick questions ready. Takes about 4 minutes. Let's fix this gap now.",
    cta: "Let's do it →",
    screen: 'practice',
    tag: '⚡ Physics · Ch.12',
  },
  {
    headline: 'You studied Electricity yesterday.',
    body: "Want a quick 5-question check to see what stuck? Takes 3 minutes.",
    cta: 'Quick check →',
    screen: 'practice',
    tag: '📋 Follow-up practice',
  },
  {
    headline: 'Ask me anything right now.',
    body: "No doubts yet today. Type a question — anything from class, your textbook, or your homework.",
    cta: 'Ask a doubt →',
    screen: 'doubt',
    tag: '💬 Ask mode',
  },
]

export default function StudentHomeScreen({ onNavigate }) {
  const student = studentProfile
  const [aiMsgIndex] = useState(0)
  const msg = AI_MESSAGES[aiMsgIndex]
  const xpInLevel = student.xp - 1600
  const xpToNextLevel = 2400 - 1600
  const hasIncomplete = true // simulated

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg pb-36 md:pb-8">
      {/* ── Status Strip ── single line, glanceable */}
      <div className="px-5 pt-12 md:pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Streak flame */}
            <div className="flex items-center gap-1.5">
              <span className="text-xl animate-flame-sway">🔥</span>
              <span className="text-sm font-black text-brand-navy">{student.streak}</span>
              <span className="text-xs text-brand-slate font-medium">days</span>
            </div>
            <div className="w-px h-3.5 bg-gray-300" />
            {/* XP */}
            <div className="flex items-center gap-1">
              <span className="text-amber-500 text-sm">⚡</span>
              <span className="text-sm font-black text-brand-navy">{student.xp.toLocaleString()}</span>
              <span className="text-xs text-brand-slate font-medium">XP</span>
            </div>
            <div className="w-px h-3.5 bg-gray-300" />
            {/* Level */}
            <span className="text-xs font-bold text-brand-primary">Lv {student.level} — {student.levelName}</span>
          </div>

          {/* Avatar */}
          <button onClick={() => onNavigate('me')} className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-violet-800 flex items-center justify-center text-white text-xs font-black border-2 border-white shadow-sm">
            {student.avatar}
          </button>
        </div>

        {/* XP progress bar — thin, below status */}
        <div className="mt-2.5 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-violet-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.round((xpInLevel / xpToNextLevel) * 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-brand-slate mt-1">{xpToNextLevel - xpInLevel} XP to Level {student.level + 1}</p>
      </div>

      {/* ── Hero: AI Recommendation Card ── the dominant element */}
      <div className="px-4 mb-5">
        <div className="bg-gradient-to-br from-brand-primary via-violet-600 to-brand-dark rounded-3xl p-5 shadow-action relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="relative">
            {/* AI tag */}
            <div className="flex items-center gap-2 mb-3">
              <AIOrb size="xs" state="idle" />
              <span className="text-white/70 text-xs font-semibold">Your AI tutor says:</span>
              <span className="ml-auto text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{msg.tag}</span>
            </div>

            <h2 className="text-white font-black text-xl leading-snug mb-2">{msg.headline}</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">{msg.body}</p>

            <button
              onClick={() => onNavigate(msg.screen)}
              className="w-full bg-white text-brand-primary font-black py-3 rounded-2xl text-sm hover:bg-violet-50 transition-colors active:scale-95 shadow-sm"
            >
              {msg.cta}
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── 3 round buttons */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-around">
          {[
            { icon: '💬', label: 'Ask',       screen: 'doubt',    bg: 'bg-violet-100', text: 'text-brand-primary' },
            { icon: '⚡', label: 'Practice',   screen: 'practice', bg: 'bg-amber-50',   text: 'text-amber-600' },
            { icon: '🎯', label: 'Challenge',  screen: 'challenge',bg: 'bg-teal-50',    text: 'text-teal-600' },
          ].map(action => (
            <button
              key={action.screen}
              onClick={() => onNavigate(action.screen)}
              className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
            >
              <div className={`w-14 h-14 ${action.bg} rounded-2xl flex items-center justify-center text-2xl shadow-card hover:shadow-card-hover transition-shadow`}>
                {action.icon}
              </div>
              <span className={`text-xs font-bold ${action.text}`}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Today's Progress ── single compact line */}
      <div className="px-5 mb-4">
        <button
          onClick={() => onNavigate('me')}
          className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card"
        >
          <div className="flex items-center gap-3 text-xs text-brand-slate font-medium">
            <span>📅 Today:</span>
            <span className="text-brand-navy font-bold">3 doubts</span>
            <span>·</span>
            <span className="text-brand-navy font-bold">10 questions</span>
            <span>·</span>
            <span className="text-brand-navy font-bold">1 test</span>
          </div>
          <span className="text-brand-primary text-xs font-bold">See all →</span>
        </button>
      </div>

      {/* ── Continue Card ── only if there's an incomplete session */}
      {hasIncomplete && (
        <div className="px-4 mb-4">
          <button
            onClick={() => onNavigate('practice')}
            className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-card hover:shadow-card-hover transition-shadow active:scale-98"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">⚡</div>
            <div className="flex-1 text-left">
              <p className="text-xs text-brand-slate font-medium">Continue where you left off</p>
              <p className="text-sm font-bold text-brand-navy">Series vs Parallel Circuits</p>
            </div>
            <span className="text-brand-primary font-bold text-lg">›</span>
          </button>
        </div>
      )}

      {/* ── Teacher mode link ── subtle, at bottom */}
      <div className="px-5 mt-auto pt-2">
        <button
          onClick={() => onNavigate('teacher-dashboard')}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-brand-slate hover:text-brand-primary transition-colors"
        >
          <span>🎓</span>
          <span>Switch to Teacher Mode</span>
        </button>
      </div>
    </div>
  )
}
