// ═══════════════════════════════════════════════════════════════════════════
// StudentPerformanceScreen — list of students in the teacher's class.
// ═══════════════════════════════════════════════════════════════════════════
// Replaces the old mock screen. Reads real students from /api/teacher/students.
// Click a row → drills into /teacher/student/:id profile view.
// Route: /teacher/students
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listTeacherStudents } from '../services/api'

export default function StudentPerformanceScreen({ onNavigate }) {
  const { token } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    listTeacherStudents(token, {
      q: search || undefined,
      classLevel: classFilter || undefined,
    }).then(res => {
      if (cancelled) return
      setLoading(false)
      if (res.error) { setError(res.error); return }
      setStudents(res.students || [])
    })
    return () => { cancelled = true }
  }, [token, search, classFilter])

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold" style={{ color: '#111827' }}>Students</h1>
        <p className="text-[13px]" style={{ color: '#6B7280' }}>
          Click a student to see their full learning profile — doubts, practice, tests, weak concepts.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2" style={{ borderColor: '#E5E7EB' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[180px] text-[13px] px-3 py-1.5 rounded border"
          style={{ borderColor: '#D1D5DB' }}
        />
        <select value={classFilter} onChange={e => setClassFilter(parseInt(e.target.value))}
          className="text-[13px] px-2 py-1.5 rounded border" style={{ borderColor: '#D1D5DB' }}>
          <option value={0}>All classes</option>
          {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px]" style={{ color: '#6B7280' }}>Loading students…</div>
      ) : error ? (
        <div className="p-3 rounded-lg text-[13px]" style={{ background: '#FEF2F2', color: '#991B1B' }}>⚠ {error}</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-[14px] font-semibold" style={{ color: '#111827' }}>No students found</p>
          <p className="text-[12px] mt-1" style={{ color: '#6B7280' }}>
            {search || classFilter ? 'Try a different filter.' : 'Students will appear here once they sign up.'}
          </p>
        </div>
      ) : (
        <ul className="bg-white rounded-xl border divide-y" style={{ borderColor: '#E5E7EB' }}>
          {students.map(s => {
            // Supabase returns one-to-one joins as either object or single-item array
            // depending on config; handle both shapes defensively.
            const streakRow = Array.isArray(s.streak) ? s.streak[0] : s.streak
            const xpRow = Array.isArray(s.xp) ? s.xp[0] : s.xp
            return (
              <li key={s.id}>
                <button onClick={() => onNavigate?.('student-profile', { studentId: s.id })}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                    style={{ background: '#CCFBF1', color: '#0F766E' }}>
                    {(s.name || s.email || 'S').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: '#111827' }}>
                      {s.name || <span style={{ color: '#9CA3AF' }}>(no name)</span>}
                    </p>
                    <p className="text-[11px]" style={{ color: '#6B7280' }}>
                      {s.email} · Class {s.class_level || '—'}
                    </p>
                  </div>
                  <div className="text-right text-[11px] flex-shrink-0" style={{ color: '#6B7280' }}>
                    {streakRow?.current_streak != null && <div>🔥 {streakRow.current_streak}</div>}
                    {xpRow?.current_level != null && <div>Lv {xpRow.current_level}</div>}
                  </div>
                  <span className="text-[14px] flex-shrink-0" style={{ color: '#9CA3AF' }}>›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
