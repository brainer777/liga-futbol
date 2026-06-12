# Sprint 1 — Cierre

## Alcance entregado

- **Auth**: login con JWT, `GET /api/auth/me`, logout simbólico.
- **RBAC**: 7 roles y permisos sembrados; guards `JwtAuthGuard` + `RolesGuard`.
- **Catálogo**: CRUD completo de categorías (8 sembradas), temporadas, clubes, equipos, torneos.
- **Inscripciones**: alta por torneo + categoría, con costo, fecha límite, observaciones y estado automático.
- **Pagos**: alta en efectivo (recibo) o transferencia (referencia), con recálculo automático de saldo y estado.
- **UI**: panel Next.js con login, dashboard con KPIs y 7 páginas CRUD funcionales.

## Reglas de negocio implementadas

- La categoría valida rangos de edad (mín/máx).
- Categorías Sub8/Sub10/Sub12 permiten validación por año de nacimiento.
- `saldo_pendiente` se recalcula en cada pago.
- `estado` de la inscripción transiciona:
  `preinscrito → pendiente_pago → pago_parcial → pagado → vencido (si pasa la fecha límite con saldo)`.
- `criterio_desempate` configurable por torneo.
- `permite_reprogramacion` configurable por torneo.

## Datos sembrados (seed)

- Roles: Superadministrador, Administrador de liga, Coordinador, Delegado de equipo, Árbitro, Digitador, Público.
- 13 permisos base.
- 8 categorías (Sub8 → Master).
- 1 temporada del año actual.
- 1 usuario `admin@liga.com / admin123`.

## Endpoints expuestos (Sprint 1)

Ver Swagger en `http://localhost:3001/api/docs` o el detalle en `backend/README.md`.

| Módulo | Endpoints |
|---|---|
| auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| usuarios | CRUD completo |
| roles | CRUD completo |
| categorías | CRUD completo |
| temporadas | CRUD completo |
| clubes | CRUD completo |
| equipos | CRUD + filtros por club/categoría |
| torneos | CRUD completo |
| inscripciones | CRUD + recalc automático |
| pagos | alta, listado, baja (recalcula saldo) |
| health | `GET /health` |

## Próximos pasos (Sprint 2)

1. Jugadores con validación de edad por fecha de nacimiento y, en Sub8/10/12, por año.
2. Documentos de jugador (subida de archivos).
3. Estados de habilitación por jugador.
4. Sanciones y disciplina.
5. Reportes (deuda, ingresos, habilitados).
