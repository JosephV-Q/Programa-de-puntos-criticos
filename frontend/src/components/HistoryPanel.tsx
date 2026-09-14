import { useEffect, useState } from "react";
import type {
  SimulationResult,
  SimulationSummary,
  StructuralModelRecord,
} from "../models/simulation";
import {
  getSimulation,
  listModels,
  listSimulations,
} from "../services/simulationService";

type Props = {
  token: string;
  selectedId: string;
  onSelect: (result: SimulationResult) => void;
};

const excitationLabels = {
  traffic: "Tráfico",
  seismic: "Sísmica",
  wind: "Viento",
} as const;

export function HistoryPanel({ token, selectedId, onSelect }: Props) {
  const [models, setModels] = useState<StructuralModelRecord[]>([]);
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([listModels(token), listSimulations(token)])
      .then(([loadedModels, loadedSimulations]) => {
        setModels(loadedModels);
        setSimulations(loadedSimulations);
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el historial",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, selectedId]);

  async function selectSimulation(simulationId: string) {
    try {
      onSelect(await getSimulation(simulationId, token));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo abrir la simulación",
      );
    }
  }

  return (
    <section className="history-section">
      <div className="history-heading">
        <div>
          <span className="section-kicker">05 / Registro</span>
          <h2>Modelos y simulaciones guardadas</h2>
        </div>
        <span className="history-count">{simulations.length} simulaciones</span>
      </div>
      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p className="history-empty">Cargando registro...</p>
      ) : (
        <div className="history-grid">
          <div className="history-column">
            <h3>Modelos estructurales</h3>
            {models.length === 0 ? (
              <p className="history-empty">Todavía no hay modelos guardados.</p>
            ) : (
              models.map((model) => (
                <div className="history-model" key={model.id}>
                  <strong>{model.name}</strong>
                  <span>
                    {model.material} · {model.length} m × {model.width} m
                  </span>
                  <small>
                    Creado{" "}
                    {new Date(model.created_at).toLocaleDateString("es-CO")}
                  </small>
                </div>
              ))
            )}
          </div>
          <div className="history-column">
            <h3>Últimas simulaciones</h3>
            {simulations.length === 0 ? (
              <p className="history-empty">
                Ejecuta una simulación para verla aquí.
              </p>
            ) : (
              simulations.map((simulation) => (
                <button
                  className={`history-simulation ${selectedId === simulation.simulation_id ? "selected" : ""}`}
                  type="button"
                  key={simulation.simulation_id}
                  onClick={() =>
                    void selectSimulation(simulation.simulation_id)
                  }
                >
                  <span className="history-simulation-top">
                    <strong>{simulation.model_name}</strong>
                    <small>
                      {new Date(simulation.created_at).toLocaleString("es-CO")}
                    </small>
                  </span>
                  <span className="history-simulation-meta">
                    {excitationLabels[simulation.excitation]} · intensidad{" "}
                    {Math.round(simulation.intensity * 100)}% ·{" "}
                    {simulation.modes} modos
                  </span>
                  <span className="history-simulation-result">
                    Pico {simulation.peak_displacement.toFixed(4)} m ·{" "}
                    {simulation.peak_acceleration.toFixed(3)} m/s²
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
