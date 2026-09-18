import { describe, expect, it } from 'vitest'
import type { SimulationResult } from '../models/simulation'
import { buildPreviewResult } from './useSimulationViewModel'

describe('buildPreviewResult', () => {
  it('updates the model preview from imported geometry so the 3D view reflects the new bridge shape', () => {
    const current: SimulationResult = {
      simulation_id: 'demo',
      model: { name: 'Puente Central', length: 120, width: 9, height: 18, material: 'concreto' },
      parameters: { excitation: 'traffic', intensity: 0.65, modes: 3 },
      peak_displacement: 0.042,
      peak_acceleration: 0.51,
      zones: [],
      monitoring_points: [],
    }

    const preview = buildPreviewResult(current, { name: 'Puente importado', length: 180, width: 12, height: 26, material: 'acero' })

    expect(preview.model).toEqual({ name: 'Puente importado', length: 180, width: 12, height: 26, material: 'acero' })
    expect(preview.parameters).toEqual({ excitation: 'traffic', intensity: 0.65, modes: 3 })
  })
})
