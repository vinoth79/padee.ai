// Ico — inline SVG icon library matching the reference prototype.
// Stroke 1.8, rounded caps/joins, 18px default. Home-v4 scoped.

const PATHS = {
  home:     <path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10z" />,
  ask:      <path d="M21 12a8 8 0 1 1-3-6.2L21 4v5h-5" />,
  learn:    <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5z" />,
  tests:    <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  progress: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>,
  clock:    <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  sparkle:  <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  heart:    <path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .8-3 .8-4 0z" />,
  arrow:    <><line x1="4" y1="12" x2="20" y2="12" /><polyline points="14 6 20 12 14 18" /></>,
  chevronR: <polyline points="9 6 15 12 9 18" />,
  search:   <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>,
  play:     <polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none" />,
  flag:     <><path d="M4 3v18" /><path d="M4 4h12l-2 4 2 4H4" /></>,
  flame:    <path d="M12 2s-4 4-4 8a4 4 0 0 0 4 4 4 4 0 0 0 4-4c0-1.5-1-3-1-3s3 3 3 6a6 6 0 1 1-12 0c0-6 6-11 6-11z" />,
  trophy:   <><path d="M6 4h12v4a6 6 0 1 1-12 0V4z" /><path d="M8 20h8" /><path d="M10 20v-3h4v3" /><path d="M4 6h2v4H4a2 2 0 0 1-2-2V6h2" /><path d="M18 6h2v2a2 2 0 0 1-2 2h-2V6h2" /></>,
  check:    <polyline points="4 12 10 18 20 6" />,
  x:        <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  bulb:     <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10c1 1 1 2 1 4h6c0-2 0-3 1-4a6 6 0 0 0-4-10z" /></>,
}

export default function Ico({ name, size = 18, color = 'currentColor', stroke = 1.8, ...rest }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      className="ico"
      {...rest}>
      {d}
    </svg>
  )
}
