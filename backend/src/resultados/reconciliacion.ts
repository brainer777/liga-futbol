/**
 * Reconciliación de goles entre el marcador y los eventos del partido (regla pura).
 *
 * Para cerrar un resultado, los goles cargados como eventos deben sumar exactamente
 * el marcador, así los rankings (goleadores) nunca quedan cortos ni inflados.
 * Solo cuentan los eventos de tipo `gol` y `gol_en_contra`; el resto (asistencias,
 * tarjetas, cambios) se ignora. Un gol en contra suma al equipo RIVAL del que lo hizo.
 */

export interface EventoGol {
  tipo: string;
  equipoId: string;
}

export function golesDesdeEventos(
  eventos: EventoGol[],
  equipoLocalId: string,
  equipoVisitanteId: string,
): { local: number; visitante: number } {
  let local = 0;
  let visitante = 0;
  for (const e of eventos) {
    if (e.tipo === 'gol') {
      if (e.equipoId === equipoLocalId) local++;
      else if (e.equipoId === equipoVisitanteId) visitante++;
    } else if (e.tipo === 'gol_en_contra') {
      // El gol en contra lo anota un jugador del equipo X pero suma al rival.
      if (e.equipoId === equipoLocalId) visitante++;
      else if (e.equipoId === equipoVisitanteId) local++;
    }
  }
  return { local, visitante };
}
