import { useState } from 'react'
import { liveClassMockResponses } from '../data/mockData'

const QUICK_ACTIONS = [
  { id: 'mcq', label: 'Generate 5 MCQs', icon: '❓', desc: 'Quick classroom quiz' },
  { id: 'explain', label: 'Explain Concept', icon: '💡', desc: 'For projecting to class' },
  { id: 'poll', label: 'Create a Poll', icon: '📊', desc: 'Student engagement check' },
  { id: 'summary', label: 'Summarize Class', icon: '📝', desc: 'End-of-lesson notes' },
]

export default function LiveClassScreen({ onNavigate }) {
  const [topic, setTopic] = useState("Ohm's Law")
  const [sessionActive, setSessionActive] = useState(false)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(null)

  const handleAction = async (actionId) => {
    if (!sessionActive) return
    setLoading(actionId)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(null)

    const responseMap = {
      mcq: { type: 'mcq', title: `5 MCQs on ${topic}`, content: liveClassMockResponses.mcqs[0].questions.join('\n\n') },
      explain: { type: 'explain', title: `Explanation: ${topic}`, content: liveClassMockResponses.explanation },
      poll: { type: 'poll', title: 'Quick Poll', content: liveClassMockResponses.poll },
      summary: { type: 'summary', title: "Today's Class Summary", content: liveClassMockResponses.summary },
    }

    setHistory(prev => [responseMap[actionId], ...prev])
  }

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className={`px-4 pt-6 pb-5 transition-all ${sessionActive ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${sessionActive ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`} />
          <h1 className="text-white font-black text-xl">Live Class Mode</h1>
          <div className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${sessionActive ? 'bg-green-400/30 text-green-200' : 'bg-white/20 text-white/70'}`}>
            {sessionActive ? '🟢 LIVE' : '⭕ Offline'}
          </div>
        </div>

        {!sessionActive ? (
          <div className="space-y-3">
            <div>
              <label className="text-white/70 text-xs font-medium mb-1.5 block">Today's Topic</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Ohm's Law"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/40 outline-none focus:border-white/40"
              />
            </div>
            <button
              onClick={() => setSessionActive(true)}
              className="w-full bg-green-400 text-green-900 font-black py-3 rounded-2xl text-sm hover:bg-green-300 transition-colors active:scale-95"
            >
              🎓 Start Live Session
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/70 text-xs">Topic</div>
              <div className="text-white font-bold text-sm">{topic}</div>
            </div>
            <button
              onClick={() => { setSessionActive(false); setHistory([]) }}
              className="text-xs bg-red-400/20 text-red-300 border border-red-400/40 font-bold px-3 py-2 rounded-xl"
            >
              End Session
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={!sessionActive || loading !== null}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                  !sessionActive
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : loading === action.id
                    ? 'bg-purple-100 border-purple-300 cursor-wait'
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md shadow-sm'
                }`}
              >
                <div className="text-2xl mb-2">
                  {loading === action.id ? (
                    <span className="inline-block w-7 h-7 border-2 border-purple-400 border-t-purple-700 rounded-full animate-spin" />
                  ) : action.icon}
                </div>
                <div className="font-bold text-gray-900 text-sm">{action.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        {sessionActive && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Custom Request</label>
            <CustomInput topic={topic} onResult={(result) => setHistory(prev => [result, ...prev])} />
          </div>
        )}

        {/* Session history */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Session Content</h2>
              <button
                onClick={() => alert('All content copied!')}
                className="text-xs text-purple-600 font-bold"
              >
                Copy All
              </button>
            </div>
            <div className="space-y-3">
              {history.map((item, i) => (
                <ContentCard key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        {!sessionActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-2">🎓</div>
            <div className="font-bold text-amber-800 text-sm">Start a live session to begin</div>
            <div className="text-amber-700 text-xs mt-1">Enter your topic and tap "Start Live Session" above</div>
          </div>
        )}
      </div>
    </div>
  )
}

function CustomInput({ topic, onResult }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    onResult({
      type: 'custom',
      title: text,
      content: `**AI Response for: "${text}"**\n\nHere are the key points about this topic in the context of ${topic}:\n\n1. The fundamental concept relates to the core principle being discussed.\n2. Students should understand the cause-effect relationship here.\n3. Common misconception: Many students confuse this with a related but different concept.\n4. CBSE exam tip: Use specific terminology and include units in numerical answers.\n\n*Generated for classroom use — verify with NCERT textbook.*`,
    })
    setText('')
  }

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Ask anything about today's topic..."
        className="flex-1 bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || loading}
        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
          text.trim() && !loading ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-400'
        }`}
      >
        {loading ? '...' : '→'}
      </button>
    </div>
  )
}

function ContentCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const icons = { mcq: '❓', explain: '💡', poll: '📊', summary: '📝', custom: '🤖' }
  const colors = { mcq: 'bg-blue-50 border-blue-200', explain: 'bg-purple-50 border-purple-200', poll: 'bg-orange-50 border-orange-200', summary: 'bg-green-50 border-green-200', custom: 'bg-gray-50 border-gray-200' }

  const preview = item.content.substring(0, 120) + (item.content.length > 120 ? '...' : '')

  return (
    <div className={`rounded-2xl border p-4 ${colors[item.type] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{icons[item.type] || '📄'}</span>
        <div className="flex-1">
          <div className="font-bold text-gray-900 text-sm">{item.title}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert('Copied!')} className="text-xs text-gray-500 font-semibold">Copy</button>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-purple-600 font-semibold">
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
        {expanded ? item.content : preview}
      </pre>
    </div>
  )
}
