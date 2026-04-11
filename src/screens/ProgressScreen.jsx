import { useState } from 'react'
import { studentProfile, progressData, badges, levels, subjects } from '../data/mockData'
import ScoreRing from '../components/ScoreRing'
import AIOrb from '../components/AIOrb'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// Simulated last 7 days activity
const LAST_7 = [true, true, true, false, true, true, true]

const SUBJECT_MASTERY = [
  { name: 'Physics',     icon: '⚡', percent: 72, from: 'from-blue-500',    to: 'to-brand-mid' },
  { name: 'Chemistry',   icon: '🧪', percent: 55, from: 'from-orange-400',  to: 'to-amber-600' },
  { name: 'Maths',       icon: '📐', percent: 88, from: 'from-brand-primary',  to: 'to-brand-mid' },
  { name: 'Biology',     icon: '🌿', percent: 64, from: 'from-emerald-400', to: 'to-green-600' },
  { name: 'CS',          icon: '💻', percent: 48, from: 'from-cyan-400',    to: 'to-sky-600' },
]

export default function ProgressScreen({ onNavigate }) {
  const student = studentProfile
  const xpInLevel = student.xp - 1600
  const xpToNext = 2400 - 1600
  const xpPercent = Math.round((xpInLevel / xpToNext) * 100)
  const [showAll, setShowAll] = useState(false)

  const earnedBadges = badges.filter(b => b.unlocked)
  const lockedBadges = badges.filter(b => !b.unlocked)

  return (
    <div className="min-h-screen bg-brand-bg pb-40 md:pb-8">

      {/* Identity card — clean white, no gradient */}
      <div className="px-4 sm:px-6 pt-10 md:pt-6 pb-2">
        <div className="bg-white rounded-xl p-4 shadow-card" style={{ border: '0.5px solid #E5E7EB' }}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold" style={{ background: '#CCFBF1', border: '1.5px solid #5EEAD4', color: '#0F766E' }}>
              {student.avatar}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight" style={{ color: '#1F2937' }}>{student.name}</h1>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Class {student.class} · {student.school.split(',')[0]}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#CCFBF1', color: '#0F766E' }}>Lv {student.level} — {student.levelName}</span>
              </div>
            </div>
            <div className="relative flex-shrink-0">
              <svg className="-rotate-90" width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="#CCFBF1" strokeWidth="5" />
                <circle cx="26" cy="26" r="22" fill="none" stroke="#0D9488" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - xpPercent / 100)}`}
                  className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold" style={{ color: '#0F766E' }}>{student.xp}</span>
                <span className="text-[8px]" style={{ color: '#9CA3AF' }}>XP</span>
              </div>
            </div>
          </div>

          <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: '#F9FAFB' }}>
            <div className="h-full rounded-full" style={{ background: '#0D9488', width: `${xpPercent}%` }} />
          </div>
          <p className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>{xpToNext - xpInLevel} XP to Level {student.level + 1}</p>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* 7-day streak flame row */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-brand-navy text-sm">Streak</h2>
              <p className="text-xs text-brand-slate">Keep it going!</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl animate-flame-sway">🔥</span>
              <div>
                <span className="text-2xl font-black text-brand-navy">{student.streak}</span>
                <span className="text-xs text-brand-slate ml-1">days</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1">
            {WEEK_DAYS.map((day, i) => {
              const active = LAST_7[i]
              const isToday = i === 6
              return (
                <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className={`text-xl ${active ? '' : 'opacity-20'}`}>🔥</span>
                  <div className={`w-full h-1 rounded-full ${active ? 'bg-orange-400' : 'bg-gray-200'}`} />
                  <span className={`text-[10px] font-bold ${isToday ? 'text-brand-primary' : 'text-brand-slate'}`}>{day}</span>
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-brand-slate mt-3 text-center">Best streak: {student.longestStreak} days</p>
        </div>

        {/* Subject mastery rings */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <h2 className="font-black text-brand-navy text-sm mb-3">Subject Mastery</h2>
          <div className="flex items-start justify-between">
            {SUBJECT_MASTERY.map(sub => (
              <div key={sub.name} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <ScoreRing percent={sub.percent} size={52} strokeWidth={5} />
                  <span className="absolute inset-0 flex items-center justify-center text-lg">{sub.icon}</span>
                </div>
                <span className="text-[10px] font-bold text-brand-navy">{sub.name}</span>
                <span className="text-[10px] text-brand-slate">{sub.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '48', label: 'Questions\nthis week', icon: '⚡', color: 'text-amber-500' },
            { value: '14', label: 'Days\nactive',         icon: '📅', color: 'text-brand-primary' },
            { value: '3',  label: 'Tests\ntaken',         icon: '📋', color: 'text-brand-secondary' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-3 shadow-card text-center">
              <span className={`text-xl ${stat.color}`}>{stat.icon}</span>
              <p className="font-black text-brand-navy text-lg mt-1">{stat.value}</p>
              <p className="text-[10px] text-brand-slate leading-tight whitespace-pre">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Badge trophy shelf */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-brand-navy text-sm">Badges</h2>
              <p className="text-xs text-brand-slate">{earnedBadges.length}/{badges.length} earned</p>
            </div>
          </div>

          {/* Horizontal scroll of earned badges */}
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {earnedBadges.map(badge => (
              <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16">
                <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                  {badge.icon}
                </div>
                <span className="text-[10px] font-bold text-brand-navy text-center leading-tight">{badge.name}</span>
              </div>
            ))}
            {/* Locked preview */}
            {lockedBadges.slice(0, 2).map(badge => (
              <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 opacity-40">
                <div className="w-14 h-14 bg-gray-100 border-2 border-gray-200 rounded-xl flex items-center justify-center text-2xl grayscale">
                  {badge.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-400 text-center leading-tight">🔒 {badge.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI weekly summary */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <AIOrb size="xs" state="idle" />
            <h2 className="font-black text-brand-navy text-sm">AI Weekly Summary</h2>
          </div>
          <p className="text-sm text-brand-navy leading-relaxed mb-3">
            Strong week, Arjun! Maths is your best subject right now at 88%. Your Physics gap is in Power Formulas — 10 more questions there would push you past 80%.
          </p>
          <button
            onClick={() => onNavigate('practice')}
            className="w-full bg-brand-primary/10 text-brand-primary font-bold text-sm py-2.5 rounded-xl active:scale-95 transition-all"
          >
            Fix Physics gap →
          </button>
        </div>

        {/* Level roadmap */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <h2 className="font-black text-brand-navy text-sm mb-3">Level Roadmap</h2>
          <div className="space-y-2">
            {levels.map(lvl => {
              const isCurrent = lvl.level === student.level
              const isCompleted = lvl.level < student.level
              return (
                <div key={lvl.level} className={`flex items-center gap-3 px-3 py-3 rounded-xl ${
                  isCurrent ? 'bg-gradient-to-r from-brand-primary to-brand-mid' :
                  isCompleted ? 'bg-emerald-50' : 'bg-gray-50'
                }`}>
                  <span className="text-xl w-8 text-center">{lvl.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-800' : 'text-brand-slate'}`}>
                      Level {lvl.level} — {lvl.name}
                    </p>
                    <p className={`text-xs ${isCurrent ? 'text-brand-primary200' : 'text-brand-slate'}`}>{lvl.xpRequired.toLocaleString()} XP</p>
                  </div>
                  {isCompleted && <span className="text-brand-success">✓</span>}
                  {isCurrent && <span className="text-amber-300 text-xs font-black">YOU</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Teacher / Parent links */}
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('teacher-dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl py-3 shadow-card text-xs font-semibold text-brand-slate"
          >
            <span>🎓</span><span>Teacher Mode</span>
          </button>
          <button
            onClick={() => onNavigate('parent-summary')}
            className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl py-3 shadow-card text-xs font-semibold text-brand-slate"
          >
            <span>👪</span><span>Parent Report</span>
          </button>
        </div>

      </div>
    </div>
  )
}
