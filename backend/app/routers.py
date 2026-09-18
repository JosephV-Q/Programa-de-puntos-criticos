import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.auth.models import User
from app.persistence_models import SimulationRecord, StructuralModelRecord
from app.schemas import (
    SimulationRequest,
    SimulationResult,
    SimulationSummary,
    StructuralModel,
    StructuralModelResponse,
)
from app.services.ai_service import analyze_simulation
from app.services.simulation_service import run_simulation

router = APIRouter(prefix="/api", tags=["simulaciones"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "puentes-criticos-api"}


@router.post(
    "/simulations",
    response_model=SimulationResult,
    dependencies=[Depends(require_roles("admin", "structural_engineer"))],
)
def create_simulation(
    request: SimulationRequest,
    database: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "structural_engineer")),
) -> SimulationResult:
    model_record = database.get(StructuralModelRecord, request.model_id) if request.model_id else None
    if model_record is not None and model_record.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo no encontrado")
    if model_record is None:
        model_record = StructuralModelRecord(owner_id=user.id, **request.model.model_dump())
        database.add(model_record)
        database.flush()
    simulation_model = StructuralModel(
        name=model_record.name,
        length=model_record.length,
        width=model_record.width,
        height=model_record.height,
        material=model_record.material,
    )
    result = run_simulation(simulation_model, request.parameters)
    result.ai_analysis = analyze_simulation(result)
    database.add(
        SimulationRecord(
            id=result.simulation_id,
            owner_id=user.id,
            model_id=model_record.id,
            excitation=request.parameters.excitation,
            intensity=request.parameters.intensity,
            modes=request.parameters.modes,
            peak_displacement=result.peak_displacement,
            peak_acceleration=result.peak_acceleration,
            zones=[zone.model_dump() for zone in result.zones],
            monitoring_points=[point.model_dump() for point in result.monitoring_points],
        )
    )
    database.commit()
    return result


@router.post(
    "/models",
    response_model=StructuralModelResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "structural_engineer"))],
)
def create_model(
    request: StructuralModel,
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StructuralModelRecord:
    model_record = StructuralModelRecord(owner_id=user.id, **request.model_dump())
    database.add(model_record)
    database.commit()
    database.refresh(model_record)
    return model_record


@router.get("/models", response_model=list[StructuralModelResponse])
def list_models(
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[StructuralModelRecord]:
    query = select(StructuralModelRecord)
    if user.role != "instrumentation_specialist":
        query = query.where(StructuralModelRecord.owner_id == user.id)
    return list(database.scalars(query.order_by(StructuralModelRecord.created_at.desc())).all())


@router.get("/simulations", response_model=list[SimulationSummary])
def list_simulations(
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SimulationSummary]:
    query = (
        select(SimulationRecord, StructuralModelRecord.name)
        .join(StructuralModelRecord, SimulationRecord.model_id == StructuralModelRecord.id)
        .order_by(SimulationRecord.created_at.desc())
    )
    if user.role != "instrumentation_specialist":
        query = query.where(SimulationRecord.owner_id == user.id)
    return [
        SimulationSummary(
            simulation_id=record.id,
            model_id=record.model_id,
            model_name=model_name,
            excitation=record.excitation,
            intensity=record.intensity,
            modes=record.modes,
            peak_displacement=record.peak_displacement,
            peak_acceleration=record.peak_acceleration,
            created_at=record.created_at,
        )
        for record, model_name in database.execute(query).all()
    ]


@router.get("/simulations/{simulation_id}", response_model=SimulationResult)
def get_simulation(
    simulation_id: str,
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SimulationResult:
    record = database.get(SimulationRecord, simulation_id)
    if record is None or (record.owner_id != user.id and user.role != "instrumentation_specialist"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulación no encontrada")
    model = database.get(StructuralModelRecord, record.model_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo estructural no encontrado")
    return SimulationResult(
        simulation_id=record.id,
        model=StructuralModel(
            name=model.name,
            length=model.length,
            width=model.width,
            height=model.height,
            material=model.material,
        ),
        parameters={"excitation": record.excitation, "intensity": record.intensity, "modes": record.modes},
        peak_displacement=record.peak_displacement,
        peak_acceleration=record.peak_acceleration,
        zones=record.zones,
        monitoring_points=record.monitoring_points,
    )


@router.get("/simulations/{simulation_id}/export")
def export_simulation(
    simulation_id: str,
    format: str = Query("json", pattern="^(json|csv|html)$"),
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    record = database.get(SimulationRecord, simulation_id)
    if record is None or (record.owner_id != user.id and user.role != "instrumentation_specialist"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulación no encontrada")
    payload = {
        "simulation_id": record.id,
        "model_id": record.model_id,
        "excitation": record.excitation,
        "intensity": record.intensity,
        "modes": record.modes,
        "peak_displacement": record.peak_displacement,
        "peak_acceleration": record.peak_acceleration,
        "zones": record.zones,
        "monitoring_points": record.monitoring_points,
        "created_at": record.created_at.isoformat(),
    }
    if format == "json":
        return Response(
            content=json.dumps(payload, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="simulacion-{record.id}.json"'},
        )
    if format == "html":
        rows = "".join(
            f"<tr><td>{zone['label']}</td><td>{zone['position']:.3f}</td><td>{zone['severity']}</td>"
            f"<td>{zone['displacement']:.5f} m</td><td>{zone['acceleration']:.5f} m/s²</td></tr>"
            for zone in record.zones
        )
        report = f"""<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>Informe {record.id}</title>
<style>body{{font-family:Arial,sans-serif;color:#172229;max-width:900px;margin:40px auto}}h1{{color:#087e74}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #dce0dc;padding:8px;text-align:left}}th{{background:#e5f2ed}}</style>
<h1>Informe de simulación estructural</h1><p><strong>ID:</strong> {record.id}</p><p><strong>Fecha:</strong> {record.created_at.isoformat()}</p>
<h2>Parámetros</h2><p>Excitación: {record.excitation} · Intensidad: {record.intensity} · Modos: {record.modes}</p>
<p>Desplazamiento pico: <strong>{record.peak_displacement} m</strong> · Aceleración pico: <strong>{record.peak_acceleration} m/s²</strong></p>
<h2>Zonas críticas</h2><table><thead><tr><th>Zona</th><th>Posición</th><th>Severidad</th><th>Desplazamiento</th><th>Aceleración</th></tr></thead><tbody>{rows}</tbody></table></html>"""
        return Response(
            content=report,
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="informe-{record.id}.html"'},
        )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["simulation_id", "position", "label", "severity", "displacement", "acceleration"])
    for zone in record.zones:
        writer.writerow([record.id, zone["position"], zone["label"], zone["severity"], zone["displacement"], zone["acceleration"]])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="simulacion-{record.id}.csv"'},
    )
