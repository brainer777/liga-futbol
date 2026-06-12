# Despliegue

## Desarrollo local

Ver [README raíz](../README.md) — `npm run dev:init` deja todo funcionando.

## Producción

### 1. Base de datos

Recomendamos un PostgreSQL administrado (Supabase, Neon, RDS, etc.).
Configurá `DATABASE_URL` apuntando a esa URL y poné
`USE_EMBEDDED_POSTGRES=false` en el `.env` del backend.

### 2. Backend

```bash
cd backend
npm ci
npm run build
npx prisma migrate deploy
npx prisma db seed   # opcional: solo en primer arranque
NODE_ENV=production node dist/main.js
```

Variables de entorno mínimas en producción:
- `DATABASE_URL` — URL de la BD
- `JWT_SECRET` — **obligatorio**, un valor fuerte y único
- `CORS_ORIGIN` — dominio del frontend
- `PORT` — puerto de escucha (default 3001)
- `USE_EMBEDDED_POSTGRES=false`

### 3. Frontend

```bash
cd frontend
npm ci
npm run build
npm run start        # puerto 3000 por defecto
```

Variable de entorno:
- `NEXT_PUBLIC_API_BASE_URL` — URL pública del backend (p.ej. `https://api.liga.com/api`)

### 4. Reverse proxy

Nginx/Caddy a la cabeza para terminar TLS y rutear:
- `/api/*` → backend
- `/*` → frontend

### 5. Almacenamiento de archivos

Los comprobantes y documentos (a partir del Sprint 2) deberían vivir en
S3/Cloud Storage. En este Sprint 1 todavía no hay upload; se agregó
`UPLOAD_DIR` y `MAX_FILE_SIZE_MB` en el `.env` para preparar el terreno.
