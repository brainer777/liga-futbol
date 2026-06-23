#!/usr/bin/env bash
#
# Reset de DATOS DEMO en el entorno dockerizado.
#
# Vacía solo las tablas del dominio de la liga (clubes, equipos, jugadores,
# torneos, partidos, resultados, sanciones, estadísticas, etc.) para poder
# re-sembrar una demo limpia con scripts/seed-demo.mjs.
#
# PRESERVA: configuracion (branding), usuarios, roles, permisos, usuario_roles,
# categorias y temporadas (los crea el seed base prisma/seed.ts). Así el reset
# NO borra el branding ni el admin.
#
# Uso:  bash scripts/reset-demo.sh
#   Requiere el stack dockerizado arriba (docker compose up -d).
#   Override de credenciales/DB con POSTGRES_USER / POSTGRES_DB.
set -euo pipefail

DB_USER="${POSTGRES_USER:-liga_user}"
DB_NAME="${POSTGRES_DB:-liga_futbol}"

# sanciones NO tiene FK a partido/torneo, así que no cascadea: hay que listarla
# explícitamente (igual que estadisticas_* y el resto del dominio).
TABLAS="arbitros auditoria clubes equipo_jugadores equipos estadisticas_equipo \
estadisticas_jugador fases_torneo grupo_equipos grupos inscripciones jugadores \
jugadores_documentos pagos partidos partidos_reprogramaciones resultado_eventos \
resultados sanciones sedes torneos"

echo "🗑️  Vaciando tablas demo (preservando branding, usuarios y categorías)..."
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" \
  -c "TRUNCATE ${TABLAS// /, } RESTART IDENTITY CASCADE;"

echo "✅ Demo vaciada. Ahora corré:  node scripts/seed-demo.mjs"
