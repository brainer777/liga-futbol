# ⚽ Frontend — Liga de Fútbol (Next.js 15)

Panel de administración para el sistema de gestión de liga de fútbol. **Sprint 1**:
login, dashboard, categorías, temporadas, clubes, equipos, torneos, inscripciones y pagos.

## 🚀 Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript 5**
- **Tailwind CSS 3** + componentes estilo shadcn/ui (Button, Input, Card, Badge, etc.)
- **Zustand** (auth store con persistencia)
- **TanStack Query** (server state)
- **TanStack Table** (tablas con sort + filter + paginación)
- **react-hook-form** + **Zod** (formularios)
- **axios** con interceptor de JWT

## ⚙️ Requisitos

- **Node.js** >= 20
- Backend corriendo en `http://localhost:3001` (ver `../backend/README.md`)

## 🏁 Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # ajustá NEXT_PUBLIC_API_BASE_URL si es necesario
npm run dev                        # http://localhost:3000
```

Si todo está bien verás la pantalla de login. Las credenciales sembradas
por el backend son: `admin@liga.com` / `admin123`.

## 🗂️ Estructura

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # /  (redirige)
│   │   ├── providers.tsx               # TanStack Query
│   │   ├── login/page.tsx
│   │   └── dashboard/
│   │       ├── layout.tsx              # Protegido + Sidebar
│   │       ├── page.tsx                # /dashboard (home)
│   │       ├── categorias/page.tsx
│   │       ├── temporadas/page.tsx
│   │       ├── clubes/page.tsx
│   │       ├── equipos/page.tsx
│   │       ├── torneos/page.tsx
│   │       ├── inscripciones/page.tsx
│   │       └── pagos/page.tsx
│   ├── components/
│   │   ├── ui/                         # Button, Input, Card, Label, Badge
│   │   ├── data-table.tsx              # Tabla genérica (sort+filter+pag)
│   │   ├── form-modal.tsx              # Modal de formulario genérico
│   │   └── dashboard/sidebar.tsx
│   ├── lib/
│   │   ├── api.ts                      # Axios + interceptors JWT
│   │   └── utils.ts                    # cn() helper
│   └── store/
│       └── auth.store.ts               # Zustand persistido
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## 🛠️ Comandos

```bash
npm run dev          # Dev server
npm run build        # Build de producción
npm run start        # Servir el build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## 🧠 Patrones clave

- **Cliente API único** (`src/lib/api.ts`): agrega el JWT, maneja 401
  redirigiendo al login.
- **Auth store** (`src/store/auth.store.ts`): persistido en
  `localStorage`. El layout de `/dashboard` valida el token antes de
  pintar.
- **Tabla genérica** (`src/components/data-table.tsx`): se usa en todos
  los listados, sólo cambiás las columnas.
- **Modal de formulario genérico** (`src/components/form-modal.tsx`):
  evita repetir formularios en cada CRUD.
