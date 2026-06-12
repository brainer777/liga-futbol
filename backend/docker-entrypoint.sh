#!/bin/sh
# ============================================
# Entrypoint del backend en Docker
# ============================================
# 1. Aplica las migraciones de Prisma (idempotente).
# 2. Siembra la base SOLO si está vacía (0 usuarios), porque el seed usa
#    create() en algunas tablas y NO es idempotente. Esto deja un usuario
#    admin disponible en el primer arranque (sin él no se podría hacer login).
# 3. Arranca el servidor NestJS.
set -e

echo "▶ Aplicando migraciones (prisma migrate deploy)..."
npx prisma migrate deploy

if [ "${SEED_ON_EMPTY:-true}" = "true" ]; then
  USERS=$(node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.usuario.count().then(c=>process.stdout.write(String(c))).catch(()=>process.stdout.write("ERR")).finally(()=>p.$disconnect())')
  if [ "$USERS" = "0" ]; then
    echo "▶ Base vacía → ejecutando seed inicial..."
    npm run prisma:seed
  elif [ "$USERS" = "ERR" ]; then
    echo "⚠ No se pudo verificar si la base está vacía; se omite el seed por seguridad."
  else
    echo "▶ Base ya poblada (usuarios: $USERS) → se omite el seed."
  fi
fi

echo "▶ Iniciando backend..."
exec node dist/main
