import type { AuthResponse, User, UserRole } from '../models/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

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
