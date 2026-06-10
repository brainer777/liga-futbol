# ⚽ Liga de Fútbol — Sistema de Gestión

> Sistema web completo para la gestión de ligas de fútbol: inscripción de equipos, control de jugadores, autenticación por roles, generación de partidos, estadísticas, publicación de resultados y control de pagos.

## 🚀 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | NestJS 10 + Prisma 5 + class-validator + Passport (JWT) |
| **Base de datos** | PostgreSQL 16 |
| **Autenticación** | JWT + bcrypt + Guards + Decorators + RBAC |
| **Gestión de estado** | Zustand (auth) + TanStack Query (server state) |
| **Formularios** | react-hook-form + zod |
| **Tablas** | TanStack Table |

## 📁 Estructura del monorepo

```
liga-futbol/
├── backend/          # API REST (NestJS)
├── frontend/         # Aplicación web (Next.js)
├── docs/             # Documentación del sistema
├── scripts/          # Scripts auxiliares
└── README.md         # Este archivo
```

## ⚙️ Requisitos previos

- **Node.js** >= 20 (probado con 24)
- **npm** >= 10 (probado con 11)
- **PostgreSQL** >= 16 (o usar `embedded-postgres` — ver `backend/README.md`)
- **Git**

## 🏁 Inicio rápido (5 minutos)

### 1. Clonar e instalar

```bash
git clone <url-del-repo>
cd liga-futbol
```

### 2. Levantar PostgreSQL

Si aún no tienes PostgreSQL instalado:

```bash
winget install -e --id PostgreSQL.PostgreSQL.16
```

Luego crear la BD:

```bash
psql -U postgres
CREATE USER liga_user WITH PASSWORD 'liga_pass_dev';
CREATE DATABASE liga_futbol OWNER liga_user;
GRANT ALL PRIVILEGES ON DATABASE liga_futbol TO liga_user;
\q
```

### 3. Backend

```bash
cd backend
cp .env.example .env       # editar si es necesario
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev          # http://localhost:3001
```

### 4. Frontend (en otra terminal)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000
```

## 🔑 Credenciales por defecto

| Campo | Valor |
|---|---|
| **Email** | `admin@liga.com` |
| **Contraseña** | `admin123` |
| **Rol** | Superadministrador |

> ⚠️ Cambia la contraseña antes de pasar a producción.

## 📊 Módulos

### Sprint 1 (actual) ✅
- Autenticación con JWT
- Gestión de usuarios y roles (RBAC)
- Categorías (Sub8 → Master)
- Temporadas
- Clubes y equipos
- Inscripciones (sin pagos)

### Sprint 2 (próximo)
- Pagos (efectivo y transferencia)
- Comprobantes
- Jugadores y validación de edad
- Documentos
- Reportes

### Sprint 3
- Torneos y formatos
- Generación de fixture
- Partidos y resultados
- Tabla de posiciones
- Estadísticas

### Sprint 4
- Portal público
- Notificaciones
- App móvil / PWA
- Multiliga
- Firma digital

## 🛠️ Comandos útiles

```bash
# Backend
npm run start:dev         # Desarrollo con watch
npm run build             # Compilar
npm run start:prod        # Producción
npx prisma studio         # GUI de la BD
npx prisma migrate dev    # Crear nueva migración
npx prisma db seed        # Ejecutar seed

# Frontend
npm run dev               # Desarrollo
npm run build             # Compilar
npm run start             # Producción
npm run lint              # Lint
npx tsc --noEmit          # Type-check
```

## 📝 Documentación

- Plan del Sprint 1: `.hermes/plans/`
- `backend/README.md` — detalles del backend
- `frontend/README.md` — detalles del frontend
- `docs/` — especificación funcional

## 🤝 Contribución

1. Crear rama desde `main`: `git checkout -b feat/mi-feature`
2. Commits con Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
3. Pull request con descripción clara

## 📄 Licencia

Privado. Todos los derechos reservados.
