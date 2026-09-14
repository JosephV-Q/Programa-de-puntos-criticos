from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StructuralModel(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    length: float = Field(gt=0, description="Longitud total en metros")
    width: float = Field(gt=0, description="Ancho del tablero en metros")
    height: float = Field(gt=0, description="Altura de referencia en metros")
    material: Literal["concreto", "acero", "mixto"] = "concreto"


class SimulationParameters(BaseModel):
    excitation: Literal["seismic", "traffic", "wind"] = "traffic"
    intensity: float = Field(default=0.65, gt=0, le=1)
    modes: int = Field(default=3, ge=1, le=8)


class SimulationRequest(BaseModel):
    model: StructuralModel
    parameters: SimulationParameters


class StructuralModelResponse(StructuralModel):
    id: str
    owner_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CriticalZone(BaseModel):
    position: float = Field(ge=0, le=1)
    label: str
    severity: Literal["low", "medium", "high", "critical"]
    displacement: float
    acceleration: float


class MonitoringPoint(BaseModel):
    position: float = Field(ge=0, le=1)
    reason: str
    priority: Literal["recommended", "high"]


class SimulationResult(BaseModel):
    simulation_id: str
    model: StructuralModel
    parameters: SimulationParameters
    peak_displacement: float
    peak_acceleration: float
    zones: list[CriticalZone]
    monitoring_points: list[MonitoringPoint]


class SimulationStatus(BaseModel):
    simulation_id: str
    status: Literal["completed"]
    result: SimulationResult


class SimulationSummary(BaseModel):
    simulation_id: str
    model_id: str
    model_name: str
    excitation: str
    intensity: float
    modes: int
    peak_displacement: float
    peak_acceleration: float
    created_at: datetime


UserRole = Literal["admin", "structural_engineer", "instrumentation_specialist"]


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "structural_engineer"


class UserLogin(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    user: UserResponse
