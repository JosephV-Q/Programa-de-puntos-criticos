import { useEffect, useState } from 'react'
import type { User, UserRole } from '../models/auth'
import type { SimulationResult } from '../models/simulation'
import { BridgeScene3D } from './BridgeScene3D'
import { HistoryPanel } from './HistoryPanel'
import { downloadAdminBackup, getAdminMetrics, listUsers, updateUserRole } from '../services/authService'
import { exportSimulation } from '../services/simulationService'

type Props = { user: User; token: string; onLogout: () => void; onClose: () => void }
type AdminPanelProps = { user: User; token: string; onLogout: () => void }
type OperatorPanelProps = { user: User; token: string; onLogout: () => void }

const roleLabels = {
  admin: 'Administrador',
  structural_engineer: 'Ingeniero estructural',
  instrumentation_specialist: 'Especialista en instrumentación',
} as const

export function OperatorPanel({ user, token, onLogout }: OperatorPanelProps) {
  const [selectedResult, setSelectedResult] = useState<SimulationResult | null>(null)

  return (
    <main className="operator-shell">
      <header className="operator-topbar">
        <div className="brand"><span className="brand-mark">PC</span><div><strong>Puntos Críticos</strong><small>Panel operativo de instrumentación</small></div></div>
        <div className="top-actions"><span className="status-dot" /> Operador conectado <span className="operator-avatar">{user.name.slice(0, 2).toUpperCase()}</span></div>
      </header>
      <section className="operator-intro">
        <div><p className="eyebrow">Operación / Supervisión de campo</p><h1>Red de <em>monitoreo</em></h1><p className="subcopy">Consulta las zonas críticas y los puntos recomendados por el análisis estructural.</p></div>
        <button className="logout-button operator-logout" type="button" onClick={onLogout}>Cerrar sesión <span>↗</span></button>
      </section>
      {selectedResult ? <section className="operator-focus">
        <div className="operator-focus-heading"><div><span className="section-kicker">Lectura seleccionada</span><h2>{selectedResult.model.name}</h2></div><span className="live-pill">● Datos disponibles</span></div>
        <div className="operator-metrics"><div><span>Desplazamiento pico</span><strong>{selectedResult.peak_displacement} m</strong></div><div><span>Aceleración pico</span><strong>{selectedResult.peak_acceleration} m/s²</strong></div><div><span>Puntos de monitoreo</span><strong>{selectedResult.monitoring_points.length}</strong></div></div>
        <BridgeScene3D model={selectedResult.model} zones={selectedResult.zones} monitoringPoints={selectedResult.monitoring_points} />
        <div className="operator-points"><div className="operator-points-heading"><h3>Puntos recomendados</h3><div className="export-actions"><button type="button" onClick={() => void exportSimulation(selectedResult.simulation_id, token, 'json')}>Exportar datos</button><button type="button" onClick={() => void exportSimulation(selectedResult.simulation_id, token, 'html')}>Informe</button></div></div>{selectedResult.monitoring_points.map((point, index) => <div key={`${point.position}-${index}`}><strong>Sensor {String(index + 1).padStart(2, '0')}</strong><span>{point.reason}</span><small>Posición {Math.round(point.position * 100)}% · {point.priority === 'high' ? 'Prioridad alta' : 'Recomendada'}</small></div>)}</div>
      </section> : <section className="operator-empty"><span className="section-kicker">02 / Lectura operativa</span><h2>Selecciona una simulación</h2><p>Abre un registro para consultar sus zonas críticas y puntos de monitoreo.</p></section>}
      <HistoryPanel token={token} selectedId={selectedResult?.simulation_id ?? ''} onSelect={setSelectedResult} />
      <footer>Cuenta activa: {user.email} <span>•</span> Solo lectura operativa</footer>
    </main>
  )
}

export function AdminPanel({ user, token, onLogout }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [userError, setUserError] = useState('')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getAdminMetrics>> | null>(null)
  const [backupError, setBackupError] = useState('')

  useEffect(() => {
    if (user.role !== 'admin') return
    listUsers(token)
      .then(setUsers)
      .catch(() => setUserError('No se pudo cargar la lista de usuarios'))
      .finally(() => setLoading(false))
    getAdminMetrics(token).then(setMetrics).catch(() => setMetrics(null))
  }, [token, user.role])

  async function changeRole(userId: string, role: UserRole) {
    try {
      const updated = await updateUserRole(token, userId, role)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setUserError('No se pudo actualizar el rol')
    }
  }

  const engineers = users.filter((item) => item.role === 'structural_engineer').length
  const instrumentationSpecialists = users.filter((item) => item.role === 'instrumentation_specialist').length

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="brand"><span className="brand-mark">PC</span><div><strong>Puntos Críticos</strong><small>Consola de administración</small></div></div>
        <div className="top-actions"><span className="status-dot" /> Sesión de administrador <span className="admin-avatar">{user.name.slice(0, 2).toUpperCase()}</span></div>
      </header>
      <section className="admin-intro">
        <div><p className="eyebrow">Administración / Control de acceso</p><h1>Centro de <em>usuarios</em></h1><p className="subcopy">Gestiona cuentas y permisos de la plataforma desde un espacio separado del análisis estructural.</p></div>
        <button className="logout-button admin-logout" type="button" onClick={onLogout}>Cerrar sesión <span>↗</span></button>
      </section>
      <section className="admin-stats" aria-label="Resumen de usuarios">
        <div><span>Total de cuentas</span><strong>{metrics?.users ?? users.length}</strong><small>Registradas en Neon</small></div>
        <div><span>Ingenieros estructurales</span><strong>{engineers}</strong><small>Acceso al simulador</small></div>
        <div><span>Instrumentación</span><strong>{instrumentationSpecialists}</strong><small>Acceso especializado</small></div>
      </section>
      <section className="admin-monitoring"><div><span className="section-kicker">02 / Operación</span><h2>Rendimiento y disponibilidad</h2></div><div className="monitoring-values"><strong>{metrics?.status === 'operational' ? 'Operativa' : 'Sin datos'}</strong><span>BD: {metrics?.database ?? 'Verificando...'}</span><span>Latencia: {metrics ? `${metrics.database_latency_ms} ms` : '...'}</span><span>Uptime: {metrics ? `${Math.floor(metrics.uptime_seconds / 60)} min` : '...'}</span></div><button className="backup-button" type="button" onClick={() => { setBackupError(''); void downloadAdminBackup(token).catch(() => setBackupError('No se pudo generar la copia')) }}>Descargar copia de seguridad</button>{backupError && <p className="error-message">{backupError}</p>}</section>
      <section className="admin-content">
        <div className="admin-section-heading"><div><span className="section-kicker">03 / Directorio</span><h2>Usuarios y permisos</h2></div><span className="admin-count">{users.length} cuentas</span></div>
        {userError && <p className="error-message">{userError}</p>}
        {loading && <p className="admin-empty">Cargando usuarios...</p>}
        {!loading && !userError && users.length === 0 && <p className="admin-empty">No hay usuarios registrados.</p>}
        <div className="admin-table" role="table" aria-label="Usuarios registrados">
          {users.map((item) => <div className="admin-table-row" role="row" key={item.id}>
            <div className="admin-user-identity"><span className="admin-user-avatar">{item.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.email}</small></div></div>
            <span className={`account-status ${item.role === 'admin' ? 'is-admin' : ''}`}>{item.role === 'admin' ? 'Administrador' : 'Cuenta activa'}</span>
            <select value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as UserRole)} aria-label={`Rol de ${item.name}`}>
              <option value="admin">Administrador</option><option value="structural_engineer">Ingeniero estructural</option><option value="instrumentation_specialist">Instrumentación</option>
            </select>
            <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('es-CO')}</time>
          </div>)}
        </div>
      </section>
      <footer>Cuenta activa: {user.email} <span>•</span> Cambios de rol protegidos por API</footer>
    </main>
  )
}

export function UserPanel({ user, token, onLogout, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [userError, setUserError] = useState('')
  useEffect(() => {
    if (user.role !== 'admin') return
    listUsers(token).then(setUsers).catch(() => setUserError('No se pudo cargar la lista de usuarios'))
  }, [token, user.role])

  async function changeRole(userId: string, role: UserRole) {
    try {
      const updated = await updateUserRole(token, userId, role)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch {
      setUserError('No se pudo actualizar el rol')
    }
  }
  return (
    <div className="user-panel" role="dialog" aria-label="Panel de usuario">
      <div className="user-panel-heading"><div><span className="section-kicker">Cuenta activa</span><h2>Tu perfil</h2></div><button className="close-button" type="button" aria-label="Cerrar panel" onClick={onClose}>×</button></div>
      <div className="profile-badge">{user.name.slice(0, 2).toUpperCase()}</div>
      <strong className="profile-name">{user.name}</strong>
      <span className="profile-email">{user.email}</span>
      <div className="profile-detail"><span>Rol</span><strong>{roleLabels[user.role]}</strong></div>
      <div className="profile-detail"><span>Cuenta creada</span><strong>{new Date(user.created_at).toLocaleDateString('es-CO')}</strong></div>
      {user.role === 'admin' && <div className="admin-users"><span className="section-kicker">Administración</span><h3>Usuarios y permisos</h3>{userError && <p className="error-message">{userError}</p>}{users.map((item) => <div className="admin-user" key={item.id}><div><strong>{item.name}</strong><small>{item.email}</small></div><select value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as UserRole)} aria-label={`Rol de ${item.name}`}><option value="admin">Administrador</option><option value="structural_engineer">Ingeniero estructural</option><option value="instrumentation_specialist">Instrumentación</option></select></div>)}</div>}
      <button className="logout-button" type="button" onClick={onLogout}>Cerrar sesión <span>↗</span></button>
    </div>
  )
}
