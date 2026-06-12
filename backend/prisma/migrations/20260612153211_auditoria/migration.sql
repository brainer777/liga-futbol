-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "usuario_email" VARCHAR(150),
    "metodo" VARCHAR(10) NOT NULL,
    "ruta" VARCHAR(255) NOT NULL,
    "entidad" VARCHAR(80),
    "entidad_id" VARCHAR(64),
    "status_code" INTEGER NOT NULL,
    "exitoso" BOOLEAN NOT NULL DEFAULT true,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_idx" ON "auditoria"("entidad");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");
