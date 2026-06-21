#!/usr/bin/env node
/**
 * Seed de DATOS DEMO vía la API real (no toca la base directo).
 *
 * Crea, autenticándose como el admin, un torneo round-robin COMPLETO y CONSISTENTE:
 * clubes, equipos, jugadores (con documentos y habilitación), inscripciones, fixture
 * y RESULTADOS CERRADOS. Cerrar los resultados dispara el cálculo de estadísticas y
 * de sanciones automáticas (ver resultados.service.ts), así que al terminar todas las
 * pantallas (estadísticas, goleadores, tarjetas, sanciones, plantillas) muestran datos.
 *
 * Diseñado para ser CONSISTENTE y respetar el enforcement de sanciones/habilitación:
 *  - Cada gol del marcador se carga como evento de un delantero → goleadores suma al GF.
 *  - Los delanteros (goleadores) nunca reciben tarjeta, así que nunca quedan suspendidos
 *    y siempre pueden figurar en los partidos siguientes (no chocan con el bloqueo).
 *  - Las amarillas se reparten de a poco entre defensores (máx 2 c/u → nadie acumula 3).
 *  - Se escenifican 2 rojas en jugadores reservados (defensores que no vuelven a aparecer):
 *      · una en la 1ª fecha → se cumple sola por el avance automático (queda "cumplida"),
 *      · otra en la última fecha → queda "pendiente" (suspensión vigente, visible en la UI).
 *
 * Solo formatos que se muestran bien: round-robin (todos_contra_todos). NO se siembran
 * torneos con fase de eliminación porque hoy se muestran incompletos (ver verificación E2E).
 *
 * Uso:
 *   bash scripts/reset-demo.sh     # vacía la demo (preserva branding/usuarios/categorías)
 *   node scripts/seed-demo.mjs     # siembra la demo
 *
 *   Backend arriba (docker compose up -d). API en http://localhost:3001/api (override API_URL).
 *   Admin: ADMIN_EMAIL / ADMIN_PASSWORD (default admin@liga.com / admin123).
 */

const API = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@liga.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let token = '';

/** Wrapper de fetch: agrega auth, parsea JSON y explica los errores. */
async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message ?? res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${Array.isArray(msg) ? msg.join('; ') : msg}`);
  }
  return data;
}

// --- Datos de muestra ---------------------------------------------------------

const CLUBES = [
  { nombre: 'Club Atlético Río Norte', sigla: 'RIO' },
  { nombre: 'Deportivo San Martín', sigla: 'DSM' },
  { nombre: 'Unión del Valle', sigla: 'UDV' },
  { nombre: 'Sportivo Las Lomas', sigla: 'SLL' },
];

const NOMBRES = ['Lucas', 'Matías', 'Diego', 'Santiago', 'Nicolás', 'Joaquín', 'Tomás', 'Bruno', 'Iván', 'Facundo'];
const APELLIDOS = ['Gómez', 'Fernández', 'López', 'Martínez', 'Sosa', 'Romero', 'Díaz', 'Acosta', 'Silva', 'Vega'];
//             idx:   0          1           2            3              4               5            6            7
const POSICIONES = ['Arquero', 'Defensor', 'Defensor', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero', 'Delantero'];
const JUGADORES_POR_EQUIPO = 8;

const SCORERS = [5, 6, 7];      // delanteros: meten los goles, NUNCA ven tarjeta
const AMARILLA_POOL = [2, 3];   // defensores que pueden ver amarilla (máx 2 c/u)
const RED_IDX = 1;              // defensor reservado para la roja escenificada (no es goleador ni recibe amarilla)

// Marcadores fijos por orden de partido (round-robin de 4 equipos = 6 partidos).
// Sin empates para no chocar con criterios de desempate. Cada gol se carga como evento.
const MARCADORES = [
  [2, 1], [3, 0], [1, 2], [2, 3], [4, 1], [0, 1],
];

async function main() {
  console.log(`🌱 Seed demo contra ${API}`);

  const login = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = login.accessToken;
  console.log(`✅ Login como ${login.user?.email}`);

  const categorias = await req('GET', '/categorias');
  const categoria = categorias.find((c) => c.nombre === 'Libre') ?? categorias[0];
  const temporadas = await req('GET', '/temporadas');
  const temporada = temporadas.find((t) => t.estado === 'activa') ?? temporadas[0];
  if (!categoria || !temporada) throw new Error('Falta categoría "Libre" o una temporada activa (corré el seed base).');
  console.log(`✅ Categoría "${categoria.nombre}" · ${temporada.nombre}`);

  // --- Clubes + equipos + jugadores + documentos ---
  const equipos = []; // { id, sigla, jugadores: [{id, nombres, apellidos}] }
  for (let c = 0; c < CLUBES.length; c++) {
    const club = await req('POST', '/clubes', CLUBES[c]);
    const equipo = await req('POST', '/equipos', {
      clubId: club.id,
      categoriaId: categoria.id,
      nombre: `${CLUBES[c].sigla} ${categoria.nombre}`,
      delegadoNombre: 'Delegado ' + CLUBES[c].sigla,
    });
    const jugadores = [];
    for (let j = 0; j < JUGADORES_POR_EQUIPO; j++) {
      const nombres = NOMBRES[(c * 3 + j) % NOMBRES.length];
      const apellidos = APELLIDOS[(c + j) % APELLIDOS.length];
      const anio = 1995 + (j % 7); // ~24-31 años, dentro de Libre
      const jugador = await req('POST', '/jugadores', {
        nombres,
        apellidos,
        fechaNacimiento: `${anio}-03-15`,
        tipoDocumento: 'DNI',
        numeroDocumento: `${30000000 + c * 100 + j}`,
        equipoId: equipo.id,
        dorsal: j + 1,
        posicion: POSICIONES[j % POSICIONES.length],
      });
      jugadores.push({ id: jugador.id, nombres, apellidos });
      // Documento de identidad (placeholder de archivo: la demo no sube archivos reales).
      await req('POST', '/jugadores/documentos', {
        jugadorId: jugador.id,
        tipoDocumento: 'dni',
        archivoUrl: '/uploads/documentos/demo-dni.pdf',
        nombreArchivo: 'dni.pdf',
      });
    }
    equipos.push({ id: equipo.id, sigla: CLUBES[c].sigla, jugadores });
    console.log(`✅ ${equipo.nombre}: club + ${jugadores.length} jugadores (con documento)`);
  }

  // --- Habilitación: casi todos habilitados, uno "observado" para mostrar variedad ---
  for (let e = 0; e < equipos.length; e++) {
    const plantilla = await req('GET', `/jugadores/equipo/${equipos[e].id}/plantilla`);
    const items = Array.isArray(plantilla) ? plantilla : plantilla.data ?? [];
    for (const ej of items) {
      const jid = (ej.jugador ?? ej).id;
      // El arquero (dorsal 1) del último equipo queda "observado" como muestra.
      const observado = e === equipos.length - 1 && ej.dorsal === 1;
      await req('PATCH', `/jugadores/equipo-jugador/${ej.id}`, {
        estadoHabilitacion: observado ? 'observado' : 'habilitado',
      });
      void jid;
    }
  }
  console.log('✅ Habilitaciones seteadas (1 jugador "observado")');

  // --- Torneo round-robin en curso ---
  const torneo = await req('POST', '/torneos', {
    temporadaId: temporada.id,
    categoriaId: categoria.id,
    nombre: `Torneo Apertura ${temporada.anio}`,
    formato: 'todos_contra_todos',
  });
  await req('PATCH', `/torneos/${torneo.id}`, { estado: 'en_curso' });
  for (const e of equipos) {
    await req('POST', '/inscripciones', { torneoId: torneo.id, equipoId: e.id, costoInscripcion: 100000 });
  }
  await req('POST', `/torneos/${torneo.id}/generar-fixture`, {
    fechaInicio: `${temporada.anio}-03-01`,
    horaDefault: '10:00',
    diasEntreJornadas: 7,
  });
  const partidos = await req('GET', `/torneos/${torneo.id}/partidos`);
  console.log(`✅ Torneo "${torneo.nombre}" (en_curso) · ${equipos.length} equipos · ${partidos.length} partidos`);

  const porEquipo = new Map(equipos.map((e) => [e.id, e]));

  // Orden de aparición de cada equipo (para escenificar las rojas en 1ª/última fecha).
  const apariciones = new Map(); // equipoId -> [indiceDePartido...]
  partidos.forEach((p, idx) => {
    for (const eqId of [p.equipoLocalId, p.equipoVisitanteId]) {
      if (!apariciones.has(eqId)) apariciones.set(eqId, []);
      apariciones.get(eqId).push(idx);
    }
  });
  const rio = equipos[0].id; // roja en su PRIMER partido → se cumple sola (avance) → "cumplida"
  const sll = equipos[3].id; // roja en su ÚLTIMO partido → queda "pendiente" (suspensión vigente)
  const rojaEnPartido = new Map(); // indiceDePartido -> [{equipoId, jugadorIdx}]
  const addRoja = (eqId, idxPartido) => {
    if (!rojaEnPartido.has(idxPartido)) rojaEnPartido.set(idxPartido, []);
    rojaEnPartido.get(idxPartido).push({ equipoId: eqId, jugadorIdx: RED_IDX });
  };
  addRoja(rio, apariciones.get(rio)[0]);
  addRoja(sll, apariciones.get(sll)[apariciones.get(sll).length - 1]);

  // Contador de apariciones por equipo (para alternar la amarilla entre 2 defensores).
  const veces = new Map();

  let i = 0;
  for (const p of partidos) {
    const [gl, gv] = MARCADORES[i % MARCADORES.length];
    const local = porEquipo.get(p.equipoLocalId);
    const visitante = porEquipo.get(p.equipoVisitanteId);
    if (!local || !visitante) { i++; continue; }

    const eventos = [];
    // Goles → delanteros, repartidos, sumando exactamente al marcador.
    for (let g = 0; g < gl; g++) eventos.push(ev('gol', local, SCORERS[g % SCORERS.length]));
    for (let g = 0; g < gv; g++) eventos.push(ev('gol', visitante, SCORERS[g % SCORERS.length]));
    // Una amarilla por equipo, alternando entre 2 defensores (máx 2 c/u → sin acumulación).
    for (const eq of [local, visitante]) {
      const n = veces.get(eq.id) ?? 0;
      eventos.push(ev('amarilla', eq, AMARILLA_POOL[n % AMARILLA_POOL.length]));
      veces.set(eq.id, n + 1);
    }
    // Rojas escenificadas (defensor reservado que no vuelve a aparecer en eventos).
    for (const r of rojaEnPartido.get(i) ?? []) {
      eventos.push(ev('roja', porEquipo.get(r.equipoId), r.jugadorIdx));
    }

    await req('POST', '/resultados', { partidoId: p.id, golesLocal: gl, golesVisitante: gv, eventos, cerrar: true });
    console.log(`  ⚽ ${local.sigla} ${gl}-${gv} ${visitante.sigla}`);
    i++;
  }

  // --- Verificación: los números tienen que cerrar ---
  const totalGoles = MARCADORES.slice(0, partidos.length).reduce((s, [a, b]) => s + a + b, 0);
  const goleadores = await req('GET', `/resultados/torneo/${torneo.id}/goleadores`);
  const sumGoleadores = goleadores.reduce((s, g) => s + (g.goles ?? 0), 0);
  const tarjetas = await req('GET', `/resultados/torneo/${torneo.id}/tarjetas`);
  const sanciones = await req('GET', `/resultados/torneo/${torneo.id}/sanciones`);
  const pendientes = sanciones.filter((s) => s.estado === 'pendiente').length;
  const cumplidas = sanciones.filter((s) => s.estado === 'cumplida').length;

  console.log('\n📊 Verificación:');
  console.log(`   goleadores → suma ${sumGoleadores} goles (marcadores: ${totalGoles}) ${sumGoleadores === totalGoles ? '✅' : '❌ NO CIERRA'}`);
  console.log(`   tarjetas   → ${tarjetas.length} jugador(es) con tarjeta`);
  console.log(`   sanciones  → ${sanciones.length} (${pendientes} pendiente, ${cumplidas} cumplida)`);
  console.log('\n🏁 Seed demo finalizado.');
}

function ev(tipo, equipo, jugadorIdx) {
  const jug = equipo.jugadores[jugadorIdx] ?? equipo.jugadores[0];
  return { tipo, jugadorId: jug.id, equipoId: equipo.id };
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
