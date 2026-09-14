import { useEffect, useState } from 'react'
import type { User, UserRole } from '../models/auth'
import { listUsers, updateUserRole } from '../services/authService'

type Props = { user: User; token: string; onLogout: () => void; onClose: () => void }

const roleLabels = {
  admin: 'Administrador',
  structural_engineer: 'Ingeniero estructural',
  instrumentation_specialist: 'Especialista en instrumentación',
} as const

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
