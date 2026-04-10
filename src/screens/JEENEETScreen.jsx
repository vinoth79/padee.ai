import { jeeNeetPreviewData, studentProfile } from '../data/mockData'

export default function JEENEETScreen({ onNavigate }) {
  const student = studentProfile
  const jee = jeeNeetPreviewData.jee
  const neet = jeeNeetPreviewData.neet
  const isUnlocked = student.level >= jee.unlockLevel

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black px-4 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.3),_transparent_60%)]" />
        <button onClick={() => onNavigate('home')} className="text-white/60 mb-4 block relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="relative">
          <div className="text-purple-400 text-xs font-bold tracking-widest uppercase mb-2">🚀 Advanced Tracks</div>
          <h1 className="text-white font-black text-3xl leading-tight">JEE / NEET<br />Foundation</h1>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            Take your CBSE mastery to the next level.<br />
            Build the conceptual depth that competitive exams demand.
          </p>
        </div>
      </div>

      {/* Unlock status */}
      {!isUnlocked && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <div className="font-bold text-amber-800 text-sm">Unlocks at Level 7 (Top Achiever)</div>
            <div className="text-amber-700 text-xs mt-0.5">You're at Level {student.level}. Keep earning XP!</div>
          </div>
          <button onClick={() => onNavigate('practice')} className="text-xs font-bold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-xl">
            Earn XP →
          </button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* JEE Card */}
        <TrackCard track={jee} unlocked={isUnlocked} onNavigate={onNavigate} />

        {/* NEET Card */}
        <TrackCard track={neet} unlocked={isUnlocked} onNavigate={onNavigate} />

        {/* What's different section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">How is this different from CBSE?</h2>
          <div className="space-y-3">
            {[
              { icon: '📊', title: 'Multi-correct MCQs', desc: 'JEE-pattern questions with partial marking rules' },
              { icon: '🎯', title: 'Application-heavy', desc: 'Go beyond formulas — test conceptual depth' },
              { icon: '⏱', title: 'Timed pressure', desc: 'Competitive exam pacing and time management' },
              { icon: '🔗', title: 'Cross-subject links', desc: 'How Maths shows up in Physics problems' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🎓</div>
          <h3 className="text-white font-black text-lg mb-1">Start your foundation now</h3>
          <p className="text-purple-300 text-sm mb-4">Students who start JEE prep in Class 10 score 30% higher on average.</p>
          <button
            onClick={() => onNavigate('practice')}
            className={`w-full font-black py-3 rounded-2xl text-sm transition-all active:scale-95 ${
              isUnlocked
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isUnlocked ? 'Start JEE Foundation →' : `Unlock at Level 7 (${student.nextLevelXP - student.xp} XP away)`}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrackCard({ track, unlocked, onNavigate }) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-md ${!unlocked ? 'opacity-70' : ''}`}>
      <div className={`bg-gradient-to-r ${track.color} px-4 py-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{track.icon}</span>
          <h3 className="text-white font-black text-lg">{track.title}</h3>
          {!unlocked && <span className="ml-auto text-xs bg-white/20 text-white/70 px-2 py-0.5 rounded-full">🔒 Locked</span>}
        </div>
        <p className="text-white/80 text-xs">{track.subtitle}</p>
        <p className="text-white/70 text-xs mt-1 leading-relaxed">{track.description}</p>
      </div>
      <div className="bg-white px-4 py-3">
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Sample Topics</div>
        <div className="flex flex-wrap gap-1.5">
          {track.topics.map((t, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                t.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
