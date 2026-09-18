import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './AppShell'
import { LoginScreen } from './components/LoginScreen'
import type { AuthResponse, User } from './models/auth'
import { getCurrentUser } from './services/authService'
import './app-shell.css'
import './auth.css'
import './admin.css'
import './history.css'

function Root() {
  const [token, setToken] = useState(() => sessionStorage.getItem('access_token'))
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    getCurrentUser(token)
      .then(setUser)
      .catch(() => { sessionStorage.removeItem('access_token'); setToken(null) })
      .finally(() => setCheckingSession(false))
  }, [token])

  function authenticate(session: AuthResponse) {
    sessionStorage.setItem('access_token', session.access_token)
    setToken(session.access_token)
    setUser(session.user)
  }

  function logout() {
    sessionStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }

  if (checkingSession) return <main className="auth-loading">Verificando sesión...</main>
  if (!token || !user) return <LoginScreen onAuthenticated={authenticate} />
  return <AppShell user={user} token={token} onLogout={logout} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
