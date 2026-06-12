# ⚽ Backend — Liga de Fútbol (NestJS + Prisma + PostgreSQL embebido)

API REST para el sistema de gestión de liga de fútbol. **Sprint 1**:
auth, usuarios, roles, categorías, temporadas, clubes, equipos, torneos,
inscripciones y pagos.

## 🚀 Stack

- **NestJS 10** + **TypeScript 5**
- **Prisma 5** ORM
- **PostgreSQL 16** (arranca embebido automáticamente — *no requiere instalación*)
- **JWT** + **bcrypt** + Guards + RBAC
- **Swagger** en `/api/docs`

## ⚙️ Requisitos

- **Node.js** >= 20 (probado con 24)
- **npm** >= 10

> No necesitás instalar PostgreSQL: la librería `embedded-postgres` lo baja y
> lo arranca en `.pgdata/` la primera vez. Si ya tenés un Postgres en el
> `5432`, podés poner `USE_EMBEDDED_POSTGRES=false` en el `.env` y apuntar
> `DATABASE_URL` a tu servidor.

## 🏁 Puesta en marcha

```bash
# 1) Instalar dependencias
npm install

# 2) Crear .env desde el ejemplo
cp .env.example .env

# 3) Inicializar base de datos (PG embebido + migraciones + seed)
npm run db:init
#   O bien, paso a paso:
#   npm run prisma:migrate
#   npm run prisma:seed

# 4) Arrancar en modo dev
npm run start:dev
#   → http://localhost:3001/api
#   → Swagger: http://localhost:3001/api/docs
#   → Health: http://localhost:3001/api/health
```

## 🔑 Credenciales por defecto (creadas por el seed)

| Campo | Valor |
|---|---|
| Email | `admin@liga.com` |
| Contraseña | `admin123` |
| Rol | Superadministrador |

## 🧰 Comandos útiles

```bash
npm run start:dev         # Dev con watch
npm run build && npm run start:prod
npm run prisma:studio     # GUI de la BD
npm run prisma:migrate    # Crear nueva migración
npm run prisma:seed       # Re-ejecutar seed
npm run db:reset          # ⚠️  Borrar todo y empezar de cero
npm run db:init           # Inicializar PG embebido + migrar + seed
```

## 🗂️ Estructura

```
backend/
├── prisma/
│   ├── schema.prisma      # Modelo de datos
│   ├── seed.ts            # Seed inicial (roles, admin, categorías...)
│   └── migrations/        # Generadas por Prisma (se commitean)
├── scripts/
│   ├── init-db.ts         # Levanta PG embebido + migra + seed
│   └── reset-db.ts        # Borra todo y re-inicializa
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/            # Cliente Prisma
│   ├── embedded-postgres/ # Arranque de PG embebido
│   ├── auth/              # JWT, login, guards, decorators
│   ├── usuarios/          # CRUD usuarios + asignación de roles
│   ├── roles/             # CRUD roles
│   ├── categorias/        # CRUD categorías
│   ├── temporadas/        # CRUD temporadas
│   ├── clubes/            # CRUD clubes
│   ├── equipos/           # CRUD equipos
│   ├── torneos/           # CRUD torneos (fixture en Sprint 3)
│   ├── inscripciones/     # Inscripciones por torneo/categoría
│   ├── pagos/             # Pagos en efectivo/transferencia
│   └── health/            # GET /api/health
└── .env.example
```

## 📡 Endpoints principales (Sprint 1)

> Todos (excepto `/auth/login` y `/health`) requieren `Authorization: Bearer <jwt>`.
> En Swagger podés probar todo con el botón **Authorize**.

### Auth
- `POST /api/auth/login` — `{ email, password }` → `{ accessToken, user }`
- `GET  /api/auth/me` — perfil del usuario autenticado
- `POST /api/auth/logout` — solo simbólico, el cliente descarta el token

### Catálogo
- `GET/POST/PATCH/DELETE /api/categorias`
- `GET/POST/PATCH/DELETE /api/temporadas`
- `GET/POST/PATCH/DELETE /api/clubes`
- `GET/POST/PATCH/DELETE /api/equipos?clubId=&categoriaId=`
- `GET/POST/PATCH/DELETE /api/torneos`

### Inscripciones y pagos
- `GET    /api/inscripciones?torneoId=&equipoId=&estado=`
- `POST   /api/inscripciones`
- `GET    /api/inscripciones/:id`
- `PATCH  /api/inscripciones/:id`
- `DELETE /api/inscripciones/:id`
- `GET    /api/pagos`
- `GET    /api/pagos/inscripcion/:inscripcionId`
- `POST   /api/pagos` — registra un pago y recalcula el saldo
- `DELETE /api/pagos/:id`

### Administración
- `GET/POST/PATCH/DELETE /api/usuarios`
- `GET/POST/PATCH/DELETE /api/roles`

### Utilidad
- `GET /api/health` — estado del backend y de la BD

## 🛡️ Roles disponibles

- `Superadministrador` — todo
- `Administrador de liga` — gestión operativa
- `Coordinador` — apoyo operativo
- `Delegado de equipo` — gestión de sus equipos
- `Árbitro` — registro de resultados
- `Digitador` — carga de datos
- `Público` — sin acceso al panel

## 🧪 Resetear todo

```bash
# Borra .pgdata, vuelve a migrar y re-sembra
npm run db:reset
```
