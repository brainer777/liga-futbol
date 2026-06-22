-- CreateTable
CREATE TABLE "arbitros" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30),
    "email" VARCHAR(150),
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arbitros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "direccion" VARCHAR(255),
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partidos_arbitro_id_idx" ON "partidos"("arbitro_id");

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_arbitro_id_fkey" FOREIGN KEY ("arbitro_id") REFERENCES "arbitros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
