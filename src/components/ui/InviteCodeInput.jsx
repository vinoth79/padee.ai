// ═══════════════════════════════════════════════════════════════════════════
// InviteCodeInput — multi-cell code entry (6 numeric for school codes,
// 8 alphanumeric for parent-link codes).
// ═══════════════════════════════════════════════════════════════════════════
// Behaviour:
//   • Each digit is its own input cell with a focus ring.
//   • Auto-advance on keypress, backspace on empty cell → previous cell.
//   • Paste support: parses pasted string and distributes across cells.
//   • Auto-submit when last cell is filled (calls onComplete).
//   • Numeric (length 6) or alphanumeric uppercase (length 8).
//
// Props:
//   length     — 6 (numeric school codes) or 8 (alphanumeric parent-link codes)
//   onComplete — called with the joined value once all cells are filled
//   error      — boolean; turns cells red + shake animation
//   disabled   — locks all inputs
//   autoFocus  — focuses first cell on mount (default: true)
//
// Used in: /onboarding/invite-code, <PendingLinkBanner>
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'

export default function InviteCodeInput({
  length = 6,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}) {
  const [cells, setCells] = useState(() => Array(length).fill(''))
  const refs = useRef([])
  const isNumeric = length === 6

  // Reset cells if `error` flips to true (user can retype after error)
  useEffect(() => {
    if (error) {
      // Refocus first cell so user can retype immediately
      const t = setTimeout(() => refs.current[0]?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [error])

  // Autofocus first cell on mount
  useEffect(() => {
    if (autoFocus && refs.current[0] && !disabled) {
      refs.current[0].focus()
    }
  }, [autoFocus, disabled])

  function normalizeChar(ch) {
    if (isNumeric) return /\d/.test(ch) ? ch : ''
    return /[A-Z0-9]/.test(ch.toUpperCase()) ? ch.toUpperCase() : ''
  }

  function handleChange(idx, raw) {
    const ch = normalizeChar(raw.slice(-1)) // take only last char
    if (!ch && raw !== '') return // ignore invalid input

    const next = [...cells]
    next[idx] = ch
    setCells(next)

    // Auto-advance
    if (ch && idx < length - 1) {
      refs.current[idx + 1]?.focus()
    }

    // Fire onComplete when all cells filled
    if (next.every(c => c !== '')) {
      onComplete?.(next.join(''))
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (cells[idx]) {
        // Cell has content — clear it (default behaviour does this)
        return
      }
      // Cell empty → move to previous cell and clear it
      if (idx > 0) {
        e.preventDefault()
        const next = [...cells]
        next[idx - 1] = ''
        setCells(next)
        refs.current[idx - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault()
      refs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault()
      refs.current[idx + 1]?.focus()
    }
  }

  function handlePaste(idx, e) {
    e.preventDefault()
    const raw = (e.clipboardData?.getData('text') || '').trim()
    // Strip non-allowed chars
    const filter = isNumeric ? /\D+/g : /[^A-Za-z0-9]+/g
    const cleaned = raw.replace(filter, '')
    const chars = isNumeric
      ? cleaned.split('')
      : cleaned.toUpperCase().split('')

    if (!chars.length) return

    const next = [...cells]
    let writeIdx = idx
    for (const ch of chars) {
      if (writeIdx >= length) break
      next[writeIdx] = ch
      writeIdx += 1
    }
    setCells(next)
    // Focus the cell after the last written one (or the last cell)
    const focusIdx = Math.min(writeIdx, length - 1)
    refs.current[focusIdx]?.focus()

    if (next.every(c => c !== '')) {
      onComplete?.(next.join(''))
    }
  }

  // Public reset (parent can call via ref if it ever exposes one — kept simple)
  // For now, error state triggers a focus-first refocus and the user retypes.

  // Position the hyphen for 6-digit codes between cells 3 and 4
  const hyphenAfter = isNumeric ? 2 : -1

  return (
    <div className="code-input-row" aria-label={`${length}-character invite code`}>
      {cells.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <input
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode={isNumeric ? 'numeric' : 'text'}
            maxLength={1}
            value={c}
            disabled={disabled}
            aria-label={`character ${i + 1} of ${length}`}
            className={`code-cell ${c ? 'filled' : ''} ${error ? 'error' : ''}`}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={e => handlePaste(i, e)}
            autoComplete="one-time-code"
            spellCheck={false}
          />
          {i === hyphenAfter && <span className="code-hyphen" aria-hidden>–</span>}
        </span>
      ))}
    </div>
  )
}
