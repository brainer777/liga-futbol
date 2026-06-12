# Sprint 3 — Cierre

## Alcance entregado

- **Fixture automático** con generador puro-Typescript (`backend/src/torneos/fixture.generator.ts`), determinista y testeado con 15 tests que pasan.
- **Algoritmo circle method** para round-robin (todos contra todos, ida y vuelta, triangular, cuadrangular, hexagonal, liguilla) con BYE automático si hay equipos impares.
- **Bracket de eliminación** (directa y doble eliminación) con siembra, BYE si el bracket no es potencia de 2, y nombres de etapa correctos (Octavos, Cuartos, Semifinal, Final).
- **Fase de grupos** con distribución equitativa (sembrado en serpentina) y configuración de cantidad de grupos.
- **Grupos + eliminación**: fase de grupos → bracket con `clasificadosPorGrupo` (1 o 2 por grupo).
- **Persistencia transaccional**: al generar el fixture se crea toda la estructura de fases → grupos → partidos en una sola transacción, eliminando cualquier estado previo.
- **Programación inicial**: `fechaInicio`, `horaDefault`, `diasEntreJornadas` opcionales para asignar fechas automáticamente (jornada N = inicio + (N-1) * días).
- **Reprogramación de partidos** con historial completo en `partidos_reprogramaciones` (fecha/hora/cancha anterior y nueva, motivo, usuario que reprogramó).
- **Estados del partido**: borrador, programado, en_juego, finalizado, suspendido, reprogramado, cancelado.
- **Validación de `permiteReprogramacion`**: si el torneo no permite, la API rechaza la reprogramación.
- **Vista de detalle de torneo** con:
  - Equipos inscritos (badges)
  - Fixture agrupado por jornada (round-robin) o por etapa (eliminación)
  - Estado de cada partido con badges
  - Contador de reprogramaciones por partido
  - Fases con conteo de partidos y grupos
- **Botón de generación de fixture** desde la lista de torneos, con modal de configuración (fecha inicio, hora, días entre jornadas, grupos si aplica, clasificados por grupo si aplica).

## Algoritmo del generador

```
roundRobin(equipos, idaVuelta):
  1. Si la cantidad de equipos es impar, agregar un BYE
  2. Aplicar "circle method":
     - Fijar el primer equipo
     - Rotar el resto cada jornada
     - Cada par (i, n-1-i) es un cruce
     - Alternar local/visitante para equidad
  3. Devolver n-1 rondas con n/2 cruces cada una
  4. Si idaVuelta, duplicar las rondas invirtiendo local/visitante

eliminacion(equipos):
  1. Calcular bracket = próxima potencia de 2 >= n
  2. Siembra: 1 vs N, 2 vs N-1, etc.
  3. Crear cruces de la primera ronda (omitiendo los que tengan BYE)
  4. Crear placeholders de rondas siguientes (se llenan dinámicamente en runtime)
  5. Devolver todas las rondas con sus etapas (Octavos, Cuartos, Semi, Final)

grupos(equipos, opciones):
  1. Determinar cantidad de grupos (auto si no se pasa)
  2. Sembrado en serpentina: 1er equipo → A, 2do → B, ..., N+1 → A, ...
  3. Para cada grupo, generar round-robin con su lista
```

### Tests (15/15 ✅)

```
✅ 4 equipos: 3 rondas
✅ 4 equipos: 2 cruces por ronda
✅ 4 equipos: 6 cruces totales
✅ 4 equipos: cada uno juega 3
✅ 5 equipos impar: 5 rondas (n-1 con BYE agregado)
✅ 5 equipos: cada uno juega 4 partidos
✅ 4 equipos ida+vuelta: 6 rondas
✅ 4 equipos ida+vuelta: 12 cruces
✅ ida y vuelta: local/visitante invertidos
✅ 3 equipos: 3 rondas con BYE
✅ 3 equipos: cada uno juega 2
✅ 8 equipos eliminación: 3 etapas
✅ 8 equipos: 4+2+1 = 7 cruces totales
✅ 6 equipos: 3 etapas (cuartos, semi, final)
✅ 6 equipos: bracket 8 con 2 BYE → 2 cruces en cuartos
```

Para correrlos: `node scripts/test-fixture.js`

## Nuevos endpoints

| Método | Path | Descripción |
|---|---|---|
| POST | `/api/torneos/:id/generar-fixture` | Genera el fixture completo del torneo |
| GET | `/api/torneos/:id/fases` | Lista las fases del torneo con grupos y conteo de partidos |
| GET | `/api/torneos/:id/partidos` | Lista todos los partidos del torneo |
| GET | `/api/partidos/:id` | Detalle de un partido con historial de reprogramaciones |
| PATCH | `/api/partidos/:id` | Actualizar fecha/hora/cancha/estado/observaciones |
| POST | `/api/partidos/:id/reprogramar` | Reprogramar con motivo (audita y crea registro en historial) |
| DELETE | `/api/partidos/:id` | Eliminar un partido (si se regenera el fixture, se borra todo) |

## Modelo de datos añadido

- `fases_torneo` (con orden, tipo: grupos/eliminacion/final, estado)
- `grupos` (pertenece a una fase)
- `grupo_equipos` (N:M)
- `partidos` (con jornada, etapa_eliminatoria, es_ida, fecha/hora/cancha, estado, llaves)
- `partidos_reprogramaciones` (historial)

3 enums nuevos: `EstadoPartido`, `EstadoFase`, `TipoFase`.

`Torneo` se extiende con relaciones inversas a `fases` y `partidos`.

## Reglas implementadas

- **BYE automático**: si la cantidad de equipos no es par, se agrega un BYE y se reporta como `warning`.
- **Bracket potencia de 2**: en eliminación, se ajusta al bracket más cercano (ej: 6 equipos → 8 con 2 BYE).
- **No se puede eliminar torneo con partidos o fases**: para evitar perder historial.
- **Reprogramación solo si `permiteReprogramacion=true`**: control a nivel de torneo.
- **Regenerar fixture borra lo anterior**: limpio y explícito, con una sola transacción.

## UX entregada

- Botón **Play** en la lista de torneos para ir al detalle.
- Vista de **detalle de torneo** con:
  - Header con nombre, temporada, categoría, formato, puntos, desempate, estado
  - **Equipos inscritos** como badges
  - **Fixture agrupado** por jornada o etapa, con fecha/hora/cancha/grupo/estado/contador de reprogramaciones
  - **Fases del torneo** con conteo de partidos y grupos
  - Acciones: programar/reprogramar, eliminar partido
- **Modal de generación de fixture** con campos dinámicos según el formato:
  - `fechaInicio` (opcional, si no se pasa los partidos quedan en borrador)
  - `horaDefault` (opcional, ej. `15:00`)
  - `diasEntreJornadas` (default 7)
  - `cantidadGrupos` (solo si formato = grupos o grupos_y_eliminacion)
  - `clasificadosPorGrupo` (solo si formato = grupos_y_eliminacion)
  - `gruposIdaVuelta` (solo si formato = grupos)
- **Modal de reprogramación** con motivo obligatorio y prefill de la fecha/hora/cancha actual.

## Próximos pasos (Sprint 4)

1. **Resultados**: registrar marcadores finales con eventos (goles, tarjetas).
2. **Tabla de posiciones**: cálculo automático con cualquier criterio de desempate (`diferencia_goles`, `gol_average`, `enfrentamiento_directo`, `goles_favor`, `partido_extra`).
3. **Goleadores** y **tarjeta acumulada**.
4. **Rendimiento por equipo** en el torneo.
5. **Sanciones** automáticas por tarjeta roja o acumulación de amarillas.
