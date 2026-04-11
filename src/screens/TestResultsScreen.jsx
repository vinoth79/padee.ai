import { useState, useEffect } from 'react'
import { mockTestResult, testQuestions } from '../data/mockData'
import ScoreRing from '../components/ui/ScoreRing'
import ProgressBar from '../components/ui/ProgressBar'
import Confetti from '../components/Confetti'
import XPToast from '../components/ui/XPToast'

export default function TestResultsScreen({ onNavigate }) {
  const result = mockTestResult
  const [showXP, setShowXP] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setShowXP(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const getQuestionText = (id) => testQuestions.find(q => q.id === id)?.question || ''

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <Confetti active={result.percentage >= 80} />
      <XPToast xp={result.xpEarned} message="Test completed!" visible={showXP} onDone={() => setShowXP(false)} />

      {/* Score hero */}
      <div className="bg-gradient-to-br from-brand-dark via-brand-primary to-brand-dark px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => onNavigate('home')} className="text-white/70">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="text-white/80 text-sm font-medium">{result.testName}</div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="text-white/80 font-bold text-sm tracking-wide">✨ Test Complete!</div>

          <div className="relative">
            <ScoreRing percent={result.percentage} size={120} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{result.percentage}%</span>
              <span className="text-white/70 text-xs font-medium">{result.score}/{result.total}</span>
            </div>
          </div>

          <div className="flex gap-4 text-center">
            <div>
              <div className="text-white font-black text-lg">{result.score}/{result.total}</div>
              <div className="text-white/60 text-xs">Score</div>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <div className="text-white font-black text-lg">{result.timeTaken}</div>
              <div className="text-white/60 text-xs">Time taken</div>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <div className={`font-black text-lg ${result.improvement >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.improvement >= 0 ? '+' : ''}{result.improvement}%
              </div>
              <div className="text-white/60 text-xs">vs last time</div>
            </div>
          </div>

          <div className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-bold px-4 py-1.5 rounded-full">
            ⚡ +{result.xpEarned} XP earned!
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Section breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="font-black text-gray-900 text-sm">Section Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-bold text-gray-500 px-4 py-2">Section</th>
                  <th className="text-center text-xs font-bold text-gray-500 px-4 py-2">Score</th>
                  <th className="text-center text-xs font-bold text-gray-500 px-4 py-2">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {result.sectionBreakdown.map((row, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.section}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">{row.score}/{row.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        row.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        row.accuracy >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{row.accuracy}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-brand-light to-brand-light border border-brand-pale/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-mid rounded-xl flex items-center justify-center">
              <span>🤖</span>
            </div>
            <span className="font-black text-gray-900 text-sm">AI Analysis</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-emerald-600 mb-1.5">💪 You're strong on:</div>
              <div className="flex flex-wrap gap-1.5">
                {result.aiInsights.strongTopics.map((t, i) => (
                  <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-orange-500 mb-1.5">🎯 Needs work on:</div>
              <div className="flex flex-wrap gap-1.5">
                {result.aiInsights.weakTopics.map((t, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-3">
              <div className="text-xs font-bold text-brand-primary mb-1">🚀 Recommended next step:</div>
              <div className="text-xs text-gray-700">{result.aiInsights.recommendation}</div>
              <button
                onClick={() => onNavigate('practice')}
                className="mt-2 text-xs font-bold text-purple-600 hover:text-brand-primary"
              >
                Start Recommended Practice →
              </button>
            </div>
          </div>
        </div>

        {/* Question review */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">Question Review</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tap any question to see explanation</p>
          </div>
          <div className="divide-y divide-gray-50">
            {result.questionResults.map((qr, i) => (
              <div key={qr.id}>
                <button
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">{qr.correct ? '✅' : '❌'}</span>
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium text-gray-700 leading-snug line-clamp-1">
                      Q{i + 1}. {getQuestionText(qr.id)}
                    </div>
                  </div>
                  <span className={`text-gray-400 text-sm transition-transform ${expandedQ === i ? 'rotate-90' : ''}`}>›</span>
                </button>
                {expandedQ === i && !qr.correct && (
                  <div className="px-4 pb-3 bg-red-50 animate-slide-up">
                    <div className="text-xs text-red-700 font-medium mb-1">
                      Your answer: Option {['A','B','C','D'][qr.yourAnswer]}
                    </div>
                    <div className="text-xs text-emerald-700 font-medium mb-2">
                      Correct answer: Option {['A','B','C','D'][qr.correctAnswer]}
                    </div>
                    <button
                      onClick={() => onNavigate('doubt')}
                      className="text-xs font-bold text-purple-600"
                    >
                      💬 Ask AI to explain this →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('test')}
            className="bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:border-gray-300 active:scale-95"
          >
            🔄 Reattempt
          </button>
          <button
            onClick={() => onNavigate('practice')}
            className="bg-gradient-to-r from-brand-primary to-brand-mid text-white font-bold py-3 rounded-xl text-sm shadow-md active:scale-95"
          >
            ⚡ Practice Weak Areas
          </button>
        </div>
      </div>
    </div>
  )
}
