from __future__ import annotations

from app.schemas import AIAnalysis, AIPlan3D, AIMonitoringRecommendation, AIZonePriority, SimulationResult


def _risk_from_score(score: float) -> str:
    if score >= 0.85:
        return "critical"
    if score >= 0.7:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def analyze_simulation(result: SimulationResult) -> AIAnalysis:
    """Deterministic IA helper for bridge critical-zone prioritization.

    It evaluates displacement and acceleration patterns to highlight the most critical
    sections and suggests how many sensors would be reasonable for monitoring.
    """
    if not result.zones:
        return AIAnalysis(
            overall_risk="low",
            critical_zone_count=0,
            summary="No se detectaron zonas con respuesta crítica en esta simulación.",
            priority_zones=[],
            monitoring_recommendations=[],
            recommended_actions=["Revisar parámetros de excitación y validar los datos de entrada."],
        )

    max_displacement = max(zone.displacement for zone in result.zones)
    max_acceleration = max(zone.acceleration for zone in result.zones)
    critical_zones = [zone for zone in result.zones if zone.severity in {"high", "critical"}]

    priority_items: list[AIZonePriority] = []
    for zone in sorted(result.zones, key=lambda item: (item.severity != "critical", item.severity != "high", item.displacement), reverse=True):
        risk_score = (
            (1.0 if zone.severity == "critical" else 0.75 if zone.severity == "high" else 0.5 if zone.severity == "medium" else 0.2)
            + (zone.displacement / max_displacement if max_displacement else 0) * 0.5
            + (zone.acceleration / max_acceleration if max_acceleration else 0) * 0.5
        )
        severity_label = zone.severity
        priority = "Crítica" if severity_label == "critical" else "Alta" if severity_label == "high" else "Media" if severity_label == "medium" else "Baja"
        reason = (
            "Máxima amplitud de desplazamiento y aceleración en la estructura."
            if zone.severity in {"critical", "high"}
            else "Respuesta moderada con necesidad de supervisión cercana."
        )
        priority_items.append(
            AIZonePriority(
                zone_label=zone.label,
                position=zone.position,
                severity=zone.severity,
                priority=priority,
                reason=reason,
            )
        )

    monitoring_recommendations: list[AIMonitoringRecommendation] = []
    for zone in sorted(result.zones, key=lambda item: item.displacement, reverse=True)[:3]:
        recommended_sensors = 2 if zone.severity == "critical" else 1 if zone.severity == "high" else 1
        monitoring_recommendations.append(
            AIMonitoringRecommendation(
                zone_label=zone.label,
                position=zone.position,
                priority="Crítica" if zone.severity == "critical" else "Alta" if zone.severity == "high" else "Media",
                recommended_sensors=recommended_sensors,
                reason=(
                    "Instalar sensores para seguimiento continuo del comportamiento dinámico."
                    if zone.severity in {"critical", "high"}
                    else "Mantener observación adicional en la zona con respuesta moderada."
                ),
            )
        )

    overall_risk = _risk_from_score(
        min(
            1.0,
            (0.6 if critical_zones else 0.2)
            + (len(critical_zones) / max(len(result.zones), 1)) * 0.4
            + (max_displacement / (max_displacement + 0.02)) * 0.4,
        )
    )

    summary = (
        f"Se detectaron {len(critical_zones)} zonas de alto riesgo y la respuesta crítica se concentra "
        f"en los tramos con mayor desplazamiento y aceleración de la estructura."
        if critical_zones
        else "La estructura presenta una respuesta estable, con algunos puntos de vigilancia moderada."
    )

    recommended_actions = [
        "Inspeccionar visualmente las zonas de máxima respuesta antes de la próxima medición.",
        "Programar revisión de sensores en los puntos de prioridad alta o crítica.",
        "Validar los parámetros de excitación y comparar contra simulaciones anteriores.",
    ]

    hotspot_zones = [zone.label for zone in sorted(result.zones, key=lambda item: item.displacement, reverse=True)[:3]]
    sensor_positions = [round(zone.position, 3) for zone in sorted(result.zones, key=lambda item: item.displacement, reverse=True)[:3]]

    plan_3d = AIPlan3D(
        generated=True,
        title="Plano 3D de respuesta estructural",
        summary=(
            "Se generó un plano 3D del puente con las zonas de mayor respuesta resaltadas y los puntos "
            "recomendados para instrumentación."
        ),
        hotspot_zones=hotspot_zones,
        sensor_positions=sensor_positions,
        camera_position=[340, 150, 420],
    )

    return AIAnalysis(
        overall_risk=overall_risk,
        critical_zone_count=len(critical_zones),
        summary=summary,
        priority_zones=priority_items[:5],
        monitoring_recommendations=monitoring_recommendations,
        recommended_actions=recommended_actions,
        plan_3d=plan_3d,
    )
