# ============================================
# Backend (NestJS + Prisma) — imagen de producción
# ============================================
# Se usa node:20-bookworm-slim (glibc) y NO alpine (musl): evita los problemas
# del engine de Prisma y del binario de embedded-postgres con musl.

# ---------- Builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# openssl: requerido por Prisma para generar el query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------- Runner ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Se copia el node_modules COMPLETO del builder a propósito: el entrypoint usa
# `prisma` (CLI) y `ts-node` (seed), ambos en devDependencies. Con --omit=dev
# desaparecerían y el arranque fallaría.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json tsconfig*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh && mkdir -p uploads

EXPOSE 3001

# Healthcheck sin curl/wget (bookworm-slim no los trae): se usa node.
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
