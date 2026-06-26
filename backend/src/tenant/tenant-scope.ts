/**
 * Lógica pura de scoping multi-tenant (fase 3c). Aislada acá para que el día que
 * `$use` (deprecado) se reemplace por `$extends` sea re-cablear, no reescribir.
 *
 * Modelos tenant gobernados por el enforcement. EXCLUIDOS a propósito:
 * - Usuario/Rol/Permiso/UsuarioRol/Liga: globales (romperían login/validate y el
 *   resolver de slug si se acotaran).
 * - Auditoria: log cross-cutting que se escribe en cada request (incluidos los
 *   sin liga); su `ligaId` lo setea best-effort el AuditoriaInterceptor.
 */
export const TENANT_MODELS = new Set<string>([
  'Temporada',
  'Club',
  'Equipo',
  'Categoria',
  'Torneo',
  'Inscripcion',
  'Pago',
  'Jugador',
  'JugadorDocumento',
  'EquipoJugador',
  'FaseTorneo',
  'Grupo',
  'GrupoEquipo',
  'Partido',
  'PartidoReprogramacion',
  'Resultado',
  'ResultadoEvento',
  'Sancion',
  'EstadisticaJugador',
  'EstadisticaEquipo',
  'Arbitro',
  'Sede',
  'Configuracion',
]);

const WHERE_ACTIONS = new Set([
  // lecturas
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  // por-clave-única o filtrables: el spread funciona en ambos (Prisma 5.x
  // extended-where-uniqueness → un campo no-único actúa de filtro extra y un
  // registro de otra liga devuelve P2025).
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'updateMany',
  'deleteMany',
]);

/**
 * Inyecta el filtro/dato de liga en los args de una operación Prisma.
 * Regla uniforme para `where`: SPREAD, no AND-wrap (el wrap rompe en las
 * acciones que toman WhereUniqueInput).
 */
export function applyTenantScope(
  action: string,
  args: Record<string, any> | undefined,
  ligaId: string,
): Record<string, any> {
  const a = args ?? {};
  if (WHERE_ACTIONS.has(action)) {
    a.where = { ...(a.where ?? {}), ligaId };
  } else if (action === 'create') {
    a.data = { ...(a.data ?? {}), ligaId };
  } else if (action === 'createMany' || action === 'createManyAndReturn') {
    const d = a.data;
    a.data = Array.isArray(d) ? d.map((x) => ({ ...x, ligaId })) : { ...(d ?? {}), ligaId };
  } else if (action === 'upsert') {
    a.where = { ...(a.where ?? {}), ligaId };
    a.create = { ...(a.create ?? {}), ligaId };
    // `update` queda acotado por el where; no se le inyecta ligaId.
  }
  return a;
}
