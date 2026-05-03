// StreakAtRiskBanner — amber strip shown only when today's XP < daily goal
// AND the student has an active streak to protect.
export default function StreakAtRiskBanner({
  xpRemaining = 0,
  streakDays = 0,
  onAct,
}) {
  if (xpRemaining <= 0) return null
  const questionsNeeded = Math.max(1, Math.ceil(xpRemaining / 10))  // ~10 XP per doubt/question
  const streakText = streakDays >= 2
    ? ` to keep your <b>${streakDays}-day streak</b> alive`
    : ''

  return (
    <div className="streak-risk" onClick={onAct} role="button" tabIndex={0}>
      <span className="flame" aria-hidden>🔥</span>
      <div className="copy"
        dangerouslySetInnerHTML={{
          __html: `You're <b>${xpRemaining} XP</b> away from today's goal. About <b>${questionsNeeded} question${questionsNeeded > 1 ? 's' : ''}</b>${streakText}.`
        }} />
      <span className="go">Fix it →</span>
    </div>
  )
}
