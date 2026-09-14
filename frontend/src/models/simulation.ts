export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Excitation = 'seismic' | 'traffic' | 'wind'
export type Material = 'concreto' | 'acero' | 'mixto'

export type StructuralModel = {
  name: string
  length: number
  width: number
  height: number
  material: Material
}

export type SimulationParameters = {
  excitation: Excitation
  intensity: number
  modes: number
}

export type CriticalZone = {
  position: number
  label: string
  severity: Severity
  displacement: number
  acceleration: number
}

export type MonitoringPoint = {
  position: number
  reason: string
  priority: 'recommended' | 'high'
}

export type SimulationResult = {
  simulation_id: string
  model: StructuralModel
  parameters: SimulationParameters
  peak_displacement: number
  peak_acceleration: number
  zones: CriticalZone[]
  monitoring_points: MonitoringPoint[]
}

export type StructuralModelRecord = StructuralModel & {
  id: string
  owner_id: string
  created_at: string
}

export type SimulationSummary = {
  simulation_id: string
  model_id: string
  model_name: string
  excitation: Excitation
  intensity: number
  modes: number
  peak_displacement: number
  peak_acceleration: number
  created_at: string
}

export type SimulationForm = StructuralModel & SimulationParameters
