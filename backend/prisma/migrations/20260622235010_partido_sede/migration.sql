-- AlterTable
ALTER TABLE "partidos" ADD COLUMN     "sede_id" UUID;

-- CreateIndex
CREATE INDEX "partidos_sede_id_idx" ON "partidos"("sede_id");

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
