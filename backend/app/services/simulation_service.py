from math import pi, sin
from uuid import uuid4

from app.schemas import (
    CriticalZone,
    MonitoringPoint,
    SimulationParameters,
    SimulationResult,
    StructuralModel,
)


def _severity(displacement: float, peak: float) -> str:
    ratio = displacement / peak if peak else 0
    if ratio >= 0.9:
        return "critical"
    if ratio >= 0.7:
        return "high"
    if ratio >= 0.45:
        return "medium"
    return "low"


def run_simulation(model: StructuralModel, parameters: SimulationParameters) -> SimulationResult:
    """Placeholder deterministic vibration model, ready to be replaced by FEM/SciPy."""
    material_factor = {"concreto": 1.0, "acero": 0.72, "mixto": 0.84}[model.material]
    excitation_factor = {"seismic": 1.35, "traffic": 1.0, "wind": 0.8}[parameters.excitation]
    geometry_factor = (model.length / model.width) * (1 + model.height / 100)
    peak_displacement = round(0.018 * geometry_factor * material_factor * excitation_factor * parameters.intensity, 5)
    peak_acceleration = round(peak_displacement * 9.81 * (1 + parameters.modes * 0.12), 5)

    samples = []
    for index in range(9):
        position = index / 8
        shape = abs(sin(pi * position))
        displacement = round(peak_displacement * shape, 5)
        acceleration = round(peak_acceleration * (0.55 + 0.45 * shape), 5)
        samples.append((position, displacement, acceleration))

    zones = [
        CriticalZone(
            position=position,
            label=f"Zona {index + 1}",
            severity=_severity(displacement, peak_displacement),
            displacement=displacement,
            acceleration=acceleration,
        )
        for index, (position, displacement, acceleration) in enumerate(samples)
        if displacement >= peak_displacement * 0.4
    ]
    monitoring_points = [
        MonitoringPoint(position=zone.position, reason="Máxima respuesta dinámica", priority="high")
        for zone in zones
        if zone.severity in {"high", "critical"}
    ]
    return SimulationResult(
        simulation_id=str(uuid4()),
        model=model,
        parameters=parameters,
        peak_displacement=peak_displacement,
        peak_acceleration=peak_acceleration,
        zones=zones,
        monitoring_points=monitoring_points,
    )
