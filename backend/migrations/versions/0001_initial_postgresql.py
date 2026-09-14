"""Create the initial PostgreSQL schema.

Revision ID: 0001_initial_postgresql
Revises:
Create Date: 2026-09-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_postgresql"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "structural_models",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("length", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("material", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_structural_models_owner_id", "structural_models", ["owner_id"])

    op.create_table(
        "simulations",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("model_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("excitation", sa.String(length=20), nullable=False),
        sa.Column("intensity", sa.Float(), nullable=False),
        sa.Column("modes", sa.Integer(), nullable=False),
        sa.Column("peak_displacement", sa.Float(), nullable=False),
        sa.Column("peak_acceleration", sa.Float(), nullable=False),
        sa.Column("zones", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("monitoring_points", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["model_id"], ["structural_models.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("intensity > 0 AND intensity <= 1", name="ck_simulations_intensity_range"),
        sa.CheckConstraint("modes >= 1 AND modes <= 8", name="ck_simulations_modes_range"),
    )
    op.create_index("ix_simulations_owner_id", "simulations", ["owner_id"])
    op.create_index("ix_simulations_model_id", "simulations", ["model_id"])


def downgrade() -> None:
    op.drop_index("ix_simulations_model_id", table_name="simulations")
    op.drop_index("ix_simulations_owner_id", table_name="simulations")
    op.drop_table("simulations")
    op.drop_index("ix_structural_models_owner_id", table_name="structural_models")
    op.drop_table("structural_models")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
