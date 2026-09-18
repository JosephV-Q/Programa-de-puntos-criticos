# Trazabilidad de requisitos IEEE830

## Sistema para la Detección de Puntos Críticos de los Puentes

**Estudiantes:** Joseph David Vasquez Quintero, Daniel Eduardo Padilla Cerpa  
**Institución:** Institución Universitaria Tecnológica de Santander  
**Asignatura:** Nuevas Tecnologías  
**Documento:** Análisis de cumplimiento de requisitos frente al código fuente  
**Fecha de análisis:** 14/09/2026

## 1. Objetivo del documento

Este documento relaciona los requisitos funcionales, no funcionales, historias de usuario y prioridades MoSCoW definidos en el documento IEEE830 con las partes concretas del proyecto.

El análisis clasifica cada aspecto como:

- **Implementado:** existe código funcional que cubre el requisito.
- **Parcial:** existe una implementación básica, pero falta una parte del alcance descrito.
- **No implementado:** el requisito está documentado, pero no existe funcionalidad correspondiente en el código.
- **No verificado:** existe una funcionalidad relacionada, pero todavía no hay mediciones o pruebas que demuestren el criterio.

## 2. Estructura relevante del proyecto

### Backend

- `backend/app/main.py`: crea la aplicación FastAPI, configura CORS y registra el arranque.
- `backend/app/routers.py`: endpoints de salud, modelos, simulaciones, historial y exportaciones.
- `backend/app/schemas.py`: validación de datos con Pydantic.
- `backend/app/persistence_models.py`: modelos SQLAlchemy para usuarios, modelos estructurales y simulaciones.
- `backend/app/services/simulation_service.py`: motor demostrativo de simulación.
- `backend/app/auth/router.py`: registro, login, consulta de usuario y administración de roles.
- `backend/app/auth/dependencies.py`: autenticación Bearer y autorización por roles.
- `backend/app/auth/security.py`: hash de contraseñas y tokens JWT.
- `backend/app/auth/models.py`: entidad persistente de usuario.
- `backend/tests/test_api.py`: pruebas de autenticación, simulación, persistencia y exportación.
- `backend/tests/test_simulation_service.py`: pruebas del motor de simulación.

### Frontend

- `frontend/src/main.tsx`: controla la sesión y decide si muestra login o aplicación.
- `frontend/src/components/LoginScreen.tsx`: registro e inicio de sesión.
- `frontend/src/components/UserPanel.tsx`: perfil y administración básica de usuarios.
- `frontend/src/AppShell.tsx`: pantalla principal, formulario, resultados y exportaciones.
- `frontend/src/viewmodels/useSimulationViewModel.ts`: estado y ejecución de simulaciones.
- `frontend/src/services/authService.ts`: comunicación con endpoints de autenticación.
- `frontend/src/services/simulationService.ts`: modelos, simulaciones, historial y exportaciones.
- `frontend/src/components/BridgeScene3D.tsx`: visualización 3D del puente, severidades y sensores.
- `frontend/src/components/HistoryPanel.tsx`: modelos y simulaciones almacenadas.
- `frontend/src/models/simulation.ts`: tipos de modelos, resultados, zonas y puntos.

## 3. Requisitos funcionales

## RF01. Gestión de usuarios y acceso

**Estado: Parcialmente implementado.**

### Evidencia en el código

- `backend/app/auth/router.py`
  - `POST /api/auth/register`: registra usuarios.
  - `POST /api/auth/login`: autentica usuarios y genera JWT.
  - `GET /api/auth/me`: devuelve el usuario autenticado.
  - `GET /api/auth/users`: permite al administrador consultar usuarios.
  - `PATCH /api/auth/users/{user_id}/role`: permite al administrador cambiar roles.
- `backend/app/auth/models.py`: almacena nombre, correo, hash de contraseña, rol y fecha de creación.
- `backend/app/auth/dependencies.py`: comprueba el token y restringe el acceso por roles.
- `frontend/src/components/LoginScreen.tsx`: ofrece registro e inicio de sesión.
- `frontend/src/components/UserPanel.tsx`: muestra el perfil y permite gestionar roles si el usuario es administrador.
- `frontend/src/services/authService.ts`: encapsula las peticiones de autenticación.

### Funcionalidades cubiertas

- Registro de usuarios.
- Login y logout.
- Persistencia de la sesión en `sessionStorage`.
- Roles `admin`, `structural_engineer` e `instrumentation_specialist`.
- Consulta de usuarios por parte del administrador.
- Cambio de roles por parte del administrador.
- Rechazo de usuarios no autenticados con `401`.
- Rechazo de usuarios sin permisos con `403`.

### Pendientes

- Eliminación de usuarios.
- Bloqueo o desactivación de cuentas.
- Recuperación segura de contraseña.
- Verificación de correo electrónico.
- Auditoría de accesos y cambios de roles.
- Permisos más detallados que el rol general.
- Panel de rendimiento y disponibilidad para el administrador.

## RF02. Registro de información estructural

**Estado: Parcialmente implementado.**

### Evidencia en el código

- `backend/app/schemas.py`, clase `StructuralModel`.
- `backend/app/persistence_models.py`, clase `StructuralModelRecord`.
- `backend/app/routers.py`, endpoints `POST /api/models` y `GET /api/models`.
- `frontend/src/AppShell.tsx`, formulario de nombre, longitud, ancho, altura y material.
- `frontend/src/models/simulation.ts`, tipos `StructuralModel` y `StructuralModelRecord`.

### Datos disponibles

- Nombre.
- Longitud.
- Ancho.
- Altura.
- Material: concreto, acero o mixto.

La validación impide valores no positivos y limita el nombre y el material a las opciones definidas.

### Limitaciones

El backend tiene un endpoint independiente para crear modelos, pero el frontend no presenta una pantalla separada para utilizarlo. Actualmente, al ejecutar una simulación, `POST /api/simulations` crea automáticamente un modelo asociado.

Tampoco se registran todavía:

- Secciones transversales.
- Tipo de apoyos.
- Número de pilonos o tirantes como datos configurables.
- Propiedades elásticas.
- Densidad e inercia.
- Condiciones de frontera.
- Geometría detallada del puente.

## RF03. Ejecución de simulaciones

**Estado: Implementado como prototipo demostrativo.**

### Evidencia en el código

- `backend/app/services/simulation_service.py`, función `run_simulation`.
- `backend/app/routers.py`, endpoint `POST /api/simulations`.
- `backend/app/schemas.py`, clases `SimulationRequest` y `SimulationParameters`.
- `frontend/src/AppShell.tsx`, formulario de parámetros.
- `frontend/src/viewmodels/useSimulationViewModel.ts`, ejecución y estado de carga.
- `frontend/src/services/simulationService.ts`, función `runSimulation`.

### Parámetros disponibles

- Fuente: tráfico, sísmica o viento.
- Intensidad entre 0 y 1.
- Número de modos entre 1 y 8.
- Dimensiones y material del puente.

### Resultados producidos

- Desplazamiento pico.
- Aceleración pico.
- Zonas críticas.
- Severidad de cada zona.
- Puntos de monitoreo recomendados.

### Limitación técnica

El motor actual utiliza una función matemática determinista basada en una forma senoidal y factores de geometría, material, excitación e intensidad. No es todavía un análisis FEM profesional ni un análisis científico completo de cargas sísmicas, vehiculares o eólicas.

Esta limitación también está documentada en `docs/INFORME_PROYECTO.md`.

## RF04. Identificación y clasificación de zonas críticas

**Estado: Implementado.**

### Evidencia en el código

- `backend/app/services/simulation_service.py`, función `_severity`.
- `backend/app/schemas.py`, clase `CriticalZone`.
- `frontend/src/AppShell.tsx`, lista de zonas por severidad.
- `frontend/src/components/BridgeScene3D.tsx`, marcadores 3D y colores.

### Clasificación

Las zonas se clasifican comparando su desplazamiento con el desplazamiento pico:

- `low`: baja.
- `medium`: media.
- `high`: alta.
- `critical`: crítica.

### Representación visual

- Lista de zonas y desplazamientos.
- Colores verde, amarillo, naranja y rojo.
- Esferas sobre el tablero.
- Anillos de resaltado.
- Leyenda de severidades.
- Selección interactiva de una zona para ver su etiqueta.

## RF05. Recomendación de puntos de monitoreo

**Estado: Implementado en versión básica.**

### Evidencia en el código

- `backend/app/services/simulation_service.py`, generación de `monitoring_points`.
- `backend/app/schemas.py`, clase `MonitoringPoint`.
- `frontend/src/AppShell.tsx`, panel de ubicaciones recomendadas.
- `frontend/src/components/BridgeScene3D.tsx`, marcadores de sensores.

El motor recomienda como puntos de monitoreo las zonas clasificadas como `high` o `critical`. Cada punto contiene posición, razón y prioridad.

### Pendientes

No existe aún un algoritmo avanzado para:

- Evitar puntos demasiado cercanos.
- Calcular cobertura de sensores.
- Establecer distancia mínima entre sensores.
- Determinar cantidad de sensores por zona.
- Considerar tipos de sensores.
- Evitar redundancia entre puntos.
- Crear una vista especializada para instrumentación.

## RF06. Generación y exportación de información

**Estado: Parcialmente implementado.**

### Evidencia en el código

- `backend/app/routers.py`, endpoint `GET /api/simulations/{simulation_id}/export`.
- `frontend/src/services/simulationService.ts`, función `exportSimulation`.
- `frontend/src/AppShell.tsx`, botones de exportación.

### Formatos disponibles

#### JSON

Incluye identificador, modelo, parámetros, métricas, zonas, puntos de monitoreo y fecha.

#### CSV

Incluye los datos de las zonas:

- `simulation_id`.
- `position`.
- `label`.
- `severity`.
- `displacement`.
- `acceleration`.

#### HTML

Genera un informe con parámetros, métricas y tabla de zonas críticas.

### Pendientes

- Exportación PDF.
- Plano o croquis de sensores.
- Imagen del modelo 3D.
- Exportación CAD.
- Informe técnico institucional completo.
- Reporte que incluya todos los datos geométricos del modelo.

## 4. Requisitos no funcionales

## RNF-R1. Tiempo de respuesta

**Estado: No verificado.**

La simulación actual es una operación matemática pequeña y probablemente responde rápidamente, pero no existe código que mida ni demuestre el criterio de máximo tres segundos en el 95 % de las solicitudes.

No existen todavía:

- Métricas de latencia.
- Registro de tiempos por endpoint.
- Pruebas de carga.
- Informe del percentil 95.
- Alertas de solicitudes lentas.

## RNF-R2. Estado durante simulaciones largas

**Estado: Parcialmente implementado.**

### Evidencia

- `frontend/src/viewmodels/useSimulationViewModel.ts`: estado `loading`.
- `frontend/src/AppShell.tsx`: muestra `Procesando...` y deshabilita el botón.

### Pendientes

- Porcentaje de avance.
- Endpoint de estado.
- Procesamiento en segundo plano.
- Cola de simulaciones.
- WebSocket o eventos en tiempo real.
- Cancelación de simulaciones.

Para el motor actual, que responde de forma inmediata, el indicador básico cubre el comportamiento esencial.

## RNF-S1. Autenticación y control de acceso

**Estado: Implementado.**

### Evidencia

- `backend/app/auth/security.py`: JWT, expiración y PBKDF2-SHA256.
- `backend/app/auth/dependencies.py`: autenticación Bearer y restricciones por rol.
- `backend/app/auth/router.py`: endpoints de registro, login y administración.
- `frontend/src/main.tsx`: recuperación y validación de sesión.
- `frontend/src/services/authService.ts`: envío del token Bearer.

### Protecciones existentes

- Contraseñas almacenadas como hash PBKDF2-SHA256.
- Tokens JWT con expiración.
- Endpoints protegidos mediante dependencias de FastAPI.
- Creación pública de usuarios limitada al rol `structural_engineer`.
- Simulaciones restringidas a administrador e ingeniero estructural.
- Administración de usuarios restringida a `admin`.

## RNF-S2. Protección de información

**Estado: Parcialmente implementado.**

### Protecciones existentes

- No se almacenan contraseñas en texto plano.
- Los modelos y simulaciones se filtran mediante `owner_id`.
- Las consultas de detalle comprueban la propiedad del registro.
- Las simulaciones usan claves foráneas hacia usuarios y modelos.
- La base de datos conserva los resultados en PostgreSQL mediante JSONB.

### Riesgos o pendientes

En `backend/app/auth/security.py` existe un valor predeterminado:

```python
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-development")
```

En producción debe ser obligatorio configurar un secreto fuerte. También faltan:

- Limitación de intentos de login.
- Recuperación de contraseña.
- Verificación de correo.
- Auditoría.
- Rotación de secretos.
- Revocación de sesiones.
- HTTPS obligatorio en despliegue.
- Cifrado adicional de datos sensibles.

## RNF-F1. Integridad de resultados

**Estado: Implementado.**

### Evidencia

- `backend/app/routers.py`, función `create_simulation`.
- `backend/app/persistence_models.py`, clase `SimulationRecord`.
- `backend/migrations/versions/0001_initial_postgresql.py`.
- `frontend/src/components/HistoryPanel.tsx`.

Al crear una simulación, el sistema:

1. Crea el modelo estructural.
2. Ejecuta el cálculo.
3. Guarda los parámetros.
4. Guarda las métricas.
5. Guarda las zonas.
6. Guarda los puntos de monitoreo.
7. Asocia usuario y modelo mediante `owner_id` y `model_id`.
8. Confirma la transacción con `database.commit()`.

La base de datos aplica restricciones de intensidad, número de modos y claves foráneas.

## RNF-D1. Disponibilidad del sistema

**Estado: No implementado formalmente.**

### Evidencia parcial

- `backend/app/routers.py`, endpoint `GET /api/health`.

El endpoint devuelve un estado de salud básico:

```json
{
  "status": "ok",
  "service": "puentes-criticos-api"
}
```

### Lo que falta para demostrar 95 % de disponibilidad

- Monitorización externa.
- Métricas de uptime mensual.
- Alertas.
- Reinicio automático.
- Réplicas o balanceador.
- Health check de la base de datos.
- Copias de seguridad automáticas.
- Plan de recuperación ante desastres.
- Registro de incidentes.

## RNF-U1. Facilidad de uso

**Estado: Parcialmente implementado.**

### Evidencia

- `frontend/src/AppShell.tsx`.
- `frontend/src/components/LoginScreen.tsx`.
- `frontend/src/components/BridgeScene3D.tsx`.
- `frontend/src/components/HistoryPanel.tsx`.
- `frontend/src/app-shell.css`.
- `frontend/src/auth.css`.
- `frontend/src/history.css`.

### Funcionalidades de usabilidad existentes

- Pantalla de autenticación.
- Formulario de parámetros.
- Mensajes de error.
- Indicador de procesamiento.
- Métricas principales.
- Leyenda de severidades.
- Modelo 3D interactivo.
- Historial de modelos y simulaciones.
- Consulta de resultados anteriores.
- Exportaciones.
- Recomendaciones de instrumentación.

### Pendientes

- Ayuda contextual técnica.
- Manual integrado.
- Explicación de fórmulas.
- Comparación entre simulaciones.
- Filtros del historial.
- Vista diferenciada para cada rol.
- Auditoría formal de accesibilidad.
- Validación detallada de errores en el formulario.

## 5. Historias de usuario

## 5.1 Administrador del sistema

| Historia | Estado | Evidencia o pendiente |
|---|---|---|
| Gestionar usuarios y permisos | Parcial | `backend/app/auth/router.py` y `frontend/src/components/UserPanel.tsx`; permite listar y cambiar roles, pero no eliminar ni bloquear cuentas. |
| Monitorear rendimiento y disponibilidad | No implementado | Solo existe `GET /api/health`; no hay métricas ni monitorización. |
| Realizar copias de seguridad | No implementado | No hay código de backup automático. |
| Actualizar la aplicación | No implementado desde la aplicación | Las actualizaciones requieren procedimientos externos de despliegue. |

## 5.2 Ingeniero estructural

| Historia | Estado | Evidencia o pendiente |
|---|---|---|
| Cargar geometría, materiales y propiedades | Parcial | Formulario básico y modelo persistente; faltan propiedades estructurales avanzadas. |
| Visualizar zonas críticas | Implementado | `BridgeScene3D` y lista de severidad en `AppShell`. |
| Ejecutar simulaciones | Implementado | `run_simulation` y `POST /api/simulations`. |
| Consultar severidad | Implementado | Función `_severity` y representación visual. |
| Generar informes técnicos | Parcial | Se genera HTML, pero no PDF ni informe institucional completo. |
| Exportar datos | Parcial | JSON, CSV y HTML; faltan plano, croquis y CAD. |

## 5.3 Especialista en instrumentación

| Historia | Estado | Evidencia o pendiente |
|---|---|---|
| Visualizar puntos óptimos | Parcial | Se muestran puntos recomendados, pero la optimización es básica. |
| Consultar severidad | Implementado | Las zonas y severidades aparecen en el diagnóstico y modelo 3D. |
| Exportar plano o croquis | No implementado | No existe exportación gráfica de ubicaciones. |
| Optimizar cobertura y evitar redundancia | No implementado | No hay algoritmo de cobertura ni distancia mínima entre sensores. |

## 6. Priorización MoSCoW frente al código

## 6.1 Must Have

| Funcionalidad | Estado |
|---|---|
| Gestión de usuarios y acceso | Parcialmente implementada |
| Autenticación y control de acceso | Implementada |
| Registro de información estructural | Parcialmente implementado |
| Ejecución de simulaciones | Implementada |
| Identificación y clasificación de zonas críticas | Implementada |
| Visualización de severidad | Implementada |
| Visualización 3D | Implementada |
| Integridad de resultados | Implementada |

## 6.2 Should Have

| Funcionalidad | Estado |
|---|---|
| Tiempo de respuesta máximo | No medido |
| Protección de información | Parcial |
| Recomendación de puntos de monitoreo | Implementada básicamente |
| Indicador de simulación | Implementado básicamente |
| Disponibilidad mínima del 95 % | No demostrada |
| Copias de seguridad | No implementadas |

## 6.3 Could Have

| Funcionalidad | Estado |
|---|---|
| Generación y exportación | Parcialmente implementada |
| Exportación de puntos de monitoreo | Incluida en JSON; no como plano |
| Consulta de zonas históricas | Implementada mediante historial |
| Notificaciones automáticas | No implementadas |
| Facilidad de uso sin capacitación | Parcialmente implementada |

## 6.4 Won't Have

No se observan implementaciones de:

- Aplicación móvil nativa.
- Comparación automática con normativas internacionales.
- Interfaz de realidad aumentada.

Estas funciones están fuera del alcance actual según la priorización del documento.

## 7. Pruebas que respaldan los requisitos

En `backend/tests/test_api.py` existen pruebas para:

- `GET /api/health`.
- Rechazo de simulaciones sin autenticación.
- Registro de usuarios.
- Inicio de sesión.
- Ejecución de simulaciones.
- Impedir que el registro público cree administradores.
- Listado y cambio de roles por un administrador.
- Impedir que un usuario normal administre usuarios.
- Persistencia de simulaciones.
- Consulta de historial y detalle.
- Exportación CSV y HTML.

En `backend/tests/test_simulation_service.py` existen pruebas para:

- Generación de zonas críticas y puntos de monitoreo.
- Diferencia de respuesta entre concreto y acero.

Todavía faltan pruebas automatizadas para:

- Medición del percentil 95 de rendimiento.
- Disponibilidad mensual.
- Backups y restauración.
- Exportación PDF o de planos.
- Cobertura y no redundancia de sensores.
- Accesibilidad y experiencia de usuario.
- Carga concurrente.

## 8. Matriz consolidada

| Requisito | Estado |
|---|---|
| RF01. Gestión de usuarios y acceso | Parcial |
| RF02. Registro de información estructural | Parcial |
| RF03. Ejecución de simulaciones | Implementado como prototipo |
| RF04. Identificación de zonas críticas | Implementado |
| RF05. Recomendación de puntos de monitoreo | Básico implementado |
| RF06. Generación y exportación | Parcial |
| RNF-R1. Tiempo de respuesta | No verificado |
| RNF-R2. Estado durante simulaciones | Básico implementado |
| RNF-S1. Autenticación y control de acceso | Implementado |
| RNF-S2. Protección de información | Parcial |
| RNF-F1. Integridad de resultados | Implementado |
| RNF-D1. Disponibilidad | No implementado formalmente |
| RNF-U1. Facilidad de uso | Parcial |

## 9. Conclusión

El proyecto implementa el flujo principal definido en el IEEE830:

```text
Autenticación
    -> Registro básico del puente
    -> Ejecución de simulación
    -> Clasificación de zonas críticas
    -> Recomendación de sensores
    -> Visualización 3D
    -> Historial
    -> Exportación
```

La aplicación debe presentarse como un **prototipo funcional de simulación y visualización estructural**. Cubre adecuadamente el flujo principal, pero todavía no es una plataforma completa de operación estructural ni un sistema FEM profesional.

Los principales pendientes son:

1. Ampliar el modelo estructural y crear una pantalla independiente para gestionar modelos.
2. Incorporar algoritmos avanzados para optimizar la ubicación y cobertura de sensores.
3. Completar los informes con PDF, planos y croquis.
4. Medir formalmente rendimiento y disponibilidad.
5. Fortalecer seguridad de producción, auditoría, backups y gestión de sesiones.
6. Crear vistas y permisos específicos para el especialista en instrumentación.
7. Añadir pruebas de carga, disponibilidad, seguridad y accesibilidad.
