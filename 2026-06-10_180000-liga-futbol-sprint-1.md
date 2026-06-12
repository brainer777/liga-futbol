# Plan: Sistema de Gestión de Liga de Fútbol — Sprint 1

> **Para Hermes:** Implementar este plan con la skill `subagent-driven-development` (un subagente por tarea, revisión de dos etapas). Cada tarea debe ser un commit independiente.

**Fecha:** 2026-06-10
**Stack confirmado:** NestJS 10 + Prisma 5 + PostgreSQL 16 + Next.js 15 (App Router) + Tailwind + shadcn/ui + JWT
**Ubicación:** `C:\Users\Brainer Gaston\liga-futbol\`
**Idioma:** Código y nombres técnicos en inglés; comentarios, mensajes y UI 100% en español.

---

## 0. Resumen de decisiones (Sprint 1)

| Decisión | Elección | Razón |
|---|---|---|
| ORM backend | **Prisma 5** | Tipado fuerte, migraciones claras, excelente DX |
| DB | **PostgreSQL 16** (instalado con winget) | Coincide con la arquitectura propuesta |
| Auth | **JWT + bcrypt + Guards + Decorators** | Estándar NestJS, simple y robusto |
| Validación | **class-validator + class-transformer** | Estándar de NestJS |
| Frontend | **Next.js 15 (App Router) + TypeScript** | Coincide con la arquitectura |
| UI | **Tailwind CSS + shadcn/ui + lucide-react** | Moderno, accesible, customizable |
| Estado global | **Zustand** (ligero) + **TanStack Query** (server state) | Estándar moderno, menos boilerplate que Redux |
| Formularios | **react-hook-form + zod** | Tipado + validación, el patrón actual |
| Tablas | **TanStack Table** | Estándar para listados admin |
| Iconos | **lucide-react** | Coherente con shadcn/ui |
| Mensajes UI | **sonner** (toasts) | Estándar shadcn/ui |
| Estructura de monorepo | **2 carpetas independientes** (backend/, frontend/) | Simple, evita complejidad de turborepo al inicio |

---

## 1. Alcance del Sprint 1

**Objetivo:** Base funcional con autenticación, gestión de roles, categorías, clubes, equipos, temporadas e inscripciones (solo el alta, sin pagos aún).

### Módulos incluidos en Sprint 1
- ✅ `auth` — login, logout, /me
- ✅ `usuarios` y `roles` (RBAC básico)
- ✅ `categorias` (CRUD + reglas de edad)
- ✅ `temporadas` (CRUD básico, necesaria para inscripciones)
- ✅ `clubes` (CRUD)
- ✅ `equipos` (CRUD básico, FK a club y categoría)
- ✅ `inscripciones` (CRUD básico: crear y listar; sin pagos en Sprint 1)

### Módulos diferidos a Sprint 2
- ❌ Pagos (efectivo, transferencia, comprobantes)
- ❌ Jugadores
- ❌ Documentos
- ❌ Torneos y fixture
- ❌ Partidos y resultados
- ❌ Estadísticas
- ❌ Portal público

### Entregables al final del Sprint 1
- Backend corriendo en `http://localhost:3001` con todos los endpoints de los módulos listados
- Frontend corriendo en `http://localhost:3000` con login, dashboard básico, y CRUDs funcionales para todos los módulos
- Base de datos PostgreSQL creada con todas las tablas necesarias (incluyendo las que no se usan aún, porque Prisma puede manejarlo en un solo `schema.prisma` que cubra los Sprints 1-3 desde el inicio para evitar retrabajo)
- Datos seed: roles por defecto, superadmin creado, 8 categorías pre-creadas, una temporada ejemplo
- README.md con instrucciones de arranque

---

## 2. Estructura de carpetas

```
C:\Users\Brainer Gaston\liga-futbol\
├── backend\
│   ├── prisma\
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations\          # generado por prisma migrate
│   ├── src\
│   │   ├── common\              # decoradores, guards, filtros compartidos
│   │   │   ├── decorators\
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── guards\
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   └── public.decorator.ts
│   │   │   ├── filters\
│   │   │   │   └── http-exception.filter.ts
│   │   │   └── prisma\
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   ├── auth\
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto\
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── auth-response.dto.ts
│   │   │   └── strategies\
│   │   │       └── jwt.strategy.ts
│   │   ├── usuarios\
│   │   │   ├── usuarios.module.ts
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── entities\usuario.entity.ts
│   │   │   └── dto\create-usuario.dto.ts, update-usuario.dto.ts
│   │   ├── roles\
│   │   │   ├── roles.module.ts
│   │   │   ├── roles.controller.ts
│   │   │   ├── roles.service.ts
│   │   │   └── entities\rol.entity.ts
│   │   ├── categorias\
│   │   ├── temporadas\
│   │   ├── clubes\
│   │   ├── equipos\
│   │   ├── inscripciones\
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test\                    # e2e (opcional Sprint 1)
│   ├── .env.example
│   ├── .env                     # gitignored
│   ├── .gitignore
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── frontend\
│   ├── app\
│   │   ├── (auth)\
│   │   │   └── login\page.tsx
│   │   ├── (admin)\
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard\page.tsx
│   │   │   ├── categorias\page.tsx, [id]\page.tsx
│   │   │   ├── temporadas\page.tsx
│   │   │   ├── clubes\page.tsx, [id]\page.tsx
│   │   │   ├── equipos\page.tsx, [id]\page.tsx
│   │   │   ├── inscripciones\page.tsx
│   │   │   └── usuarios\page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx            # redirect a /login o /dashboard
│   │   └── globals.css
│   ├── components\
│   │   ├── ui\                 # shadcn components
│   │   ├── layout\sidebar.tsx, header.tsx, user-menu.tsx
│   │   ├── forms\categoria-form.tsx, club-form.tsx, etc.
│   │   └── tables\data-table.tsx, columns-categorias.tsx, etc.
│   ├── lib\
│   │   ├── api.ts              # axios/fetch wrapper con JWT
│   │   ├── auth.ts             # store de auth
│   │   ├── utils.ts            # cn(), formatters
│   │   └── validations\        # zod schemas
│   ├── hooks\                  # useAuth, useCategorias, etc.
│   ├── types\                  # tipos compartidos con backend
│   ├── .env.local.example
│   ├── components.json         # shadcn config
│   ├── next.config.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── README.md
├── .gitignore                  # raíz del monorepo
├── docker-compose.yml          # postgres (alternativa a winget)
└── README.md                   # instrucciones globales
```

---

## 3. Tareas del Sprint 1

### Convención
- ⏱ Tareas de 2-5 min cada una cuando se ejecutan con subagente
- 🔴 Tarea de setup
- 🟡 Tarea de código backend
- 🟢 Tarea de código frontend
- 🔵 Tarea de configuración / BD
- Cada tarea cierra con un `git commit` siguiendo Conventional Commits

---

### 🔴 Tarea 1: Inicializar repositorio y estructura raíz

**Objetivo:** Crear la carpeta del proyecto, inicializar git, crear `.gitignore` raíz y `README.md` raíz.

**Pasos:**
1. `mkdir C:\Users\Brainer Gaston\liga-futbol && cd liga-futbol`
2. `git init`
3. Crear `.gitignore` raíz con exclusiones estándar (node_modules, .env, dist, .next, *.log, .DS_Store, Thumbs.db, .vscode/, .idea/)
4. Crear `README.md` raíz con resumen del proyecto, stack y comandos básicos.
5. `git add . && git commit -m "chore: inicializar proyecto liga-futbol"`

**Verificación:** `ls -la` muestra carpetas vacías `backend/` y `frontend/` (creadas con `mkdir` pero vacías).

---

### 🔵 Tarea 2: Instalar PostgreSQL 16 con winget

**Objetivo:** Tener PostgreSQL corriendo localmente.

**Pasos:**
1. Verificar versión disponible: `winget search PostgreSQL`
2. Instalar: `winget install -e --id PostgreSQL.PostgreSQL.16` (o el ID que aparezca)
3. Verificar: `psql --version`
4. Crear usuario y BD de la app:
   - Conectarse como postgres (el instalador suele pedir contraseña)
   - `CREATE USER liga_user WITH PASSWORD 'liga_pass_dev';`
   - `CREATE DATABASE liga_futbol OWNER liga_user;`
   - `GRANT ALL PRIVILEGES ON DATABASE liga_futbol TO liga_user;`
5. Probar conexión: `psql -U liga_user -d liga_futbol -h localhost`

**Verificación:** El último comando entra al prompt de psql. Salir con `\q`.

**⚠️ Plan B aplicado:** el instalador winget quedó a mitad (sin inicializar `data/` y sin servicio). Se usa `embedded-postgres` (paquete npm) que descarga y arranca PostgreSQL 17 portable en un puerto local. Documentado en `backend/README.md`.

---

### 🔴 Tarea 3: Scaffold del backend NestJS

**Objetivo:** Crear proyecto NestJS con TypeScript, Prisma y configuración base.

**Pasos:**
1. `cd backend`
2. `npm i -g @nestjs/cli` (si no está)
3. `nest new . --package-manager npm --skip-git` (responder "no" a git init porque ya hay repo)
4. Instalar dependencias base:
   ```
   npm i @prisma/client bcrypt class-validator class-transformer
     @nestjs/jwt @nestjs/passport passport passport-jwt
     @nestjs/config reflect-metadata rxjs
   npm i -D prisma @types/bcrypt @types/passport-jwt @types/node
     ts-node ts-loader tsconfig-paths
   ```
5. Crear `.env.example` y `.env` con:
   ```
   DATABASE_URL="postgresql://liga_user:liga_pass_dev@localhost:5432/liga_futbol?schema=public"
   JWT_SECRET="change-me-in-production-min-32-chars-please"
   JWT_EXPIRES_IN="8h"
   PORT=3001
   NODE_ENV=development
   ```
6. Verificar `.gitignore` ya excluye `.env`
7. `git add backend && git commit -m "feat(backend): scaffold nestjs con prisma y auth deps"`

**Verificación:** `npm run build` no falla. `npm run start:dev` arranca en puerto 3001.

---

### 🔵 Tarea 4: Definir schema Prisma completo (Sprint 1-3)

**Objetivo:** Crear `prisma/schema.prisma` con TODAS las entidades que se usarán en Sprints 1-3, para evitar migraciones destructivas después. Sprint 1 solo usará un subconjunto, pero las tablas existen.

**Pasos:**
1. `npx prisma init` (ya hecho por el scaffold, ajustar)
2. Sobrescribir `prisma/schema.prisma` con todas las entidades del documento de contexto: usuarios, roles, permisos, usuario_roles, categorias, temporadas, clubes, equipos, delegados, torneos, fases_torneo, grupos, grupo_equipos, inscripciones, jugadores, jugadores_documentos, equipo_jugadores, pagos, pagos_comprobantes, partidos, partidos_reprogramaciones, resultados, resultado_detalles, tabla_posiciones, estadisticas_jugador, estadisticas_equipo, auditoria.
3. Usar enums de Prisma para los enums del documento (estado_usuario, estado_inscripcion, metodo_pago, estado_partido, criterio_desempate, formato_torneo, estado_jugador).
4. Ejecutar `npx prisma migrate dev --name init` → crea la migración inicial y la BD.
5. `npx prisma generate` → genera el cliente.
6. `git add . && git commit -m "feat(backend): schema prisma completo con todas las entidades"`

**Verificación:** `npx prisma studio` abre y muestra todas las tablas vacías.

---

### 🔵 Tarea 5: Crear PrismaModule y PrismaService

**Objetivo:** Hacer Prisma disponible globalmente.

**Archivos:**
- `src/common/prisma/prisma.service.ts`
- `src/common/prisma/prisma.module.ts`
- Modificar `src/app.module.ts` para importar `PrismaModule` (global)

**Verificación:** Backend sigue arrancando sin errores.

---

### 🔴 Tarea 6: Crear módulo de Auth completo

**Objetivo:** Login funcional con JWT.

**Archivos a crear:**
- `src/auth/dto/login.dto.ts` (email, password, validados)
- `src/auth/dto/auth-response.dto.ts` (user, access_token, roles)
- `src/auth/strategies/jwt.strategy.ts` (validar token, devolver payload con roles)
- `src/auth/auth.service.ts` (validateUser, login, hashPassword)
- `src/auth/auth.controller.ts` (POST /auth/login, POST /auth/logout, GET /auth/me con JwtAuthGuard)
- `src/auth/auth.module.ts`
- `src/common/guards/jwt-auth.guard.ts` (con `@Public()` decorator)
- `src/common/decorators/current-user.decorator.ts` (extrae `req.user`)
- `src/common/decorators/roles.decorator.ts` (define roles requeridos)
- `src/common/guards/roles.guard.ts` (verifica que el usuario tiene el rol)
- Modificar `src/main.ts` para usar `ValidationPipe` global con `whitelist: true`, `transform: true`.

**Verificación:** Con curl, `POST /api/auth/login` con credenciales válidas devuelve `{user, access_token}`. `GET /api/auth/me` con `Authorization: Bearer <token>` devuelve el usuario.

**Test manual (curl):**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@liga.com","password":"admin123"}'

# Me (con token)
TOKEN="..."
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
```

---

### 🔴 Tarea 7: Crear módulo de Roles

**Objetivo:** CRUD de roles, seed inicial con los 7 roles del documento.

**Endpoints:**
- `GET /api/roles` — listar
- `GET /api/roles/:id` — detalle
- `POST /api/roles` — crear (admin)
- `PUT /api/roles/:id` — actualizar (admin)
- `DELETE /api/roles/:id` — soft delete (admin)

**Seed:** Crear roles por defecto: Superadministrador, Administrador de liga, Coordinador, Delegado de equipo, Árbitro, Digitador, Público.

**Verificación:** Endpoints funcionan. Seed crea los 7 roles.

---

### 🔴 Tarea 8: Crear módulo de Usuarios

**Objetivo:** CRUD de usuarios con asignación de roles.

**Endpoints:**
- `GET /api/usuarios`
- `GET /api/usuarios/:id`
- `POST /api/usuarios` (admin)
- `PUT /api/usuarios/:id` (admin)
- `DELETE /api/usuarios/:id` (admin, soft)
- `POST /api/usuarios/:id/roles` (admin, asignar roles)

**Seed:** Crear usuario `admin@liga.com` con password `admin123` y rol Superadministrador.

**Verificación:** Login con este usuario funciona. Endpoints devuelven datos con sus roles.

---

### 🔴 Tarea 9: Crear módulo de Categorías

**Objetivo:** CRUD de categorías con las 8 categorías pre-cargadas.

**Endpoints:**
- `GET /api/categorias` (público para admins, lista todas)
- `GET /api/categorias/:id`
- `POST /api/categorias` (admin)
- `PUT /api/categorias/:id` (admin)
- `DELETE /api/categorias/:id` (admin, soft)

**Validación:** edad_minima <= edad_maxima, `permite_sin_cedula` y `valida_por_anio_nacimiento` booleanos.

**Seed:** Crear las 8 categorías:
- Sub8 (edad_min: 6, edad_max: 8, permite_sin_cedula: true, valida_por_anio: true)
- Sub10 (7-10, true, true)
- Sub12 (9-12, true, true)
- Sub14 (11-14, false, false)
- Sub16 (13-16, false, false)
- Sub18 (15-18, false, false)
- Libre (18-99, false, false)
- Master (35-99, false, false)

**Verificación:** GET devuelve las 8 categorías con sus reglas.

---

### 🔴 Tarea 10: Crear módulo de Temporadas

**Objetivo:** CRUD de temporadas.

**Endpoints:**
- `GET /api/temporadas`
- `POST /api/temporadas`
- `PUT /api/temporadas/:id`
- `DELETE /api/temporadas/:id`

**Seed:** Crear temporada 2026 por defecto (estado 'activa').

**Verificación:** Temporada 2026 existe y es la activa.

---

### 🔴 Tarea 11: Crear módulo de Clubes

**Objetivo:** CRUD de clubes con datos de contacto.

**Endpoints:**
- `GET /api/clubes` (paginado opcional: ?page=1&limit=20&search=)
- `GET /api/clubes/:id`
- `POST /api/clubes`
- `PUT /api/clubes/:id`
- `DELETE /api/clubes/:id` (soft)

**Verificación:** CRUD funciona. Validación de email único, sigla única opcional.

---

### 🔴 Tarea 12: Crear módulo de Equipos

**Objetivo:** CRUD de equipos vinculados a un club y una categoría.

**Endpoints:**
- `GET /api/equipos?club_id=...&categoria_id=...`
- `GET /api/equipos/:id` (incluye datos del club y categoría)
- `POST /api/equipos`
- `PUT /api/equipos/:id`
- `DELETE /api/equipos/:id` (soft)

**Validación:** Un club puede tener varios equipos en distintas categorías, pero solo UN equipo por (club, categoría). Esto se valida con un índice único compuesto o lógica de servicio.

**Verificación:** Intentar crear dos equipos del mismo club en la misma categoría debe fallar con 409 Conflict.

---

### 🔴 Tarea 13: Crear módulo de Inscripciones (sin pagos)

**Objetivo:** CRUD básico de inscripciones. Los pagos se hacen en Sprint 2.

**Endpoints:**
- `GET /api/inscripciones?torneo_id=...&equipo_id=...&estado=...` (en Sprint 1 no hay torneos, así que el filtro `torneo_id` no se usa aún, pero el endpoint se prepara)
- `GET /api/inscripciones/:id`
- `POST /api/inscripciones` (crea con `costo_inscripcion`, `fecha_limite_pago`, estado inicial 'pendiente_pago', `saldo_pendiente = costo_inscripcion`)
- `PUT /api/inscripciones/:id` (actualizar estado, observaciones; admin)
- `DELETE /api/inscripciones/:id` (admin, soft)

**Verificación:** Crear inscripción genera saldo_pendiente correcto. Estados permitidos: preinscrito, pendiente_pago, pago_parcial, pagado, aprobado, observado, rechazado, vencido.

> **Nota:** En Sprint 1 NO creamos la entidad Torneo todavía (es Sprint 3), pero el modelo `inscripciones` ya tiene `torneo_id` (nullable inicialmente) para que el Sprint 3 solo agregue la tabla `torneos` y el FK se mantenga. Esto evita romper datos.

---

### 🔴 Tarea 14: Seed maestro (consolidado)

**Objetivo:** Un único `prisma/seed.ts` que se ejecute con `npx prisma db seed` y cree:
- 7 roles por defecto
- 1 superadmin (`admin@liga.com` / `admin123`)
- 8 categorías
- 1 temporada 2026 activa

**Configurar `package.json`:**
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

**Verificación:** Tras correr `npx prisma db seed` y reiniciar backend, login funciona, GET /categorias devuelve 8, GET /temporadas devuelve 1.

---

### 🟢 Tarea 15: Scaffold del frontend Next.js 15

**Objetivo:** Crear proyecto Next.js con App Router, TypeScript, Tailwind.

**Pasos:**
1. `cd ..` (ir a raíz)
2. `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir=false --import-alias="@/*" --eslint --use-npm --no-git`
3. `cd frontend`
4. Instalar:
   ```
   npm i axios zustand @tanstack/react-query @tanstack/react-table
     react-hook-form @hookform/resolvers zod
     lucide-react sonner class-variance-authority clsx tailwind-merge
     date-fns
   npx shadcn@latest init    # elige Default, Slate, CSS variables yes
   npx shadcn@latest add button input label card table dialog dropdown-menu
     form select textarea sonner badge separator avatar sheet sidebar
   ```
5. Configurar `app/globals.css` con variables CSS del tema (shadcn).
6. Configurar `lib/utils.ts` con `cn()`.
7. Crear `lib/api.ts` con axios instance + interceptor JWT.
8. Crear `lib/auth.ts` (zustand store: token, user, login, logout).
9. Crear `lib/validations/*.ts` con zod schemas.
10. `git add frontend && git commit -m "feat(frontend): scaffold nextjs 15 con tailwind y shadcn"`

**Verificación:** `npm run dev` arranca en puerto 3000, `npx tsc --noEmit` no tiene errores.

---

### 🟢 Tarea 16: Pantalla de Login

**Objetivo:** Login funcional conectado al backend.

**Archivos:**
- `app/(auth)/login/page.tsx` — formulario con shadcn Form + react-hook-form + zod
- `app/(auth)/layout.tsx` — layout minimalista
- `components/forms/login-form.tsx`

**Verificación:** Login con `admin@liga.com` / `admin123` guarda el token y redirige a `/dashboard`.

---

### 🟢 Tarea 17: Layout admin + Sidebar + Dashboard

**Objetivo:** Layout autenticado con sidebar de navegación y dashboard inicial.

**Archivos:**
- `app/(admin)/layout.tsx` — verifica sesión, redirige a /login si no
- `components/layout/sidebar.tsx` — con links a Categorías, Temporadas, Clubes, Equipos, Inscripciones, Usuarios
- `components/layout/header.tsx` — con menú de usuario (logout)
- `app/(admin)/dashboard/page.tsx` — cards con conteos (total clubes, equipos, jugadores próximamente, etc.)

**Verificación:** Usuario logueado ve el dashboard. Sidebar navega correctamente. Logout limpia token y redirige a login.

---

### 🟢 Tarea 18: CRUD de Categorías en frontend

**Objetivo:** Listar, crear, editar, eliminar categorías.

**Archivos:**
- `app/(admin)/categorias/page.tsx` — listado con TanStack Table
- `app/(admin)/categorias/[id]/page.tsx` — detalle/edición
- `components/forms/categoria-form.tsx`
- `components/tables/columns-categorias.tsx`
- `hooks/use-categorias.ts` — TanStack Query: useList, useCreate, useUpdate, useDelete
- `lib/validations/categoria.ts` — zod schema

**Verificación:** Crear "Sub20" nueva, ver que aparece en la lista, editarla, eliminarla.

---

### 🟢 Tarea 19: CRUD de Temporadas en frontend

**Objetivo:** Listar, crear, editar temporadas.

**Archivos similares al de categorías pero para temporadas.**

**Verificación:** Crear temporada 2027, marcarla como activa (campo `estado`).

---

### 🟢 Tarea 20: CRUD de Clubes en frontend

**Objetivo:** Listar, crear, editar, eliminar clubes. Con búsqueda.

**Archivos similares. Páginas:** listado + detalle (`/clubes/[id]`) con equipos del club listados abajo.

---

### 🟢 Tarea 21: CRUD de Equipos en frontend

**Objetivo:** Listar, crear, editar, eliminar equipos. Filtros por club y categoría.

**Archivos similares. Páginas:** listado con filtros + detalle.

**Verificación:** Crear equipo nuevo eligiendo club y categoría. Intentar crear duplicado (mismo club + categoría) muestra error del backend.

---

### 🟢 Tarea 22: Listado y alta de Inscripciones

**Objetivo:** Pantalla de inscripciones con tabla y formulario de alta.

**Archivos:**
- `app/(admin)/inscripciones/page.tsx` — listado con filtros (equipo, estado)
- `components/forms/inscripcion-form.tsx` — formulario con campos: equipo, costo, fecha_limite_pago, estado inicial, observaciones.

**Verificación:** Crear inscripción para un equipo con costo $100.000, fecha límite +15 días, estado "pendiente_pago". Saldo pendiente se muestra como $100.000.

---

### 🟢 Tarea 23: Listado de Usuarios (solo admin)

**Objetivo:** Listar usuarios y asignarles roles.

**Archivos:**
- `app/(admin)/usuarios/page.tsx`
- `components/forms/usuario-form.tsx` (con selector múltiple de roles)
- `hooks/use-usuarios.ts`

**Verificación:** Crear usuario "delegado1@liga.com" y asignarle rol "Delegado de equipo". Al loguearse con ese usuario, ve el dashboard pero NO ve el menú Usuarios (control por roles en frontend).

---

### 🟢 Tarea 24: Guards de roles en frontend

**Objetivo:** `<RoleGuard roles={['Superadministrador']}>` y hook `useHasRole()`.

**Archivos:**
- `components/auth/role-guard.tsx` — oculta children si no tiene rol
- `hooks/use-has-role.ts`

Aplicar en:
- Sidebar: ocultar link "Usuarios" si no es admin
- Página de usuarios: redirigir si no es admin

**Verificación:** Usuario "delegado" no ve la sección Usuarios.

---

### 🔴 Tarea 25: README final + scripts de arranque

**Objetivo:** Documentar el proyecto para que sea fácil de levantar.

**Archivos:**
- `README.md` raíz con: requisitos, instalación paso a paso, comandos de arranque, estructura, próximos pasos.
- `backend/README.md` con: variables de entorno, comandos prisma, seed.
- `frontend/README.md` con: variables de entorno, comandos.

Crear scripts en raíz:
- `scripts/start-backend.ps1` y `scripts/start-frontend.ps1` (PowerShell)
- O alternativamente, `package.json` raíz con scripts que usen `concurrently`.

**Verificación:** Otro dev puede clonar el repo, seguir el README y tener todo funcionando.

---

## 4. Convenciones de código

### Backend (TypeScript)
- **Naming:** `camelCase` para variables/funciones, `PascalCase` para clases, `snake_case` para columnas de BD (Prisma los mapea).
- **Errores:** usar excepciones HTTP de NestJS (`BadRequestException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`).
- **Respuestas exitosas:** siempre devolver la entidad, nunca mensajes. Errores sí devuelven `{statusCode, message, error}`.
- **Validación:** DTOs con `class-validator` en todos los endpoints. `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **Guards:** `JwtAuthGuard` global excepto donde se marque `@Public()`. `RolesGuard` global + `@Roles('Admin', ...)` por endpoint.
- **Comentarios:** español, breves, solo donde la lógica no sea obvia.

### Frontend (TypeScript / React)
- **Naming:** igual al backend.
- **Componentes:** funciones, no clases. `"use client"` solo cuando sea necesario.
- **Server components por defecto.** Client components para formularios, tablas interactivas, hooks.
- **Data fetching:** TanStack Query (`useQuery`, `useMutation`). NO `useEffect` + `fetch` directo.
- **Tipos:** compartir tipos del backend en `types/` o generarlos desde OpenAPI (en Sprint 2 con `openapi-typescript`).
- **Estilos:** Tailwind classes, nunca CSS inline. `cn()` para combinar clases condicionales.
- **Comentarios:** español.

---

## 5. Comandos clave del día a día

```bash
# Backend
cd backend
npx prisma studio            # GUI de la BD
npx prisma migrate dev       # nueva migración tras cambiar schema
npx prisma db seed           # ejecutar seed
npm run start:dev            # arrancar backend

# Frontend
cd frontend
npm run dev                  # arrancar frontend
npx tsc --noEmit             # type-check sin emitir
```

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `winget install` puede fallar por permisos | Plan B: `embedded-postgres` npm + script de arranque |
| Tamaño de tareas (15-24 frontend son muchas) | Cada sub-tarea UI es bite-sized; un agente por tarea |
| Pérdida de foco entre módulos | Revisión de cumplimiento de spec después de cada tarea |
| Type drift backend ↔ frontend | Tipos compartidos en `frontend/types/`; en Sprint 2 automatizar con OpenAPI |
| Tiempo de compilación de NestJS | Modo watch con SWC (`nest start --watch --builder swc`) ya configurado por defecto |
| Backend no arranca por error de prisma | `npx prisma generate` siempre antes de `npm run start:dev` |
| Frontend no conecta a backend | CORS en NestJS: `app.enableCors({origin: 'http://localhost:3000'})` |

---

## 7. Criterios de aceptación del Sprint 1

- [ ] PostgreSQL instalado, BD `liga_futbol` creada, migraciones aplicadas.
- [ ] Backend arranca en `http://localhost:3001` sin errores.
- [ ] Frontend arranca en `http://localhost:3000` sin errores.
- [ ] Login con `admin@liga.com` / `admin123` funciona, devuelve JWT, redirige a dashboard.
- [ ] CRUDs de categorías, temporadas, clubes, equipos, inscripciones, usuarios funcionan desde el frontend.
- [ ] Guard de roles bloquea acceso a endpoints sensibles desde el frontend Y desde el backend.
- [ ] Seed crea: 7 roles, 1 superadmin, 8 categorías, 1 temporada.
- [ ] `npx tsc --noEmit` pasa en backend y frontend sin errores.
- [ ] `git log` tiene 25 commits, uno por tarea.
- [ ] README raíz explica cómo arrancar todo en menos de 5 minutos.
- [ ] Validación de edad en categorías (campo `edad_minima` / `edad_maxima` configurable, con booleanos `permite_sin_cedula` y `valida_por_anio_nacimiento`).

---

## 8. Próximos pasos (al cerrar Sprint 1)

1. Revisión final del usuario y demo.
2. Commit "sprint 1 cerrado".
3. Crear plan de Sprint 2 (pagos, jugadores, documentos).
4. Repetir el ciclo.

---

**Estimación total:** 25 tareas × ~5 min/subagente = ~2-3 horas de ejecución secuencial; o ~1 hora si varias tareas se ejecutan en paralelo donde sea posible (por ejemplo, los 4 CRUDs frontend similares se pueden hacer en paralelo).
