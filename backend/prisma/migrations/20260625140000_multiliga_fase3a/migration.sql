-- Multi-liga fase 3a: anclar cada asignación de rol a una liga.
-- liga_id NULL = rol de plataforma (Superadministrador, cross-liga);
-- con valor = rol acotado a esa liga. Sin cambio de comportamiento (una liga).

-- AlterTable: columna nullable
ALTER TABLE "usuario_roles" ADD COLUMN "liga_id" UUID;

-- Backfill: roles por-liga -> liga 'principal'; Superadministrador queda NULL (plataforma).
UPDATE "usuario_roles" ur
SET "liga_id" = '00000000-0000-0000-0000-000000000010'
FROM "roles" r
WHERE ur."rol_id" = r."id" AND r."nombre" <> 'Superadministrador';

-- Reemplazar el unique [usuario, rol] por [usuario, rol, liga]
-- (un usuario puede tener el mismo rol en varias ligas).
DROP INDEX "usuario_roles_usuario_id_rol_id_key";
CREATE UNIQUE INDEX "usuario_roles_usuario_id_rol_id_liga_id_key" ON "usuario_roles"("usuario_id", "rol_id", "liga_id");

-- CreateIndex
CREATE INDEX "usuario_roles_liga_id_idx" ON "usuario_roles"("liga_id");

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_liga_id_fkey" FOREIGN KEY ("liga_id") REFERENCES "ligas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
