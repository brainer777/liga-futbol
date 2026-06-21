/**
 * Generadores de fixture puro-typescript. No tocan la base de datos:
 * reciben una lista de equipos y devuelven una estructura de "rounds"
 * con los cruces (local/visitante). La capa de servicio (TorneosService)
 * se encarga de persistir.
 *
 * Soporta:
 *  - todos_contra_todos (round-robin simple)
 *  - ida_y_vuelta (round-robin doble)
 *  - triangular / cuadrangular / hexagonal (atajos de round-robin)
 *  - eliminacion_directa (con seeding por orden o aleatorio)
 *  - doble_eliminacion (bracket con upper/lower)
 *  - grupos (asignación + round-robin por grupo)
 *  - grupos_y_eliminacion (fase de grupos → bracket)
 *  - liguilla (atajo de todos contra todos)
 */

export type Formato =
  | 'todos_contra_todos'
  | 'ida_y_vuelta'
  | 'triangular'
  | 'cuadrangular'
  | 'hexagonal'
  | 'liguilla'
  | 'eliminacion_directa'
  | 'doble_eliminacion'
  | 'grupos'
  | 'grupos_y_eliminacion';

export interface EquipoSlot {
  id: string;
  nombre: string;
  /** ID del club, útil para evitar cruces tempranos en eliminatorias */
  clubId?: string;
}

export interface Cruce {
  local: EquipoSlot;
  visitante: EquipoSlot;
  /** En eliminación: nombre de la etapa (octavos, cuartos, semi, final) */
  etapa?: string;
  /** En eliminación: posición en el bracket (1 = primero) */
  bracketPos?: number;
  /** Es partido de ida (round-robin ida/vuelta) o upper/lower bracket */
  esIda?: boolean;
  /** En grupos: nombre del grupo (A, B, C…) */
  grupo?: string;
  /** En grupos: número de jornada dentro del grupo */
  jornada?: number;
  /** True si es un BYE (equipo fantasma) */
  bye?: boolean;
}

export interface Ronda {
  nombre: string;
  numero: number;
  cruces: Cruce[];
  /** Nombre de la fase a la que pertenece la ronda (debe coincidir con un valor de `fases`). */
  fase?: string;
}

export interface ResultadoFixture {
  formato: Formato;
  rondas: Ronda[];
  /** Etiquetas de las fases en orden (fase regular, cuartos, semi, final…) */
  fases: string[];
  /** Si el formato usa grupos, devuelve el mapa grupo → equipos */
  grupos?: Record<string, EquipoSlot[]>;
  warnings: string[];
}

const FORMATOS_VALIDOS: Set<Formato> = new Set([
  'todos_contra_todos', 'ida_y_vuelta', 'triangular', 'cuadrangular', 'hexagonal',
  'liguilla', 'eliminacion_directa', 'doble_eliminacion', 'grupos', 'grupos_y_eliminacion',
]);

export function esFormatoValido(f: string): f is Formato {
  return FORMATOS_VALIDOS.has(f as Formato);
}

const TAMANO_NOMBRE: Record<string, number> = {
  triangular: 3,
  cuadrangular: 4,
  hexagonal: 6,
};

// ============================================================
// Helpers
// ============================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Algoritmo de "circle method" para round-robin.
 * Si la cantidad de equipos es impar, agrega un BYE (id="__bye__") automáticamente.
 * Devuelve `n-1` rondas con `n/2` cruces cada una.
 */
function roundRobin(equipos: EquipoSlot[], incluirVuelta = false): { rondas: Ronda[]; warnings: string[] } {
  const warnings: string[] = [];
  let eq = [...equipos];
  let huboBye = false;
  if (eq.length % 2 !== 0) {
    eq.push({ id: '__bye__', nombre: 'BYE' });
    huboBye = true;
    warnings.push('Se agregó un BYE porque la cantidad de equipos es impar.');
  }
  const n = eq.length;
  const rondas: Ronda[] = [];
  // Circle method: fijar el primer equipo, rotar el resto
  let arr = [...eq];
  const totalRondas = n - 1;
  for (let r = 0; r < totalRondas; r++) {
    const cruces: Cruce[] = [];
    for (let i = 0; i < n / 2; i++) {
      const local = arr[i];
      const visitante = arr[n - 1 - i];
      if (local.id === '__bye__' || visitante.id === '__bye__') {
        // El real descansa, el otro "gana" (no emitimos cruce)
        const real = local.id === '__bye__' ? visitante : local;
        warnings.push(`Jornada ${r + 1}: ${real.nombre} descansa (BYE).`);
        continue;
      }
      // Alternar localía para equidad
      const esLocal = (r + i) % 2 === 0;
      cruces.push(esLocal
        ? { local, visitante, esIda: true, jornada: r + 1 }
        : { local: visitante, visitante: local, esIda: true, jornada: r + 1 },
      );
    }
    rondas.push({ nombre: `Jornada ${r + 1}`, numero: r + 1, cruces });
    // Rotar (mantener arr[0] fijo)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }
  if (incluirVuelta) {
    const totalJornadas = rondas.length;
    for (let r = 0; r < totalJornadas; r++) {
      const crucesVuelta: Cruce[] = rondas[r].cruces.map((c) => ({
        local: c.visitante,
        visitante: c.local,
        esIda: false,
        jornada: totalJornadas + r + 1,
      }));
      rondas.push({ nombre: `Jornada ${totalJornadas + r + 1} (vuelta)`, numero: totalJornadas + r + 1, cruces: crucesVuelta });
    }
  }
  return { rondas, warnings };
}

/**
 * Devuelve la cantidad de equipos que tiene un formato de "mini-liga".
 */
function tamanoFormato(f: Formato): number | null {
  return TAMANO_NOMBRE[f] ?? null;
}

// ============================================================
// Eliminación directa
// ============================================================

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

const ETAPAS_BRACKET: { cantidad: number; nombre: string }[] = [
  { cantidad: 2, nombre: 'Final' },
  { cantidad: 4, nombre: 'Semifinal' },
  { cantidad: 8, nombre: 'Cuartos de final' },
  { cantidad: 16, nombre: 'Octavos de final' },
  { cantidad: 32, nombre: 'Dieciseisavos de final' },
  { cantidad: 64, nombre: 'Treintaidosavos de final' },
];

function etapaPorCantidad(n: number): string {
  for (const e of ETAPAS_BRACKET) {
    if (e.cantidad === n) return e.nombre;
  }
  // Si no matchea exacto, devolvemos algo genérico
  return `Ronda de ${n}`;
}

function eliminacionDirecta(equipos: EquipoSlot[]): { rondas: Ronda[]; fases: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const n = equipos.length;
  if (n < 2) throw new Error('Eliminación directa requiere al menos 2 equipos.');
  const bracket = nextPowerOfTwo(n);
  if (bracket !== n) {
    warnings.push(`El bracket más cercano es de ${bracket} equipos. Habrá ${bracket - n} BYE(s).`);
  }
  // Sembrado: por orden de la lista. Para sembrar por puntos/club, se ordenará desde el service.
  const siembra = [...equipos];
  while (siembra.length < bracket) {
    siembra.push({ id: '__bye__', nombre: 'BYE' });
  }
  // Construir la primera ronda: emparejamientos por siembra (1 vs N, 2 vs N-1…)
  const primeraRonda: Cruce[] = [];
  for (let i = 0; i < bracket / 2; i++) {
    const local = siembra[i];
    const visitante = siembra[bracket - 1 - i];
    if (local.id === '__bye__' && visitante.id === '__bye__') continue;
    if (local.id === '__bye__') {
      warnings.push(`(Bracket) ${visitante.nombre} avanza sin jugar en la primera ronda (rival BYE).`);
      continue;
    }
    if (visitante.id === '__bye__') {
      warnings.push(`(Bracket) ${local.nombre} avanza sin jugar en la primera ronda (rival BYE).`);
      continue;
    }
    primeraRonda.push({
      local,
      visitante,
      etapa: etapaPorCantidad(bracket),
      bracketPos: i + 1,
      esIda: true,
    });
  }
  const rondas: Ronda[] = [{
    nombre: etapaPorCantidad(bracket),
    numero: 1,
    cruces: primeraRonda,
  }];
  // Etapas siguientes: placeholders
  let cantidad = bracket / 2;
  let etapaNum = 2;
  while (cantidad >= 1) {
    if (cantidad === 1) break; // el campeón no es un partido
    const etapaNombre = etapaPorCantidad(cantidad);
    const cruces: Cruce[] = [];
    for (let i = 0; i < cantidad / 2; i++) {
      cruces.push({
        local: { id: `__ganador_${etapaNum}_${i * 2 + 1}__`, nombre: `Ganador match ${i * 2 + 1}` },
        visitante: { id: `__ganador_${etapaNum}_${i * 2 + 2}__`, nombre: `Ganador match ${i * 2 + 2}` },
        etapa: etapaNombre,
        bracketPos: i + 1,
      });
    }
    rondas.push({ nombre: etapaNombre, numero: etapaNum, cruces });
    cantidad = cantidad / 2;
    etapaNum++;
  }
  const fases = rondas.map((r) => r.nombre);
  return { rondas, fases, warnings };
}

function dobleEliminacion(equipos: EquipoSlot[]): { rondas: Ronda[]; fases: string[]; warnings: string[] } {
  // Implementación análoga: upper bracket como eliminación directa,
  // lower bracket como una segunda fase que se materializará en runtime.
  const base = eliminacionDirecta(equipos);
  const warnings = [...base.warnings, 'Doble eliminación: el lower bracket se arma dinámicamente con los perdedores.'];
  return { rondas: base.rondas, fases: [...base.fases, 'Lower bracket'], warnings };
}

// ============================================================
// Grupos
// ============================================================

function distribuirEnGrupos(equipos: EquipoSlot[], cantidadGrupos: number): Record<string, EquipoSlot[]> {
  const grupos: Record<string, EquipoSlot[]> = {};
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < cantidadGrupos; i++) grupos[letras[i]] = [];
  // Sembrado simple: orden alternado (snake) para repartir
  const mezcla = shuffle(equipos);
  for (let i = 0; i < mezcla.length; i++) {
    const grupoIdx = i % cantidadGrupos;
    const nombreGrupo = letras[grupoIdx];
    grupos[nombreGrupo].push(mezcla[i]);
  }
  return grupos;
}

function generarGrupos(
  equipos: EquipoSlot[],
  opciones: { cantidadGrupos?: number; conIdaVuelta?: boolean; conEliminacionPosterior?: boolean },
): { rondas: Ronda[]; fases: string[]; grupos: Record<string, EquipoSlot[]>; warnings: string[] } {
  const warnings: string[] = [];
  const n = equipos.length;
  if (n < 2) throw new Error('La fase de grupos requiere al menos 2 equipos.');
  // Elegir cantidad de grupos
  let cg = opciones.cantidadGrupos ?? 0;
  if (!cg) {
    if (n <= 4) cg = 2;
    else if (n <= 8) cg = 2;
    else if (n <= 12) cg = 3;
    else if (n <= 16) cg = 4;
    else cg = Math.min(8, Math.ceil(n / 4));
  }
  cg = Math.max(1, Math.min(cg, n));
  const grupos = distribuirEnGrupos(equipos, cg);
  const rondas: Ronda[] = [];
  const nombreFase = opciones.conEliminacionPosterior ? 'Fase de grupos' : 'Fase regular';
  rondas.push({ nombre: nombreFase, numero: 1, cruces: [], fase: nombreFase });
  for (const [nombreGrupo, lista] of Object.entries(grupos)) {
    if (lista.length < 2) {
      warnings.push(`El grupo ${nombreGrupo} tiene un solo equipo, no genera partidos en esta fase.`);
      continue;
    }
    const { rondas: rondasGrupo, warnings: w } = roundRobin(lista, opciones.conIdaVuelta);
    // Reetiquetar cruces con el nombre del grupo y la ronda con su fase
    for (const r of rondasGrupo) {
      r.fase = nombreFase;
      for (const c of r.cruces) c.grupo = nombreGrupo;
    }
    rondas.push(...rondasGrupo);
    warnings.push(...w);
  }
  // La(s) fase(s) de eliminación las agrega el dispatcher con sus etapas reales
  // (Semifinal, Final…); acá solo va la fase de grupos.
  const fases = [nombreFase];
  return { rondas, fases, grupos, warnings };
}

// ============================================================
// Dispatcher
// ============================================================

export interface OpcionesGenerador {
  /** Cantidad de grupos (solo si formato = grupos o grupos_y_eliminacion) */
  cantidadGrupos?: number;
  /** Si la fase de grupos debe incluir ida y vuelta */
  gruposIdaVuelta?: boolean;
  /** Si la lista viene ya ordenada para sembrar (eliminación) */
  siembraOrdenada?: boolean;
  /** Cantidad de equipos que clasifican por grupo (en grupos_y_eliminacion) */
  clasificadosPorGrupo?: number;
}

export function generarFixture(
  formato: Formato,
  equipos: EquipoSlot[],
  opciones: OpcionesGenerador = {},
): ResultadoFixture {
  if (!equipos || equipos.length < 2) {
    throw new Error('Se necesitan al menos 2 equipos para generar un fixture.');
  }

  // Atajos de mini-liga
  const tamFijo = tamanoFormato(formato);
  if (tamFijo && equipos.length !== tamFijo) {
    throw new Error(`El formato "${formato}" requiere exactamente ${tamFijo} equipos (recibidos: ${equipos.length}).`);
  }

  // Sembrado: si no viene ordenada, shuffle para aleatoriedad
  const siembra = opciones.siembraOrdenada ? [...equipos] : shuffle(equipos);

  switch (formato) {
    case 'todos_contra_todos':
    case 'liguilla': {
      const { rondas, warnings } = roundRobin(siembra);
      for (const r of rondas) r.fase = 'Fase regular';
      return { formato, rondas, fases: ['Fase regular'], warnings };
    }
    case 'ida_y_vuelta': {
      const { rondas, warnings } = roundRobin(siembra, true);
      for (const r of rondas) r.fase = r.cruces[0]?.esIda === false ? 'Fase regular (vuelta)' : 'Fase regular (ida)';
      return { formato, rondas, fases: ['Fase regular (ida)', 'Fase regular (vuelta)'], warnings };
    }
    case 'triangular':
    case 'cuadrangular':
    case 'hexagonal': {
      const { rondas, warnings } = roundRobin(siembra);
      for (const r of rondas) r.fase = 'Fase regular';
      return { formato, rondas, fases: ['Fase regular'], warnings };
    }
    case 'eliminacion_directa': {
      const { rondas, fases, warnings } = eliminacionDirecta(siembra);
      for (const r of rondas) r.fase = r.nombre; // la ronda ya se llama como su etapa/fase
      return { formato, rondas, fases, warnings };
    }
    case 'doble_eliminacion': {
      const { rondas, fases, warnings } = dobleEliminacion(siembra);
      for (const r of rondas) r.fase = r.nombre;
      return { formato, rondas, fases, warnings };
    }
    case 'grupos': {
      const { rondas, fases, grupos, warnings } = generarGrupos(siembra, {
        cantidadGrupos: opciones.cantidadGrupos,
        conIdaVuelta: !!opciones.gruposIdaVuelta,
      });
      return { formato, rondas, fases, grupos, warnings };
    }
    case 'grupos_y_eliminacion': {
      const { rondas, fases, grupos, warnings } = generarGrupos(siembra, {
        cantidadGrupos: opciones.cantidadGrupos,
        conIdaVuelta: !!opciones.gruposIdaVuelta,
        conEliminacionPosterior: true,
      });
      // Después de los grupos, agregar un bracket de eliminación
      const clasificados = (opciones.clasificadosPorGrupo ?? 2) * (opciones.cantidadGrupos ?? 2);
      const clasificadosSlots: EquipoSlot[] = [];
      for (let i = 0; i < clasificados; i++) {
        clasificadosSlots.push({ id: `__ganador_grupo_${i + 1}__`, nombre: `Clasificado ${i + 1}` });
      }
      const bracket = eliminacionDirecta(clasificadosSlots);
      // Numerar rondas y etiquetar su fase
      const offset = rondas.length;
      for (const r of bracket.rondas) { r.numero += offset; r.fase = r.nombre; }
      rondas.push(...bracket.rondas);
      warnings.push(...bracket.warnings);
      return { formato, rondas, fases: [...fases, ...bracket.fases], grupos, warnings };
    }
  }
}
