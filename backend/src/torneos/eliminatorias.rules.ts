/**
 * Reglas puras de la fase de eliminación a partir de los grupos (sin acceso a BD).
 *
 * Soporta brackets chicos (2 o 4 clasificados) que es lo habitual en ligas de barrio
 * (2 grupos, 1 o 2 clasificados por grupo). Con 4, siembra cruzada para que los dos
 * primeros de cada grupo no se crucen en semifinal (1ºA vs 2ºB, 1ºB vs 2ºA).
 */

export interface Clasificado {
  equipoId: string;
  grupo: string; // nombre del grupo (A, B…)
  pos: number; // posición dentro del grupo (1 = primero)
}

export interface CruceEliminatoria {
  localId: string;
  visitanteId: string;
}

export interface RondaEliminatoria {
  etapa: string; // 'Final', 'Semifinal'…
  cruces: CruceEliminatoria[];
}

/** Ordena los clasificados por posición (todos los 1°, luego los 2°…) y, dentro, por grupo. */
export function ordenarClasificados(clasificados: Clasificado[]): Clasificado[] {
  return [...clasificados].sort((a, b) => a.pos - b.pos || a.grupo.localeCompare(b.grupo, 'es'));
}

/**
 * Arma la primera ronda de eliminación a partir de los clasificados ya ordenados.
 * Solo 2 o 4 clasificados (más requiere sembrado/avance de bracket más complejo).
 */
export function primeraRondaEliminatoria(ordenados: Clasificado[]): RondaEliminatoria {
  const n = ordenados.length;
  if (n === 2) {
    return { etapa: 'Final', cruces: [{ localId: ordenados[0].equipoId, visitanteId: ordenados[1].equipoId }] };
  }
  if (n === 4) {
    // ordenados = [1ºA, 1ºB, 2ºA, 2ºB] → 1ºA vs 2ºB y 1ºB vs 2ºA (siembra cruzada)
    return {
      etapa: 'Semifinal',
      cruces: [
        { localId: ordenados[0].equipoId, visitanteId: ordenados[3].equipoId },
        { localId: ordenados[1].equipoId, visitanteId: ordenados[2].equipoId },
      ],
    };
  }
  throw new Error('Por ahora la eliminación soporta 2 o 4 clasificados (1 o 2 por grupo, con 2 grupos).');
}

/**
 * A partir de los ganadores de la ronda actual (en orden de bracket), arma la siguiente.
 * Devuelve null si ya hay un solo equipo (campeón) y no quedan partidos por jugar.
 */
export function siguienteRondaEliminatoria(ganadores: string[]): RondaEliminatoria | null {
  if (ganadores.length <= 1) return null;
  if (ganadores.length === 2) {
    return { etapa: 'Final', cruces: [{ localId: ganadores[0], visitanteId: ganadores[1] }] };
  }
  throw new Error('Avance de eliminación no soportado para más de 2 ganadores por ronda.');
}

/**
 * Determina el ganador de un partido de eliminación. Si hay override (empate resuelto
 * por penales/repetición por el operador) se respeta. Si está empatado y no hay override,
 * devuelve null (no se puede avanzar hasta definirlo).
 */
export function ganadorDePartido(
  p: { equipoLocalId: string; equipoVisitanteId: string; golesLocal: number; golesVisitante: number },
  override?: string,
): string | null {
  if (override) return override;
  if (p.golesLocal > p.golesVisitante) return p.equipoLocalId;
  if (p.golesVisitante > p.golesLocal) return p.equipoVisitanteId;
  return null;
}
