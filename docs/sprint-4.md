# Sprint 4 — Cierre

## Alcance entregado

- **Registro de resultados** con marcador final + eventos por partido (goles, goles en contra, asistencias, amarillas, roja directa, doble amarilla, cambios).
- **Tabla de posiciones** calculada on-demand con cualquier criterio de desempate:
  - `diferencia_goles` (default)
  - `gol_average`
  - `enfrentamiento_directo` (suma puntos en cruces directos)
  - `goles_favor`
  - `partido_extra` (rechaza cerrar empates si está configurado)
- **Estadísticas de jugador y equipo** sincronizadas automáticamente al cerrar cada partido (upsert por `torneoId+jugadorId` y `torneoId+equipoId`).
- **Goleadores** y **ranking de tarjetas** por torneo.
- **Sanciones automáticas** al cerrar un partido:
  - Roja directa → 2 fechas
  - Doble amarilla → 1 fecha
  - Acumulación de 3 amarillas en el torneo → 1 fecha
- **Gestión manual de sanciones** (cumplida, condonada, anulada) con control de fechas cumplidas vs. fechas a cumplir.
- **Validación de eventos**: cada evento debe pertenecer a uno de los dos equipos del partido.
- **Consistencia marcador vs. eventos**: el frontend muestra un warning si los goles del marcador no coinciden con los goles en los eventos.
- **Rechazo de cierre con empate** cuando el criterio de desempate del torneo es `partido_extra`.
- **11 endpoints nuevos** (registrar resultado, cerrar, ver resultado por partido, tabla, goleadores, tarjetas, sanciones, actualizar sanción).

## Nuevos endpoints

| Método | Path | Descripción |
|---|---|---|
| POST | `/api/resultados` | Registrar/actualizar resultado + eventos (opcionalmente cierra el partido) |
| GET | `/api/resultados/:id` | Detalle del resultado con eventos |
| GET | `/api/resultados/partido/:partidoId` | Resultado asociado a un partido (o null) |
| PATCH | `/api/resultados/:id` | Editar resultado (sólo si no está cerrado) |
| POST | `/api/resultados/:id/cerrar` | Cerrar resultado + recalcular tabla y sanciones |
| DELETE | `/api/resultados/:id` | Eliminar resultado (sólo admin) |
| GET | `/api/resultados/torneo/:torneoId/tabla` | Tabla de posiciones del torneo |
| GET | `/api/resultados/torneo/:torneoId/goleadores` | Ranking de goleadores |
| GET | `/api/resultados/torneo/:torneoId/tarjetas` | Ranking de tarjetas |
| GET | `/api/resultados/torneo/:torneoId/sanciones` | Sanciones del torneo |
| PATCH | `/api/resultados/sanciones/:id` | Cambiar estado / fechas cumplidas de una sanción |

## Algoritmo de tabla

```
calcularTabla(reglas, partidos, inscripciones):
  1. Inicializar contadores para cada equipo inscrito (0 en todo)
  2. Para cada partido FINALIZADO:
     - Sumar goles a favor y en contra
     - Determinar resultado (G / E / P)
     - Sumar puntos según reglas
  3. Calcular diferencia de goles y gol average por equipo
  4. Ordenar:
     a) Mayor puntaje
     b) Según criterioDesempate:
        - diferencia_goles: mayor DG
        - gol_average: mayor GA
        - enfrentamiento_directo: puntos en cruces A vs B
        - goles_favor: mayor GF
        - partido_extra: cae al siguiente
     c) Mayor goles a favor
     d) Mayor diferencia de goles
     e) Orden alfabético por ID
  5. Asignar posición 1..N
```

### Tests (9/9 ✅)

```
=== Test 1: 4 equipos ===
✅ A 1° con 7 puntos (2G + 1E)
✅ B 2° con 4 puntos (1G + 1E + 1P)
✅ C 3° con 3 puntos (3E)
✅ D 4° con 1 punto (1E + 2P)

=== Test 2: gol_average como desempate ===
✅ A 1° por goles a favor (5 > 2)

=== Test 3: partido no finalizado se ignora ===
✅ A tiene 1 partido, no 2
✅ A tiene 5 goles (no 104)

=== Test 4: equipos sin partidos (todos en 0 pts) ===
✅ Todos en 0 puntos
✅ Todos con 0 PJ
```

Para correrlos: `node scripts/test-tabla.js`

## Sanciones automáticas

| Evento | Sanción | Fechas |
|---|---|---|
| Roja directa | Inmediata | 2 |
| Doble amarilla | Inmediata | 1 |
| 3ra amarilla en el torneo | Al cierre del partido donde se acumuló | 1 |

El sistema evita duplicar sanciones del mismo tipo en el mismo partido (chequea `jugadorId + partidoId + motivo`).

## Modelo de datos añadido

- `resultados` (1:1 con partido, con `golesLocal`, `golesVisitante`, `cerrado`, auditoría)
- `resultado_eventos` (goles, tarjetas, cambios con jugador, equipo, minuto)
- `sanciones` (motivo, fechas, estado, auditoría)
- `estadisticas_jugador` (unique por `torneoId + jugadorId`, con PJ, goles, asist., amarillas, rojas)
- `estadisticas_equipo` (unique por `torneoId + equipoId`, con PJ, G, E, P, GF, GC, Pts)

2 enums nuevos: `EstadoSancion`, `MotivoSancion`. `TipoEventoPartido` se extiende con `doble_amarilla`. Se agregaron relaciones inversas en `Usuario` y `Partido`.

## UX entregada

### Vista de detalle de torneo (`/dashboard/torneos/[id]`)

- **3 KPI cards** arriba: Equipos inscritos, Partidos (con desglose por estado), Sanciones.
- **Tabla de posiciones** completa con posición, equipo, club, PJ, G, E, P, GF, GC, DG, Pts.
- **Top goleadores** y **Top amonestados** lado a lado.
- **Fixture** con botón "Resultado" en cada partido no finalizado.
- **Sanciones** con tabla y acciones inline (Cumplida / Condonar).
- **Fases** con conteo de partidos y grupos.

### Modal de resultado (`<ResultadoModal>`)

- **Marcador** con botones +/- y campos editables.
- **Aviso automático** si los goles del marcador no coinciden con los eventos registrados.
- **Eventos**: tabla con tipo, jugador, equipo, minuto; formulario inline para agregar.
- **Checkbox "Cerrar resultado"**: si está tildado, también cambia el estado del partido a `finalizado` y dispara recálculo de tabla + sanciones.
- **Carga de plantilla**: trae los jugadores habilitados de cada equipo para que el selector sólo muestre los disponibles.

## Reglas implementadas

- Un resultado cerrado no se puede modificar — sólo eliminar (admin).
- Los eventos se borran y reescriben en cada `registrar()` para mantener consistencia.
- Las sanciones automáticas se crean **sólo si no existe** una previa del mismo tipo para ese jugador en ese partido.
- El partido pasa a estado `finalizado` cuando se cierra el resultado.
- Las estadísticas se recalculan en cada cierre (no se acumulan sobre un snapshot anterior).

## Próximos pasos (Sprint 5)

1. **Portal público** sin login: tabla, goleadores, programación, resultados filtrados por torneo/categoría.
2. **Reportes**: deuda por equipo, ingresos por torneo, jugadores habilitados, programación.
3. **Auditoría**: tabla que registra cambios importantes (creación/edición/eliminación) con usuario, timestamp y detalle.
4. **Filtros avanzados** en el portal público (temporada, categoría, fase, grupo).
