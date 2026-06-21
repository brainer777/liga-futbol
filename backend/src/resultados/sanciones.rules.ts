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
