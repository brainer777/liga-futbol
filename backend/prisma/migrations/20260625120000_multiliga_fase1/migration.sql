-- Multi-liga fase 1: entidad Liga (raíz de tenant) + Configuracion por-liga.
-- Sin cambio de comportamiento: se crea UNA liga "principal" a partir del nombre
-- actual de la configuración y la fila existente queda vinculada a ella.

-- CreateTable
CREATE TABLE "ligas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ligas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ligas_slug_key" ON "ligas"("slug");

-- Backfill: una liga "principal" tomando el nombre actual de la configuración.
-- (migrate deploy corre siempre; la config singleton ya existe desde su migración.)
INSERT INTO "ligas" ("id", "nombre", "slug", "estado", "updated_at")
SELECT '00000000-0000-0000-0000-000000000010', "nombre_liga", 'principal', 'activo', CURRENT_TIMESTAMP
FROM "configuracion"
WHERE "singleton" = true;

-- AlterTable: liga_id nullable primero para poder backfillear la fila existente.
ALTER TABLE "configuracion" ADD COLUMN "liga_id" UUID;

-- Vincular la configuración existente a la liga recién creada.
UPDATE "configuracion" SET "liga_id" = '00000000-0000-0000-0000-000000000010' WHERE "singleton" = true;

-- Ahora sí, obligatorio.
ALTER TABLE "configuracion" ALTER COLUMN "liga_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_liga_id_key" ON "configuracion"("liga_id");

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
