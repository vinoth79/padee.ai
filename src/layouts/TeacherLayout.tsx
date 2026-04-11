import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import TeacherSidebar from '../components/teacher/TeacherSidebar'

export default function TeacherLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen" style={{ background: '#F8F7F4' }}>

      {/* ═══ DESKTOP: Sidebar + content ═══ */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        <TeacherSidebar />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ═══ TABLET + MOBILE: stacked ═══ */}
      <div className="lg:hidden">
        {/* Compact top bar for tablet/mobile */}
        <div className="sticky top-0 z-30 bg-white" style={{ borderBottom: '0.5px solid #E5E7EB' }}>
          <div className="px-4 flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: '#0D9488' }}>
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#99F6E4' }} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: '#111827' }}>Padhi.ai</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#ECFDF5', color: '#0F766E' }}>Teacher</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
