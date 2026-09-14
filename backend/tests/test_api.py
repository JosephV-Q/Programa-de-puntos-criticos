import os
from uuid import uuid4

import pytest

if not os.getenv("TEST_DATABASE_URL"):
    pytest.skip("TEST_DATABASE_URL apunta a una instancia PostgreSQL de pruebas", allow_module_level=True)
os.environ.setdefault("DATABASE_URL", os.environ["TEST_DATABASE_URL"])

from fastapi.testclient import TestClient

from app.auth.database import create_tables
from app.auth.database import SessionLocal
from app.auth.models import User
from app.auth.security import hash_password
from app.main import app

client = TestClient(app)
create_tables()


def create_admin_token() -> str:
    email = f"admin-{uuid4()}@example.com"
    with SessionLocal() as database:
        user = User(name="Admin de Prueba", email=email, password_hash=hash_password("adminpass123"), role="admin")
        database.add(user)
        database.commit()
    response = client.post("/api/auth/login", json={"email": email, "password": "adminpass123"})
    return response.json()["access_token"]


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_simulation_requires_authentication():
    response = client.post(
        "/api/simulations",
        json={
            "model": {"name": "Puente", "length": 100, "width": 8, "height": 15},
            "parameters": {"excitation": "traffic", "intensity": 0.5, "modes": 2},
        },
    )
    assert response.status_code == 401


def test_simulation_endpoint():
    email = f"engineer-{uuid4()}@example.com"
    register = client.post(
        "/api/auth/register",
        json={"name": "Ingeniera de Prueba", "email": email, "password": "password123"},
    )
    assert register.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    response = client.post(
        "/api/simulations",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        json={
            "model": {"name": "Viaducto Norte", "length": 140, "width": 10, "height": 20, "material": "mixto"},
            "parameters": {"excitation": "seismic", "intensity": 0.7, "modes": 4},
        },
    )
    assert response.status_code == 200
    assert response.json()["monitoring_points"]


def test_public_registration_cannot_create_admin():
    email = f"user-{uuid4()}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"name": "Usuario", "email": email, "password": "password123", "role": "admin"},
    )
    assert response.status_code == 201
    assert response.json()["role"] == "structural_engineer"


def test_admin_can_list_and_change_user_roles():
    token = create_admin_token()
    email = f"managed-{uuid4()}@example.com"
    created = client.post(
        "/api/auth/register",
        json={"name": "Usuario Gestionado", "email": email, "password": "password123"},
    )
    user_id = created.json()["id"]
    headers = {"Authorization": f"Bearer {token}"}
    listed = client.get("/api/auth/users", headers=headers)
    assert listed.status_code == 200
    assert any(user["id"] == user_id for user in listed.json())
    updated = client.patch(
        f"/api/auth/users/{user_id}/role",
        headers=headers,
        json={"role": "instrumentation_specialist"},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "instrumentation_specialist"


def test_regular_user_cannot_manage_users():
    email = f"regular-{uuid4()}@example.com"
    registered = client.post(
        "/api/auth/register",
        json={"name": "Usuario Regular", "email": email, "password": "password123"},
    )
    login = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    response = client.get("/api/auth/users", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert registered.status_code == 201
    assert response.status_code == 403


def test_simulation_is_persisted_and_exportable():
    email = f"export-{uuid4()}@example.com"
    client.post("/api/auth/register", json={"name": "Exportador", "email": email, "password": "password123"})
    token = client.post("/api/auth/login", json={"email": email, "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    simulation = client.post(
        "/api/simulations",
        headers=headers,
        json={"model": {"name": "Puente Guardado", "length": 100, "width": 8, "height": 15}, "parameters": {"intensity": 0.5, "modes": 2}},
    )
    simulation_id = simulation.json()["simulation_id"]
    history = client.get("/api/simulations", headers=headers)
    detail = client.get(f"/api/simulations/{simulation_id}", headers=headers)
    export = client.get(f"/api/simulations/{simulation_id}/export?format=csv", headers=headers)
    report = client.get(f"/api/simulations/{simulation_id}/export?format=html", headers=headers)
    assert simulation.status_code == 200
    assert any(item["simulation_id"] == simulation_id for item in history.json())
    assert detail.status_code == 200
    assert detail.json()["model"]["name"] == "Puente Guardado"
    assert export.status_code == 200
    assert "text/csv" in export.headers["content-type"]
    assert report.status_code == 200
    assert "Informe de simulación estructural" in report.text
