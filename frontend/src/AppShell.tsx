import { FormEvent, useState } from "react";
import { BridgeScene3D } from "./components/BridgeScene3D";
import { UserPanel } from "./components/UserPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import type { User } from "./models/auth";
import { exportSimulation } from "./services/simulationService";
import type { Severity, SimulationResult } from "./models/simulation";
import { useSimulationViewModel } from "./viewmodels/useSimulationViewModel";

const severityLabels: Record<Severity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const demoResult: SimulationResult = {
  simulation_id: "demo",
  model: {
    name: "Puente Central",
    length: 120,
    width: 9,
    height: 18,
    material: "concreto",
  },
  parameters: { excitation: "traffic", intensity: 0.65, modes: 3 },
  peak_displacement: 0.042,
  peak_acceleration: 0.51,
  zones: [
    {
      position: 0.25,
      label: "Zona 3",
      severity: "high",
      displacement: 0.032,
      acceleration: 0.44,
    },
    {
      position: 0.375,
      label: "Zona 4",
      severity: "critical",
      displacement: 0.042,
      acceleration: 0.51,
    },
    {
      position: 0.5,
      label: "Zona 5",
      severity: "high",
      displacement: 0.039,
      acceleration: 0.48,
    },
    {
      position: 0.625,
      label: "Zona 6",
      severity: "medium",
      displacement: 0.029,
      acceleration: 0.39,
    },
    {
      position: 0.75,
      label: "Zona 7",
      severity: "medium",
      displacement: 0.021,
      acceleration: 0.31,
    },
  ],
  monitoring_points: [
    { position: 0.375, reason: "Máxima respuesta dinámica", priority: "high" },
    { position: 0.625, reason: "Cambio de curvatura", priority: "recommended" },
  ],
};

export function AppShell({
  user,
  token,
  onLogout,
}: {
  user: User;
  token: string;
  onLogout: () => void;
}) {
  const [showUserPanel, setShowUserPanel] = useState(false);
  const {
    form,
    result,
    loading,
    error,
    updateForm,
    executeSimulation,
    selectResult,
  } = useSimulationViewModel(demoResult, token);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void executeSimulation();
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">PC</span>
          <div>
            <strong>Puntos Críticos</strong>
            <small>Centro de análisis estructural</small>
          </div>
        </div>
        <div className="top-actions">
          <span className="status-dot" /> Sistema operativo{" "}
          <button
            className="avatar"
            aria-label="Abrir panel de usuario"
            onClick={() => setShowUserPanel((visible) => !visible)}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>
      {showUserPanel && (
        <UserPanel
          user={user}
          token={token}
          onLogout={onLogout}
          onClose={() => setShowUserPanel(false)}
        />
      )}
      <section className="intro">
        <div>
          <p className="eyebrow">Centro de análisis / Proyecto activo</p>
          <h1>
            Lectura dinámica del <em>{form.name}</em>
          </h1>
          <p className="subcopy">
            Simula vibraciones, localiza respuestas críticas y prepara tu red de
            instrumentación.
          </p>
        </div>
        <div className="run-meta">
          <span>Última simulación</span>
          <strong>{loading ? "Procesando..." : "Lista para ejecutar"}</strong>
          <span className="live-pill">● Modelo conectado</span>
        </div>
      </section>
      <div className="workspace">
        <aside className="panel controls">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">01 / Entrada</span>
              <h2>Parámetros del modelo</h2>
            </div>
            <span className="panel-icon">⌁</span>
          </div>
          <form onSubmit={submit}>
            <label>
              Nombre de la estructura
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </label>
            <div className="field-grid">
              <label>
                Longitud <span>m</span>
                <input
                  type="number"
                  min="1"
                  value={form.length}
                  onChange={(event) =>
                    updateForm("length", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Ancho <span>m</span>
                <input
                  type="number"
                  min="1"
                  value={form.width}
                  onChange={(event) =>
                    updateForm("width", Number(event.target.value))
                  }
                />
              </label>
            </div>
            <div className="field-grid">
              <label>
                Altura <span>m</span>
                <input
                  type="number"
                  min="1"
                  value={form.height}
                  onChange={(event) =>
                    updateForm("height", Number(event.target.value))
                  }
                />
              </label>
              <label>
                Modos <span>n.º</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={form.modes}
                  onChange={(event) =>
                    updateForm("modes", Number(event.target.value))
                  }
                />
              </label>
            </div>
            <label>
              Material
              <select
                value={form.material}
                onChange={(event) =>
                  updateForm(
                    "material",
                    event.target.value as typeof form.material,
                  )
                }
              >
                <option value="concreto">Concreto</option>
                <option value="acero">Acero</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
            <label>
              Fuente de excitación
              <select
                value={form.excitation}
                onChange={(event) =>
                  updateForm(
                    "excitation",
                    event.target.value as typeof form.excitation,
                  )
                }
              >
                <option value="traffic">Tráfico vehicular</option>
                <option value="seismic">Sísmica</option>
                <option value="wind">Viento</option>
              </select>
            </label>
            <label className="range-label">
              Intensidad <output>{Math.round(form.intensity * 100)}%</output>
              <input
                className="range"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={form.intensity}
                onChange={(event) =>
                  updateForm("intensity", Number(event.target.value))
                }
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "Procesando..." : "Ejecutar simulación"} <span>→</span>
            </button>
          </form>
          {error && (
            <p className="error-message">
              {error}. Verifica que la API esté disponible.
            </p>
          )}
          <p className="helper">
            <span>i</span> Motor simplificado de demostración · resultados
            sujetos a validación de ingeniería
          </p>
        </aside>
        <section className="results">
          <div className="metrics">
            <Metric
              label="Desplazamiento pico"
              value={`${result.peak_displacement} m`}
              trend="Respuesta máxima"
            />
            <Metric
              label="Aceleración pico"
              value={`${result.peak_acceleration} m/s²`}
              trend="En el tablero"
            />
            <Metric
              label="Puntos sugeridos"
              value={String(result.monitoring_points.length).padStart(2, "0")}
              trend="Para instrumentar"
            />
          </div>
          <div className="panel bridge-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">02 / Visualización 3D</span>
                <h2>Modelo de respuesta</h2>
              </div>
              <div className="legend">
                <span>
                  <i className="legend-dot critical" /> Crítica
                </span>
                <span>
                  <i className="legend-dot high" /> Alta
                </span>
                <span>
                  <i className="legend-dot medium" /> Media
                </span>
              </div>
            </div>
            <BridgeScene3D
              zones={result.zones}
              monitoringPoints={result.monitoring_points}
            />
          </div>
          <div className="lower-grid">
            <div className="panel severity-panel">
              <div className="panel-heading compact">
                <div>
                  <span className="section-kicker">03 / Diagnóstico</span>
                  <h2>Zonas por severidad</h2>
                </div>
              </div>
              {result.zones.map((zone) => (
                <div className="severity-row" key={zone.label}>
                  <span className={`severity-bar ${zone.severity}`} />
                  <strong>{zone.label}</strong>
                  <span className="severity-type">
                    {severityLabels[zone.severity]}
                  </span>
                  <span className="severity-value">
                    {zone.displacement.toFixed(3)} m
                  </span>
                </div>
              ))}
            </div>
            <div className="panel recommendation">
              <span className="section-kicker">04 / Instrumentación</span>
              <h2>Ubicaciones recomendadas</h2>
              {result.monitoring_points.map((point, index) => (
                <div
                  className="recommendation-row"
                  key={`${point.position}-${index}`}
                >
                  <span className="sensor-badge">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{point.reason}</strong>
                    <small>
                      Posición {Math.round(point.position * 100)}% del tablero
                    </small>
                  </div>
                  <span className="priority">
                    {point.priority === "high"
                      ? "Prioridad alta"
                      : "Recomendada"}
                  </span>
                </div>
              ))}
              {result.simulation_id !== "demo" && (
                <div className="export-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void exportSimulation(result.simulation_id, token, "html")
                    }
                  >
                    Informe HTML
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void exportSimulation(result.simulation_id, token, "json")
                    }
                  >
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void exportSimulation(result.simulation_id, token, "csv")
                    }
                  >
                    Exportar CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <HistoryPanel
        token={token}
        selectedId={result.simulation_id}
        onSelect={selectResult}
      />
      <footer>
        Motor de simulación v0.1 <span>•</span> Visualización WebGL interactiva{" "}
        <span>•</span> Los resultados requieren validación de ingeniería
      </footer>
    </main>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <i /> {trend}
      </small>
    </div>
  );
}
