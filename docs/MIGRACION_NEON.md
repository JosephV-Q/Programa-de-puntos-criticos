# Migración de MySQL a Neon PostgreSQL

## Decisión de esquema

La aplicación conserva tres tablas: `users`, `structural_models` y `simulations`.

- Los identificadores pasan de `VARCHAR(36)` a `UUID` de PostgreSQL.
- Las fechas se almacenan como `TIMESTAMP WITH TIME ZONE`.
- `zones` y `monitoring_points` se mantienen como `JSONB` porque el frontend recupera los arrays completos y las exportaciones los recorren como documentos. No se añaden tablas relacionadas sin una necesidad de consulta que lo justifique.
- Las claves foráneas enlazan propietario, modelo y simulación.
- `email` conserva unicidad y las columnas de propietario/modelo tienen índices.
- La intensidad y los modos tienen restricciones de rango en la base, además de la validación Pydantic.

## Preparar Neon

1. Crea un proyecto y una base en Neon Console.
2. Copia la cadena de conexión del panel.
3. Usa el formato SQLAlchemy con Psycopg:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

4. Guarda la cadena únicamente en `.env` o en los secretos del proveedor.
5. Define también `JWT_SECRET` y, si se necesita, las variables `ADMIN_*`.

## Crear el esquema nuevo

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

La migración `0001_initial_postgresql` crea el esquema sin depender de MySQL, SQLite o contenedores.

## Migrar datos existentes

No ejecutes un dump MySQL directamente contra Neon. La conversión debe hacerse en un entorno controlado:

1. Exporta cada tabla a CSV o JSON desde la base MySQL original.
2. Convierte los IDs de 36 caracteres a UUID válidos y conserva un mapa de IDs antiguos a nuevos.
3. Convierte `DATETIME` a valores con zona horaria definida, preferiblemente UTC.
4. Valida que `zones` y `monitoring_points` sean JSON válido y conserva todos sus campos.
5. Inserta primero `users`.
6. Inserta `structural_models` usando el mapa de `owner_id`.
7. Inserta `simulations` usando los mapas de `owner_id` y `model_id`.
8. Comprueba que no haya claves huérfanas y que los conteos coincidan.
9. Valida el registro de referencia: tráfico, intensidad `0.65`, `3` modos, métricas globales, zonas, puntos y fecha.
10. Ejecuta una consulta de detalle y una exportación desde la API.

Para una migración grande, usa una herramienta especializada como `pgloader` en un entorno temporal, revisando manualmente la conversión de UUID, fechas, JSON y contraseñas antes de cargar producción. No se incluye `pgloader` como dependencia de la aplicación porque solo sirve para la migración puntual.

## Verificación de integridad

Comprueba en Neon:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM structural_models;
SELECT COUNT(*) FROM simulations;

SELECT COUNT(*)
FROM simulations s
JOIN users u ON u.id = s.owner_id
JOIN structural_models m ON m.id = s.model_id
WHERE s.owner_id <> m.owner_id;
```

La última consulta debe devolver `0`. Además, prueba el aislamiento con dos usuarios desde los endpoints de historial y detalle.
