import { useState } from 'react'
import type { SimulationForm, SimulationResult } from '../models/simulation'
import { runSimulation } from '../services/simulationService'

export const defaultSimulationForm: SimulationForm = {
  name: 'Puente Central',
  length: 120,
  width: 9,
  height: 18,
  material: 'concreto',
  excitation: 'traffic',
  intensity: 0.65,
  modes: 3,
}

export function useSimulationViewModel(initialResult: SimulationResult, token: string) {
  const [form, setForm] = useState<SimulationForm>(defaultSimulationForm)
  const [result, setResult] = useState(initialResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateForm<Key extends keyof SimulationForm>(key: Key, value: SimulationForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function executeSimulation() {
    setLoading(true)
    setError('')
    try {
      setResult(await runSimulation(form, token))
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  function selectResult(nextResult: SimulationResult) {
    setResult(nextResult)
    setError('')
  }

  return { form, result, loading, error, updateForm, executeSimulation, selectResult }
}
