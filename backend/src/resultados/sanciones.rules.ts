/**
 * Reglas puras de sanciones (sin acceso a BD), para poder testearlas en aislamiento.
 *
 * Una sanción se "cumple" fecha a fecha: cada vez que el equipo del jugador disputa
 * un partido del torneo, se le descuenta una fecha. Al alcanzar `fechasCumplir`
 * la sanción pasa a `cumplida` y el jugador vuelve a estar disponible.
 */

export interface SancionParaAvance {
  fechasCumplidas: number;
  fechasCumplir: number;
}

/**
 * Calcula el nuevo estado de una sanción tras disputarse una fecha.
 * Devuelve el patch a aplicar (fechasCumplidas siempre; estado solo si llega al tope).
 */
export function aplicarFechaCumplida(
  s: SancionParaAvance,
): { fechasCumplidas: number; estado?: 'cumplida' } {
  const fechasCumplidas = s.fechasCumplidas + 1;
  if (fechasCumplidas >= s.fechasCumplir) {
    return { fechasCumplidas, estado: 'cumplida' };
  }
  return { fechasCumplidas };
}

/**
 * ¿Una sanción está vigente (cumpliéndose todavía)? Solo bloquea cuando está
 * `pendiente` y aún le faltan fechas. Las cumplidas/condonadas/anuladas no bloquean.
 */
export function estaSuspendida(s: {
  estado: string;
  fechasCumplidas: number;
  fechasCumplir: number;
}): boolean {
  return s.estado === 'pendiente' && s.fechasCumplidas < s.fechasCumplir;
}

/**
 * Estados de habilitación que impiden que un jugador sea cargado en un resultado.
 * Solo los explícitamente negativos: rechazado y suspendido (estado administrativo,
 * distinto de una Sancion). `pendiente`/`observado`/`habilitado` no bloquean por ahora.
 */
export const HABILITACION_BLOQUEANTE = ['rechazado', 'suspendido'] as const;

export function habilitacionBloquea(estado: string): boolean {
  return (HABILITACION_BLOQUEANTE as readonly string[]).includes(estado);
}
