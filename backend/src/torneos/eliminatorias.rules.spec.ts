import {
  ordenarClasificados,
  primeraRondaEliminatoria,
  siguienteRondaEliminatoria,
  ganadorDePartido,
  Clasificado,
} from './eliminatorias.rules';

const c = (equipoId: string, grupo: string, pos: number): Clasificado => ({ equipoId, grupo, pos });

describe('ordenarClasificados', () => {
  it('ordena por posición y luego por grupo (todos los 1° antes que los 2°)', () => {
    const orden = ordenarClasificados([c('2A', 'A', 2), c('1B', 'B', 1), c('2B', 'B', 2), c('1A', 'A', 1)]);
    expect(orden.map((x) => x.equipoId)).toEqual(['1A', '1B', '2A', '2B']);
  });
});

describe('primeraRondaEliminatoria', () => {
  it('2 clasificados → final directa', () => {
    const r = primeraRondaEliminatoria([c('1A', 'A', 1), c('1B', 'B', 1)]);
    expect(r.etapa).toBe('Final');
    expect(r.cruces).toEqual([{ localId: '1A', visitanteId: '1B' }]);
  });

  it('4 clasificados → semifinales con siembra cruzada (1ºA-2ºB, 1ºB-2ºA)', () => {
    const orden = ordenarClasificados([c('1A', 'A', 1), c('1B', 'B', 1), c('2A', 'A', 2), c('2B', 'B', 2)]);
    const r = primeraRondaEliminatoria(orden);
    expect(r.etapa).toBe('Semifinal');
    expect(r.cruces).toEqual([
      { localId: '1A', visitanteId: '2B' },
      { localId: '1B', visitanteId: '2A' },
    ]);
  });

  it('cantidades no soportadas lanzan error', () => {
    expect(() => primeraRondaEliminatoria([c('1A', 'A', 1)])).toThrow();
    expect(() => primeraRondaEliminatoria([c('1A', 'A', 1), c('1B', 'B', 1), c('1C', 'C', 1)])).toThrow();
  });
});

describe('siguienteRondaEliminatoria', () => {
  it('2 ganadores → final', () => {
    expect(siguienteRondaEliminatoria(['g1', 'g2'])).toEqual({
      etapa: 'Final',
      cruces: [{ localId: 'g1', visitanteId: 'g2' }],
    });
  });
  it('1 ganador → null (campeón, no hay más partidos)', () => {
    expect(siguienteRondaEliminatoria(['campeon'])).toBeNull();
  });
});

describe('ganadorDePartido', () => {
  const base = { equipoLocalId: 'L', equipoVisitanteId: 'V' };
  it('gana el de más goles', () => {
    expect(ganadorDePartido({ ...base, golesLocal: 2, golesVisitante: 1 })).toBe('L');
    expect(ganadorDePartido({ ...base, golesLocal: 0, golesVisitante: 3 })).toBe('V');
  });
  it('empate sin override → null', () => {
    expect(ganadorDePartido({ ...base, golesLocal: 1, golesVisitante: 1 })).toBeNull();
  });
  it('empate con override → el designado', () => {
    expect(ganadorDePartido({ ...base, golesLocal: 1, golesVisitante: 1 }, 'V')).toBe('V');
  });
});
