import { ChangeEvent, FormEvent, useEffect, useState, type CSSProperties } from 'react'
import { BridgeScene3D } from './components/BridgeScene3D'
import { AdminPanel, OperatorPanel, UserPanel } from './components/UserPanel'
import { HistoryPanel } from './components/HistoryPanel'
import type { User } from './models/auth'
import type { StructuralModelRecord } from './models/simulation'
import { exportSimulation } from './services/simulationService'
import { createModel, listModels } from './services/simulationService'
import type { Severity, SimulationResult } from './models/simulation'
import { useSimulationViewModel } from './viewmodels/useSimulationViewModel'

const severityLabels: Record<Severity, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }
const riskLabels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }

const aiPanelStyles = {
  panel: {
    border: '1px solid #dfe5e2',
    background: '#ffffff',
    borderRadius: '18px',
    padding: '0',
    overflow: 'hidden',
    boxShadow: '0 8px 22px rgba(19, 33, 39, 0.04)',
  } as CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '18px 22px 14px',
    borderBottom: '1px solid #edf0ee',
    background: 'linear-gradient(180deg, #f9fbfa 0%, #ffffff 100%)',
  } as CSSProperties,
  headerCopy: { display: 'flex', flexDirection: 'column', gap: '6px' } as CSSProperties,
  title: { margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.04em', color: '#172229' } as CSSProperties,
  risk: { fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '999px', padding: '7px 10px', color: '#fff' } as CSSProperties,
  body: { padding: '22px 22px 20px' } as CSSProperties,
  summary: { margin: '0 0 18px', color: '#24353b', fontSize: '15px', lineHeight: 1.6 } as CSSProperties,
  plan: { background: '#f5faf8', border: '1px solid #dfeae4', borderRadius: '12px', padding: '16px 18px', marginBottom: '18px' } as CSSProperties,
  planTitle: { margin: '0 0 8px', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' } as CSSProperties,
  planText: { margin: 0, color: '#496066', lineHeight: 1.55, fontSize: '14px' } as CSSProperties,
  planMeta: { display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: '12px', fontSize: '13px', color: '#39515b' } as CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginTop: '14px' } as CSSProperties,
  card: { background: '#f9faf9', border: '1px solid #edf1ef', borderRadius: '12px', padding: '16px' } as CSSProperties,
  cardTitle: { margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#172229' } as CSSProperties,
  row: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 0', borderTop: '1px solid #edf0ee' } as CSSProperties,
  rowHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' } as CSSProperties,
  rowLabel: { fontWeight: 700, color: '#1c2c32' } as CSSProperties,
  rowBadge: { fontSize: '11px', fontWeight: 700, color: '#0d4f48', background: '#dfeee9', borderRadius: '999px', padding: '4px 8px' } as CSSProperties,
  rowText: { fontSize: '12.5px', color: '#536a73', lineHeight: 1.5 } as CSSProperties,
  actionsBlock: { marginTop: '18px', paddingTop: '18px', borderTop: '1px solid #edf0ee' } as CSSProperties,
  actionsTitle: { margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#172229' } as CSSProperties,
  actionsList: { margin: 0, paddingLeft: '18px', display: 'grid', gap: '8px', color: '#24353b', fontSize: '14px', lineHeight: 1.55 } as CSSProperties,
} as const

function formatRiskLabel(value: string) {
  return riskLabels[value] ?? value
}

const demoResult: SimulationResult = {
  simulation_id: 'demo',
  model: { name: 'Puente Central', length: 120, width: 9, height: 18, material: 'concreto' },
  parameters: { excitation: 'traffic', intensity: 0.65, modes: 3 },
  peak_displacement: 0.042,
  peak_acceleration: 0.51,
  zones: [
    { position: 0.25, label: 'Zona 3', severity: 'high', displacement: 0.032, acceleration: 0.44 },
    { position: 0.375, label: 'Zona 4', severity: 'critical', displacement: 0.042, acceleration: 0.51 },
    { position: 0.5, label: 'Zona 5', severity: 'high', displacement: 0.039, acceleration: 0.48 },
    { position: 0.625, label: 'Zona 6', severity: 'medium', displacement: 0.029, acceleration: 0.39 },
    { position: 0.75, label: 'Zona 7', severity: 'medium', displacement: 0.021, acceleration: 0.31 },
  ],
  monitoring_points: [
    { position: 0.375, reason: 'Máxima respuesta dinámica', priority: 'high' },
    { position: 0.625, reason: 'Cambio de curvatura', priority: 'recommended' },
  ],
  ai_analysis: {
    overall_risk: 'high',
    critical_zone_count: 2,
    summary: 'La respuesta dinámica máxima se concentra en la zona central y en el tramo de cambio de curvatura.',
    priority_zones: [
      { zone_label: 'Zona 4', position: 0.375, severity: 'critical', priority: 'Crítica', reason: 'Máxima amplitud de desplazamiento y aceleración.' },
      { zone_label: 'Zona 5', position: 0.5, severity: 'high', priority: 'Alta', reason: 'Respuesta dinámica elevada con riesgo de fatiga localizada.' },
    ],
    monitoring_recommendations: [
      { zone_label: 'Zona 4', position: 0.375, priority: 'Crítica', recommended_sensors: 2, reason: 'Instalar acelerómetros y desplazamiento en el punto de mayor demanda.' },
      { zone_label: 'Zona 5', position: 0.5, priority: 'Alta', recommended_sensors: 1, reason: 'Reforzar supervisión en la zona de transición crítica.' },
    ],
    recommended_actions: ['Inspeccionar la zona central', 'Validar la conexión de vigas y tablero', 'Programar revisión de campo en 48 horas'],
    plan_3d: {
      generated: true,
      title: 'Plano 3D de respuesta estructural',
      summary: 'El plano 3D resalta los puntos críticos del tablero y las ubicaciones recomendadas para sensores.',
      hotspot_zones: ['Zona 4', 'Zona 5'],
      sensor_positions: [0.375, 0.5],
      camera_position: [340, 150, 420],
    },
  },
}

export function AppShell({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [models, setModels] = useState<StructuralModelRecord[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [modelError, setModelError] = useState('')
  const [importingModels, setImportingModels] = useState(false)
  const [activePanel, setActivePanel] = useState<'ai' | 'history'>('ai')
  const { form, result, loading, error, updateForm, executeSimulation, selectResult } = useSimulationViewModel(demoResult, token)
  const aiAnalysis = result.ai_analysis
  function loadModel(model: StructuralModelRecord) {
    setSelectedModelId(model.id)
    updateForm('name', model.name)
    updateForm('length', model.length)
    updateForm('width', model.width)
    updateForm('height', model.height)
    updateForm('material', model.material)
    selectResult({
      ...result,
      model: {
        name: model.name,
        length: model.length,
        width: model.width,
        height: model.height,
        material: model.material,
      },
    })
  }

  function selectModel(modelId: string) {
    const model = models.find((item) => item.id === modelId)
    if (!model) return
    loadModel(model)
  }

  useEffect(() => {
    if (user.role !== 'structural_engineer') return
    listModels(token).then(setModels).catch(() => setModelError('No se pudieron cargar los modelos'))
  }, [token, user.role])

  const submit = (event: FormEvent) => { event.preventDefault(); void executeSimulation(selectedModelId || undefined) }
  async function saveModel() {
    setModelError('')
    try {
      const saved = await createModel(form, token)
      setModels((current) => [saved, ...current])
      setSelectedModelId(saved.id)
    } catch (saveError) {
      setModelError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el modelo')
    }
  }

  async function importModels(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setModelError('')
    setImportingModels(true)
    try {
      const importedModels = parseModelFile(await file.text(), file.name)
      const savedModels: StructuralModelRecord[] = []
      for (const model of importedModels) savedModels.push(await createModel(model, token))
      setModels((current) => [...savedModels, ...current])
      if (savedModels[0]) loadModel(savedModels[0])
    } catch (importError) {
      setModelError(importError instanceof Error ? importError.message : 'No se pudieron importar los modelos')
    } finally {
      setImportingModels(false)
    }
  }

  if (user.role === 'admin') {
    return <AdminPanel user={user} token={token} onLogout={onLogout} />
  }
  if (user.role === 'instrumentation_specialist') {
    return <OperatorPanel user={user} token={token} onLogout={onLogout} />
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">PC</span><div><strong>Puntos Críticos</strong><small>Centro de análisis estructural</small></div></div>
        <div className="top-actions"><span className="status-dot" /> Sistema operativo <button className="avatar" aria-label="Abrir panel de usuario" onClick={() => setShowUserPanel((visible) => !visible)}>{user.name.slice(0, 2).toUpperCase()}</button></div>
      </header>
      {showUserPanel && <UserPanel user={user} token={token} onLogout={onLogout} onClose={() => setShowUserPanel(false)} />}
      <section className="intro">
        <div><p className="eyebrow">Centro de análisis / Proyecto activo</p><h1>Lectura dinámica del <em>{form.name}</em></h1><p className="subcopy">Simula vibraciones, localiza respuestas críticas y prepara tu red de instrumentación.</p></div>
        <div className="run-meta"><span>Última simulación</span><strong>{loading ? 'Procesando...' : 'Lista para ejecutar'}</strong><span className="live-pill">● Modelo conectado</span></div>
      </section>
      <div className="workspace">
        <aside className="panel controls">
          <div className="panel-heading"><div><span className="section-kicker">01 / Entrada</span><h2>Parámetros del modelo</h2></div><span className="panel-icon">⌁</span></div>
          <form onSubmit={submit}>
            <label>Modelo guardado<select value={selectedModelId} onChange={(event) => selectModel(event.target.value)}><option value="">Nuevo modelo desde estos datos</option>{models.map((model) => <option value={model.id} key={model.id}>{model.name} · {model.material}</option>)}</select></label>
            <label>Nombre de la estructura<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
            <div className="field-grid"><label>Longitud <span>m</span><input type="number" min="1" value={form.length} onChange={(event) => updateForm('length', Number(event.target.value))} /></label><label>Ancho <span>m</span><input type="number" min="1" value={form.width} onChange={(event) => updateForm('width', Number(event.target.value))} /></label></div>
            <div className="field-grid"><label>Altura <span>m</span><input type="number" min="1" value={form.height} onChange={(event) => updateForm('height', Number(event.target.value))} /></label><label>Modos <span>n.º</span><input type="number" min="1" max="8" value={form.modes} onChange={(event) => updateForm('modes', Number(event.target.value))} /></label></div>
            <label>Material<select value={form.material} onChange={(event) => updateForm('material', event.target.value as typeof form.material)}><option value="concreto">Concreto</option><option value="acero">Acero</option><option value="mixto">Mixto</option></select></label>
            <label>Fuente de excitación<select value={form.excitation} onChange={(event) => updateForm('excitation', event.target.value as typeof form.excitation)}><option value="traffic">Tráfico vehicular</option><option value="seismic">Sísmica</option><option value="wind">Viento</option></select></label>
            <label className="range-label">Intensidad <output>{Math.round(form.intensity * 100)}%</output><input className="range" type="range" min="0.1" max="1" step="0.05" value={form.intensity} onChange={(event) => updateForm('intensity', Number(event.target.value))} /></label>
            <div className="model-actions"><button className="secondary" type="button" onClick={() => void saveModel()}>Guardar modelo</button><label className="import-button" htmlFor="model-import">{importingModels ? 'Importando...' : 'Importar modelos'}</label><input id="model-import" className="model-import-input" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => void importModels(event)} disabled={importingModels} /><button className="primary" disabled={loading || importingModels}>{loading ? 'Procesando...' : 'Ejecutar simulación'} <span>→</span></button></div>
          </form>
          {modelError && <p className="error-message">{modelError}</p>}
          {error && <p className="error-message">{error}. Verifica que la API esté disponible.</p>}
          <p className="helper"><span>i</span> Motor simplificado de demostración · resultados sujetos a validación de ingeniería</p>
        </aside>
        <section className="results">
          <div className="metrics"><Metric label="Desplazamiento pico" value={`${result.peak_displacement} m`} trend="Respuesta máxima" /><Metric label="Aceleración pico" value={`${result.peak_acceleration} m/s²`} trend="En el tablero" /><Metric label="Puntos sugeridos" value={String(result.monitoring_points.length).padStart(2, '0')} trend="Para instrumentar" /></div>

          <div className="panel" style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 22px rgba(19, 33, 39, 0.04)' }}>
            <div style={{ display: 'flex', gap: '10px', padding: '14px 18px 0', borderBottom: activePanel === 'ai' ? '1px solid #edf1ef' : 'none' }}>
              <button type="button" onClick={() => setActivePanel('ai')} style={{ border: '1px solid #dfe5e2', background: activePanel === 'ai' ? '#0f5d57' : '#fff', color: activePanel === 'ai' ? '#fff' : '#1c2c32', borderRadius: '999px', padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Resultados IA</button>
              <button type="button" onClick={() => setActivePanel('history')} style={{ border: '1px solid #dfe5e2', background: activePanel === 'history' ? '#0f5d57' : '#fff', color: activePanel === 'history' ? '#fff' : '#1c2c32', borderRadius: '999px', padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Modelos y simulaciones</button>
            </div>

            {activePanel === 'ai' ? (
              aiAnalysis && (
                <div aria-label="Análisis del agente IA" style={aiPanelStyles.panel}>
                  <div style={aiPanelStyles.header}>
                    <div style={aiPanelStyles.headerCopy}>
                      <span className="section-kicker">02 / IA</span>
                      <h2 style={aiPanelStyles.title}>Agente de análisis</h2>
                    </div>
                    <span
                      style={{
                        ...aiPanelStyles.risk,
                        background:
                          aiAnalysis.overall_risk === 'critical'
                            ? '#d94b4b'
                            : aiAnalysis.overall_risk === 'high'
                              ? '#e87a3d'
                              : aiAnalysis.overall_risk === 'medium'
                                ? '#e5bf52'
                                : '#44a17a',
                        color: '#ffffff',
                      }}
                    >
                      {formatRiskLabel(aiAnalysis.overall_risk)}
                    </span>
                  </div>

                  <div style={aiPanelStyles.body}>
                    <p style={aiPanelStyles.summary}>{aiAnalysis.summary}</p>

                    {aiAnalysis.plan_3d && (
                      <div style={aiPanelStyles.plan}>
                        <h3 style={aiPanelStyles.planTitle}>{aiAnalysis.plan_3d.title}</h3>
                        <p style={aiPanelStyles.planText}>{aiAnalysis.plan_3d.summary}</p>
                        <div style={aiPanelStyles.planMeta}>
                          <span><strong>Hotspots:</strong> {aiAnalysis.plan_3d.hotspot_zones.join(', ') || 'Ninguno'}</span>
                          <span><strong>Sensores:</strong> {aiAnalysis.plan_3d.sensor_positions.map((value) => `${Math.round(value * 100)}%`).join(' · ') || 'Ninguna'}</span>
                        </div>
                      </div>
                    )}

                    <div style={aiPanelStyles.grid}>
                      <div style={aiPanelStyles.card}>
                        <h3 style={aiPanelStyles.cardTitle}>Prioridades</h3>
                        {aiAnalysis.priority_zones.map((zone) => (
                          <div key={zone.zone_label} style={aiPanelStyles.row}>
                            <div style={aiPanelStyles.rowHead}>
                              <strong style={aiPanelStyles.rowLabel}>{zone.zone_label}</strong>
                              <span style={aiPanelStyles.rowBadge}>{zone.priority}</span>
                            </div>
                            <small style={aiPanelStyles.rowText}>{zone.reason}</small>
                          </div>
                        ))}
                      </div>

                      <div style={aiPanelStyles.card}>
                        <h3 style={aiPanelStyles.cardTitle}>Recomendación de sensores</h3>
                        {aiAnalysis.monitoring_recommendations.map((item) => (
                          <div key={`${item.zone_label}-${item.position}`} style={aiPanelStyles.row}>
                            <div style={aiPanelStyles.rowHead}>
                              <strong style={aiPanelStyles.rowLabel}>{item.zone_label}</strong>
                              <span style={aiPanelStyles.rowBadge}>{item.recommended_sensors} sensor(es)</span>
                            </div>
                            <small style={aiPanelStyles.rowText}>{item.reason}</small>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={aiPanelStyles.actionsBlock}>
                      <h3 style={aiPanelStyles.actionsTitle}>Acciones recomendadas</h3>
                      <ul style={aiPanelStyles.actionsList}>
                        {aiAnalysis.recommended_actions.map((action) => <li key={action}>{action}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div style={{ padding: '8px 0 0' }}>
                <HistoryPanel token={token} selectedId={result.simulation_id} onSelect={selectResult} />
              </div>
            )}
          </div>

          <div className="panel bridge-panel"><div className="panel-heading"><div><span className="section-kicker">03 / Visualización 3D</span><h2>{result.model.name}</h2></div><div className="legend"><span><i className="legend-dot critical" /> Crítica</span><span><i className="legend-dot high" /> Alta</span><span><i className="legend-dot medium" /> Media</span></div></div><BridgeScene3D model={result.model} zones={result.zones} monitoringPoints={result.monitoring_points} /></div>
          <div className="lower-grid"><div className="panel severity-panel"><div className="panel-heading compact"><div><span className="section-kicker">04 / Diagnóstico</span><h2>Zonas por severidad</h2></div></div>{result.zones.map((zone) => <div className="severity-row" key={zone.label}><span className={`severity-bar ${zone.severity}`} /><strong>{zone.label}</strong><span className="severity-type">{severityLabels[zone.severity]}</span><span className="severity-value">{zone.displacement.toFixed(3)} m</span></div>)}</div><div className="panel recommendation"><span className="section-kicker">05 / Instrumentación</span><h2>Ubicaciones recomendadas</h2>{result.monitoring_points.map((point, index) => <div className="recommendation-row" key={`${point.position}-${index}`}><span className="sensor-badge">{String(index + 1).padStart(2, '0')}</span><div><strong>{point.reason}</strong><small>Posición {Math.round(point.position * 100)}% del tablero</small></div><span className="priority">{point.priority === 'high' ? 'Prioridad alta' : 'Recomendada'}</span></div>)}{result.simulation_id !== 'demo' && <div className="export-actions"><button type="button" onClick={() => void exportSimulation(result.simulation_id, token, 'html')}>Informe HTML</button><button type="button" onClick={() => void exportSimulation(result.simulation_id, token, 'json')}>Exportar JSON</button><button type="button" onClick={() => void exportSimulation(result.simulation_id, token, 'csv')}>Exportar CSV</button></div>}</div></div>
        </section>
      </div>
      <footer>Motor de simulación v0.1 <span>•</span> Visualización WebGL interactiva <span>•</span> Los resultados requieren validación de ingeniería</footer>
    </main>
  )
}

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small><i /> {trend}</small></div> }

function parseModelFile(content: string, fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop()
  const records: unknown = extension === 'json' ? JSON.parse(content) : parseModelCsv(content)
  const models = Array.isArray(records) ? records : (records as { structural_models?: unknown[] })?.structural_models
  if (!Array.isArray(models) || models.length === 0) throw new Error('El archivo no contiene modelos estructurales')
  return models.map((record, index) => {
    if (!record || typeof record !== 'object') throw new Error(`Modelo ${index + 1} inválido`)
    const candidate = record as Record<string, unknown>
    const model = { name: String(candidate.name ?? '').trim(), length: Number(candidate.length), width: Number(candidate.width), height: Number(candidate.height), material: candidate.material }
    if (model.name.length < 2 || !Number.isFinite(model.length) || model.length <= 0 || !Number.isFinite(model.width) || model.width <= 0 || !Number.isFinite(model.height) || model.height <= 0 || !['concreto', 'acero', 'mixto'].includes(String(model.material))) throw new Error(`Modelo ${index + 1} tiene datos inválidos`)
    return { ...model, material: String(model.material) as StructuralModelRecord['material'] }
  })
}

function parseModelCsv(content: string) {
  const rows = content.split(/\r?\n/).map((row) => row.trim()).filter(Boolean)
  if (rows.length < 2) return []
  const headers = rows[0].split(',').map((header) => header.trim().toLowerCase())
  return rows.slice(1).map((row) => {
    const values = row.split(',').map((value) => value.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]))
  })
}
