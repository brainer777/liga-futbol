-- CreateTable
CREATE TABLE "configuracion" (
    "id" UUID NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "nombre_liga" VARCHAR(100) NOT NULL DEFAULT 'Liga de Fútbol',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "color_primario" VARCHAR(50) NOT NULL DEFAULT '142 70% 35%',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_singleton_key" ON "configuracion"("singleton");

-- Fila ÚNICA por defecto. Se inserta acá (en la migración) y NO en el seed,
-- porque el seed solo corre con la base vacía; migrate deploy corre siempre.
INSERT INTO "configuracion" ("id", "singleton", "nombre_liga", "color_primario", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', true, 'Liga de Fútbol', '142 70% 35%', CURRENT_TIMESTAMP);
