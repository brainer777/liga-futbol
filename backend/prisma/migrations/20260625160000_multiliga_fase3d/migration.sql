-- Multi-liga fase 3d: backstop de integridad. liga_id NO puede ser NULL en las
-- tablas de datos tenant. Se usa CHECK (no NOT NULL en el modelo Prisma) porque
-- el modelo mantiene `ligaId String?`: los servicios no pasan ligaId (lo inyecta
-- el middleware $use), así que un campo obligatorio rompería el typecheck. Prisma
-- no modela CHECKs → sin drift, modelo y servicios intactos. Postgres lo enforcea
-- igual que NOT NULL. EXCLUIDAS: auditoria y usuario_roles (liga_id nullable a
-- propósito: log cross-cutting / roles de plataforma).

ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "clubes" ADD CONSTRAINT "clubes_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "jugadores_documentos" ADD CONSTRAINT "jugadores_documentos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "equipo_jugadores" ADD CONSTRAINT "equipo_jugadores_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "fases_torneo" ADD CONSTRAINT "fases_torneo_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "grupo_equipos" ADD CONSTRAINT "grupo_equipos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "partidos_reprogramaciones" ADD CONSTRAINT "partidos_reprogramaciones_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "resultado_eventos" ADD CONSTRAINT "resultado_eventos_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "sanciones" ADD CONSTRAINT "sanciones_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "estadisticas_jugador" ADD CONSTRAINT "estadisticas_jugador_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "estadisticas_equipo" ADD CONSTRAINT "estadisticas_equipo_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "arbitros" ADD CONSTRAINT "arbitros_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_liga_id_not_null" CHECK ("liga_id" IS NOT NULL);
