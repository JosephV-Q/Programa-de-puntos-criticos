import { FormEvent, useState } from 'react'
import type { AuthResponse, User } from '../models/auth'
import { login, register } from '../services/authService'

type Props = { onAuthenticated: (session: AuthResponse) => void }

export function LoginScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'register') {
        const user: User = await register(name, email, password)
        const session = await login(user.email, password)
        onAuthenticated(session)
      } else {
        onAuthenticated(await login(email, password))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-art">
        <span className="brand-mark">PC</span>
        <p className="eyebrow">Centro de análisis estructural</p>
        <h1>Decisiones claras para estructuras complejas.</h1>
        <p>Accede a tus modelos, simulaciones y recomendaciones de instrumentación desde un mismo espacio de trabajo.</p>
        <div className="auth-signal"><span /><span /><span /><span /><span /></div>
      </section>
      <section className="auth-card">
        <div className="auth-heading"><span className="section-kicker">Acceso seguro</span><h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2><p>{mode === 'login' ? 'Ingresa con tus credenciales para continuar.' : 'Tu cuenta se registrará como Ingeniero Estructural.'}</p></div>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Nombre completo<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label>}
          <label>Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Contraseña<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? 'Validando...' : mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'} <span>→</span></button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? '¿Aún no tienes una cuenta? Regístrate' : 'Ya tengo una cuenta. Iniciar sesión'}
        </button>
      </section>
    </main>
  )
}
