# Sprint 2 — Cierre

## Alcance entregado

- **Jugadores**: alta, edición, baja lógica (con chequeo de equipos), búsqueda por nombre/documento, filtro por estado de validación y por equipo.
- **Validación de edad**: cálculo automático, alertas (no rechazo) si no cumple el rango o falta documento, transición de estado a `observado` para revisión manual.
- **Regla Sub8/Sub10/Sub12**: si no hay cédula, se permite validar por año de nacimiento. La discrepancia entre año de nacimiento y fecha de nacimiento genera alerta.
- **Categorías superiores** (Sub14, Sub16, Sub18, Libre, Master): cédula obligatoria (configurable por categoría).
- **Documentos**: subir, listar, aprobar, rechazar y eliminar. Tipos: cédula, DNI, pasaporte, partida de nacimiento, foto, autorización, otro.
- **Subida de archivos**: validación de MIME (jpg/png/webp/gif/pdf) y tamaño (10 MB por defecto). Persistencia local en `backend/uploads/<subfolder>/`. Servido en `GET /uploads/...`.
- **Plantilla de equipo**: vincular jugador a equipo con dorsal y posición. La habilitación inicial se calcula al vincular (si hay alerta de edad, queda en `observado` con motivo).
- **Habilitación por equipo**: el `estadoHabilitacion` del `equipo_jugador` es independiente del `estadoValidacion` global del jugador, para reflejar que un jugador puede estar habilitado en Sub14 pero no en Sub16.
- **Auditoría mínima**: documento y habilitación guardan `validadoPorId` y `validadoEn` cuando se aprueban/rechazan.
- **Revalidación bajo demanda**: `POST /api/jugadores/:id/revalidar/:categoriaId` recalcula el estado contra una categoría puntual.

## Nuevos endpoints

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/jugadores?estado=&search=&equipoId=` | Listado con búsqueda y filtros |
| GET | `/api/jugadores/:id` | Detalle completo (docs + equipos) |
| POST | `/api/jugadores` | Alta (opcional: `categoriaId` para validar edad al crear) |
| PATCH | `/api/jugadores/:id` | Edición |
| DELETE | `/api/jugadores/:id` | Baja (bloqueada si pertenece a equipos) |
| POST | `/api/jugadores/:id/revalidar/:categoriaId` | Revalida contra una categoría |
| GET | `/api/jugadores/:id/documentos` | Lista de documentos |
| POST | `/api/jugadores/documentos` | Crea registro de documento (con `archivoUrl` ya subido) |
| PATCH | `/api/jugadores/documentos/:id` | Cambia estado / observaciones |
| DELETE | `/api/jugadores/documentos/:id` | Elimina |
| GET | `/api/jugadores/equipo/:equipoId/plantilla` | Plantilla de un equipo |
| POST | `/api/jugadores/equipo-jugador` | Vincular jugador a equipo |
| PATCH | `/api/jugadores/equipo-jugador/:id` | Cambiar dorsal/posición/habilitación |
| DELETE | `/api/jugadores/equipo-jugador/:id` | Quitar de equipo |
| POST | `/api/uploads?subfolder=documentos` | Subida de archivo (multipart) |

## Reglas de validación de edad

- Edad calculada a la fecha actual, considerando mes/día.
- Si la categoría tiene `edadMinima`/`edadMaxima`, se exige estar dentro del rango.
- Si la categoría es Sub8/Sub10/Sub12 y `permiteSinCedula=true` y `validaPorAnioNacimiento=true`:
  - Sin cédula + sin año de nacimiento → alerta, queda en `observado`.
  - Sin cédula + año de nacimiento → se valida la coherencia del año con la fecha de nacimiento.
- En cualquier otra categoría: cédula obligatoria. Sin cédula → `observado`.
- Edad fuera de rango → `observado` (queda pendiente de revisión manual, **no se rechaza automáticamente**).

## Modelo de datos añadido

- `jugadores` (incluye índice por documento y por nombre/apellido)
- `jugadores_documentos` (con validación, auditoría)
- `equipo_jugadores` (plantilla, dorsal, posición, estado de habilitación, auditoría)

Se extendieron `usuarios` y `equipos` con las relaciones inversas correspondientes.

## UX entregada

- Página `/dashboard/jugadores` con:
  - Búsqueda en vivo por nombre o documento.
  - Tabla con edad calculada, tipo de documento, estado, cantidad de documentos y equipos.
  - Modal de **detalle de jugador** con tres secciones:
    1. **Datos y validación** (alta/edición en un modal aparte).
    2. **Documentos**: tabla con acciones de aprobar/rechazar/eliminar y formulario inline de subida.
    3. **Equipos donde juega**: tabla con dorsal, posición, estado de habilitación y motivos de observación, más formulario para agregar a otro equipo.
- Nuevo KPI en el dashboard: cantidad de jugadores registrados.
- Columna **Plantilla** en el listado de equipos con la cantidad de jugadores.

## Próximos pasos (Sprint 3)

1. Fixture: round-robin todos contra todos, ida y vuelta, triangular/cuadrangular/hexagonal.
2. Eliminatorias: cuadro con siembra, doble eliminación opcional.
3. Grupos + eliminatorias.
4. Programación inicial (fechas y horas) y `generar-fixture`.
5. Reprogramación con historial.
