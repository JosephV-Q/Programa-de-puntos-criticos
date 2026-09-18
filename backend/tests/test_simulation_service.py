from app.schemas import SimulationParameters, StructuralModel
from app.services.ai_service import analyze_simulation
from app.services.simulation_service import run_simulation


def test_ai_analysis_identifies_critical_zones_and_priorities():
    result = run_simulation(
        StructuralModel(name="Puente Central", length=120, width=9, height=18, material="concreto"),
        SimulationParameters(excitation="seismic", intensity=0.9, modes=5),
    )

    analysis = analyze_simulation(result)

    assert analysis.overall_risk in {"low", "medium", "high", "critical"}
    assert analysis.critical_zone_count >= 1
    assert analysis.priority_zones
    assert analysis.monitoring_recommendations
    assert analysis.plan_3d is not None
    assert analysis.plan_3d.generated is True
    assert any(item.priority == "Alta" for item in analysis.priority_zones)


def test_simulation_returns_critical_zones_and_monitoring_points():
    result = run_simulation(
        StructuralModel(name="Puente Central", length=120, width=9, height=18),
        SimulationParameters(excitation="traffic", intensity=0.8),
    )

    assert result.peak_displacement > 0
    assert result.zones
    assert any(zone.severity in {"high", "critical"} for zone in result.zones)
    assert result.monitoring_points


def test_material_changes_response():
    model = StructuralModel(name="Puente", length=80, width=8, height=12)
    concrete = run_simulation(model, SimulationParameters())
    steel = run_simulation(model.model_copy(update={"material": "acero"}), SimulationParameters())

    assert steel.peak_displacement < concrete.peak_displacement
