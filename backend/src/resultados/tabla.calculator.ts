/**
 * Calculador de tabla de posiciones.
 *
 * Toma todos los partidos finalizados de un torneo, los cruces y las reglas
 * del torneo (puntos por victoria/empate/derrota, criterio de desempate)
 * y devuelve una tabla ordenada.
 *
 * No persiste nada: el servicio se encarga de tomar la salida y
 * opcionalmente sincronizarla con `EstadisticaEquipo`.
 */

export interface ReglasTorneo {
  puntosVictoria: number;
  puntosEmpate: number;
  puntosDerrota: number;
  criterioDesempate:
    | 'diferencia_goles'
    | 'gol_average'
    | 'enfrentamiento_directo'
    | 'goles_favor'
    | 'partido_extra';
}

export interface PartidoParaTabla {
  id: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  golesLocal: number;
  golesVisitante: number;
  finalizado: boolean;
  fecha?: Date | null;
}

export interface InscripcionParaTabla {
  id: string;
  equipoId: string;
}

export interface FilaTabla {
  posicion: number;
  equipoId: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGoles: number;
  golAverage: number;
  puntos: number;
  /** Detalle de enfrentamientos directos contra equipos con misma posición numérica */
  enfrentamientosDirectos?: Record<string, { gf: number; gc: number }>;
}

export function calcularTabla(
  reglas: ReglasTorneo,
  partidos: PartidoParaTabla[],
  inscripciones: InscripcionParaTabla[],
): FilaTabla[] {
  // Inicializar contadores por equipo
  const contadores = new Map<string, FilaTabla>();
  for (const i of inscripciones) {
    contadores.set(i.equipoId, {
      posicion: 0,
      equipoId: i.equipoId,
      partidosJugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
      diferenciaGoles: 0,
      golAverage: 0,
      puntos: 0,
    });
  }
  // Recorrer sólo partidos finalizados
  for (const p of partidos) {
    if (!p.finalizado) continue;
    const local = contadores.get(p.equipoLocalId);
    const visitante = contadores.get(p.equipoVisitanteId);
    if (!local || !visitante) continue;
    local.partidosJugados += 1;
    visitante.partidosJugados += 1;
    local.golesFavor += p.golesLocal;
    local.golesContra += p.golesVisitante;
    visitante.golesFavor += p.golesVisitante;
    visitante.golesContra += p.golesLocal;
    if (p.golesLocal > p.golesVisitante) {
      local.ganados += 1;
      visitante.perdidos += 1;
      local.puntos += reglas.puntosVictoria;
      visitante.puntos += reglas.puntosDerrota;
    } else if (p.golesLocal < p.golesVisitante) {
      visitante.ganados += 1;
      local.perdidos += 1;
      visitante.puntos += reglas.puntosVictoria;
      local.puntos += reglas.puntosDerrota;
    } else {
      local.empatados += 1;
      visitante.empatados += 1;
      local.puntos += reglas.puntosEmpate;
      visitante.puntos += reglas.puntosEmpate;
    }
  }
  // Calcular diferencia y gol average
  for (const f of contadores.values()) {
    f.diferenciaGoles = f.golesFavor - f.golesContra;
    f.golAverage = f.golesContra === 0 ? f.golesFavor : Number((f.golesFavor / f.golesContra).toFixed(3));
  }

  // Ordenar según criterio de desempate
  const filas = Array.from(contadores.values());
  filas.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    switch (reglas.criterioDesempate) {
      case 'diferencia_goles':
        if (b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
        break;
      case 'gol_average':
        if (b.golAverage !== a.golAverage) return b.golAverage - a.golAverage;
        break;
      case 'goles_favor':
        if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
        break;
      case 'enfrentamiento_directo':
        // Comparar puntos en cruces directos (entre A y B, sumar puntos de A en partidos contra B y viceversa)
        const directos = partidos.filter(
          (p) => p.finalizado
            && ((p.equipoLocalId === a.equipoId && p.equipoVisitanteId === b.equipoId)
              || (p.equipoLocalId === b.equipoId && p.equipoVisitanteId === a.equipoId)),
        );
        let puntosA = 0, puntosB = 0;
        for (const p of directos) {
          if (p.golesLocal === p.golesVisitante) {
            puntosA += reglas.puntosEmpate; puntosB += reglas.puntosEmpate;
          } else if (
            (p.equipoLocalId === a.equipoId && p.golesLocal > p.golesVisitante) ||
            (p.equipoVisitanteId === a.equipoId && p.golesVisitante > p.golesLocal)
          ) {
            puntosA += reglas.puntosVictoria;
          } else {
            puntosB += reglas.puntosVictoria;
          }
        }
        if (puntosA !== puntosB) return puntosB - puntosA;
        break;
      case 'partido_extra':
        // No implementamos partido extra en este sprint: cae al siguiente criterio
        break;
    }
    // Desempate final: goles a favor, luego diferencia
    if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
    if (b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
    return a.equipoId.localeCompare(b.equipoId);
  });
  filas.forEach((f, i) => (f.posicion = i + 1));
  return filas;
}

/**
 * Calcula estadísticas de jugador y equipo a partir de los resultados y eventos.
 * Devuelve dos mapas: por jugador y por equipo.
 */
export interface StatsJugador {
  jugadorId: string;
  equipoId: string;
  partidosJugados: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  rojas: number;
}
export interface StatsEquipo {
  equipoId: string;
  partidosJugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
  puntos: number;
}

export function calcularEstadicasJugador(
  partidos: PartidoParaTabla[],
  eventosPorPartido: Record<string, Array<{ tipo: string; jugadorId: string; equipoId: string }>>,
): StatsJugador[] {
  const map = new Map<string, StatsJugador>();
  const partidoPorJugador = new Set<string>();
  for (const p of partidos) {
    if (!p.finalizado) continue;
    const evs = eventosPorPartido[p.id] || [];
    for (const e of evs) {
      const key = `${e.jugadorId}`;
      if (!map.has(key)) {
        map.set(key, { jugadorId: e.jugadorId, equipoId: e.equipoId, partidosJugados: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0 });
      }
      const s = map.get(key)!;
      const k = `${p.id}__${e.jugadorId}`;
      if (!partidoPorJugador.has(k)) {
        s.partidosJugados += 1;
        partidoPorJugador.add(k);
      }
      switch (e.tipo) {
        case 'gol': s.goles += 1; break;
        case 'asistencia': s.asistencias += 1; break;
        case 'amarilla': s.amarillas += 1; break;
        case 'roja':
        case 'doble_amarilla': s.rojas += 1; break;
      }
    }
  }
  return Array.from(map.values());
}
