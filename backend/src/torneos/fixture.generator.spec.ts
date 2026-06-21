import {
  generarFixture,
  esFormatoValido,
  EquipoSlot,
  Ronda,
} from './fixture.generator';

function equipos(n: number): EquipoSlot[] {
  return Array.from({ length: n }, (_, i) => ({ id: `E${i + 1}`, nombre: `Equipo ${i + 1}` }));
}

function totalCruces(rondas: Ronda[]): number {
  return rondas.reduce((acc, r) => acc + r.cruces.length, 0);
}

/** Cuenta cuántos partidos juega cada equipo (como local o visitante). */
function partidosPorEquipo(rondas: Ronda[]): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const r of rondas) {
    for (const c of r.cruces) {
      conteo[c.local.id] = (conteo[c.local.id] || 0) + 1;
      conteo[c.visitante.id] = (conteo[c.visitante.id] || 0) + 1;
    }
  }
  return conteo;
}

const ORDENADA = { siembraOrdenada: true };

describe('esFormatoValido', () => {
  it('acepta formatos conocidos', () => {
    expect(esFormatoValido('todos_contra_todos')).toBe(true);
    expect(esFormatoValido('eliminacion_directa')).toBe(true);
  });
  it('rechaza formatos desconocidos', () => {
    expect(esFormatoValido('formato_inventado')).toBe(false);
  });
});

describe('generarFixture — validaciones', () => {
  it('lanza si hay menos de 2 equipos', () => {
    expect(() => generarFixture('todos_contra_todos', equipos(1))).toThrow(/al menos 2/);
  });

  it('lanza si el formato de tamaño fijo no coincide (triangular ≠ 3)', () => {
    expect(() => generarFixture('triangular', equipos(4), ORDENADA)).toThrow(/exactamente 3/);
  });

  it('acepta triangular con exactamente 3 equipos', () => {
    expect(() => generarFixture('triangular', equipos(3), ORDENADA)).not.toThrow();
  });
});

describe('round-robin (todos_contra_todos)', () => {
  it('4 equipos → 3 jornadas, 2 cruces cada una, 6 en total', () => {
    const fx = generarFixture('todos_contra_todos', equipos(4), ORDENADA);
    expect(fx.rondas).toHaveLength(3);
    expect(fx.rondas.every((r) => r.cruces.length === 2)).toBe(true);
    expect(totalCruces(fx.rondas)).toBe(6);
  });

  it('4 equipos → cada uno juega 3 partidos', () => {
    const fx = generarFixture('todos_contra_todos', equipos(4), ORDENADA);
    expect(Object.values(partidosPorEquipo(fx.rondas)).every((v) => v === 3)).toBe(true);
  });

  it('5 equipos (impar) → agrega BYE, cada uno juega 4 y emite warning', () => {
    const fx = generarFixture('todos_contra_todos', equipos(5), ORDENADA);
    expect(fx.rondas).toHaveLength(5); // n-1 con el BYE incluido (6 slots)
    const conteo = partidosPorEquipo(fx.rondas);
    // El equipo fantasma __bye__ no debe aparecer en ningún cruce
    expect(conteo['__bye__']).toBeUndefined();
    expect(Object.values(conteo).every((v) => v === 4)).toBe(true);
    expect(fx.warnings.some((w) => w.includes('BYE'))).toBe(true);
  });

  it('todos los pares de equipos se enfrentan exactamente una vez', () => {
    const fx = generarFixture('todos_contra_todos', equipos(4), ORDENADA);
    const pares = new Set<string>();
    for (const r of fx.rondas) {
      for (const c of r.cruces) {
        pares.add([c.local.id, c.visitante.id].sort().join('-'));
      }
    }
    expect(pares.size).toBe(6); // C(4,2)
  });
});

describe('ida y vuelta', () => {
  it('4 equipos → 6 jornadas, 12 cruces', () => {
    const fx = generarFixture('ida_y_vuelta', equipos(4), ORDENADA);
    expect(fx.rondas).toHaveLength(6);
    expect(totalCruces(fx.rondas)).toBe(12);
  });

  it('invierte localía entre ida y vuelta', () => {
    const fx = generarFixture('ida_y_vuelta', equipos(4), ORDENADA);
    const ida = fx.rondas[0].cruces[0];
    const vuelta = fx.rondas[3].cruces[0];
    expect(vuelta.local.id).toBe(ida.visitante.id);
    expect(vuelta.visitante.id).toBe(ida.local.id);
    expect(ida.esIda).toBe(true);
    expect(vuelta.esIda).toBe(false);
  });
});

describe('eliminación directa', () => {
  it('8 equipos → 3 etapas (cuartos, semi, final) y 7 cruces', () => {
    const fx = generarFixture('eliminacion_directa', equipos(8), ORDENADA);
    expect(fx.rondas).toHaveLength(3);
    expect(totalCruces(fx.rondas)).toBe(7); // 4 + 2 + 1
    expect(fx.fases).toEqual(['Cuartos de final', 'Semifinal', 'Final']);
  });

  it('6 equipos → bracket de 8 con 2 BYE; primera ronda tiene 2 cruces reales', () => {
    const fx = generarFixture('eliminacion_directa', equipos(6), ORDENADA);
    expect(fx.rondas[0].cruces.length).toBe(2);
    expect(fx.warnings.some((w) => w.includes('BYE'))).toBe(true);
  });

  it('etiqueta la última ronda como Final con un solo cruce', () => {
    const fx = generarFixture('eliminacion_directa', equipos(8), ORDENADA);
    const ultima = fx.rondas[fx.rondas.length - 1];
    expect(ultima.nombre).toBe('Final');
    expect(ultima.cruces).toHaveLength(1);
  });
});

describe('doble eliminación', () => {
  it('incluye una fase de Lower bracket y warning explicativo', () => {
    const fx = generarFixture('doble_eliminacion', equipos(8), ORDENADA);
    expect(fx.fases).toContain('Lower bracket');
    expect(fx.warnings.some((w) => w.toLowerCase().includes('lower bracket'))).toBe(true);
  });
});

describe('grupos (siempre con shuffle interno: solo verificamos invariantes)', () => {
  it('distribuye 8 equipos sin perder ni duplicar a nadie', () => {
    const fx = generarFixture('grupos', equipos(8), { ...ORDENADA, cantidadGrupos: 2 });
    expect(fx.grupos).toBeDefined();
    const todos = Object.values(fx.grupos!).flat().map((e) => e.id);
    expect(new Set(todos).size).toBe(8);
    expect(todos.sort()).toEqual(equipos(8).map((e) => e.id).sort());
  });

  it('reparte equitativamente entre la cantidad de grupos pedida', () => {
    const fx = generarFixture('grupos', equipos(8), { ...ORDENADA, cantidadGrupos: 2 });
    const tamanos = Object.values(fx.grupos!).map((g) => g.length);
    expect(tamanos).toEqual([4, 4]);
  });

  it('cada cruce queda etiquetado con su grupo', () => {
    const fx = generarFixture('grupos', equipos(8), { ...ORDENADA, cantidadGrupos: 2 });
    const crucesConGrupo = fx.rondas.flatMap((r) => r.cruces).filter((c) => c.grupo);
    expect(crucesConGrupo.length).toBeGreaterThan(0);
    expect(crucesConGrupo.every((c) => ['A', 'B'].includes(c.grupo!))).toBe(true);
  });
});

describe('grupos y eliminación', () => {
  it('combina fase de grupos con un bracket posterior de clasificados', () => {
    const fx = generarFixture('grupos_y_eliminacion', equipos(8), {
      ...ORDENADA,
      cantidadGrupos: 2,
      clasificadosPorGrupo: 2,
    });
    // 4 clasificados (2 por grupo × 2 grupos) → fase de grupos + bracket semifinal + final
    expect(fx.fases).toEqual(['Fase de grupos', 'Semifinal', 'Final']);
    expect(fx.fases).not.toContain('Eliminatorias');
    expect(fx.grupos).toBeDefined();
  });
});
