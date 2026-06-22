import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTorneoDto, UpdateTorneoDto } from './dto/torneos.dto';
import { GenerarFixtureDto, UpdatePartidoDto, ReprogramarPartidoDto } from './dto/fixture.dto';
import {
  generarFixture, esFormatoValido, EquipoSlot, ResultadoFixture,
} from './fixture.generator';
import { calcularTabla } from '../resultados/tabla.calculator';
import {
  Clasificado, ordenarClasificados, primeraRondaEliminatoria,
  siguienteRondaEliminatoria, ganadorDePartido, RondaEliminatoria,
} from './eliminatorias.rules';

@Injectable()
export class TorneosService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // CRUD de torneo (existente)
  // ============================================================

  findAll() {
    return this.prisma.torneo.findMany({
      include: { temporada: true, categoria: true, _count: { select: { inscripciones: true, partidos: true, fases: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.torneo.findUnique({
      where: { id },
      include: {
        _count: { select: { partidos: true, inscripciones: true, fases: true } },
        temporada: true,
        categoria: true,
        inscripciones: { include: { equipo: { include: { club: true } } } },
        fases: {
          orderBy: { orden: 'asc' },
          include: {
            grupos: { include: { equipos: { include: { grupo: true } } } },
            partidos: {
              orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
              include: {
                grupo: true,
                fase: true,
                arbitro: { select: { id: true, nombre: true } },
                sede: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    });
    if (!t) throw new NotFoundException(`Torneo ${id} no encontrado`);
    return t;
  }

  create(dto: CreateTorneoDto) {
    return this.prisma.torneo.create({ data: dto, include: { temporada: true, categoria: true } });
  }

  async update(id: string, dto: UpdateTorneoDto) {
    await this.findOne(id);
    return this.prisma.torneo.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const t = await this.findOne(id);
    if (t._count?.partidos > 0 || t._count?.inscripciones > 0) {
      throw new BadRequestException('No se puede eliminar: el torneo tiene fases, partidos o inscripciones asociadas.');
    }
    await this.prisma.torneo.delete({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // FIXTURE / FASES / GRUPOS / PARTIDOS
  // ============================================================

  /**
   * Genera el fixture completo del torneo:
   *  - Crea la(s) fase(s) según el formato.
   *  - Crea los grupos si corresponde.
   *  - Genera los cruces como partidos en estado "borrador".
   *  - Si se pasó fechaInicio/horaDefault, las asigna.
   *
   * REEMPLAZA el fixture existente (limpia partidos, fases y grupos previos).
   */
  async generarFixture(torneoId: string, dto: GenerarFixtureDto, userId?: string) {
    const torneo = await this.findOne(torneoId);
    if (!esFormatoValido(torneo.formato)) {
      throw new BadRequestException(`Formato no soportado: ${torneo.formato}`);
    }
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId },
      include: { equipo: { include: { club: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (inscripciones.length < 2) {
      throw new BadRequestException('El torneo necesita al menos 2 equipos inscritos para generar fixture.');
    }
    const equipos: EquipoSlot[] = inscripciones.map((i) => ({
      id: i.equipo.id,
      nombre: i.equipo.nombre,
      clubId: i.equipo.clubId,
    }));

    let resultado: ResultadoFixture;
    try {
      resultado = generarFixture(torneo.formato as any, equipos, {
        cantidadGrupos: dto.cantidadGrupos,
        gruposIdaVuelta: dto.gruposIdaVuelta,
        siembraOrdenada: dto.siembraOrdenada,
        clasificadosPorGrupo: dto.clasificadosPorGrupo,
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'No se pudo generar el fixture');
    }

    // Persistir en una transacción
    return this.prisma.$transaction(async (tx) => {
      // 1) Borrar fixture anterior
      await tx.partidoReprogramacion.deleteMany({ where: { partido: { torneoId } } });
      await tx.partido.deleteMany({ where: { torneoId } });
      await tx.grupoEquipo.deleteMany({ where: { grupo: { fase: { torneoId } } } });
      await tx.grupo.deleteMany({ where: { fase: { torneoId } } });
      await tx.faseTorneo.deleteMany({ where: { torneoId } });

      // 2) Crear las fases (cada "fase" en el resultado = 1 fila en fases_torneo)
      const fasesCreadas: Record<string, string> = {};
      let orden = 1;
      for (const nombreFase of resultado.fases) {
        const fase = await tx.faseTorneo.create({
          data: {
            torneoId,
            nombre: nombreFase,
            tipo: nombreFase.toLowerCase().includes('grupo') ? 'grupos' : 'eliminacion',
            orden: orden++,
            estado: 'pendiente',
          },
        });
        fasesCreadas[nombreFase] = fase.id;
      }

      // 3) Crear grupos (si el formato los usa)
      const gruposCreados: Record<string, string> = {}; // "A" -> grupoId
      if (resultado.grupos) {
        // Asignar a la primera fase (la "fase de grupos")
        const faseId = Object.values(fasesCreadas)[0];
        for (const [nombreGrupo, lista] of Object.entries(resultado.grupos)) {
          const grupo = await tx.grupo.create({
            data: { faseId, nombre: nombreGrupo },
          });
          gruposCreados[nombreGrupo] = grupo.id;
          for (const eq of lista) {
            if (eq.id.startsWith('__')) continue; // BYE
            await tx.grupoEquipo.create({
              data: { grupoId: grupo.id, equipoId: eq.id },
            });
          }
        }
      }

      // 4) Generar los partidos
      const partidosCreados: any[] = [];
      const fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : null;
      const diasEntre = dto.diasEntreJornadas ?? 7;
      let ultimaFecha: Date | null = null;
      // Indexar fases por orden (asumimos que las fases en resultado.fases están en orden)
      const faseOrden: string[] = resultado.fases;
      const faseIdPorIndice: Record<number, string> = {};
      Object.entries(fasesCreadas).forEach(([nombre, id], idx) => {
        faseIdPorIndice[idx] = id;
      });

      for (const ronda of resultado.rondas) {
        // Asignar fecha si hay fechaInicio
        let fechaRonda: Date | null = null;
        if (fechaInicio) {
          if (ronda.numero === 1) {
            fechaRonda = new Date(fechaInicio);
            ultimaFecha = fechaRonda;
          } else if (ultimaFecha) {
            // Para round-robin las jornadas son consecutivas: offset = (n-1) * diasEntre
            // Para eliminatorias: cada etapa es una fase nueva, pero como las numeramos
            // de forma contigua, el mismo offset funciona.
            const offsetDias = (ronda.numero - 1) * diasEntre;
            fechaRonda = new Date(fechaInicio.getTime() + offsetDias * 24 * 60 * 60 * 1000);
            ultimaFecha = fechaRonda;
          }
        }

        for (const cruce of ronda.cruces) {
          // Si es un cruce placeholder (ganador X), no lo persistimos
          if (cruce.local.id.startsWith('__ganador_') || cruce.visitante.id.startsWith('__ganador_')) {
            continue;
          }
          if (cruce.local.id === '__bye__' || cruce.visitante.id === '__bye__') {
            continue;
          }
          // Determinar fase (la ronda trae su fase; si no, caemos a su nombre)
          const idxFase = faseOrden.indexOf(ronda.fase ?? ronda.nombre);
          const faseId = idxFase >= 0 ? faseIdPorIndice[idxFase] : null;
          const grupoId = cruce.grupo ? gruposCreados[cruce.grupo] : null;
          const partido = await tx.partido.create({
            data: {
              torneoId,
              faseId,
              grupoId,
              jornada: cruce.jornada ?? ronda.numero,
              etapaEliminatoria: cruce.etapa ?? null,
              esIda: cruce.esIda ?? true,
              equipoLocalId: cruce.local.id,
              equipoVisitanteId: cruce.visitante.id,
              fechaProgramada: fechaRonda,
              horaProgramada: dto.horaDefault ?? null,
              estado: fechaRonda ? 'programado' : 'borrador',
              creadoPorId: userId,
            },
          });
          partidosCreados.push(partido);
        }
      }

      // 5) Generado el fixture, el torneo pasa a "en_curso"
      await tx.torneo.update({
        where: { id: torneoId },
        data: { estado: 'en_curso' },
      });

      return {
        formato: torneo.formato,
        fases: resultado.fases,
        grupos: resultado.grupos,
        warnings: resultado.warnings,
        totalPartidos: partidosCreados.length,
        fechaInicio: fechaInicio,
      };
    });
  }

  // ============================================================
  // PARTIDOS
  // ============================================================

  listarPartidos(torneoId: string) {
    return this.prisma.partido.findMany({
      where: { torneoId },
      include: {
        fase: true,
        grupo: true,
        arbitro: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        resultado: { select: { golesLocal: true, golesVisitante: true, cerrado: true } },
        reprogramaciones: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOnePartido(id: string) {
    const p = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        torneo: true,
        fase: true,
        grupo: true,
        arbitro: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        reprogramaciones: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!p) throw new NotFoundException(`Partido ${id} no encontrado`);
    return p;
  }

  async updatePartido(id: string, dto: UpdatePartidoDto) {
    await this.findOnePartido(id);
    const data: any = { ...dto };
    if (dto.fechaProgramada) data.fechaProgramada = new Date(dto.fechaProgramada);
    return this.prisma.partido.update({
      where: { id },
      data,
      include: {
        arbitro: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
      },
    });
  }

  async reprogramarPartido(id: string, dto: ReprogramarPartidoDto, userId?: string) {
    const actual = await this.findOnePartido(id);
    if (!actual.torneo.permiteReprogramacion) {
      throw new BadRequestException('Este torneo no permite reprogramaciones.');
    }
    return this.prisma.$transaction(async (tx) => {
      const reprogramacion = await tx.partidoReprogramacion.create({
        data: {
          partidoId: id,
          fechaAnterior: actual.fechaProgramada,
          horaAnterior: actual.horaProgramada,
          canchaAnterior: actual.cancha,
          fechaNueva: dto.fechaProgramada ? new Date(dto.fechaProgramada) : null,
          horaNueva: dto.horaProgramada ?? null,
          canchaNueva: dto.cancha ?? null,
          motivo: dto.motivo,
          reprogramadoPorId: userId,
        },
      });
      const data: any = { estado: 'reprogramado' };
      if (dto.fechaProgramada !== undefined) data.fechaProgramada = dto.fechaProgramada ? new Date(dto.fechaProgramada) : null;
      if (dto.horaProgramada !== undefined) data.horaProgramada = dto.horaProgramada;
      if (dto.cancha !== undefined) data.cancha = dto.cancha;
      const partido = await tx.partido.update({ where: { id }, data });
      return { partido, reprogramacion };
    });
  }

  async eliminarPartido(id: string) {
    await this.findOnePartido(id);
    await this.prisma.partido.delete({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // FASES / GRUPOS (lectura)
  // ============================================================

  listarFases(torneoId: string) {
    return this.prisma.faseTorneo.findMany({
      where: { torneoId },
      orderBy: { orden: 'asc' },
      include: { grupos: { include: { equipos: true } }, _count: { select: { partidos: true } } },
    });
  }

  listarGrupos(faseId: string) {
    return this.prisma.grupo.findMany({
      where: { faseId },
      include: { equipos: { include: { grupo: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  // ============================================================
  // ELIMINATORIAS (group → knockout)
  // ============================================================

  private reglasDe(torneo: { puntosVictoria: number; puntosEmpate: number; puntosDerrota: number; criterioDesempate: string }) {
    return {
      puntosVictoria: torneo.puntosVictoria,
      puntosEmpate: torneo.puntosEmpate,
      puntosDerrota: torneo.puntosDerrota,
      criterioDesempate: torneo.criterioDesempate as any,
    };
  }

  /** Busca la fase por nombre o la crea (al final del orden) como fase de eliminación. */
  private async asegurarFaseEliminacion(tx: any, torneoId: string, nombre: string): Promise<string> {
    const existente = await tx.faseTorneo.findFirst({ where: { torneoId, nombre } });
    if (existente) return existente.id;
    const max = await tx.faseTorneo.aggregate({ where: { torneoId }, _max: { orden: true } });
    const fase = await tx.faseTorneo.create({
      data: { torneoId, nombre, tipo: 'eliminacion', orden: (max._max.orden ?? 0) + 1, estado: 'pendiente' },
    });
    return fase.id;
  }

  /** Persiste los cruces de una ronda de eliminación con una jornada nueva (posterior a todo). */
  private async crearPartidosRonda(tx: any, torneoId: string, faseId: string, ronda: RondaEliminatoria, userId?: string) {
    const max = await tx.partido.aggregate({ where: { torneoId }, _max: { jornada: true } });
    const jornada = (max._max.jornada ?? 0) + 1;
    const creados = [];
    for (const cruce of ronda.cruces) {
      creados.push(await tx.partido.create({
        data: {
          torneoId,
          faseId,
          jornada,
          etapaEliminatoria: ronda.etapa,
          esIda: true,
          equipoLocalId: cruce.localId,
          equipoVisitanteId: cruce.visitanteId,
          estado: 'programado',
          creadoPorId: userId,
        },
      }));
    }
    return creados;
  }

  /** Genera la primera ronda de eliminación a partir de las posiciones de los grupos. */
  async generarEliminatorias(torneoId: string, dto: { clasificadosPorGrupo?: number }, userId?: string) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      include: {
        inscripciones: { select: { id: true, equipoId: true } },
        fases: { orderBy: { orden: 'asc' }, include: { grupos: { include: { equipos: true } } } },
        partidos: { include: { resultado: true } },
      },
    });
    if (!torneo) throw new NotFoundException(`Torneo ${torneoId} no encontrado`);
    if (torneo.formato !== 'grupos_y_eliminacion') {
      throw new BadRequestException('Solo los torneos de grupos y eliminación pueden generar eliminatorias.');
    }
    const faseGrupos = torneo.fases.find((f) => f.tipo === 'grupos');
    if (!faseGrupos) throw new BadRequestException('El torneo no tiene una fase de grupos.');

    const partidosGrupos = torneo.partidos.filter((p) => p.faseId === faseGrupos.id);
    if (partidosGrupos.length === 0) throw new BadRequestException('La fase de grupos no tiene partidos.');
    if (!partidosGrupos.every((p) => p.estado === 'finalizado')) {
      throw new BadRequestException('La fase de grupos no está completa: faltan resultados por cerrar.');
    }
    if (torneo.partidos.some((p) => p.etapaEliminatoria)) {
      throw new BadRequestException('Las eliminatorias ya fueron generadas.');
    }

    const clasifPorGrupo = dto?.clasificadosPorGrupo ?? 2;
    const reglas = this.reglasDe(torneo);
    const clasificados: Clasificado[] = [];
    for (const grupo of faseGrupos.grupos) {
      const equipoIds = grupo.equipos.map((ge: any) => ge.equipoId);
      const partidosDelGrupo = partidosGrupos
        .filter((p) => p.grupoId === grupo.id && p.resultado)
        .map((p) => ({
          id: p.id,
          equipoLocalId: p.equipoLocalId,
          equipoVisitanteId: p.equipoVisitanteId,
          golesLocal: p.resultado!.golesLocal,
          golesVisitante: p.resultado!.golesVisitante,
          finalizado: p.resultado!.cerrado,
          fecha: p.fechaProgramada,
        }));
      const inscG = torneo.inscripciones.filter((i) => equipoIds.includes(i.equipoId));
      const tabla = calcularTabla(reglas, partidosDelGrupo, inscG);
      tabla.slice(0, clasifPorGrupo).forEach((fila, idx) => {
        clasificados.push({ equipoId: fila.equipoId, grupo: grupo.nombre, pos: idx + 1 });
      });
    }

    const ronda = primeraRondaEliminatoria(ordenarClasificados(clasificados)); // valida 2 o 4
    return this.prisma.$transaction(async (tx) => {
      const faseId = await this.asegurarFaseEliminacion(tx, torneoId, ronda.etapa);
      const partidos = await this.crearPartidosRonda(tx, torneoId, faseId, ronda, userId);
      await tx.faseTorneo.update({ where: { id: faseGrupos.id }, data: { estado: 'finalizada' } });
      await tx.faseTorneo.update({ where: { id: faseId }, data: { estado: 'activa' } });
      return { etapa: ronda.etapa, partidos };
    });
  }

  /** Avanza la eliminación: con la ronda actual completa, crea la siguiente con los ganadores. */
  async avanzarEliminatoria(torneoId: string, dto: { ganadores?: Record<string, string> }, userId?: string) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      include: { fases: { orderBy: { orden: 'asc' } }, partidos: { include: { resultado: true } } },
    });
    if (!torneo) throw new NotFoundException(`Torneo ${torneoId} no encontrado`);
    const elim = torneo.partidos.filter((p) => p.etapaEliminatoria);
    if (elim.length === 0) throw new BadRequestException('Todavía no se generaron las eliminatorias.');

    const maxJornada = Math.max(...elim.map((p) => p.jornada ?? 0));
    const rondaActual = elim
      .filter((p) => (p.jornada ?? 0) === maxJornada)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (!rondaActual.every((p) => p.estado === 'finalizado' && p.resultado?.cerrado)) {
      throw new BadRequestException('La ronda actual de eliminación no está completa.');
    }

    const overrides = dto?.ganadores ?? {};
    const ganadores: string[] = [];
    const empatadas: string[] = [];
    for (const p of rondaActual) {
      const g = ganadorDePartido(
        { equipoLocalId: p.equipoLocalId, equipoVisitanteId: p.equipoVisitanteId, golesLocal: p.resultado!.golesLocal, golesVisitante: p.resultado!.golesVisitante },
        overrides[p.id],
      );
      if (!g) empatadas.push(p.id); else ganadores.push(g);
    }
    if (empatadas.length > 0) {
      throw new BadRequestException(
        `Hay llave(s) empatada(s) sin ganador definido (${empatadas.join(', ')}). Indicá quién pasó para poder avanzar.`,
      );
    }

    const siguiente = siguienteRondaEliminatoria(ganadores);
    if (!siguiente) {
      // La ronda actual era la final: ya hay campeón.
      const faseFinalId = rondaActual[0].faseId;
      if (faseFinalId) await this.prisma.faseTorneo.update({ where: { id: faseFinalId }, data: { estado: 'finalizada' } });
      return { campeonId: ganadores[0], mensaje: 'La eliminación terminó: hay campeón.' };
    }
    if (elim.some((p) => (p.jornada ?? 0) > maxJornada)) {
      throw new BadRequestException('La siguiente ronda ya fue generada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const faseId = await this.asegurarFaseEliminacion(tx, torneoId, siguiente.etapa);
      const partidos = await this.crearPartidosRonda(tx, torneoId, faseId, siguiente, userId);
      const faseActualId = rondaActual[0].faseId;
      if (faseActualId) await tx.faseTorneo.update({ where: { id: faseActualId }, data: { estado: 'finalizada' } });
      await tx.faseTorneo.update({ where: { id: faseId }, data: { estado: 'activa' } });
      return { etapa: siguiente.etapa, partidos };
    });
  }
}
