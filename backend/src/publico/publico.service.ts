import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResultadosService } from '../resultados/resultados.service';

/**
 * Servicio del portal público (sin autenticación).
 *
 * REGLA DE ORO: nunca devolver entidades crudas. Todo lo que sale por acá es
 * para usuarios anónimos, así que se proyecta explícitamente a un conjunto de
 * campos seguros. En particular se EXCLUYE:
 *  - PII de jugadores: numeroDocumento, tipoDocumento, fechaNacimiento,
 *    anioNacimiento, observaciones (¡incluye menores en categorías Sub!).
 *  - Contacto de clubes/delegados: representante, telefono, email, direccion,
 *    delegadoNombre/Telefono/Email.
 *  - Datos financieros de inscripciones: costoInscripcion, montoPagado,
 *    saldoPendiente.
 *
 * Los métodos de ResultadosService (tabla/goleadores/tarjetas) hidratan
 * entidades completas, por eso se mapean a campos seguros antes de devolver.
 */
@Injectable()
export class PublicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultados: ResultadosService,
  ) {}

  /** Solo clubes: nombre + sigla + logo (sin contacto). */
  private clubSeguro(club: any) {
    if (!club) return null;
    return { nombre: club.nombre, sigla: club.sigla ?? null, logoUrl: club.logoUrl ?? null };
  }

  private equipoSeguro(equipo: any) {
    if (!equipo) return null;
    return { id: equipo.id, nombre: equipo.nombre, club: this.clubSeguro(equipo.club) };
  }

  private jugadorSeguro(jugador: any) {
    if (!jugador) return null;
    return { nombres: jugador.nombres, apellidos: jugador.apellidos };
  }

  /** Lista de torneos visibles públicamente (excluye borradores). */
  torneos() {
    return this.prisma.torneo.findMany({
      where: { estado: { not: 'borrador' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        formato: true,
        estado: true,
        createdAt: true,
        categoria: { select: { id: true, nombre: true } },
        temporada: { select: { id: true, nombre: true, anio: true } },
        _count: { select: { partidos: true, inscripciones: true } },
      },
    });
  }

  /** Detalle público de un torneo (sin inscripciones ni datos financieros). */
  async torneo(id: string) {
    const t = await this.prisma.torneo.findFirst({
      where: { id, estado: { not: 'borrador' } },
      select: {
        id: true,
        nombre: true,
        formato: true,
        estado: true,
        puntosVictoria: true,
        puntosEmpate: true,
        puntosDerrota: true,
        criterioDesempate: true,
        categoria: { select: { id: true, nombre: true } },
        temporada: { select: { id: true, nombre: true, anio: true } },
        _count: { select: { partidos: true, inscripciones: true, fases: true } },
      },
    });
    if (!t) throw new NotFoundException(`Torneo ${id} no disponible`);
    return t;
  }

  /** Fixture: partidos con nombres de equipo y marcador (sin datos internos). */
  async fixture(id: string) {
    await this.torneo(id); // valida existencia y que no sea borrador
    return this.prisma.partido.findMany({
      where: { torneoId: id },
      orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        jornada: true,
        etapaEliminatoria: true,
        esIda: true,
        fechaProgramada: true,
        horaProgramada: true,
        cancha: true,
        estado: true,
        fase: { select: { id: true, nombre: true } },
        grupo: { select: { id: true, nombre: true } },
        equipoLocal: { select: { id: true, nombre: true, club: { select: { sigla: true } } } },
        equipoVisitante: { select: { id: true, nombre: true, club: { select: { sigla: true } } } },
        resultado: { select: { golesLocal: true, golesVisitante: true, cerrado: true } },
      },
    });
  }

  /** Tabla de posiciones, proyectada a campos seguros. */
  async tabla(id: string) {
    await this.torneo(id);
    const filas = await this.resultados.tablaPosiciones(id);
    return filas.map((f: any) => ({
      posicion: f.posicion,
      equipoId: f.equipoId,
      partidosJugados: f.partidosJugados,
      ganados: f.ganados,
      empatados: f.empatados,
      perdidos: f.perdidos,
      golesFavor: f.golesFavor,
      golesContra: f.golesContra,
      diferenciaGoles: f.diferenciaGoles,
      golAverage: f.golAverage,
      puntos: f.puntos,
      equipo: this.equipoSeguro(f.equipo),
    }));
  }

  /** Goleadores, proyectado a {jugador: nombre/apellidos, equipo, goles}. */
  async goleadores(id: string) {
    await this.torneo(id);
    const list = await this.resultados.goleadores(id);
    return list.map((l: any) => ({
      goles: l.goles,
      jugador: this.jugadorSeguro(l.jugador),
      equipo: this.equipoSeguro(l.equipo),
    }));
  }

  /** Ranking de tarjetas, proyectado a campos seguros. */
  async tarjetas(id: string) {
    await this.torneo(id);
    const list = await this.resultados.tarjetas(id);
    return list.map((l: any) => ({
      amarillas: l.amarillas,
      rojas: l.rojas,
      jugador: this.jugadorSeguro(l.jugador),
      equipo: this.equipoSeguro(l.equipo),
    }));
  }
}
