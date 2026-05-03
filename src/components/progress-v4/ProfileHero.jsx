// ProfileHero — dark hero: avatar + level/name/class + XP + streak.
export default function ProfileHero({
  initials = 'S',
  levelName = 'Beginner',
  level = 1,
  name = 'Student',
  classMeta = '',
  sinceMeta = '',
  totalXP = 0,
  xpToNext = 0,
  nextLevel,
  streakDays = 0,
}) {
  const metaParts = [classMeta, sinceMeta].filter(Boolean).join(' · ')
  return (
    <div className="profile-hero">
      <div className="avatar">{initials}</div>
      <div className="info">
        <div className="level-eyebrow">
          Level {level} · {levelName}
        </div>
        <div className="name">{name}</div>
        {metaParts && <div className="meta">{metaParts}</div>}
      </div>
      <div className="stats">
        <div className="stat-block">
          <div className="stat-eyebrow">Total XP</div>
          <div className="stat-value tabular">{totalXP.toLocaleString()}</div>
          {nextLevel && (
            <div className="stat-sub tabular">
              {xpToNext} to Lv {nextLevel}
            </div>
          )}
        </div>
        <div className="stat-block">
          <div className="stat-eyebrow">Streak</div>
          <div className="stat-value tabular">
            <span style={{ marginRight: 4 }}>🔥</span>{streakDays}
          </div>
          <div className="stat-sub">days</div>
        </div>
      </div>
    </div>
  )
}
