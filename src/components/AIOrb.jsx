// The AI's visual identity — a glowing orb that reflects its state
export default function AIOrb({ size = 'md', state = 'idle', className = '' }) {
  const sizes = {
    xs:  'w-7 h-7',
    sm:  'w-10 h-10',
    md:  'w-16 h-16',
    lg:  'w-24 h-24',
    xl:  'w-32 h-32',
  }
  const animations = {
    idle:      'animate-orb-idle',
    thinking:  'animate-pulse-gentle',
    active:    'animate-pulse-slow',
    celebrating: 'animate-bounce-slow',
  }
  return (
    <div
      className={`
        ${sizes[size] || sizes.md}
        ${animations[state] || animations.idle}
        ai-orb rounded-full flex items-center justify-center flex-shrink-0
        ${className}
      `}
    >
      <div className="w-1/3 h-1/3 bg-white/30 rounded-full" />
    </div>
  )
}
