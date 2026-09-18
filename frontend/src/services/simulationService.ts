import type { SimulationForm, SimulationResult, SimulationSummary, StructuralModel, StructuralModelRecord } from '../models/simulation'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export async function runSimulation(form: SimulationForm, token: string, modelId?: string): Promise<SimulationResult> {
  const response = await fetch(`${API_URL}/simulations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model_id: modelId,
      model: {
        name: form.name,
        length: Number(form.length),
        width: Number(form.width),
        height: Number(form.height),
        material: form.material,
      },
      parameters: {
        excitation: form.excitation,
        intensity: Number(form.intensity),
        modes: Number(form.modes),
      },
    }),
  })

  if (!response.ok) throw new Error('No se pudo completar la simulación')
  return response.json() as Promise<SimulationResult>
}

export async function createModel(model: StructuralModel, token: string) {
  const response = await fetch(`${API_URL}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: model.name, length: model.length, width: model.width, height: model.height, material: model.material }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.detail ?? 'No se pudo guardar el modelo')
  return payload as StructuralModelRecord
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.detail ?? 'No se pudo cargar la información')
  return payload as T
}

export function listModels(token: string) {
  return getJson<StructuralModelRecord[]>('/models', token)
}

export function listSimulations(token: string) {
  return getJson<SimulationSummary[]>('/simulations', token)
}

export function getSimulation(simulationId: string, token: string) {
  return getJson<SimulationResult>(`/simulations/${simulationId}`, token)
}

export async function exportSimulation(simulationId: string, token: string, format: 'json' | 'csv' | 'html') {
  const response = await fetch(`${API_URL}/simulations/${simulationId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('No se pudo exportar la simulación')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `simulacion-${simulationId}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
