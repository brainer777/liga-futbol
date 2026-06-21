import { golesDesdeEventos } from './reconciliacion';

const L = 'local-id';
const V = 'visitante-id';
const gol = (equipoId: string) => ({ tipo: 'gol', equipoId });
const enContra = (equipoId: string) => ({ tipo: 'gol_en_contra', equipoId });

describe('golesDesdeEventos', () => {
  it('cuenta goles normales por equipo', () => {
    expect(golesDesdeEventos([gol(L), gol(L), gol(V)], L, V)).toEqual({ local: 2, visitante: 1 });
  });

  it('un gol en contra suma al rival', () => {
    // un jugador local hace gol en contra → suma al visitante
    expect(golesDesdeEventos([enContra(L)], L, V)).toEqual({ local: 0, visitante: 1 });
    // un jugador visitante hace gol en contra → suma al local
    expect(golesDesdeEventos([enContra(V)], L, V)).toEqual({ local: 1, visitante: 0 });
  });

  it('combina goles normales y en contra', () => {
    // local 2-1: 1 gol propio del local + 1 en contra del visitante (=2 local); 1 gol propio visitante
    expect(golesDesdeEventos([gol(L), enContra(V), gol(V)], L, V)).toEqual({ local: 2, visitante: 1 });
  });

  it('ignora eventos que no son goles', () => {
    const eventos = [
      gol(L),
      { tipo: 'amarilla', equipoId: L },
      { tipo: 'roja', equipoId: V },
      { tipo: 'asistencia', equipoId: L },
      { tipo: 'cambio', equipoId: V },
    ];
    expect(golesDesdeEventos(eventos, L, V)).toEqual({ local: 1, visitante: 0 });
  });

  it('sin eventos devuelve 0-0', () => {
    expect(golesDesdeEventos([], L, V)).toEqual({ local: 0, visitante: 0 });
  });

  it('ignora eventos de equipos ajenos al partido', () => {
    expect(golesDesdeEventos([gol('otro-equipo')], L, V)).toEqual({ local: 0, visitante: 0 });
  });
});
