# Puntos Críticos

Aplicación web para registrar modelos estructurales de puentes, ejecutar simulaciones de respuesta dinámica, identificar zonas críticas y recomendar puntos de monitoreo.

## Arquitectura

```text
React + TypeScript + Vite
          |
          | HTTP/REST
          v
FastAPI + SQLAlchemy 2
          |
          | PostgreSQL
          v
Neon Console
```

El motor de simulación es determinista y demostrativo. No es un análisis FEM profesional y sus resultados requieren validación de ingeniería.

## Requisitos

- Python 3.12 o compatible.
- Node.js 22 o compatible.
- Una base PostgreSQL accesible. Neon es la base de producción prevista.
- `psycopg` para conectar SQLAlchemy con PostgreSQL.


## Configuración

Copia `.env.example` como `.env` y completa los valores sin subir el archivo al repositorio:

```powershell
Copy-Item .env.example .env
```

Variables principales:

- `DATABASE_URL`: URL PostgreSQL de Neon, normalmente con `postgresql+psycopg://` y `sslmode=require`.
- `JWT_SECRET`: secreto largo y aleatorio para firmar tokens.
- `JWT_EXPIRE_MINUTES`: duración del token JWT.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: administrador opcional creado al iniciar la API después de aplicar migraciones.
- `VITE_API_URL`: URL base de la API, por defecto `http://localhost:8000/api`.
- `TEST_DATABASE_URL`: PostgreSQL separado para pruebas de integración.

No escribas credenciales de Neon en código, documentación ni commits.

## Crear o actualizar el esquema

Desde `backend`, con el entorno virtual activo:

```powershell
alembic upgrade head
```

La migración inicial crea `users`, `structural_models` y `simulations`, con UUID, claves foráneas, índices, correo único, fechas con zona horaria y resultados `JSONB`.

La migración inicial ya fue aplicada y verificada contra la instancia Neon configurada para este proyecto.

Para generar una nueva migración después de cambiar los modelos:

```powershell
alembic revision --autogenerate -m "describe el cambio"
alembic upgrade head
```

## Ejecutar el backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000` y su documentación interactiva en `http://localhost:8000/docs`.

## Ejecutar el frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

## Flujo funcional

1. Registrar una cuenta o iniciar sesión.
2. Introducir nombre, dimensiones, material y parámetros de excitación.
3. Ejecutar una simulación.
4. Consultar desplazamiento, aceleración, severidad y puntos de monitoreo.
5. Revisar modelos y simulaciones del usuario en el historial.
6. Abrir el detalle y exportar la simulación como JSON, CSV o HTML.

Los administradores pueden consultar usuarios y modificar roles. Los usuarios solo pueden consultar sus propios modelos y simulaciones.

## API principal

- `GET /` y `GET /api/health`: estado del servicio.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`: autenticación.
- `GET /api/auth/users`, `PATCH /api/auth/users/{user_id}/role`: administración.
- `POST /api/models`, `GET /api/models`: modelos estructurales.
- `POST /api/simulations`: ejecutar y guardar una simulación.
- `GET /api/simulations`: historial del usuario.
- `GET /api/simulations/{simulation_id}`: detalle de una simulación propia.
- `GET /api/simulations/{simulation_id}/export`: exportación JSON, CSV o HTML.

## Pruebas y compilación

Frontend:

```powershell
cd frontend
npm run build
npm test
```

Backend, usando `TEST_DATABASE_URL` apuntando a una base PostgreSQL aislada:

```powershell
cd backend
pytest
```

Si `TEST_DATABASE_URL` no está definida, las pruebas de API se omiten para evitar conectarse accidentalmente a producción. Las pruebas puras del motor de simulación siguen siendo ejecutables.

## Migración desde MySQL

No ejecutes el dump MySQL directamente en Neon. Exporta los datos a un formato intermedio, transforma los identificadores a UUID, convierte fechas a `timestamptz`, conserva `zones` y `monitoring_points` como JSON válido y carga primero usuarios y modelos; después carga simulaciones respetando sus claves foráneas. Valida conteos, asociaciones por usuario y el registro de simulación de referencia antes de poner el sistema en producción.

## Documentación adicional

- [Informe técnico del proyecto](docs/INFORME_PROYECTO.md)
- [Migración de MySQL a Neon PostgreSQL](docs/MIGRACION_NEON.md)

## Advertencia

La persistencia conserva los parámetros y resultados actuales del motor, pero esos resultados son orientativos y deben ser revisados por personal de ingeniería.
