import { useState } from 'react'

const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'Fill in the Blank']

export default function TestGeneratorScreen({ onNavigate }) {
  const [config, setConfig] = useState({
    class: '10', subject: 'Physics', chapters: ['Ch. 12 — Electricity'],
    questionTypes: ['MCQ', 'Short Answer'], difficulty: 'Balanced',
    totalMarks: 40, timeLimit: 60, sections: true, negativeMark: false, randomize: false,
  })
  const [phase, setPhase] = useState('config')
  const [tab, setTab] = useState('paper')

  const handleGenerate = async () => {
    setPhase('generating')
    await new Promise(r => setTimeout(r, 2500))
    setPhase('preview')
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
          <span className="text-4xl">📋</span>
        </div>
        <div className="text-center">
          <h2 className="font-black text-gray-900 text-xl">Creating test paper...</h2>
          <p className="text-gray-500 text-sm mt-1">Balancing difficulty and marking scheme</p>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
        </div>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div className="pb-6 bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-black text-gray-900 text-lg">Test Paper Ready ✅</h1>
              <p className="text-gray-400 text-xs mt-0.5">Physics · Class 10 · {config.totalMarks} marks · {config.timeLimit} min</p>
            </div>
            <button onClick={() => setPhase('config')} className="text-xs text-purple-600 font-bold border border-purple-200 px-3 py-1.5 rounded-xl">Edit</button>
          </div>
          <div className="flex gap-2">
            {['paper', 'answers'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t === 'paper' ? '📄 Student Paper' : '✅ Answer Key'}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
            {tab === 'paper' ? `CLASS 10 — PHYSICS TEST
Chapter: Electricity | Time: ${config.timeLimit} min | Max Marks: ${config.totalMarks}

SECTION A — MCQ (1 mark each)

1. The SI unit of electric resistance is:
   (a) Volt  (b) Ampere  (c) Ohm  (d) Watt

2. Ohm's Law states:
   (a) V = I + R  (b) V = I × R  (c) V = I/R  (d) V = R/I

3. In a parallel circuit, the voltage across each branch is:
   (a) Different  (b) Zero  (c) Same  (d) Half

4. The formula for electric power is:
   (a) P = V/I  (b) P = V × I  (c) P = I/V  (d) P = R/V

5. Resistance of a wire depends on:
   (a) Colour  (b) Length and cross-sectional area  (c) Weight  (d) Temperature only

SECTION B — Short Answer (2 marks each)

6. Define electric current and state its SI unit.

7. State Ohm's Law and derive its mathematical expression.

8. Two resistors of 4 Ω and 6 Ω are connected in parallel across 12 V.
   Find: (a) equivalent resistance, (b) total current.

9. Why are household appliances connected in parallel rather than in series? Give two reasons.

10. Calculate the electrical energy consumed by a 100 W bulb in 5 hours.`
: `CLASS 10 — PHYSICS TEST
ANSWER KEY (Teacher Copy)

SECTION A:
1. (c) Ohm
2. (b) V = I × R
3. (c) Same
4. (b) P = V × I
5. (b) Length and cross-sectional area

SECTION B:
6. Electric current is the rate of flow of charge. I = Q/t. SI unit: Ampere (A).

7. Ohm's Law: V ∝ I (at constant temperature for ohmic conductors). V = IR where R is resistance.

8. (a) 1/R = 1/4 + 1/6 = 3/12 + 2/12 = 5/12. R = 2.4 Ω
   (b) I = V/R = 12/2.4 = 5 A

9. (i) Each appliance operates at the same voltage (ii) Failure of one doesn't affect others.

10. E = P × t = 100 W × 5 h = 500 Wh = 0.5 kWh`}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => alert('PDF simulated!')} className="py-3 rounded-2xl text-sm font-bold border-2 border-gray-200 bg-white text-gray-700 active:scale-95">
              📥 Student PDF
            </button>
            <button onClick={() => alert('Answer key PDF!')} className="py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-md active:scale-95">
              🔑 Answer Key
            </button>
          </div>
          <button onClick={() => alert('Share link copied!')} className="w-full mt-3 py-3 rounded-2xl text-sm font-bold bg-purple-50 text-purple-700 border border-purple-200 active:scale-95">
            🔗 Copy Shareable Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-4 pt-6 pb-6">
        <h1 className="text-white font-black text-2xl">Create Test</h1>
        <p className="text-purple-200 text-sm mt-1">Full CBSE-pattern test paper with answer key</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Class + Subject (compact) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Class</label>
              <select value={config.class} onChange={e => setConfig(p => ({...p, class: e.target.value}))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-400">
                {['8','9','10','11','12'].map(c => <option key={c}>Class {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Subject</label>
              <select value={config.subject} onChange={e => setConfig(p => ({...p, subject: e.target.value}))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-400">
                {['Physics','Chemistry','Mathematics','Biology','Computer Science'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Test settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h3 className="font-bold text-gray-700 text-sm">Test Settings</h3>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Total Marks: <span className="text-purple-600">{config.totalMarks}</span></label>
            <div className="flex gap-2">
              {[25, 40, 80, 100].map(m => (
                <button key={m} onClick={() => setConfig(p => ({...p, totalMarks: m}))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 ${config.totalMarks === m ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Time Limit: <span className="text-purple-600">{config.timeLimit} min</span></label>
            <div className="flex gap-2">
              {[30, 60, 90, 180].map(t => (
                <button key={t} onClick={() => setConfig(p => ({...p, timeLimit: t}))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${config.timeLimit === t ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                  {t}m
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {[
            { key: 'sections', label: 'Auto-create Sections (A/B/C)', sub: 'Based on question types' },
            { key: 'negativeMark', label: 'Negative Marking', sub: '-0.25 per wrong MCQ' },
            { key: 'randomize', label: 'Randomize Questions', sub: 'Different order each time' },
          ].map(toggle => (
            <div key={toggle.key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700">{toggle.label}</div>
                <div className="text-xs text-gray-400">{toggle.sub}</div>
              </div>
              <button
                onClick={() => setConfig(p => ({...p, [toggle.key]: !p[toggle.key]}))}
                className={`w-12 h-6 rounded-full transition-colors ${config[toggle.key] ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config[toggle.key] ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          className="w-full font-black py-4 rounded-2xl text-base bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          ✨ Generate Test Paper
        </button>
      </div>
    </div>
  )
}
