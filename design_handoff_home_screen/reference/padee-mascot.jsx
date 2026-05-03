// Padee mascot — abstract friendly blob named "Pa"
// Props: size, mood ('happy'|'think'|'cheer'|'sleep'|'sparkle'), color
function Mascot({ size = 80, mood = 'happy', color = '#E85D3A', bg = null }) {
  const eyeY = mood === 'sleep' ? 46 : 44;
  const mouthPath = {
    happy:   'M 38 58 Q 50 68 62 58',
    think:   'M 40 60 Q 50 56 60 60',
    cheer:   'M 36 54 Q 50 72 64 54 Q 50 64 36 54 Z',
    sleep:   'M 40 60 Q 50 62 60 60',
    sparkle: 'M 38 58 Q 50 68 62 58',
  }[mood];
  const eye = (cx) => mood === 'sleep'
    ? <path d={`M ${cx-4} ${eyeY} Q ${cx} ${eyeY+3} ${cx+4} ${eyeY}`} stroke="#13131A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    : <circle cx={cx} cy={eyeY} r="3" fill="#13131A"/>;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {bg && <circle cx="50" cy="50" r="50" fill={bg}/>}
      {/* antenna */}
      <line x1="50" y1="18" x2="50" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="50" cy="6" r="4" fill="#FFB547"/>
      {/* body — rounded squircle blob */}
      <path d="M 50 18 C 78 18 86 36 86 56 C 86 78 72 88 50 88 C 28 88 14 78 14 56 C 14 36 22 18 50 18 Z" fill={color}/>
      {/* face highlight */}
      <ellipse cx="32" cy="32" rx="10" ry="6" fill="rgba(255,255,255,0.25)"/>
      {/* cheeks */}
      <circle cx="26" cy="58" r="5" fill="rgba(255,255,255,0.18)"/>
      <circle cx="74" cy="58" r="5" fill="rgba(255,255,255,0.18)"/>
      {/* eyes */}
      {eye(38)}
      {eye(62)}
      {/* mouth */}
      <path d={mouthPath} stroke="#13131A" strokeWidth="2.5" fill={mood === 'cheer' ? '#13131A' : 'none'} strokeLinecap="round" strokeLinejoin="round"/>
      {mood === 'sparkle' && (
        <>
          <path d="M 20 26 L 22 30 L 26 32 L 22 34 L 20 38 L 18 34 L 14 32 L 18 30 Z" fill="#FFB547"/>
          <path d="M 82 20 L 83 23 L 86 24 L 83 25 L 82 28 L 81 25 L 78 24 L 81 23 Z" fill="#FFB547"/>
        </>
      )}
    </svg>
  );
}
window.Mascot = Mascot;
