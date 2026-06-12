import {
  calcularTabla,
  calcularEstadicasJugador,
  ReglasTorneo,
  PartidoParaTabla,
  InscripcionParaTabla,
} from './tabla.calculator';

const REGLAS: ReglasTorneo = {
  puntosVictoria: 3,
  puntosEmpate: 1,
  puntosDerrota: 0,
  criterioDesempate: 'diferencia_goles',
};

function insc(...ids: string[]): InscripcionParaTabla[] {
  return ids.map((id) => ({ id: `i-${id}`, equipoId: id }));
}

function partido(
  id: string,
  local: string,
  visitante: string,
  gl: number,
  gv: number,
  finalizado = true,
): PartidoParaTabla {
  return { id, equipoLocalId: local, equipoVisitanteId: visitante, golesLocal: gl, golesVisitante: gv, finalizado };
}

describe('calcularTabla', () => {
  describe('liga simple de 4 equipos', () => {
    const partidos = [
      partido('1', 'A', 'B', 2, 0),
      partido('2', 'C', 'D', 1, 1),
      partido('3', 'A', 'C', 1, 1),
      partido('4', 'D', 'B', 0, 3),
      partido('5', 'A', 'D', 4, 0),
      partido('6', 'B', 'C', 2, 2),
    ];
    const tabla = calcularTabla(REGLAS, partidos, insc('A', 'B', 'C', 'D'));
    const fila = (eq: string) => tabla.find((f) => f.equipoId === eq)!;

    it('A primero con 7 puntos (2G + 1E)', () => {
      expect(tabla[0].equipoId).toBe('A');
      expect(tabla[0].puntos).toBe(7);
      expect(tabla[0].posicion).toBe(1);
    });

    it('B segundo con 4 puntos', () => {
      expect(fila('B').puntos).toBe(4);
    });

    it('C con 3 puntos (3 empates)', () => {
      expect(fila('C').puntos).toBe(3);
      expect(fila('C').empatados).toBe(3);
    });

    it('D último con 1 punto', () => {
      expect(tabla[3].equipoId).toBe('D');
      expect(tabla[3].puntos).toBe(1);
    });

    it('asigna posiciones consecutivas 1..N', () => {
      expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3, 4]);
    });

    it('calcula PJ, GF, GC y diferencia de goles de A', () => {
      const a = fila('A');
      expect(a.partidosJugados).toBe(3);
      expect(a.golesFavor).toBe(7);
      expect(a.golesContra).toBe(1);
      expect(a.diferenciaGoles).toBe(6);
    });
  });

  describe('partidos no finalizados', () => {
    it('ignora partidos con finalizado=false', () => {
      const partidos = [
        partido('1', 'A', 'B', 5, 0, true),
        partido('2', 'A', 'B', 99, 0, false),
      ];
      const tabla = calcularTabla(REGLAS, partidos, insc('A', 'B'));
      const a = tabla.find((f) => f.equipoId === 'A')!;
      expect(a.partidosJugados).toBe(1);
      expect(a.golesFavor).toBe(5);
    });
  });

  describe('equipos sin partidos', () => {
    it('todos quedan en 0 puntos y 0 PJ', () => {
      const tabla = calcularTabla(REGLAS, [], insc('A', 'B', 'C'));
      expect(tabla).toHaveLength(3);
      expect(tabla.every((f) => f.puntos === 0 && f.partidosJugados === 0)).toBe(true);
    });
  });

  describe('partido con equipo no inscrito', () => {
    it('lo ignora si alguno de los equipos no está en inscripciones', () => {
      const partidos = [partido('1', 'A', 'Z', 3, 0)];
      const tabla = calcularTabla(REGLAS, partidos, insc('A', 'B'));
      const a = tabla.find((f) => f.equipoId === 'A')!;
      expect(a.partidosJugados).toBe(0);
    });
  });

  describe('gol average', () => {
    it('usa goles a favor cuando golesContra es 0 (no divide por cero)', () => {
      const tabla = calcularTabla(REGLAS, [partido('1', 'A', 'B', 3, 0)], insc('A', 'B'));
      const a = tabla.find((f) => f.equipoId === 'A')!;
      expect(a.golesContra).toBe(0);
      expect(a.golAverage).toBe(3);
    });

    it('como criterio de desempate ordena por mejor average', () => {
      const reglasGA: ReglasTorneo = { ...REGLAS, criterioDesempate: 'gol_average' };
      // A y B con 6 pts; A 5GF/0GC, B 2GF/0GC → desempata por goles a favor
      const partidos = [
        partido('1', 'A', 'C', 3, 0),
        partido('2', 'A', 'D', 2, 0),
        partido('3', 'B', 'C', 1, 0),
        partido('4', 'B', 'D', 1, 0),
      ];
      const tabla = calcularTabla(reglasGA, partidos, insc('A', 'B', 'C', 'D'));
      expect(tabla[0].equipoId).toBe('A');
    });
  });

  describe('criterio goles_favor', () => {
    it('con mismos puntos ordena por más goles a favor', () => {
      const reglasGF: ReglasTorneo = { ...REGLAS, criterioDesempate: 'goles_favor' };
      const partidos = [
        partido('1', 'A', 'C', 5, 0),
        partido('2', 'B', 'D', 2, 0),
      ];
      const tabla = calcularTabla(reglasGF, partidos, insc('A', 'B', 'C', 'D'));
      // A y B ambos 3 pts; A tiene 5 GF, B tiene 2 GF
      expect(tabla[0].equipoId).toBe('A');
      expect(tabla[1].equipoId).toBe('B');
    });
  });

  describe('criterio enfrentamiento_directo', () => {
    it('desempata por el resultado del cruce directo', () => {
      const reglasED: ReglasTorneo = { ...REGLAS, criterioDesempate: 'enfrentamiento_directo' };
      // A y B terminan con los mismos puntos globales y misma diferencia,
      // pero A le ganó a B en el enfrentamiento directo.
      const partidos = [
        partido('1', 'A', 'B', 1, 0), // A le gana a B (directo)
        partido('2', 'A', 'C', 0, 2), // A pierde con C
        partido('3', 'B', 'C', 2, 0), // B le gana a C
      ];
      // A: 3 (gana B) + 0 (pierde C) = 3 pts, GF1 GC2, DG -1
      // B: 0 (pierde A) + 3 (gana C) = 3 pts, GF2 GC1, DG +1
      // Por DG global B iría arriba, pero el criterio es enfrentamiento_directo:
      const tabla = calcularTabla(reglasED, partidos, insc('A', 'B', 'C'));
      const posA = tabla.find((f) => f.equipoId === 'A')!.posicion;
      const posB = tabla.find((f) => f.equipoId === 'B')!.posicion;
      expect(posA).toBeLessThan(posB);
    });
  });
});

describe('calcularEstadicasJugador', () => {
  it('agrega goles, asistencias, amarillas y rojas por jugador', () => {
    const partidos = [partido('p1', 'A', 'B', 2, 1)];
    const eventos = {
      p1: [
        { tipo: 'gol', jugadorId: 'j1', equipoId: 'A' },
        { tipo: 'gol', jugadorId: 'j1', equipoId: 'A' },
        { tipo: 'asistencia', jugadorId: 'j2', equipoId: 'A' },
        { tipo: 'amarilla', jugadorId: 'j3', equipoId: 'B' },
        { tipo: 'roja', jugadorId: 'j3', equipoId: 'B' },
      ],
    };
    const stats = calcularEstadicasJugador(partidos, eventos);
    const j1 = stats.find((s) => s.jugadorId === 'j1')!;
    const j3 = stats.find((s) => s.jugadorId === 'j3')!;
    expect(j1.goles).toBe(2);
    expect(j1.partidosJugados).toBe(1);
    expect(j3.amarillas).toBe(1);
    expect(j3.rojas).toBe(1);
  });

  it('cuenta doble_amarilla como roja', () => {
    const partidos = [partido('p1', 'A', 'B', 0, 0)];
    const eventos = {
      p1: [{ tipo: 'doble_amarilla', jugadorId: 'j1', equipoId: 'A' }],
    };
    const stats = calcularEstadicasJugador(partidos, eventos);
    expect(stats[0].rojas).toBe(1);
  });

  it('no cuenta partidos no finalizados', () => {
    const partidos = [partido('p1', 'A', 'B', 0, 0, false)];
    const eventos = { p1: [{ tipo: 'gol', jugadorId: 'j1', equipoId: 'A' }] };
    const stats = calcularEstadicasJugador(partidos, eventos);
    expect(stats).toHaveLength(0);
  });

  it('no duplica partidosJugados cuando un jugador tiene varios eventos en el mismo partido', () => {
    const partidos = [partido('p1', 'A', 'B', 3, 0)];
    const eventos = {
      p1: [
        { tipo: 'gol', jugadorId: 'j1', equipoId: 'A' },
        { tipo: 'gol', jugadorId: 'j1', equipoId: 'A' },
        { tipo: 'amarilla', jugadorId: 'j1', equipoId: 'A' },
      ],
    };
    const stats = calcularEstadicasJugador(partidos, eventos);
    expect(stats[0].partidosJugados).toBe(1);
    expect(stats[0].goles).toBe(2);
  });
});
