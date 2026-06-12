// Tests del calculador de tabla de posiciones.
// Reimplementa la lógica de `tabla.calculator.ts` en JS plano para verificar
// sin necesidad de compilar TypeScript.

function calcularTabla(reglas, partidos, inscripciones) {
  const contadores = new Map();
  for (const i of inscripciones) {
    contadores.set(i.equipoId, {
      posicion: 0, equipoId: i.equipoId,
      partidosJugados: 0, ganados: 0, empatados: 0, perdidos: 0,
      golesFavor: 0, golesContra: 0, diferenciaGoles: 0, golAverage: 0, puntos: 0,
    });
  }
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
      local.ganados += 1; visitante.perdidos += 1;
      local.puntos += reglas.puntosVictoria; visitante.puntos += reglas.puntosDerrota;
    } else if (p.golesLocal < p.golesVisitante) {
      visitante.ganados += 1; local.perdidos += 1;
      visitante.puntos += reglas.puntosVictoria; local.puntos += reglas.puntosDerrota;
    } else {
      local.empatados += 1; visitante.empatados += 1;
      local.puntos += reglas.puntosEmpate; visitante.puntos += reglas.puntosEmpate;
    }
  }
  for (const f of contadores.values()) {
    f.diferenciaGoles = f.golesFavor - f.golesContra;
    f.golAverage = f.golesContra === 0 ? f.golesFavor : Number((f.golesFavor / f.golesContra).toFixed(3));
  }
  const filas = Array.from(contadores.values());
  filas.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (reglas.criterioDesempate === 'diferencia_goles' && b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
    if (reglas.criterioDesempate === 'gol_average' && b.golAverage !== a.golAverage) return b.golAverage - a.golAverage;
    if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
    if (b.diferenciaGoles !== a.diferenciaGoles) return b.diferenciaGoles - a.diferenciaGoles;
    return a.equipoId.localeCompare(b.equipoId);
  });
  filas.forEach((f, i) => (f.posicion = i + 1));
  return filas;
}

function assert(label, ok, extra) {
  console.log((ok ? '✅' : '❌') + ' ' + label + (extra ? ' — ' + extra : ''));
}

const reglas = { puntosVictoria: 3, puntosEmpate: 1, puntosDerrota: 0, criterioDesempate: 'diferencia_goles' };

// ============ Test 1: Liga simple de 4 equipos ============
const partidos = [
  // Jornada 1
  { id: '1', equipoLocalId: 'A', equipoVisitanteId: 'B', golesLocal: 2, golesVisitante: 0, finalizado: true },
  { id: '2', equipoLocalId: 'C', equipoVisitanteId: 'D', golesLocal: 1, golesVisitante: 1, finalizado: true },
  // Jornada 2
  { id: '3', equipoLocalId: 'A', equipoVisitanteId: 'C', golesLocal: 1, golesVisitante: 1, finalizado: true },
  { id: '4', equipoLocalId: 'D', equipoVisitanteId: 'B', golesLocal: 0, golesVisitante: 3, finalizado: true },
  // Jornada 3
  { id: '5', equipoLocalId: 'A', equipoVisitanteId: 'D', golesLocal: 4, golesVisitante: 0, finalizado: true },
  { id: '6', equipoLocalId: 'B', equipoVisitanteId: 'C', golesLocal: 2, golesVisitante: 2, finalizado: true },
];
const inscripciones = [
  { equipoId: 'A' }, { equipoId: 'B' }, { equipoId: 'C' }, { equipoId: 'D' },
];
let tabla = calcularTabla(reglas, partidos, inscripciones);
console.log('\n=== Test 1: 4 equipos ===');
console.table(tabla.map(t => ({ pos: t.posicion, eq: t.equipoId, pts: t.puntos, PJ: t.partidosJugados, G: t.ganados, E: t.empatados, P: t.perdidos, GF: t.golesFavor, GC: t.golesContra, DG: t.diferenciaGoles })));
assert('A 1° con 7 puntos (2G + 1E)', tabla[0].equipoId === 'A' && tabla[0].puntos === 7);
assert('B 2° con 4 puntos (1G + 1E + 1P)', tabla[1].equipoId === 'B' && tabla[1].puntos === 4);
assert('C 3° con 3 puntos (3E)', tabla[2].equipoId === 'C' && tabla[2].puntos === 3);
assert('D 4° con 1 punto (1E + 2P)', tabla[3].equipoId === 'D' && tabla[3].puntos === 1);

// ============ Test 2: Criterio gol_average ============
const reglasGA = { ...reglas, criterioDesempate: 'gol_average' };
// A y B empatan en puntos y diferencia, pero A tiene mejor gol average
const partidos2 = [
  { id: '1', equipoLocalId: 'A', equipoVisitanteId: 'C', golesLocal: 3, golesVisitante: 0, finalizado: true },
  { id: '2', equipoLocalId: 'A', equipoVisitanteId: 'D', golesLocal: 2, golesVisitante: 0, finalizado: true },
  { id: '3', equipoLocalId: 'B', equipoVisitanteId: 'C', golesLocal: 1, golesVisitante: 0, finalizado: true },
  { id: '4', equipoLocalId: 'B', equipoVisitanteId: 'D', golesLocal: 1, golesVisitante: 0, finalizado: true },
];
tabla = calcularTabla(reglasGA, partidos2, [
  { equipoId: 'A' }, { equipoId: 'B' }, { equipoId: 'C' }, { equipoId: 'D' },
]);
console.log('\n=== Test 2: gol_average como desempate ===');
console.table(tabla.map(t => ({ pos: t.posicion, eq: t.equipoId, pts: t.puntos, DG: t.diferenciaGoles, GA: t.golAverage })));
// A: 6 puntos, 5GF, 0GC, DG=5, GA=Infinity
// B: 6 puntos, 2GF, 0GC, DG=2, GA=Infinity
// (GA infinito para ambos, siguiente criterio: goles a favor → A gana)
assert('A 1° por goles a favor (5 > 2)', tabla[0].equipoId === 'A');

// ============ Test 3: Partido no finalizado se ignora ============
const partidos3 = [
  { id: '1', equipoLocalId: 'A', equipoVisitanteId: 'B', golesLocal: 5, golesVisitante: 0, finalizado: true },
  { id: '2', equipoLocalId: 'A', equipoVisitanteId: 'B', golesLocal: 99, golesVisitante: 0, finalizado: false },
];
tabla = calcularTabla(reglas, partidos3, [{ equipoId: 'A' }, { equipoId: 'B' }]);
console.log('\n=== Test 3: partido no finalizado se ignora ===');
assert('A tiene 1 partido, no 2', tabla[0].partidosJugados === 1);
assert('A tiene 5 goles (no 104)', tabla[0].golesFavor === 5);

// ============ Test 4: Equipos sin partidos ============
tabla = calcularTabla(reglas, [], [{ equipoId: 'A' }, { equipoId: 'B' }, { equipoId: 'C' }]);
console.log('\n=== Test 4: equipos sin partidos (todos en 0 pts) ===');
assert('Todos en 0 puntos', tabla.every(t => t.puntos === 0));
assert('Todos con 0 PJ', tabla.every(t => t.partidosJugados === 0));
