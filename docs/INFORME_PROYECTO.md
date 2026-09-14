# Informe técnico: Puntos Críticos

## Resumen

Puntos Críticos registra modelos estructurales de puentes, ejecuta una simulación dinámica determinista, clasifica zonas críticas y recomienda puntos de monitoreo. La aplicación conserva su arquitectura React/FastAPI y ahora usa PostgreSQL externo, preparado para Neon Console.

El motor de simulación sigue siendo demostrativo. No es un análisis FEM profesional y sus resultados requieren validación de ingeniería.

## Flujo de la aplicación

1. `main.tsx` recupera el JWT desde `sessionStorage` y valida la sesión con `/api/auth/me`.
2. `LoginScreen` registra o autentica usuarios.
3. `AppShell` y `useSimulationViewModel` mantienen los parámetros del formulario.
4. `simulationService.ts` envía `POST /api/simulations` con el token.
5. FastAPI valida la entrada con Pydantic.
6. `simulation_service.py` calcula desplazamiento, aceleración, zonas y puntos de monitoreo sin cambios científicos en esta migración.
7. El backend guarda el modelo, los parámetros y los resultados en PostgreSQL.
8. El frontend muestra métricas, diagnóstico, historial y visualización 3D.
9. Las consultas de modelos y simulaciones filtran por `owner_id`.
10. Las exportaciones JSON, CSV y HTML leen los resultados persistidos.

## Tecnologías

- React 19, TypeScript y Vite.
- React Three Fiber, Three.js y Drei para WebGL.
- Python 3.12, FastAPI, Uvicorn y Pydantic 2.
- SQLAlchemy 2 con Psycopg 3.
- PostgreSQL externo, con Neon Console como destino previsto.
- JWT y PBKDF2-SHA256 para autenticación.
- Alembic para crear y versionar el esquema.

## Esquema PostgreSQL

### `users`

- `id`: UUID, clave primaria.
- `name`, `email`, `password_hash`, `role`.
- `created_at`: `TIMESTAMP WITH TIME ZONE`.
- `email` es único e indexado.

### `structural_models`

- `id`: UUID, clave primaria.
- `owner_id`: UUID, clave foránea a `users.id`, indexada.
- Geometría: `name`, `length`, `width`, `height`, `material`.
- `created_at`: `TIMESTAMP WITH TIME ZONE`.

### `simulations`

- `id`: UUID, clave primaria.
- `owner_id`: UUID, clave foránea a `users.id`, indexada.
- `model_id`: UUID, clave foránea a `structural_models.id`, indexada.
- Parámetros: `excitation`, `intensity`, `modes`.
- Métricas: `peak_displacement`, `peak_acceleration`.
- Resultados: `zones` y `monitoring_points` como `JSONB`.
- `created_at`: `TIMESTAMP WITH TIME ZONE`.
- Restricciones de base: intensidad entre 0 y 1; modos entre 1 y 8.

Se mantienen los arrays como JSONB porque el sistema los recupera completos, los devuelve en la misma forma de la API y los recorre directamente para exportaciones. Normalizarlos ahora añadiría tablas y joins sin una necesidad funcional actual.

## Migraciones

La migración inicial está en `backend/migrations/versions/0001_initial_postgresql.py`. La aplicación no crea tablas automáticamente durante el arranque; el esquema se prepara con:

```powershell
cd backend
alembic upgrade head
```

Los cambios posteriores deben generarse con `alembic revision --autogenerate` y aplicarse con `alembic upgrade head`.

## Configuración

Las únicas variables de conexión relevantes son:

- `DATABASE_URL`: URL `postgresql+psycopg://...` de Neon, normalmente con `sslmode=require`.
- `JWT_SECRET`: secreto aleatorio para JWT.
- `JWT_EXPIRE_MINUTES`: duración del token.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: bootstrap opcional del administrador después de aplicar migraciones.
- `VITE_API_URL`: URL base de la API.
- `TEST_DATABASE_URL`: base PostgreSQL aislada para las pruebas de integración.

No hay credenciales reales en el proyecto. `.env` está excluido por `.gitignore` y `.env.example` solo contiene placeholders.

## Docker, MySQL y SQLite

Se eliminaron `docker-compose.yml`, `backend/Dockerfile` y `frontend/Dockerfile`. La ejecución oficial es directa con Python/Uvicorn y Node/npm.

También se eliminó PyMySQL, la URL MySQL del ejemplo y el archivo SQLite residual. El backend exige `DATABASE_URL` y rechaza URLs que no usen `postgresql+psycopg://`; no existe fallback silencioso a SQLite.

## Seguridad e integridad

- Las simulaciones exigen autenticación y rol `admin` o `structural_engineer`.
- Los listados y detalles filtran por el usuario autenticado.
- Las rutas de gestión de usuarios exigen rol `admin`.
- Las claves foráneas impiden modelos o simulaciones huérfanos.
- Los resultados conservan parámetros, métricas, zonas, puntos, propietario y modelo asociado.

## Migración de datos existente

No se debe ejecutar un dump MySQL directamente en Neon. La guía [MIGRACION_NEON.md](MIGRACION_NEON.md) describe la transformación de IDs a UUID, fechas a UTC, JSON válido, orden de carga y consultas de integridad. La carga debe insertar usuarios, luego modelos y finalmente simulaciones respetando las claves foráneas.

## Verificación realizada

- `python -m compileall -q backend\app backend\migrations backend\tests`: correcto.
- `npm run build`: correcto.
- Búsqueda de referencias de MySQL, PyMySQL, SQLite, Docker y `mysql_data`: las referencias funcionales fueron eliminadas; cualquier mención restante debe ser únicamente histórica o documental.
- `docker compose config`: no se ejecutó porque Docker no está instalado y ya no forma parte del flujo requerido.
- Pruebas de API contra Neon: pendientes hasta disponer de `TEST_DATABASE_URL`.

## Limitaciones pendientes

- La migración de datos reales requiere la URL y acceso a la fuente MySQL original, que no se proporcionaron para ejecutar una carga efectiva.
- No se puede declarar verificada la conectividad con Neon sin una URL real configurada.
- El frontend sigue mostrando una advertencia de bundle grande por Three.js, aunque compila correctamente.
