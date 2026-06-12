// Tests del generador de fixture (sin dependencias, lógica equivalente).
function roundRobin(equipos, incluirVuelta) {
  if (incluirVuelta === undefined) incluirVuelta = false;
  let eq = equipos.map(e => ({ ...e }));
  const warnings = [];
  if (eq.length % 2 !== 0) {
    eq.push({ id: '__bye__', nombre: 'BYE' });
    warnings.push('BYE');
  }
  const n = eq.length;
  const rondas = [];
  let arr = eq.slice();
  for (let r = 0; r < n - 1; r++) {
    const cruces = [];
    for (let i = 0; i < n / 2; i++) {
      const local = arr[i];
      const visitante = arr[n - 1 - i];
      if (local.id === '__bye__' || visitante.id === '__bye__') continue;
      const esLocal = (r + i) % 2 === 0;
      cruces.push(esLocal ? { local, visitante } : { local: visitante, visitante: local });
    }
    rondas.push({ nombre: 'Jornada ' + (r + 1), numero: r + 1, cruces });
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed].concat(rest);
  }
  if (incluirVuelta) {
    const total = rondas.length;
    for (let r = 0; r < total; r++) {
      const v = rondas[r].cruces.map(c => ({ local: c.visitante, visitante: c.local }));
      rondas.push({ nombre: 'Jornada ' + (total + r + 1) + ' (vuelta)', numero: total + r + 1, cruces: v });
    }
  }
  return { rondas, warnings };
}

function nextPowerOfTwo(n) { let p = 1; while (p < n) p *= 2; return p; }
function etapa(n) {
  const m = { 2: 'Final', 4: 'Semifinal', 8: 'Cuartos', 16: 'Octavos', 32: 'Dieciseisavos', 64: 'Treintaidosavos' };
  return m[n] || ('Ronda de ' + n);
}
function eliminacion(equipos) {
  const warnings = [];
  const n = equipos.length;
  if (n < 2) throw new Error('mínimo 2');
  const bracket = nextPowerOfTwo(n);
  if (bracket !== n) warnings.push('BYE: ' + (bracket - n));
  let siembra = equipos.slice();
  while (siembra.length < bracket) siembra.push({ id: '__bye__', nombre: 'BYE' });
  const primera = [];
  for (let i = 0; i < bracket / 2; i++) {
    const local = siembra[i];
    const visitante = siembra[bracket - 1 - i];
    if (local.id === '__bye__' || visitante.id === '__bye__') continue;
    primera.push({ local, visitante, etapa: etapa(bracket) });
  }
  const rondas = [{ nombre: etapa(bracket), numero: 1, cruces: primera }];
  let cantidad = bracket / 2;
  let num = 2;
  while (cantidad >= 2) {
    const cruces = [];
    for (let i = 0; i < cantidad / 2; i++) {
      cruces.push({ local: { id: '__W', nombre: 'W' + (i * 2 + 1) }, visitante: { id: '__W', nombre: 'W' + (i * 2 + 2) }, etapa: etapa(cantidad) });
    }
    rondas.push({ nombre: etapa(cantidad), numero: num, cruces });
    cantidad /= 2;
    num++;
  }
  return { rondas, warnings };
}

// ============ Tests ============
function assert(label, ok, extra) {
  console.log((ok ? '✅' : '❌') + ' ' + label + (extra ? ' — ' + extra : ''));
}

// 1) 4 equipos round-robin
const eq4 = ['A','B','C','D'].map(n => ({ id: n, nombre: n }));
const r4 = roundRobin(eq4);
assert('4 equipos: 3 rondas', r4.rondas.length === 3, 'tiene ' + r4.rondas.length);
assert('4 equipos: 2 cruces por ronda', r4.rondas.every(r => r.cruces.length === 2));
assert('4 equipos: 6 cruces totales', r4.rondas.reduce((a, r) => a + r.cruces.length, 0) === 6);
const p4 = {};
for (const r of r4.rondas) for (const c of r.cruces) {
  p4[c.local.id] = (p4[c.local.id] || 0) + 1;
  p4[c.visitante.id] = (p4[c.visitante.id] || 0) + 1;
}
assert('4 equipos: cada uno juega 3', Object.values(p4).every(v => v === 3), JSON.stringify(p4));

// 2) 5 equipos impar
const eq5 = ['A','B','C','D','E'].map(n => ({ id: n, nombre: n }));
const r5 = roundRobin(eq5);
assert('5 equipos impar: 5 rondas (n-1 con BYE agregado)', r5.rondas.length === 5, 'tiene ' + r5.rondas.length);
const p5 = {};
for (const r of r5.rondas) for (const c of r.cruces) {
  p5[c.local.id] = (p5[c.local.id] || 0) + 1;
  p5[c.visitante.id] = (p5[c.visitante.id] || 0) + 1;
}
assert('5 equipos: cada uno juega 4 partidos', Object.values(p5).every(v => v === 4), JSON.stringify(p5));

// 3) Ida y vuelta
const r4v = roundRobin(eq4, true);
assert('4 equipos ida+vuelta: 6 rondas', r4v.rondas.length === 6, 'tiene ' + r4v.rondas.length);
assert('4 equipos ida+vuelta: 12 cruces', r4v.rondas.reduce((a, r) => a + r.cruces.length, 0) === 12);
// En la vuelta, los local/visitante están invertidos: ida jornada 1 partido 0
//   tiene local=A,visit=D; vuelta jornada 4 partido 0 debe tener local=D,visit=A
const ida_0 = r4v.rondas[0].cruces[0];
const vuelta_0 = r4v.rondas[3].cruces[0];
assert('ida y vuelta: local/visitante invertidos',
  ida_0.local.id === vuelta_0.visitante.id && ida_0.visitante.id === vuelta_0.local.id,
  `${ida_0.local.id}->${ida_0.visitante.id} vs ${vuelta_0.local.id}->${vuelta_0.visitante.id}`);

// 4) 3 equipos triangular
const eq3 = ['A','B','C'].map(n => ({ id: n, nombre: n }));
const r3 = roundRobin(eq3);
assert('3 equipos: 3 rondas con BYE', r3.rondas.length === 3, 'tiene ' + r3.rondas.length);
const p3 = {};
for (const r of r3.rondas) for (const c of r.cruces) {
  p3[c.local.id] = (p3[c.local.id] || 0) + 1;
  p3[c.visitante.id] = (p3[c.visitante.id] || 0) + 1;
}
assert('3 equipos: cada uno juega 2', Object.values(p3).every(v => v === 2), JSON.stringify(p3));

// 5) Eliminación 8 equipos
const eq8 = Array.from({ length: 8 }, (_, i) => ({ id: 'E' + i, nombre: 'E' + i }));
const elim8 = eliminacion(eq8);
assert('8 equipos eliminación: 3 etapas', elim8.rondas.length === 3, 'tiene ' + elim8.rondas.length);
assert('8 equipos: 4+2+1 = 7 cruces totales', elim8.rondas.reduce((a, r) => a + r.cruces.length, 0) === 7, elim8.rondas.map(r => r.cruces.length).join('+'));

// 6) Eliminación 6 equipos (con 2 BYE)
const eq6 = Array.from({ length: 6 }, (_, i) => ({ id: 'E' + i, nombre: 'E' + i }));
const elim6 = eliminacion(eq6);
assert('6 equipos: 3 etapas (cuartos, semi, final)', elim6.rondas.length === 3);
assert('6 equipos: bracket 8 con 2 BYE → 2 cruces en cuartos', elim6.rondas[0].cruces.length === 2);
