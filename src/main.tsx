import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AuthProvider } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import { SpeechProvider } from './context/SpeechContext'
import './tokens.css'
import './index.css'
import 'katex/dist/katex.min.css'

// Note: React.StrictMode is intentionally NOT used.
// It double-invokes effects in dev which orphans in-flight streaming fetches
// (e.g. /api/ai/doubt SSE). Re-enable once we wire AbortController on effect
// cleanup throughout the app.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <UserProvider>
      <SpeechProvider>
        <RouterProvider router={router} />
      </SpeechProvider>
    </UserProvider>
  </AuthProvider>
)
