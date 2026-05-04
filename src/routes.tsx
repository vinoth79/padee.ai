import { createBrowserRouter, Navigate } from 'react-router-dom'
import StudentLayout from './layouts/StudentLayout'
import { ScreenBridge } from './components/ScreenBridge'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleRoute, HomeForRole } from './components/ui/RoleRoute'

// Auth + onboarding + admin (TypeScript)
import LoginScreen from './screens/LoginScreen'
import SignupScreen from './screens/SignupScreen'
import LandingPage from './screens/LandingPage'
import AdminScreen from './screens/AdminScreen'
import OnboardingClass from './screens/OnboardingClass'
import OnboardingSubjects from './screens/OnboardingSubjects'
import OnboardingTrack from './screens/OnboardingTrack'

// v5 Sprint 1 — school onboarding + dashboard + invite redemption
import SchoolOnboardingScreen from './screens/SchoolOnboardingScreen'
import SchoolDashboardScreen from './screens/SchoolDashboardScreen'
import InviteCodeRedeemScreen from './screens/InviteCodeRedeemScreen'

// Student v4 screens (all full-bleed — own their HomeTopNav + FooterStrip)
import SplashScreen from './screens/SplashScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import StudentHomeScreenV4 from './screens/StudentHomeScreenV4'
import DoubtSolverScreenV4 from './screens/DoubtSolverScreenV4'
import LearnScreenV4 from './screens/LearnScreenV4'
import TestListScreenV4 from './screens/TestListScreenV4'
import TestActiveScreenV4 from './screens/TestActiveScreenV4'
import TestResultsScreenV4 from './screens/TestResultsScreenV4'
import ProgressScreenV4 from './screens/ProgressScreenV4'
import PracticeRunScreenV4 from './screens/PracticeRunScreenV4'
import SettingsScreen from './screens/SettingsScreen'

// Teacher screens
import TeacherDashboardScreenV4 from './screens/TeacherDashboardScreenV4'
import WorksheetGeneratorScreenV4 from './screens/WorksheetGeneratorScreenV4'
import TeacherAssignTestScreenV4 from './screens/TeacherAssignTestScreenV4'
import LiveClassScreenV4 from './screens/LiveClassScreenV4'
import StudentPerformanceScreenV4 from './screens/StudentPerformanceScreenV4'
import TeacherStudentProfileScreenV4 from './screens/TeacherStudentProfileScreenV4'
import PaperMimicScreenV4 from './screens/PaperMimicScreenV4'

export const router = createBrowserRouter([
  // ── Public routes ──
  { path: '/',      element: <LandingPage /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/signup', element: <SignupScreen /> },
  { path: '/admin', element: <AdminScreen /> },

  // ── Onboarding (requires auth, but no full layout) ──
  { path: '/onboarding/class',    element: <ProtectedRoute><OnboardingClass /></ProtectedRoute> },
  { path: '/onboarding/subjects', element: <ProtectedRoute><OnboardingSubjects /></ProtectedRoute> },
  { path: '/onboarding/track',    element: <ProtectedRoute><OnboardingTrack /></ProtectedRoute> },

  // ── v5 Sprint 1 — school onboarding + invite redemption ──
  // /onboarding/school: school_admin only (others redirected to /home).
  { path: '/onboarding/school',       element: <RoleRoute allowed={['school_admin']}><SchoolOnboardingScreen /></RoleRoute> },
  // /onboarding/invite-code: student / teacher (people without school_id).
  // role-gate is light (any logged-in user) since the screen has its own
  // skip path; we don't want to block someone who got here by accident.
  { path: '/onboarding/invite-code',  element: <ProtectedRoute><InviteCodeRedeemScreen /></ProtectedRoute> },
  // /school: school_admin only (the dashboard).
  { path: '/school',                  element: <RoleRoute allowed={['school_admin']}><SchoolDashboardScreen /></RoleRoute> },

  // Legacy onboarding fallback (older sessions point here)
  { path: '/onboarding', element: <ProtectedRoute><ScreenBridge Component={OnboardingScreen} redirectTo="/home" isOnboarding /></ProtectedRoute> },
  { path: '/splash',     element: <ScreenBridge Component={SplashScreen} redirectTo="/onboarding/class" autoRedirect /> },

  // ── Student v4 — full-bleed (each screen owns its HomeTopNav + FooterStrip) ──
  // /home is wrapped in <HomeForRole> so non-students (school_admin,
  // super_admin, parent, teacher) hitting /home get redirected to their
  // own dashboard before the student UI ever renders.
  { path: '/home',          element: <ProtectedRoute><HomeForRole><ScreenBridge Component={StudentHomeScreenV4} /></HomeForRole></ProtectedRoute> },
  { path: '/ask',           element: <ProtectedRoute><ScreenBridge Component={DoubtSolverScreenV4} /></ProtectedRoute> },
  { path: '/learn',         element: <ProtectedRoute><ScreenBridge Component={LearnScreenV4} /></ProtectedRoute> },
  { path: '/tests',         element: <ProtectedRoute><ScreenBridge Component={TestListScreenV4} /></ProtectedRoute> },
  { path: '/tests/active',  element: <ProtectedRoute><ScreenBridge Component={TestActiveScreenV4} /></ProtectedRoute> },
  { path: '/tests/results', element: <ProtectedRoute><ScreenBridge Component={TestResultsScreenV4} /></ProtectedRoute> },
  { path: '/progress',      element: <ProtectedRoute><ScreenBridge Component={ProgressScreenV4} /></ProtectedRoute> },
  { path: '/practice',      element: <ProtectedRoute><ScreenBridge Component={PracticeRunScreenV4} /></ProtectedRoute> },
  { path: '/settings',      element: <ProtectedRoute><ScreenBridge Component={SettingsScreen} /></ProtectedRoute> },

  // ── Student shell (protected) — placeholder redirects for legacy routes ──
  // /parent will get a real v4 screen in the next iteration.
  // /jee-neet is Phase 2 (those tracks are disabled in onboarding for now).
  // Until then both redirect to /home so stale links / parent logins don't 404.
  {
    element: <ProtectedRoute><StudentLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard',   element: <Navigate to="/home" replace /> },
      { path: '/jee-neet',    element: <Navigate to="/home" replace /> },
      { path: '/parent',      element: <Navigate to="/home" replace /> },
    ],
  },

  // ── Teacher v4 — full-bleed (each screen owns its TeacherTopNav) ──
  { path: '/teacher',           element: <ProtectedRoute><ScreenBridge Component={TeacherDashboardScreenV4} /></ProtectedRoute> },
  { path: '/teacher/worksheet', element: <ProtectedRoute><ScreenBridge Component={WorksheetGeneratorScreenV4} /></ProtectedRoute> },
  { path: '/teacher/mimic',     element: <ProtectedRoute><ScreenBridge Component={PaperMimicScreenV4} /></ProtectedRoute> },
  { path: '/teacher/test',         element: <ProtectedRoute><ScreenBridge Component={TeacherAssignTestScreenV4} /></ProtectedRoute> },
  { path: '/teacher/student/:id',  element: <ProtectedRoute><ScreenBridge Component={TeacherStudentProfileScreenV4} /></ProtectedRoute> },
  { path: '/teacher/live',         element: <ProtectedRoute><ScreenBridge Component={LiveClassScreenV4} /></ProtectedRoute> },
  { path: '/teacher/students',     element: <ProtectedRoute><ScreenBridge Component={StudentPerformanceScreenV4} /></ProtectedRoute> },

  // /teacher/review moved to /admin → "Flagged Review" tab. Old links redirect.
  { path: '/teacher/review', element: <Navigate to="/admin" replace /> },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
])
