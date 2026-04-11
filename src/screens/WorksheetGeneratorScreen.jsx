import { useState } from 'react'
import { mockAIResponses } from '../data/mockData'

const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'Fill in the Blank']
const SUBJECTS_BY_CLASS = {
  '10': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'],
  '11': ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English'],
  '12': ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English'],
  '9': ['Science', 'Mathematics', 'Social Science', 'English'],
  '8': ['Science', 'Mathematics', 'Social Science', 'English'],
}
const CHAPTERS_BY_SUBJECT = {
  Physics: ['Ch. 10 — Light: Reflection & Refraction', 'Ch. 11 — Human Eye', 'Ch. 12 — Electricity', 'Ch. 13 — Magnetic Effects'],
  Chemistry: ['Ch. 1 — Chemical Reactions', 'Ch. 2 — Acids, Bases & Salts', 'Ch. 3 — Metals & Non-metals', 'Ch. 4 — Carbon Compounds'],
  Mathematics: ['Ch. 1 — Real Numbers', 'Ch. 2 — Polynomials', 'Ch. 4 — Quadratic Equations', 'Ch. 5 — Arithmetic Progressions'],
  Science: ['Ch. 1 — Matter', 'Ch. 2 — Atoms & Molecules', 'Ch. 8 — Motion', 'Ch. 9 — Force & Laws'],
}

export default function WorksheetGeneratorScreen({ onNavigate }) {
  const [config, setConfig] = useState({
    class: '10', subject: 'Physics', chapter: '', questionTypes: ['MCQ', 'Short Answer'],
    difficulty: 'Balanced', totalQuestions: 15, cbseFormat: true,
  })
  const [phase, setPhase] = useState('config') // config | generating | preview
  const [progress, setProgress] = useState(0)

  const chapters = CHAPTERS_BY_SUBJECT[config.subject] || []

  const toggleType = (type) => {
    setConfig(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type],
    }))
  }

  const handleGenerate = async () => {
    if (!config.chapter) return
    setPhase('generating')
    setProgress(0)
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setProgress(i)
    }
    setPhase('preview')
  }

  if (phase === 'generating') return <GeneratingScreen progress={progress} />
  if (phase === 'preview') return (
    <WorksheetPreview config={config} onNavigate={onNavigate} onRegen={() => setPhase('config')} />
  )

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-brand-primary to-brand-mid px-4 pt-6 pb-6">
        <h1 className="text-white font-black text-2xl">Create Worksheet</h1>
        <p className="text-blue-200 text-sm mt-1">AI generates in seconds</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Class + Subject */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Class & Subject</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {['8','9','10','11','12'].map(cls => (
              <button
                key={cls}
                onClick={() => setConfig(prev => ({ ...prev, class: cls, chapter: '' }))}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  config.class === cls ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                Class {cls}
              </button>
            ))}
          </div>
          <select
            value={config.subject}
            onChange={e => setConfig(prev => ({ ...prev, subject: e.target.value, chapter: '' }))}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-brand-primary"
          >
            {(SUBJECTS_BY_CLASS[config.class] || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Chapter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Chapter</h3>
          <div className="space-y-2">
            {chapters.map(ch => (
              <button
                key={ch}
                onClick={() => setConfig(prev => ({ ...prev, chapter: ch }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  config.chapter === ch
                    ? 'bg-blue-50 border-brand-primary text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Question types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Question Types</h3>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                  config.questionTypes.includes(type)
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty + Count */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Settings</h3>

          <div className="mb-4">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">Difficulty Mix</label>
            <div className="flex gap-2">
              {['Easy Heavy', 'Balanced', 'Hard Heavy'].map(d => (
                <button
                  key={d}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: d }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    config.difficulty === d ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">
              Total Questions: <span className="text-blue-600">{config.totalQuestions}</span>
            </label>
            <input
              type="range" min={5} max={30} step={5}
              value={config.totalQuestions}
              onChange={e => setConfig(prev => ({ ...prev, totalQuestions: Number(e.target.value) }))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-700">CBSE Format</div>
              <div className="text-xs text-gray-400">Add section headers & marks</div>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, cbseFormat: !prev.cbseFormat }))}
              className={`w-12 h-6 rounded-full transition-colors ${config.cbseFormat ? 'bg-brand-primary' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${config.cbseFormat ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!config.chapter || config.questionTypes.length === 0}
          className={`w-full font-black py-4 rounded-xl text-base transition-all active:scale-95 ${
            config.chapter && config.questionTypes.length > 0
              ? 'bg-gradient-to-r from-brand-primary to-brand-mid text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✨ Generate Worksheet
        </button>
      </div>
    </div>
  )
}

function GeneratingScreen({ progress }) {
  const messages = [
    'Reading CBSE syllabus...',
    'Selecting relevant questions...',
    'Adjusting difficulty balance...',
    'Formatting answer key...',
    'Finalising worksheet...',
  ]
  const msgIndex = Math.min(Math.floor(progress / 20), messages.length - 1)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-6">
      <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-mid rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
        <span className="text-4xl">✨</span>
      </div>
      <div className="text-center">
        <h2 className="font-black text-gray-900 text-xl">Generating your worksheet...</h2>
        <p className="text-gray-500 text-sm mt-1">{messages[msgIndex]}</p>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-mid rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">{progress}%</p>
      </div>
    </div>
  )
}

function WorksheetPreview({ config, onNavigate, onRegen }) {
  const [tab, setTab] = useState('worksheet') // worksheet | answers
  const [copied, setCopied] = useState(false)
  const worksheet = mockAIResponses.worksheet.class10Physics

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-black text-gray-900 text-lg">Worksheet Ready ✅</h1>
            <p className="text-gray-400 text-xs mt-0.5">{config.subject} · {config.chapter.split('—')[0].trim()} · {config.totalQuestions} questions</p>
          </div>
          <button onClick={onRegen} className="text-xs text-blue-600 font-bold border border-blue-200 px-3 py-1.5 rounded-xl">
            Regenerate
          </button>
        </div>
        <div className="flex gap-2">
          {['worksheet', 'answers'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                tab === t ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'worksheet' ? '📄 Student Paper' : '✅ Answer Key'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {tab === 'worksheet' ? worksheet : worksheet + '\n\n---\n\n**ANSWER KEY**\n\nSection A:\n1. (b) 2 A\n2. (c) 18 Ω\n3. (c) Watt\n\nSection B:\n4. Ohm\'s Law states that V ∝ I (at constant temp). V = IR.\n5. R = V²/P = (220)²/100 = 484 Ω. I = P/V = 100/220 ≈ 0.45 A\n6. Parallel: same voltage across each, if one fails others work; series: if one fails all stop.'}
          </pre>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className={`py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
              copied ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </button>
          <button
            onClick={() => alert('PDF download simulated!')}
            className="py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-brand-primary to-brand-mid text-white shadow-md active:scale-95"
          >
            📥 Download PDF
          </button>
        </div>
        <button
          onClick={() => onNavigate('test-generator')}
          className="w-full mt-3 py-3 rounded-xl text-sm font-bold bg-brand-light text-brand-primary border border-brand-pale/30 hover:bg-brand-light transition-colors active:scale-95"
        >
          Add to Test →
        </button>
      </div>
    </div>
  )
}
