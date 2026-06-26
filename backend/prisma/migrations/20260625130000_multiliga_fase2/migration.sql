-- Multi-liga fase 2: columna liga_id (NULLABLE) + indice + FK en todas las
-- tablas tenant-scoped, backfilleadas a la liga 'principal'. NOT NULL se
-- difiere a fase 3 (junto al contexto de tenant que inyecta liga_id en los
-- create). categorias: el unique de nombre pasa a compuesto [liga_id, nombre].

-- AlterTable: agregar columna (nullable)
ALTER TABLE "temporadas" ADD COLUMN "liga_id" UUID;
ALTER TABLE "clubes" ADD COLUMN "liga_id" UUID;
ALTER TABLE "equipos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "torneos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "inscripciones" ADD COLUMN "liga_id" UUID;
ALTER TABLE "pagos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "jugadores" ADD COLUMN "liga_id" UUID;
ALTER TABLE "jugadores_documentos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "equipo_jugadores" ADD COLUMN "liga_id" UUID;
ALTER TABLE "fases_torneo" ADD COLUMN "liga_id" UUID;
ALTER TABLE "grupos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "grupo_equipos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "partidos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "partidos_reprogramaciones" ADD COLUMN "liga_id" UUID;
ALTER TABLE "resultados" ADD COLUMN "liga_id" UUID;
ALTER TABLE "resultado_eventos" ADD COLUMN "liga_id" UUID;
ALTER TABLE "sanciones" ADD COLUMN "liga_id" UUID;
ALTER TABLE "estadisticas_jugador" ADD COLUMN "liga_id" UUID;
ALTER TABLE "estadisticas_equipo" ADD COLUMN "liga_id" UUID;
ALTER TABLE "arbitros" ADD COLUMN "liga_id" UUID;
ALTER TABLE "sedes" ADD COLUMN "liga_id" UUID;
ALTER TABLE "auditoria" ADD COLUMN "liga_id" UUID;
ALTER TABLE "categorias" ADD COLUMN "liga_id" UUID;

-- Backfill: toda la data existente pertenece a la unica liga ('principal').
UPDATE "temporadas" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "clubes" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "equipos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "torneos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "inscripciones" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "pagos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "jugadores" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "jugadores_documentos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "equipo_jugadores" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "fases_torneo" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "grupos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "grupo_equipos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "partidos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "partidos_reprogramaciones" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "resultados" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "resultado_eventos" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "sanciones" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "estadisticas_jugador" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "estadisticas_equipo" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "arbitros" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "sedes" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "auditoria" SET "liga_id" = '00000000-0000-0000-0000-000000000010';
UPDATE "categorias" SET "liga_id" = '00000000-0000-0000-0000-000000000010';

-- categorias: reemplazar el unique global de nombre por uno por-liga.
DROP INDEX "categorias_nombre_key";

-- CreateIndex
CREATE INDEX "temporadas_liga_id_idx" ON "temporadas"("liga_id");
CREATE INDEX "clubes_liga_id_idx" ON "clubes"("liga_id");
CREATE INDEX "equipos_liga_id_idx" ON "equipos"("liga_id");
CREATE INDEX "torneos_liga_id_idx" ON "torneos"("liga_id");
CREATE INDEX "inscripciones_liga_id_idx" ON "inscripciones"("liga_id");
CREATE INDEX "pagos_liga_id_idx" ON "pagos"("liga_id");
CREATE INDEX "jugadores_liga_id_idx" ON "jugadores"("liga_id");
CREATE INDEX "jugadores_documentos_liga_id_idx" ON "jugadores_documentos"("liga_id");
CREATE INDEX "equipo_jugadores_liga_id_idx" ON "equipo_jugadores"("liga_id");
CREATE INDEX "fases_torneo_liga_id_idx" ON "fases_torneo"("liga_id");
CREATE INDEX "grupos_liga_id_idx" ON "grupos"("liga_id");
CREATE INDEX "grupo_equipos_liga_id_idx" ON "grupo_equipos"("liga_id");
CREATE INDEX "partidos_liga_id_idx" ON "partidos"("liga_id");
CREATE INDEX "partidos_reprogramaciones_liga_id_idx" ON "partidos_reprogramaciones"("liga_id");
CREATE INDEX "resultados_liga_id_idx" ON "resultados"("liga_id");
CREATE INDEX "resultado_eventos_liga_id_idx" ON "resultado_eventos"("liga_id");
CREATE INDEX "sanciones_liga_id_idx" ON "sanciones"("liga_id");
CREATE INDEX "estadisticas_jugador_liga_id_idx" ON "estadisticas_jugador"("liga_id");
CREATE INDEX "estadisticas_equipo_liga_id_idx" ON "estadisticas_equipo"("liga_id");
CREATE INDEX "arbitros_liga_id_idx" ON "arbitros"("liga_id");
CREATE INDEX "sedes_liga_id_idx" ON "sedes"("liga_id");
CREATE INDEX "auditoria_liga_id_idx" ON "auditoria"("liga_id");
CREATE UNIQUE INDEX "categorias_liga_id_nombre_key" ON "categorias"("liga_id", "nombre");

-- AddForeignKey
ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clubes" ADD CONSTRAINT "clubes_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jugadores_documentos" ADD CONSTRAINT "jugadores_documentos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipo_jugadores" ADD CONSTRAINT "equipo_jugadores_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fases_torneo" ADD CONSTRAINT "fases_torneo_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grupo_equipos" ADD CONSTRAINT "grupo_equipos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partidos_reprogramaciones" ADD CONSTRAINT "partidos_reprogramaciones_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resultado_eventos" ADD CONSTRAINT "resultado_eventos_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sanciones" ADD CONSTRAINT "sanciones_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estadisticas_jugador" ADD CONSTRAINT "estadisticas_jugador_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estadisticas_equipo" ADD CONSTRAINT "estadisticas_equipo_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arbitros" ADD CONSTRAINT "arbitros_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
