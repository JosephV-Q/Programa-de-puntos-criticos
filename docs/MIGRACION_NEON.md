# Migración de MySQL a Neon PostgreSQL

## Decisión de esquema

La aplicación conserva tres tablas: `users`, `structural_models` y `simulations`.

- Los identificadores pasan de `VARCHAR(36)` a `UUID` de PostgreSQL.
- Las fechas se almacenan como `TIMESTAMP WITH TIME ZONE`.
- `zones` y `monitoring_points` se mantienen como `JSONB` porque el frontend recupera los arrays completos y las exportaciones los recorren como documentos. No se añaden tablas relacionadas sin una necesidad de consulta que lo justifique.
- Las claves foráneas enlazan propietario, modelo y simulación.
- `email` conserva unicidad y las columnas de propietario/modelo tienen índices.
- La intensidad y los modos tienen restricciones de rango en la base, además de la validación Pydantic.

## Preparar Neon paso a paso

### 1. Crear el proyecto

1. Entra en [Neon Console](https://console.neon.tech) y crea una cuenta o inicia sesión.
2. Selecciona **New project**.
3. Elige la región más cercana al backend que ejecutará FastAPI.
4. Define un nombre para el proyecto y conserva la base de datos que Neon crea para él.
5. Espera a que el proyecto aparezca como activo.

Neon ofrece ramas de base de datos. Usa la rama principal para el entorno de desarrollo compartido y crea otra rama para pruebas o migraciones experimentales cuando sea posible.

### 2. Copiar la conexión de Neon

1. Abre el proyecto en Neon Console.
2. Pulsa **Connect**.
3. Selecciona la rama, la base de datos y el rol de PostgreSQL que utilizará la API.
4. Copia la cadena que muestra Neon. No la pegues en el código ni en un commit.

Neon suele mostrar una URL parecida a esta:

```text
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Para SQLAlchemy con el driver instalado en este proyecto, cambia solamente el prefijo a `postgresql+psycopg://` y conserva el resto:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

No sustituyas `USER`, `PASSWORD`, `HOST` ni `DBNAME` por valores inventados. Deben ser exactamente los que entrega Neon. Si la contraseña contiene caracteres especiales, utiliza la URL copiada por Neon o codifica esos caracteres según las reglas de URLs.

### 3. Crear el archivo local de variables

Desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
notepad .env
```

Completa al menos estas variables:

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
JWT_SECRET=una-cadena-larga-y-aleatoria
JWT_EXPIRE_MINUTES=480
VITE_API_URL=http://localhost:8000/api
```

Opcionalmente define `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` para que la API cree un administrador al arrancar después de aplicar la migración.

El archivo `.env` está ignorado por Git. Nunca publiques la contraseña de Neon, aunque sea una base de desarrollo.

### 4. Crear el entorno Python

En PowerShell, desde la raíz:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si PowerShell impide activar el entorno, puedes ejecutar los comandos con `backend\.venv\Scripts\python.exe` directamente.

### 5. Comprobar la conexión antes de migrar

Con el `.env` configurado, el backend carga sus variables automáticamente mediante `python-dotenv`. Para ejecutar comandos de Alembic desde una terminal PowerShell, carga también las variables en esa terminal:

```powershell
Get-Content ..\.env | Where-Object { $_ -match '^[^#].+=' } | ForEach-Object {
	$name, $value = $_ -split '=', 2
	Set-Item -Path "Env:$name" -Value $value
}
```

Comprueba que existe la variable sin imprimir su contraseña:

```powershell
if (-not $env:DATABASE_URL) { throw 'DATABASE_URL no está configurada' }
if ($env:DATABASE_URL -notlike 'postgresql+psycopg://*') { throw 'DATABASE_URL no usa postgresql+psycopg://' }
Write-Output 'DATABASE_URL configurada'
```

La comprobación real se hace al ejecutar Alembic. Si la conexión es válida, Neon aceptará la migración; si no, mostrará el error de conexión sin modificar el esquema parcialmente porque la migración usa DDL transaccional de PostgreSQL.

### 6. Crear las tablas en Neon

Desde el directorio `backend` y con las variables cargadas:

```powershell
alembic current
alembic upgrade head
alembic current
```

El último comando debe mostrar `0001_initial_postgresql`. En Neon deberían aparecer:

- `users`
- `structural_models`
- `simulations`
- `alembic_version`

La API ya no crea tablas automáticamente. Primero se ejecuta Alembic y después se inicia FastAPI.

En este proyecto, este paso ya fue ejecutado correctamente contra la instancia Neon configurada en el `.env`; Alembic dejó la base en `0001_initial_postgresql (head)`.

### 7. Crear el administrador inicial

Si definiste `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME`, inicia la API:

```powershell
uvicorn app.main:app --reload --port 8000
```

El evento de arranque comprueba si existe ese correo y crea el usuario administrador si todavía no existe. Si no defines esas variables, puedes registrar un usuario desde la interfaz; ese usuario tendrá rol `structural_engineer`.

### 8. Probar el flujo completo

1. Abre `http://localhost:5173`.
2. Registra un usuario o inicia sesión con el administrador.
3. Ejecuta una simulación con el modelo de referencia: 120 m, 9 m, 18 m, concreto, `traffic`, intensidad `0.65` y 3 modos.
4. Comprueba que el resultado aparece en la interfaz.
5. Abre el historial.
6. Consulta el detalle y prueba una exportación.
7. Comprueba en Neon que la fila de `simulations` conserva `owner_id`, `model_id`, parámetros, métricas, `zones` y `monitoring_points`.

## Migrar datos existentes paso a paso

No ejecutes un dump MySQL directamente contra Neon. La conversión debe hacerse en un entorno controlado:

1. Haz una copia de seguridad de la base MySQL original y trabaja primero sobre una copia.
2. Exporta cada tabla a CSV o JSON desde la base MySQL original.
3. Convierte los IDs de 36 caracteres a UUID válidos y conserva un mapa de IDs antiguos a nuevos.
4. Convierte `DATETIME` a valores con zona horaria definida, preferiblemente UTC.
5. Valida que `zones` y `monitoring_points` sean JSON válido y conserva todos sus campos.
6. Aplica `alembic upgrade head` sobre la base Neon vacía.
7. Inserta primero `users`.
8. Inserta `structural_models` usando el mapa de `owner_id`.
9. Inserta `simulations` usando los mapas de `owner_id` y `model_id`.
10. Comprueba que no haya claves huérfanas y que los conteos coincidan.
11. Valida el registro de referencia: tráfico, intensidad `0.65`, `3` modos, métricas globales, zonas, puntos y fecha.
12. Ejecuta una consulta de detalle y una exportación desde la API.

No sobrescribas la base Neon de producción durante la primera prueba. Usa una rama de Neon o un proyecto separado, valida la carga y solo después repite el procedimiento en producción.

## Resultado de la verificación

Se ejecutó un smoke test contra Neon con un usuario temporal. Se verificó registro, login, creación de una simulación con tráfico, intensidad `0.65` y 3 modos, historial, detalle y exportación JSON. Los datos temporales fueron eliminados al finalizar.

La prueba confirmó la persistencia de métricas, zonas, puntos de monitoreo y relaciones entre usuario, modelo y simulación.

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
