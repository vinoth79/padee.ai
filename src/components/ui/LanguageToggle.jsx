// ═══════════════════════════════════════════════════════════════════════════
// LanguageToggle — "Pa speaks to me in" dropdown for Sprint 3 (F6a).
// ═══════════════════════════════════════════════════════════════════════════
// Two options: English / हिन्दी. Calls userApi.setTutorLanguage on change.
// Optimistic: shows the new value immediately, rolls back on server error.
//
// Purposely simple — a plain <select> works on every device including older
// Android browsers without depending on a custom dropdown library. Designer
// can re-skin in v5.1 without changing the contract.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUser } from '../../context/UserContext'
import { userApi } from '../../services/api'

export default function LanguageToggle({ onSaved }) {
  const { token } = useAuth()
  const ctx = useUser()
  // UserContext may not expose tutorLanguage yet — fall back to 'en'.
  const current = (ctx?.tutorLanguage || 'en')
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = useCallback(async (e) => {
    const next = e.target.value
    if (!token || saving || next === value) return
    const prev = value
    setValue(next)             // optimistic
    setSaving(true)
    setError('')
    try {
      await userApi.setTutorLanguage(token, next)
      // Tell UserContext / parent screen to refresh if it tracks this.
      onSaved?.(next)
    } catch (err) {
      setValue(prev)           // rollback
      setError(err?.message || 'Could not save language preference')
    } finally {
      setSaving(false)
    }
  }, [token, value, saving, onSaved])

  return (
    <div className="lang-toggle">
      <label className="lang-toggle-label" htmlFor="lang-toggle-select">
        Pa speaks to me in
      </label>
      <select
        id="lang-toggle-select"
        className="lang-toggle-select"
        value={value}
        onChange={handleChange}
        disabled={saving}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी (Hindi)</option>
      </select>
      {saving && <span className="lang-toggle-status">Saving…</span>}
      {error && <span className="lang-toggle-error">{error}</span>}
    </div>
  )
}
