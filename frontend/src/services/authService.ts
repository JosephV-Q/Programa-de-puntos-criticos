import type { AuthResponse, User, UserRole } from '../models/auth'

// 🔹 Usa la variable de entorno VITE_API_URL definida en Render.
// Si no existe, por defecto apunta a localhost (solo útil en desarrollo).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'No se pudo completar la operación')
  }
  return payload as T
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name: string, email: string, password: string) {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function getCurrentUser(token: string) {
  return request<User>('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
}

export function listUsers(token: string) {
  return request<User[]>('/auth/users', { headers: { Authorization: `Bearer ${token}` } })
}

export function updateUserRole(token: string, userId: string, role: UserRole) {
  return request<User>(`/auth/users/${userId}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  })
}

export type AdminMetrics = {
  status: string
  uptime_seconds: number
  database: string
  database_latency_ms: number
  users: number
  models: number
  simulations: number
}

export function getAdminMetrics(token: string) {
  return request<AdminMetrics>('/auth/admin/metrics', { headers: { Authorization: `Bearer ${token}` } })
}

export async function downloadAdminBackup(token: string) {
  const response = await fetch(`${API_URL}/auth/admin/backup`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('No se pudo generar la copia de seguridad')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'puntos-criticos-backup.json'
  link.click()
  URL.revokeObjectURL(url)
}
