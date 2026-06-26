-- Multi-liga: el unique de temporadas pasa de global (anio, nombre) a per-liga
-- (liga_id, anio, nombre), para que dos ligas puedan tener su propia "Temporada <año>".
-- DropIndex
DROP INDEX "temporadas_anio_nombre_key";

-- CreateIndex
CREATE UNIQUE INDEX "temporadas_liga_id_anio_nombre_key" ON "temporadas"("liga_id", "anio", "nombre");
