import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarResultadoDto, UpdateResultadoDto } from './dto/resultados.dto';
import { calcularTabla, calcularEstadicasJugador } from './tabla.calculator';
import { aplicarFechaCumplida, estaSuspendida, habilitacionBloquea } from './sanciones.rules';
import { golesDesdeEventos } from './reconciliacion';

const UMBRAL_AMARILLAS_PARA_SANCION = 3;
const FECHAS_SANCION_POR_ACUMULACION = 1;
const FECHAS_SANCION_POR_ROJA_DIRECTA = 2;

@Injectable()
export class ResultadosService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // REGISTRAR / ACTUALIZAR RESULTADO
  // ============================================================

  async registrar(dto: RegistrarResultadoDto, userId?: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id: dto.partidoId },
      include: { torneo: true, resultado: { include: { eventos: true } } },
    });
    if (!partido) throw new NotFoundException(`Partido ${dto.partidoId} no encontrado`);
    if (partido.resultado?.cerrado) {
      throw new ConflictException('El resultado ya está cerrado. Crea un nuevo resultado desde cero.');
    }
    if (dto.golesLocal === dto.golesVisitante && partido.torneo.criterioDesempate === 'partido_extra') {
      throw new BadRequestException(
        'Este torneo define "partido extra" como criterio de desempate. No se puede cerrar un empate.',
      );
    }
    // Validar jugadores y equipos de los eventos
    if (dto.eventos?.length) {
      for (const ev of dto.eventos) {
        if (ev.equipoId !== partido.equipoLocalId && ev.equipoId !== partido.equipoVisitanteId) {
          throw new BadRequestException(`El equipo ${ev.equipoId} no juega este partido.`);
        }
      }
      // No permitir cargar jugadores suspendidos o no habilitados en la planilla
      await this.validarElegibilidad(partido.torneoId, dto.eventos);
    }

    // Al cerrar, los goles cargados como eventos deben sumar exactamente el marcador
    // (así los goleadores nunca quedan cortos). Un borrador sí puede quedar incompleto.
    if (dto.cerrar) {
      this.validarReconciliacion(
        dto.eventos ?? [],
        partido.equipoLocalId,
        partido.equipoVisitanteId,
        dto.golesLocal,
        dto.golesVisitante,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let resultado;
      if (partido.resultado) {
        resultado = await tx.resultado.update({
          where: { id: partido.resultado.id },
          data: {
            golesLocal: dto.golesLocal,
            golesVisitante: dto.golesVisitante,
            observaciones: dto.observaciones,
            cerrado: dto.cerrar ?? false,
            cerradoPorId: dto.cerrar ? userId : null,
            cerradoEn: dto.cerrar ? new Date() : null,
          },
        });
        // Borrar eventos anteriores para reescribirlos
        await tx.resultadoEvento.deleteMany({ where: { resultadoId: resultado.id } });
      } else {
        resultado = await tx.resultado.create({
          data: {
            partidoId: dto.partidoId,
            golesLocal: dto.golesLocal,
            golesVisitante: dto.golesVisitante,
            observaciones: dto.observaciones,
            cerrado: dto.cerrar ?? false,
            cerradoPorId: dto.cerrar ? userId : null,
            cerradoEn: dto.cerrar ? new Date() : new Date(),
          },
        });
      }
      // Insertar eventos
      if (dto.eventos?.length) {
        await tx.resultadoEvento.createMany({
          data: dto.eventos.map((e) => ({
            resultadoId: resultado.id,
            tipo: e.tipo,
            jugadorId: e.jugadorId,
            equipoId: e.equipoId,
            minuto: e.minuto,
            observaciones: e.observaciones,
          })),
        });
      }
      // Si se está cerrando, cambiar el estado del partido
      if (dto.cerrar) {
        await tx.partido.update({
          where: { id: partido.id },
          data: { estado: 'finalizado' },
        });
      }
      // Sincronizar estadísticas y tabla si está cerrado
      if (dto.cerrar) {
        await this.syncEstadisticasYTabla(tx, partido.torneoId, partido.id);
        // Primero descontar fechas a las sanciones pendientes (el equipo disputó una fecha),
        // y recién después generar las sanciones nuevas de este partido.
        await this.avanzarSancionesPendientes(
          tx,
          partido.torneoId,
          partido.equipoLocalId,
          partido.equipoVisitanteId,
        );
        await this.aplicarSancionesAutomaticas(tx, partido.torneoId, partido.id, userId);
      }
      return tx.resultado.findUnique({
        where: { id: resultado.id },
        include: { eventos: true, partido: { include: { torneo: { select: { id: true, nombre: true } } } } },
      });
    });
  }

  async update(id: string, dto: UpdateResultadoDto) {
    const r = await this.prisma.resultado.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Resultado ${id} no encontrado`);
    if (r.cerrado) throw new ConflictException('Resultado cerrado: no se puede modificar.');
    return this.prisma.resultado.update({ where: { id }, data: dto });
  }

  async cerrar(id: string, userId?: string) {
    const r = await this.prisma.resultado.findUnique({
      where: { id },
      include: { partido: true, eventos: true },
    });
    if (!r) throw new NotFoundException(`Resultado ${id} no encontrado`);
    if (r.cerrado) return r;
    this.validarReconciliacion(
      r.eventos,
      r.partido.equipoLocalId,
      r.partido.equipoVisitanteId,
      r.golesLocal,
      r.golesVisitante,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.resultado.update({
        where: { id },
        data: { cerrado: true, cerradoPorId: userId, cerradoEn: new Date() },
      });
      await tx.partido.update({ where: { id: r.partidoId }, data: { estado: 'finalizado' } });
      await this.syncEstadisticasYTabla(tx, r.partido.torneoId, r.partidoId);
      await this.avanzarSancionesPendientes(
        tx,
        r.partido.torneoId,
        r.partido.equipoLocalId,
        r.partido.equipoVisitanteId,
      );
      await this.aplicarSancionesAutomaticas(tx, r.partido.torneoId, r.partidoId, userId);
      return tx.resultado.findUnique({
        where: { id },
        include: { eventos: true, partido: true },
      });
    });
  }

  async delete(id: string) {
    const r = await this.prisma.resultado.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Resultado ${id} no encontrado`);
    await this.prisma.resultado.delete({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // CONSULTAS
  // ============================================================

  async findByPartido(partidoId: string) {
    return this.prisma.resultado.findUnique({
      where: { partidoId },
      include: { eventos: { orderBy: { minuto: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.resultado.findUnique({
      where: { id },
      include: {
        eventos: { orderBy: { minuto: 'asc' } },
        partido: { include: { torneo: { include: { categoria: true } } } },
      },
    });
    if (!r) throw new NotFoundException(`Resultado ${id} no encontrado`);
    return r;
  }

  async tablaPosiciones(torneoId: string) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      include: {
        inscripciones: { select: { id: true, equipoId: true } },
        partidos: { where: { estado: 'finalizado' }, include: { resultado: true } },
      },
    });
    if (!torneo) throw new NotFoundException(`Torneo ${torneoId} no encontrado`);
    const partidos = torneo.partidos
      .filter((p) => p.resultado)
      .map((p) => ({
        id: p.id,
        equipoLocalId: p.equipoLocalId,
        equipoVisitanteId: p.equipoVisitanteId,
        golesLocal: p.resultado!.golesLocal,
        golesVisitante: p.resultado!.golesVisitante,
        finalizado: p.resultado!.cerrado,
        fecha: p.fechaProgramada,
      }));
    const tabla = calcularTabla(
      {
        puntosVictoria: torneo.puntosVictoria,
        puntosEmpate: torneo.puntosEmpate,
        puntosDerrota: torneo.puntosDerrota,
        criterioDesempate: torneo.criterioDesempate as any,
      },
      partidos,
      torneo.inscripciones,
    );
    // Adjuntar datos de equipo
    const equipos = await this.prisma.equipo.findMany({
      where: { id: { in: tabla.map((t) => t.equipoId) } },
      include: { club: true, categoria: true },
    });
    const mapEq = new Map(equipos.map((e) => [e.id, e]));
    return tabla.map((fila) => ({
      ...fila,
      equipo: mapEq.get(fila.equipoId),
    }));
  }

  async goleadores(torneoId: string) {
    const eventos = await this.prisma.resultadoEvento.findMany({
      where: { tipo: 'gol', resultado: { cerrado: true, partido: { torneoId } } },
      include: { resultado: { include: { partido: true } } },
    });
    const map = new Map<string, { jugadorId: string; goles: number; equipoId: string; jugador?: any }>();
    for (const e of eventos) {
      if (!map.has(e.jugadorId)) {
        map.set(e.jugadorId, { jugadorId: e.jugadorId, equipoId: e.equipoId, goles: 0 });
      }
      map.get(e.jugadorId)!.goles += 1;
    }
    const list = Array.from(map.values()).sort((a, b) => b.goles - a.goles);
    // Cargar info de jugador + equipo
    const jugadores = await this.prisma.jugador.findMany({
      where: { id: { in: list.map((l) => l.jugadorId) } },
    });
    const equipos = await this.prisma.equipo.findMany({
      where: { id: { in: list.map((l) => l.equipoId) } },
      include: { club: true },
    });
    const mapJ = new Map(jugadores.map((j) => [j.id, j]));
    const mapE = new Map(equipos.map((e) => [e.id, e]));
    return list.map((l) => ({
      ...l,
      jugador: mapJ.get(l.jugadorId),
      equipo: mapE.get(l.equipoId),
    }));
  }

  async tarjetas(torneoId: string) {
    const eventos = await this.prisma.resultadoEvento.findMany({
      where: {
        tipo: { in: ['amarilla', 'roja', 'doble_amarilla'] },
        resultado: { cerrado: true, partido: { torneoId } },
      },
    });
    const map = new Map<string, { jugadorId: string; amarillas: number; rojas: number; equipoId: string; jugador?: any; equipo?: any }>();
    for (const e of eventos) {
      if (!map.has(e.jugadorId)) {
        map.set(e.jugadorId, { jugadorId: e.jugadorId, equipoId: e.equipoId, amarillas: 0, rojas: 0 });
      }
      const s = map.get(e.jugadorId)!;
      if (e.tipo === 'amarilla') s.amarillas += 1;
      if (e.tipo === 'roja' || e.tipo === 'doble_amarilla') s.rojas += 1;
    }
    const list = Array.from(map.values()).sort((a, b) => b.amarillas + b.rojas * 3 - (a.amarillas + a.rojas * 3));
    const jugadores = await this.prisma.jugador.findMany({ where: { id: { in: list.map((l) => l.jugadorId) } } });
    const equipos = await this.prisma.equipo.findMany({ where: { id: { in: list.map((l) => l.equipoId) } }, include: { club: true } });
    const mapJ = new Map(jugadores.map((j) => [j.id, j]));
    const mapE = new Map(equipos.map((e) => [e.id, e]));
    return list.map((l) => ({
      ...l,
      jugador: mapJ.get(l.jugadorId),
      equipo: mapE.get(l.equipoId),
    }));
  }

  async sanciones(torneoId?: string) {
    return this.prisma.sancion.findMany({
      where: torneoId ? { torneoId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSancion(id: string, data: { estado?: string; fechasCumplidas?: number }) {
    const sancion = await this.prisma.sancion.findUnique({ where: { id } });
    if (!sancion) throw new NotFoundException(`Sanción ${id} no encontrada`);
    return this.prisma.sancion.update({ where: { id }, data: data as any });
  }

  // ============================================================
  // SINCRONIZACIÓN DE ESTADÍSTICAS
  // ============================================================

  private async syncEstadisticasYTabla(
    tx: any,
    torneoId: string,
    partidoIdCerrado: string,
  ) {
    // Traer TODOS los partidos finalizados del torneo con sus resultados + eventos
    const partidos = await tx.partido.findMany({
      where: { torneoId, estado: 'finalizado' },
      include: { resultado: { include: { eventos: true } } },
    });
    const torneo = await tx.torneo.findUnique({
      where: { id: torneoId },
      include: { inscripciones: true },
    });
    if (!torneo) return;

    // === Tabla de posiciones / Estadísticas de equipo ===
    const statsEquipoMap = new Map<string, any>();
    for (const i of torneo.inscripciones) {
      statsEquipoMap.set(i.equipoId, {
        torneoId, equipoId: i.equipoId,
        partidosJugados: 0, victorias: 0, empates: 0, derrotas: 0,
        golesFavor: 0, golesContra: 0, puntos: 0,
      });
    }
    for (const p of partidos) {
      if (!p.resultado) continue;
      const l = statsEquipoMap.get(p.equipoLocalId);
      const v = statsEquipoMap.get(p.equipoVisitanteId);
      if (!l || !v) continue;
      l.partidosJugados += 1; v.partidosJugados += 1;
      l.golesFavor += p.resultado.golesLocal; l.golesContra += p.resultado.golesVisitante;
      v.golesFavor += p.resultado.golesVisitante; v.golesContra += p.resultado.golesLocal;
      if (p.resultado.golesLocal > p.resultado.golesVisitante) {
        l.victorias += 1; v.derrotas += 1;
        l.puntos += torneo.puntosVictoria; v.puntos += torneo.puntosDerrota;
      } else if (p.resultado.golesLocal < p.resultado.golesVisitante) {
        v.victorias += 1; l.derrotas += 1;
        v.puntos += torneo.puntosVictoria; l.puntos += torneo.puntosDerrota;
      } else {
        l.empates += 1; v.empates += 1;
        l.puntos += torneo.puntosEmpate; v.puntos += torneo.puntosEmpate;
      }
    }
    // Persistir (upsert) estadísticas de equipo
    for (const s of statsEquipoMap.values()) {
      await tx.estadisticaEquipo.upsert({
        where: { torneoId_equipoId: { torneoId, equipoId: s.equipoId } },
        update: s,
        create: s,
      });
    }

    // === Estadísticas de jugador ===
    const eventosPorPartido: Record<string, any[]> = {};
    for (const p of partidos) {
      if (p.resultado) eventosPorPartido[p.id] = p.resultado.eventos;
    }
    const stats = calcularEstadicasJugador(
      partidos.map((p) => ({
        id: p.id,
        equipoLocalId: p.equipoLocalId,
        equipoVisitanteId: p.equipoVisitanteId,
        golesLocal: p.resultado?.golesLocal ?? 0,
        golesVisitante: p.resultado?.golesVisitante ?? 0,
        finalizado: !!p.resultado?.cerrado,
      })),
      eventosPorPartido,
    );
    for (const s of stats) {
      // `s` (de calcularEstadicasJugador) no trae torneoId, y es requerido en
      // EstadisticaJugador → hay que inyectarlo en create/update.
      const data = { ...s, torneoId };
      await tx.estadisticaJugador.upsert({
        where: { torneoId_jugadorId: { torneoId, jugadorId: s.jugadorId } },
        update: data,
        create: data,
      });
    }
  }

  /** Lanza 400 si los goles de los eventos no coinciden con el marcador. */
  private validarReconciliacion(
    eventos: { tipo: string; equipoId: string }[],
    equipoLocalId: string,
    equipoVisitanteId: string,
    golesLocal: number,
    golesVisitante: number,
  ) {
    const { local, visitante } = golesDesdeEventos(eventos, equipoLocalId, equipoVisitanteId);
    if (local !== golesLocal || visitante !== golesVisitante) {
      throw new BadRequestException(
        `Los goles cargados (${local}-${visitante}) no coinciden con el marcador ` +
          `(${golesLocal}-${golesVisitante}). Cargá todos los goles como eventos antes de cerrar.`,
      );
    }
  }

  /**
   * Rechaza el resultado si algún jugador de los eventos está suspendido (sanción vigente
   * en el torneo) o no habilitado (estado de habilitación negativo en su equipo). Es el
   * único punto donde el sistema conoce qué jugadores intervienen, así que acá se aplica
   * la regla. No frena a un jugador que entra a la cancha pero no figura en ningún evento
   * (no existe planilla/alineación todavía).
   */
  private async validarElegibilidad(
    torneoId: string,
    eventos: { jugadorId: string; equipoId: string }[],
  ) {
    const jugadorIds = [...new Set(eventos.map((e) => e.jugadorId))];
    if (jugadorIds.length === 0) return;

    const [sanciones, equipoJugadores, jugadores] = await Promise.all([
      this.prisma.sancion.findMany({
        where: { torneoId, estado: 'pendiente', jugadorId: { in: jugadorIds } },
      }),
      this.prisma.equipoJugador.findMany({
        where: {
          OR: eventos.map((e) => ({ jugadorId: e.jugadorId, equipoId: e.equipoId })),
        },
      }),
      this.prisma.jugador.findMany({
        where: { id: { in: jugadorIds } },
        select: { id: true, nombres: true, apellidos: true },
      }),
    ]);

    const nombre = (id: string) => {
      const j = jugadores.find((x) => x.id === id);
      return j ? `${j.apellidos}, ${j.nombres}` : id;
    };
    const habMap = new Map(
      equipoJugadores.map((ej) => [`${ej.jugadorId}:${ej.equipoId}`, ej.estadoHabilitacion]),
    );

    const errores: string[] = [];
    for (const id of jugadorIds) {
      if (sanciones.some((s) => s.jugadorId === id && estaSuspendida(s))) {
        errores.push(`${nombre(id)} está suspendido y no puede ser incluido en el resultado.`);
      }
    }
    // Habilitación: evaluar por par jugador+equipo tal como viene en el evento
    const paresVistos = new Set<string>();
    for (const e of eventos) {
      const key = `${e.jugadorId}:${e.equipoId}`;
      if (paresVistos.has(key)) continue;
      paresVistos.add(key);
      const estado = habMap.get(key);
      if (estado && habilitacionBloquea(estado)) {
        errores.push(`${nombre(e.jugadorId)} no está habilitado (${estado}).`);
      }
    }

    if (errores.length > 0) {
      throw new BadRequestException(errores.join(' '));
    }
  }

  /**
   * Al disputarse un partido, cada jugador de los dos equipos con una sanción pendiente
   * en el torneo cumple una fecha. Es independiente de que el jugador aparezca o no en
   * los eventos: la sanción se cumple porque su equipo jugó la fecha.
   */
  private async avanzarSancionesPendientes(
    tx: any,
    torneoId: string,
    equipoLocalId: string,
    equipoVisitanteId: string,
  ) {
    const roster = await tx.equipoJugador.findMany({
      where: { equipoId: { in: [equipoLocalId, equipoVisitanteId] } },
      select: { jugadorId: true },
    });
    const jugadorIds = [...new Set(roster.map((r: { jugadorId: string }) => r.jugadorId))];
    if (jugadorIds.length === 0) return;

    const pendientes = await tx.sancion.findMany({
      where: { torneoId, estado: 'pendiente', jugadorId: { in: jugadorIds } },
    });
    for (const s of pendientes) {
      await tx.sancion.update({
        where: { id: s.id },
        data: aplicarFechaCumplida(s),
      });
    }
  }

  private async aplicarSancionesAutomaticas(
    tx: any,
    torneoId: string,
    partidoId: string,
    userId?: string,
  ) {
    const partido = await tx.partido.findUnique({ where: { id: partidoId } });
    if (!partido) return;
    // Acumulación de amarillas en este torneo
    const eventos = await tx.resultadoEvento.findMany({
      where: { resultado: { partido: { torneoId, id: partidoId } } },
    });
    for (const e of eventos) {
      if (e.tipo === 'roja') {
        // Sanción por roja directa
        const yaExiste = await tx.sancion.findFirst({
          where: { jugadorId: e.jugadorId, partidoId, motivo: 'roja_directa' },
        });
        if (!yaExiste) {
          await tx.sancion.create({
            data: {
              jugadorId: e.jugadorId,
              torneoId,
              partidoId,
              motivo: 'roja_directa',
              fechasCumplir: FECHAS_SANCION_POR_ROJA_DIRECTA,
              descripcion: 'Sanción automática por tarjeta roja directa',
              aplicadaPorId: userId,
            },
          });
        }
      } else if (e.tipo === 'doble_amarilla') {
        const yaExiste = await tx.sancion.findFirst({
          where: { jugadorId: e.jugadorId, partidoId, motivo: 'doble_amarilla' },
        });
        if (!yaExiste) {
          await tx.sancion.create({
            data: {
              jugadorId: e.jugadorId,
              torneoId,
              partidoId,
              motivo: 'doble_amarilla',
              fechasCumplir: 1,
              descripcion: 'Sanción automática por doble amarilla',
              aplicadaPorId: userId,
            },
          });
        }
      } else if (e.tipo === 'amarilla') {
        // Contar amarillas totales en el torneo
        const totalAmarillas = await tx.resultadoEvento.count({
          where: {
            tipo: 'amarilla',
            jugadorId: e.jugadorId,
            resultado: { partido: { torneoId, estado: 'finalizado' } },
          },
        });
        if (totalAmarillas > 0 && totalAmarillas % UMBRAL_AMARILLAS_PARA_SANCION === 0) {
          // Verificar que no haya sanción previa por la misma acumulación
          const yaExiste = await tx.sancion.findFirst({
            where: { jugadorId: e.jugadorId, partidoId, motivo: 'acumulacion_amarillas' },
          });
          if (!yaExiste) {
            await tx.sancion.create({
              data: {
                jugadorId: e.jugadorId,
                torneoId,
                partidoId,
                motivo: 'acumulacion_amarillas',
                fechasCumplir: FECHAS_SANCION_POR_ACUMULACION,
                descripcion: `Sanción automática por acumulación de ${UMBRAL_AMARILLAS_PARA_SANCION} amarillas en el torneo`,
                aplicadaPorId: userId,
              },
            });
          }
        }
      }
    }
  }
}
