import { useState } from 'react'
import type { SimulationForm, SimulationResult, StructuralModel } from '../models/simulation'
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

export function buildPreviewResult(current: SimulationResult, model: StructuralModel): SimulationResult {
  return {
    ...current,
    model,
    parameters: {
      ...current.parameters,
      excitation: current.parameters.excitation,
      intensity: current.parameters.intensity,
      modes: current.parameters.modes,
    },
  }
}

export function useSimulationViewModel(initialResult: SimulationResult, token: string) {
  const [form, setForm] = useState<SimulationForm>(defaultSimulationForm)
  const [result, setResult] = useState(initialResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateForm<Key extends keyof SimulationForm>(key: Key, value: SimulationForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function executeSimulation(modelId?: string) {
    setLoading(true)
    setError('')
    try {
      setResult(await runSimulation(form, token, modelId))
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
