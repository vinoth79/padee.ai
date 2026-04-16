import { createBrowserRouter, Navigate } from 'react-router-dom'
import StudentLayout from './layouts/StudentLayout'
import TeacherLayout from './layouts/TeacherLayout'
import { ScreenBridge } from './components/ScreenBridge'
import { ProtectedRoute } from './components/ProtectedRoute'

// Auth + onboarding + admin (TypeScript)
import LoginScreen from './screens/LoginScreen'
import LandingPage from './screens/LandingPage'
import AdminScreen from './screens/AdminScreen'
import OnboardingClass from './screens/OnboardingClass'
import OnboardingSubjects from './screens/OnboardingSubjects'
import OnboardingTrack from './screens/OnboardingTrack'

// Existing screens (JSX, loaded via bridge)
import SplashScreen from './screens/SplashScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import StudentHomeScreen from './screens/StudentHomeScreen'
import DoubtSolverScreen from './screens/DoubtSolverScreen'
import LearnScreen from './screens/LearnScreen'
import PracticeModeScreen from './screens/PracticeModeScreen'
import TestListScreen from './screens/TestListScreen'
import TestActiveScreen from './screens/TestActiveScreen'
import TestResultsScreen from './screens/TestResultsScreen'
import ProgressScreen from './screens/ProgressScreen'
import JEENEETScreen from './screens/JEENEETScreen'
import ParentSummaryScreen from './screens/ParentSummaryScreen'

// Teacher screens
import TeacherDashboardScreen from './screens/TeacherDashboardScreen'
import WorksheetGeneratorScreen from './screens/WorksheetGeneratorScreen'
import TeacherAssignTestScreen from './screens/TeacherAssignTestScreen'
import LiveClassScreen from './screens/LiveClassScreen'
import StudentPerformanceScreen from './screens/StudentPerformanceScreen'

export const router = createBrowserRouter([
  // ── Public routes ──
  { path: '/',      element: <LandingPage /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/admin', element: <AdminScreen /> },

  // ── Onboarding (requires auth, but no full layout) ──
  { path: '/onboarding/class',    element: <ProtectedRoute><OnboardingClass /></ProtectedRoute> },
  { path: '/onboarding/subjects', element: <ProtectedRoute><OnboardingSubjects /></ProtectedRoute> },
  { path: '/onboarding/track',    element: <ProtectedRoute><OnboardingTrack /></ProtectedRoute> },

  // Legacy onboarding
  { path: '/onboarding', element: <ProtectedRoute><ScreenBridge Component={OnboardingScreen} redirectTo="/home" isOnboarding /></ProtectedRoute> },
  { path: '/splash',     element: <ScreenBridge Component={SplashScreen} redirectTo="/onboarding/class" autoRedirect /> },

  // ── Student shell (protected) ──
  {
    element: <ProtectedRoute><StudentLayout /></ProtectedRoute>,
    children: [
      { path: '/home',           element: <ScreenBridge Component={StudentHomeScreen} /> },
      { path: '/dashboard',      element: <Navigate to="/home" replace /> },
      { path: '/dashboard/neet', element: <ScreenBridge Component={StudentHomeScreen} /> },
      { path: '/dashboard/jee',  element: <ScreenBridge Component={StudentHomeScreen} /> },
      { path: '/dashboard/ca',   element: <ScreenBridge Component={StudentHomeScreen} /> },
      { path: '/ask',            element: <ScreenBridge Component={DoubtSolverScreen} /> },
      { path: '/learn',          element: <ScreenBridge Component={LearnScreen} /> },
      { path: '/practice',       element: <ScreenBridge Component={PracticeModeScreen} /> },
      { path: '/tests',          element: <ScreenBridge Component={TestListScreen} /> },
      { path: '/tests/active',   element: <ScreenBridge Component={TestActiveScreen} /> },
      { path: '/tests/results',  element: <ScreenBridge Component={TestResultsScreen} /> },
      { path: '/progress',       element: <ScreenBridge Component={ProgressScreen} /> },
      { path: '/jee-neet',       element: <ScreenBridge Component={JEENEETScreen} /> },
      { path: '/parent',         element: <ScreenBridge Component={ParentSummaryScreen} /> },
      { path: '/tutoring',       element: <ScreenBridge Component={ProgressScreen} /> },
    ],
  },

  // ── Teacher shell (protected) ──
  {
    element: <ProtectedRoute><TeacherLayout /></ProtectedRoute>,
    children: [
      { path: '/teacher',            element: <ScreenBridge Component={TeacherDashboardScreen} /> },
      { path: '/teacher/worksheet',  element: <ScreenBridge Component={WorksheetGeneratorScreen} /> },
      { path: '/teacher/test',       element: <ScreenBridge Component={TeacherAssignTestScreen} /> },
      { path: '/teacher/live',       element: <ScreenBridge Component={LiveClassScreen} /> },
      { path: '/teacher/students',   element: <ScreenBridge Component={StudentPerformanceScreen} /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
])
