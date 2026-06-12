# ⚽ Liga de Fútbol — Sistema de Gestión

> Sistema web completo para la gestión de ligas de fútbol: inscripción de equipos, control de jugadores, autenticación por roles, generación de partidos, estadísticas, publicación de resultados y control de pagos.

## 🚀 Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn-style UI |
| **Backend** | NestJS 10 + Prisma 5 + class-validator + Passport (JWT) |
| **Base de datos** | PostgreSQL 16 — embebido en local; contenedor real con Docker |
| **Auth** | JWT + bcrypt + Guards + Decorators + RBAC |
| **Gestión de estado** | Zustand (auth) + TanStack Query (server state) |
| **Formularios** | react-hook-form + zod |
| **Tablas** | TanStack Table |

## 📁 Estructura del monorepo

```
liga-futbol/
├── backend/          # API REST (NestJS) — ver backend/README.md
├── frontend/         # Aplicación web (Next.js) — ver frontend/README.md
├── docs/             # Documentación del sistema
├── scripts/          # dev-init.js (bootstrap de primer arranque)
└── package.json      # Scripts de orquestación
```

## ⚙️ Requisitos

- **Node.js** >= 20
- **npm** >= 10
- (No es necesario instalar PostgreSQL — la BD embebida arranca sola)

## 🏁 Inicio rápido (3 comandos)

```bash
# 1. Bootstrap completo (instala deps, copia .env, inicia PG embebido, migra y siembra)
npm run dev:init

# 2. En una terminal: backend
npm run backend:dev
#   → http://localhost:3001/api
#   → Swagger UI: http://localhost:3001/api/docs
#   → Health:     http://localhost:3001/api/health

# 3. En otra terminal: frontend
npm run frontend:dev
#   → http://localhost:3000
```

> Tras cualquier cambio al schema (`backend/prisma/schema.prisma`),
> regenerá el cliente y aplicá la migración:
> ```bash
> cd backend
> npx prisma migrate dev --name <nombre>
> npx prisma generate
> ```

## 🐳 Docker (stack completo)

Levanta **base de datos + backend + frontend** en contenedores, sin instalar Node ni PostgreSQL en tu máquina. Pensado para correr el sistema completo con un comando.

### Requisitos

- **Docker Engine** + **Docker Compose v2** (`docker compose version`).

### Puesta en marcha

```bash
# 1. Copiá las variables y completá los secretos (POSTGRES_PASSWORD y JWT_SECRET)
cp .env.docker.example .env
#    Tip para generar un secreto fuerte:  openssl rand -base64 32

# 2. Build + arranque de los 3 servicios
docker compose up --build        # agregá -d para correr en segundo plano
```

Una vez arriba:

| Servicio | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:3001/api |
| **Swagger UI** | http://localhost:3001/api/docs |
| **Health** | http://localhost:3001/api/health |

Entrá con las [credenciales por defecto](#-credenciales-por-defecto) (`admin@liga.com` / `admin123`).

### Cómo funciona

- **db** → `postgres:16` con healthcheck; los datos persisten en el volumen `pgdata`.
- **backend** → al arrancar corre `prisma migrate deploy` y **siembra la base solo si está vacía** (idempotente: el admin se crea una sola vez). El PostgreSQL embebido queda desactivado (`USE_EMBEDDED_POSTGRES=false`); usa el servicio `db`.
- **frontend** → imagen Next.js `standalone`. La URL de la API (`NEXT_PUBLIC_API_BASE_URL`) se **hornea en build** porque las llamadas las hace el navegador; si exponés el backend en otro host/puerto, ajustá esa variable en `.env` y reconstruí.
- El arranque está encadenado por *healthchecks*: `frontend` espera a que `backend` esté sano, y `backend` a que `db` lo esté.

### Comandos útiles

```bash
docker compose logs -f backend     # ver logs del backend en vivo
docker compose ps                  # estado de los contenedores
docker compose down                # detener (conserva los datos)
docker compose down -v             # detener y BORRAR datos (volúmenes)
docker compose up -d --build       # reconstruir tras cambios de código
```

> El primer build descarga las imágenes base y corre `npm ci` en ambos proyectos, así que tarda unos minutos. Los siguientes usan caché.

## 🔑 Credenciales por defecto

| Campo | Valor |
|---|---|
| **Email** | `admin@liga.com` |
| **Contraseña** | `admin123` |
| **Rol** | Superadministrador |

> ⚠️ Cambia la contraseña antes de pasar a producción.

## 🛠️ Otros comandos

```bash
npm run db:reset       # ⚠️  Borra y re-inicializa la BD (PG embebido + seed)
```

## 📊 Estado del proyecto

### ✅ Sprint 1

- Autenticación con JWT + bcrypt
- 7 roles + RBAC con guards y decorators
- CRUD de **Categorías** (Sub8 → Master, con reglas de edad y documentación)
- CRUD de **Temporadas** anuales
- CRUD de **Clubes**
- CRUD de **Equipos** (con club + categoría + delegado)
- CRUD de **Torneos** con formato configurable y reglas de puntuación/desempate
- **Inscripciones** por torneo y categoría con costo, fecha límite y observaciones
- **Pagos** en efectivo (con número de recibo) y transferencia (con referencia)
- Cálculo automático de `monto_pagado` y `saldo_pendiente`
- Estado de inscripción: `pendiente_pago → pago_parcial → pagado → vencido` (automático)
- Dashboard con KPIs
- Swagger UI documentando todos los endpoints
- 8 categorías sembradas por defecto

### ✅ Sprint 2

- **Jugadores** con datos personales, fecha de nacimiento y documento
- **Validación de edad automática** según categoría:
  - Sub8/Sub10/Sub12: acepta validación por año de nacimiento si no hay cédula
  - Categorías superiores: cédula obligatoria
- **Estados de validación**: pendiente, habilitado, observado, rechazado, suspendido
- **Documentos de jugador** (cédula, DNI, pasaporte, partida, foto, autorización, etc.)
- **Subida de archivos** con validación de tipo y tamaño (jpg/png/webp/gif/pdf)
- **Aprobación / rechazo de documentos** con auditoría
- **Plantilla de equipos** (vincular jugador a equipo con dorsal y posición)
- **Habilitación por equipo**: estado independiente + motivo de observación
- **Revalidación bajo demanda** contra una categoría específica
- Sirve los uploads vía `GET /uploads/...`
- Nueva sección en el dashboard y KPIs de jugadores

### ✅ Sprint 3

- **Generador de fixture** determinista y testeado (15/15 tests pasan) que soporta:
  - Todos contra todos, ida y vuelta, triangular/cuadrangular/hexagonal, liguilla
  - Eliminación directa y doble eliminación (con siembra)
  - Grupos (con distribución equitativa) y grupos + eliminación
- **Algoritmo circle method** para round-robin con BYE automático si hay equipos impares
- **Bracket automático** al tamaño potencia de 2 más cercano
- **Fases, grupos y partidos** persistidos en BD con transacción
- **Programación inicial**: fecha de inicio, hora por defecto, días entre jornadas
- **Reprogramación de partidos** con historial completo (`partidos_reprogramaciones`)
- **Estados del partido**: borrador, programado, en_juego, finalizado, suspendido, reprogramado, cancelado
- **Vista de detalle de torneo** con fixture agrupado por jornada/etapa
- **Validación de `permiteReprogramacion`** por torneo
- 6 modelos nuevos en BD: `FaseTorneo`, `Grupo`, `GrupoEquipo`, `Partido`, `PartidoReprogramacion` (+ 3 enums)

### ✅ Sprint 4

- **Resultados**: registro de marcador + eventos (goles, tarjetas, cambios, doble amarilla)
- **Tabla de posiciones** con cualquier criterio de desempate (`diferencia_goles`, `gol_average`, `enfrentamiento_directo`, `goles_favor`, `partido_extra`) — 9/9 tests pasan
- **Goleadores** y **ranking de tarjetas** por torneo
- **Estadísticas de jugador y equipo** sincronizadas automáticamente al cerrar cada partido
- **Sanciones automáticas**:
  - Tarjeta roja directa → 2 fechas de suspensión
  - Doble amarilla → 1 fecha
  - Acumulación de 3 amarillas en el torneo → 1 fecha
- **Vista de detalle de torneo ampliada** con:
  - 3 KPI cards (partidos, equipos, sanciones)
  - Tabla de posiciones completa (con #, PJ, G, E, P, GF, GC, DG, Pts)
  - Top 10 goleadores y top 10 amonestados
  - Sanciones con acciones de "Cumplida" / "Condonar"
  - Botón "Resultado" en cada partido no finalizado
- **Modal de resultado** con marcador editable (+/-), validador de consistencia entre goles del marcador y eventos
- 5 modelos nuevos en BD: `Resultado`, `ResultadoEvento`, `Sancion`, `EstadisticaJugador`, `EstadisticaEquipo` (+ 2 enums)
- 11 endpoints nuevos

### 🟡 Próximos sprints

- **Sprint 5** — Portal público, reportes, auditoría
- **Sprint 6** — Pasarela de pago, notificaciones, PWA, multiliga

## 🤝 Contribución

1. Ramas desde `main`: `git checkout -b feat/mi-feature`
2. Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
3. PR con descripción clara
