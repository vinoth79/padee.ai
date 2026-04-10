import { useState } from 'react'
import { classPerformanceData } from '../data/mockData'
import ProgressBar from '../components/ui/ProgressBar'

export default function StudentPerformanceScreen({ onNavigate }) {
  const [selectedClass, setSelectedClass] = useState('Class 10A')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const classData = classPerformanceData.find(c => c.class === selectedClass) || classPerformanceData[0]

  const statusColors = {
    'Excellent': 'bg-emerald-100 text-emerald-700',
    'Good': 'bg-blue-100 text-blue-700',
    'Needs attention': 'bg-amber-100 text-amber-700',
    'At risk': 'bg-red-100 text-red-700',
  }

  if (selectedStudent) {
    return <StudentDetail student={selectedStudent} classData={classData} onBack={() => setSelectedStudent(null)} />
  }

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-4 pt-6 pb-6">
        <h1 className="text-white font-black text-2xl">Student Performance</h1>
        <p className="text-indigo-200 text-sm mt-1">Track your class at a glance</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Class selector */}
        <div className="flex gap-2">
          {['Class 10A', 'Class 10B', 'Class 11A'].map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                selectedClass === cls ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Class overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">{selectedClass} Overview</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { value: classData.students, label: 'Students', icon: '👥', color: 'text-indigo-600' },
              { value: `${classData.avgScore}%`, label: 'Avg Score', icon: '📊', color: classData.avgScore >= 75 ? 'text-emerald-600' : 'text-amber-600' },
              { value: `${classData.participation}%`, label: 'Participation', icon: '✅', color: 'text-blue-600' },
            ].map((s, i) => (
              <div key={i} className="text-center bg-gray-50 rounded-xl py-3">
                <div className="text-xl">{s.icon}</div>
                <div className={`font-black text-lg ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <div className="text-xs font-bold text-orange-700 mb-1.5">🎯 Top Weak Areas (Whole Class)</div>
            <div className="flex flex-wrap gap-1.5">
              {classData.weakChapters.map((ch, i) => (
                <span key={i} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{ch}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">Student List</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tap any student for detailed view</p>
          </div>
          <div className="divide-y divide-gray-50">
            {classData.students_list.map((student, i) => (
              <button
                key={i}
                onClick={() => setSelectedStudent(student)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{student.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    🔥 {student.streak}d streak · Weak: {student.weak}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[student.status]}`}>
                    {student.status}
                  </div>
                  <div className={`text-sm font-black ${
                    student.score >= 75 ? 'text-emerald-600' : student.score >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>{student.score}%</div>
                  <span className="text-gray-300 text-sm">›</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Download report */}
        <button onClick={() => alert('Report downloaded!')} className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl text-sm hover:border-gray-300 transition-colors active:scale-95">
          📥 Download Class Report
        </button>
      </div>
    </div>
  )
}

function StudentDetail({ student, classData, onBack }) {
  const doubtsAsked = ['Ohm\'s Law formula', 'Series vs parallel current', 'Power dissipation formula']
  const testHistory = [
    { test: 'Chapter 12 Test', score: student.score, date: '3 days ago' },
    { test: 'Mid-term Unit Test', score: student.score - 8, date: '2 weeks ago' },
    { test: 'Chapter 10 Quiz', score: student.score + 5, date: '3 weeks ago' },
  ]

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-4 pt-6 pb-6">
        <button onClick={onBack} className="text-white/70 mb-4 block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg border-2 border-white/40">
            {student.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-white font-black text-xl">{student.name}</h1>
            <div className="text-indigo-200 text-sm">{classData.class} · {classData.lastTest}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/80 text-xs">🔥 {student.streak}-day streak</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Score summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">Test History</h2>
          <div className="space-y-3">
            {testHistory.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{t.test}</div>
                  <div className="text-xs text-gray-400">{t.date}</div>
                </div>
                <div className="w-24">
                  <ProgressBar value={t.score} max={100} color={t.score >= 75 ? 'green' : t.score >= 50 ? 'amber' : 'orange'} height="h-1.5" />
                </div>
                <div className={`text-sm font-black w-10 text-right ${t.score >= 75 ? 'text-emerald-600' : t.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {t.score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <span className="font-black text-gray-900 text-sm">AI Insight</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {student.name.split(' ')[0]} struggles with <strong>application questions</strong> in Electricity — specifically power formula numericals. Conceptual understanding is good (correct on definition/formula questions) but gets stuck on multi-step calculations. Suggest: targeted practice on <em>P=VI, P=I²R, P=V²/R</em> applications.
          </p>
        </div>

        {/* Top doubts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3">Recent Doubts Asked</h2>
          <div className="space-y-2">
            {doubtsAsked.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-purple-400">💬</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weak area */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="font-bold text-orange-800 text-sm mb-2">⚠️ Needs Attention</div>
          <p className="text-xs text-orange-700">{student.weak} — hasn't been practiced in 5 days. Consider assigning a targeted worksheet.</p>
          <button className="mt-2 text-xs font-bold text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
            Assign Practice Set →
          </button>
        </div>
      </div>
    </div>
  )
}
