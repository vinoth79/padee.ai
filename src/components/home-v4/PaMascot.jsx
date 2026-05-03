// PaMascot — round, friendly orange blob. Upgraded to match reference fidelity:
// sparkles around the head when celebrating, polished eyes + blush + mouth.
// Moods: idle | thinking | speaking | celebrate
// `glow`: pulsing antenna (e.g. active streak)
// `syncWithSpeech`: when true, this mascot subscribes to global TTS state.
//   While speech is actively playing, the mood is forced to 'speaking' and
//   the mouth animates with a bob to mimic talking. Default false so brand
//   instances (top nav, landing) don't react to playback.
import { useSpeech } from '../../hooks/useSpeech'

export default function PaMascot({ size = 44, mood: propMood = 'idle', glow = false, syncWithSpeech = false }) {
  const speech = useSpeech()
  const isSpeechActive = !!(syncWithSpeech && speech.speaking)
  const mood = isSpeechActive ? 'speaking' : propMood
  const animClass = mood === 'celebrate' ? 'celebrate' : mood === 'thinking' ? '' : 'breathe'
  return (
    <svg
      className={`pa-mascot ${animClass} ${isSpeechActive ? 'is-speech-active' : ''}`}
      width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }}>
      {/* Sparkles (celebrate mode) */}
      {mood === 'celebrate' && (
        <g>
          <Spark x={16} y={16} r={5} />
          <Spark x={100} y={22} r={6} />
          <Spark x={20} y={86} r={4} />
          <Spark x={104} y={86} r={4} />
        </g>
      )}

      {/* Body */}
      <ellipse cx="60" cy="64" rx="44" ry="44" fill="#E85D3A" />
      {/* Belly highlight */}
      <ellipse cx="60" cy="78" rx="30" ry="22" fill="#FF8A63" opacity="0.55" />

      {/* Antenna */}
      <path d="M 56 18 Q 60 8 64 18" stroke="#B2381B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle className={`pa-antenna-ball ${glow ? 'glow' : ''}`} cx="64" cy="16" r="3.5" fill="#FFB547" />

      {/* Eyes */}
      {mood === 'idle' && (
        <>
          <circle cx="44" cy="58" r="5" fill="#13131A" />
          <circle cx="76" cy="58" r="5" fill="#13131A" />
          <circle cx="46" cy="56" r="1.5" fill="white" />
          <circle cx="78" cy="56" r="1.5" fill="white" />
        </>
      )}
      {mood === 'thinking' && (
        <>
          <path d="M 38 58 L 50 58" stroke="#13131A" strokeWidth="5" strokeLinecap="round" />
          <path d="M 70 58 L 82 58" stroke="#13131A" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {mood === 'speaking' && (
        <>
          <circle cx="44" cy="56" r="5.5" fill="#13131A" />
          <circle cx="76" cy="56" r="5.5" fill="#13131A" />
          <circle cx="46" cy="54" r="1.8" fill="white" />
          <circle cx="78" cy="54" r="1.8" fill="white" />
        </>
      )}
      {mood === 'celebrate' && (
        <>
          {/* Squinting happy eyes */}
          <path d="M 38 56 Q 44 50 50 56" stroke="#13131A" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M 70 56 Q 76 50 82 56" stroke="#13131A" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Cheek blush */}
      <circle cx="32" cy="72" r="6" fill="#FF9FA8" opacity="0.6" />
      <circle cx="88" cy="72" r="6" fill="#FF9FA8" opacity="0.6" />

      {/* Mouth */}
      {mood === 'speaking' ? (
        <ellipse className="pa-mouth-speaking" cx="60" cy="82" rx="8" ry="6" fill="#13131A" />
      ) : mood === 'celebrate' ? (
        <path d="M 48 80 Q 60 94 72 80" stroke="#13131A" strokeWidth="4" strokeLinecap="round" fill="#13131A" />
      ) : (
        <path d="M 50 82 Q 60 90 70 82" stroke="#13131A" strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
    </svg>
  )
}

function Spark({ x, y, r }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M 0 ${-r} L ${r * 0.3} ${-r * 0.3} L ${r} 0 L ${r * 0.3} ${r * 0.3} L 0 ${r} L ${-r * 0.3} ${r * 0.3} L ${-r} 0 L ${-r * 0.3} ${-r * 0.3} Z`}
        fill="#FFB547"
        opacity="0.9"
      />
    </g>
  )
}
