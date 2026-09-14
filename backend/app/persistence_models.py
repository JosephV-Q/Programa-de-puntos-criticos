from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, String, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.database import Base


class StructuralModelRecord(Base):
    __tablename__ = "structural_models"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    owner_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    length: Mapped[float] = mapped_column(Float, nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False)
    height: Mapped[float] = mapped_column(Float, nullable=False)
    material: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class SimulationRecord(Base):
    __tablename__ = "simulations"
    __table_args__ = (
        CheckConstraint("intensity > 0 AND intensity <= 1", name="ck_simulations_intensity_range"),
        CheckConstraint("modes >= 1 AND modes <= 8", name="ck_simulations_modes_range"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    owner_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), index=True, nullable=False)
    model_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("structural_models.id"), index=True, nullable=False)
    excitation: Mapped[str] = mapped_column(String(20), nullable=False)
    intensity: Mapped[float] = mapped_column(Float, nullable=False)
    modes: Mapped[int] = mapped_column(nullable=False)
    peak_displacement: Mapped[float] = mapped_column(Float, nullable=False)
    peak_acceleration: Mapped[float] = mapped_column(Float, nullable=False)
    zones: Mapped[list] = mapped_column(JSONB, nullable=False)
    monitoring_points: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
