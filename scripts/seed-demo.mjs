#!/usr/bin/env node
/**
 * Seed de DATOS DEMO vía la API real (no toca la base directo).
 *
 * Crea, autenticándose como el admin sembrado por defecto, un torneo completo
 * con clubes, equipos, jugadores, inscripciones, fixture y RESULTADOS CERRADOS.
 * Cerrar los resultados es lo que dispara el cálculo de estadisticas_equipo /
 * estadisticas_jugador en el backend (ver resultados.service.ts), así que al
 * terminar las pantallas de estadísticas (dashboard y portal público) tienen
 * números reales para mostrar.
 *
 * Uso:  node scripts/seed-demo.mjs
 *   - Requiere el backend arriba (docker compose up -d). Por defecto apunta a
 *     http://localhost:3001/api; override con API_URL.
 *   - Credenciales del admin: ADMIN_EMAIL / ADMIN_PASSWORD (default admin@liga.com / admin123).
 *
 * OJO: NO es idempotente. Está pensado para correr una vez sobre la base actual;
 * si se corre dos veces duplica clubes/equipos/jugadores.
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
const POSICIONES = ['Arquero', 'Defensor', 'Defensor', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero'];
const JUGADORES_POR_EQUIPO = 7;

// Marcadores fijos por orden de partido (round-robin de 4 equipos = 6 partidos).
// Evitamos empates a propósito para no chocar con criterios de desempate.
const MARCADORES = [
  [2, 1], [3, 0], [1, 2], [2, 3], [4, 1], [0, 1],
];

async function main() {
  console.log(`🌱 Seed demo contra ${API}`);

  // 1) Login admin
  const login = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = login.accessToken;
  console.log(`✅ Login como ${login.user?.email}`);

  // 2) Categoría "Libre" + temporada activa
  const categorias = await req('GET', '/categorias');
  const categoria = categorias.find((c) => c.nombre === 'Libre') ?? categorias[0];
  const temporadas = await req('GET', '/temporadas');
  const temporada = temporadas.find((t) => t.estado === 'activa') ?? temporadas[0];
  if (!categoria || !temporada) throw new Error('Falta categoría "Libre" o una temporada activa (corré el seed base).');
  console.log(`✅ Categoría "${categoria.nombre}" · ${temporada.nombre}`);

  // 3) Clubes + 4) Equipos + 5) Jugadores
  const equipos = []; // { id, nombre, jugadores: [{id, nombres, apellidos}] }
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
      // Edad ~ 24-31 (dentro de Libre 18-35); fecha fija para reproducibilidad.
      const anio = 1995 + (j % 7);
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
    }
    equipos.push({ id: equipo.id, nombre: equipo.nombre, jugadores });
    console.log(`✅ ${equipo.nombre}: club + ${jugadores.length} jugadores`);
  }

  // 6) Torneo + 7) pasar a "en_curso" (las stats globales ignoran "borrador")
  const torneo = await req('POST', '/torneos', {
    temporadaId: temporada.id,
    categoriaId: categoria.id,
    nombre: `Torneo Apertura ${temporada.anio}`,
    formato: 'todos_contra_todos',
  });
  await req('PATCH', `/torneos/${torneo.id}`, { estado: 'en_curso' });
  console.log(`✅ Torneo "${torneo.nombre}" (en_curso)`);

  // 8) Inscripciones
  for (const e of equipos) {
    await req('POST', '/inscripciones', { torneoId: torneo.id, equipoId: e.id, costoInscripcion: 100000 });
  }
  console.log(`✅ ${equipos.length} equipos inscriptos`);

  // 9) Fixture round-robin
  await req('POST', `/torneos/${torneo.id}/generar-fixture`, {
    fechaInicio: `${temporada.anio}-03-01`,
    horaDefault: '10:00',
    diasEntreJornadas: 7,
  });
  const partidos = await req('GET', `/torneos/${torneo.id}/partidos`);
  console.log(`✅ Fixture generado: ${partidos.length} partidos`);

  const porEquipo = new Map(equipos.map((e) => [e.id, e]));

  // 10) Cargar y CERRAR resultados (esto puebla las estadísticas)
  let i = 0;
  for (const p of partidos) {
    const [gl, gv] = MARCADORES[i % MARCADORES.length];
    const local = porEquipo.get(p.equipoLocalId);
    const visitante = porEquipo.get(p.equipoVisitanteId);
    if (!local || !visitante) {
      console.warn(`⚠️  Partido ${p.id} con equipos fuera del set demo; lo salto.`);
      i++;
      continue;
    }
    const eventos = [];
    // Goles repartidos entre delanteros de cada equipo (dorsales 6 y 7 → idx 5,6).
    for (let g = 0; g < gl; g++) eventos.push(gol(local, 5 + (g % 2)));
    for (let g = 0; g < gv; g++) eventos.push(gol(visitante, 5 + (g % 2)));
    // Un par de amarillas y, en algunos partidos, una roja (puebla tarjetas/sanciones).
    eventos.push(tarjeta('amarilla', local, 1));
    eventos.push(tarjeta('amarilla', visitante, 3));
    if (i % 3 === 0) eventos.push(tarjeta('roja', visitante, 2));

    await req('POST', '/resultados', {
      partidoId: p.id,
      golesLocal: gl,
      golesVisitante: gv,
      eventos,
      cerrar: true,
    });
    console.log(`  ⚽ ${local.nombre} ${gl}-${gv} ${visitante.nombre}`);
    i++;
  }

  // 11) Verificación: leer las estadísticas públicas ya pobladas
  const resumen = await req('GET', '/publico/estadisticas/resumen');
  const tabla = await req('GET', '/publico/estadisticas/equipos');
  const goleadores = await req('GET', '/publico/estadisticas/goleadores');
  console.log('\n📊 Verificación (endpoints públicos):');
  console.log('   resumen   →', resumen);
  console.log(`   equipos   → ${tabla.length} filas; líder: ${tabla[0]?.equipo?.nombre} (${tabla[0]?.puntos} pts)`);
  console.log(`   goleador  → ${goleadores[0]?.jugador?.nombres} ${goleadores[0]?.jugador?.apellidos} (${goleadores[0]?.goles} goles)`);
  console.log('\n🏁 Seed demo finalizado.');
}

function gol(equipo, jugadorIdx) {
  const jug = equipo.jugadores[jugadorIdx] ?? equipo.jugadores[0];
  return { tipo: 'gol', jugadorId: jug.id, equipoId: equipo.id };
}
function tarjeta(tipo, equipo, jugadorIdx) {
  const jug = equipo.jugadores[jugadorIdx] ?? equipo.jugadores[0];
  return { tipo, jugadorId: jug.id, equipoId: equipo.id };
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
