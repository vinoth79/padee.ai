import { Outlet } from 'react-router-dom'
import TeacherSidebar from '../components/teacher/TeacherSidebar'

// Single Outlet across breakpoints + no key-based wrapper. Having two separate
// Outlets (one per viewport, both in the DOM via `hidden` / `lg:hidden`) caused
// teacher screens to double-mount — every async effect, every fetch, every
// setState ran in two parallel instances, producing racy state and silently
// dropped responses. Additionally, the AnimatePresence key={location.pathname}
// wrapper tore down in-flight streaming fetches on every navigation. Both were
// silent bugs for long-running operations (the worksheet generator LLM call
// takes ~20s). Same fix as applied to StudentLayout.
export default function TeacherLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#F8F7F4' }}>
      {/* Desktop sidebar (hidden below lg) */}
      <div className="hidden lg:block">
        <TeacherSidebar />
      </div>

      {/* Tablet/mobile top bar (hidden above lg) */}
      <div className="lg:hidden sticky top-0 z-30 bg-white" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
        <div className="px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: '#0D9488' }}>
              <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#99F6E4' }} />
            </div>
            <span className="font-bold text-[14px]" style={{ color: '#111827' }}>Padee.ai</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#ECFDF5', color: '#0F766E' }}>Teacher</span>
          </div>
        </div>
      </div>

      {/* Single Outlet — mounts once per route change */}
      <main className="flex-1 overflow-y-auto h-screen lg:h-auto px-4 lg:px-0 pb-10 lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
