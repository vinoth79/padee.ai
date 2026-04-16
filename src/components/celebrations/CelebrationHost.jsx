import { useUser } from '../../context/UserContext'
import LevelUpOverlay from './LevelUpOverlay'
import BadgeUnlockSheet from './BadgeUnlockSheet'

/**
 * CelebrationHost — renders exactly ONE celebration at a time from the queue.
 * Mounted once inside StudentLayout. Consumes events published by UserContext
 * when it detects a level-up or newly-unlocked badge after refreshUser().
 */
export default function CelebrationHost() {
  const { celebrations, dismissCelebration } = useUser()
  const current = celebrations[0]
  if (!current) return null

  if (current.type === 'level_up') {
    return (
      <LevelUpOverlay
        newLevel={current.payload.newLevel}
        levelName={current.payload.levelName}
        prevLevel={current.payload.prevLevel}
        onDismiss={dismissCelebration}
      />
    )
  }

  if (current.type === 'badge_unlock') {
    return (
      <BadgeUnlockSheet
        badge={current.payload}
        onDismiss={dismissCelebration}
      />
    )
  }

  return null
}
