import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EstadisticasFiltros {
  temporadaId?: string;
  categoriaId?: string;
  limit?: number;
}

/**
 * Estadísticas GLOBALES de la liga: agregan las tablas EstadisticaJugador /
 * EstadisticaEquipo, que tienen UNA fila por (torneo, jugador|equipo). Para los
 * rankings históricos se suma por jugador/equipo cruzando todos los torneos
 * (opcionalmente filtrados por temporada y/o categoría).
 *
 * Devuelve solo campos seguros (nombre/apellidos del jugador, nombre+club del
 * equipo, y números), así que sirve tanto al dashboard como al portal público.
 */
@Injectable()
export class EstadisticasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ids de torneos no-borrador que matchean los filtros. */
  private async torneoIds(f: EstadisticasFiltros): Promise<string[]> {
    const torneos = await this.prisma.torneo.findMany({
      where: {
        estado: { not: 'borrador' },
        ...(f.temporadaId ? { temporadaId: f.temporadaId } : {}),
        ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      },
      select: { id: true },
    });
    return torneos.map((t) => t.id);
  }

  private async mapJugadores(ids: string[]) {
    const js = await this.prisma.jugador.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombres: true, apellidos: true },
    });
    return new Map(js.map((j) => [j.id, { nombres: j.nombres, apellidos: j.apellidos }]));
  }

  private async mapEquipos(ids: string[]) {
    const es = await this.prisma.equipo.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, club: { select: { nombre: true, sigla: true, logoUrl: true } } },
    });
    return new Map(
      es.map((e) => [
        e.id,
        { id: e.id, nombre: e.nombre, club: e.club ? { nombre: e.club.nombre, sigla: e.club.sigla, logoUrl: e.club.logoUrl } : null },
      ]),
    );
  }

  /** Equipo con más goles del jugador (su "equipo principal" en el ranking). */
  private equipoPrincipal(porEquipo: Map<string, number>): string | undefined {
    return [...porEquipo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  async goleadores(f: EstadisticasFiltros) {
    const ids = await this.torneoIds(f);
    if (!ids.length) return [];
    const rows = await this.prisma.estadisticaJugador.findMany({
      where: { torneoId: { in: ids }, goles: { gt: 0 } },
      select: { jugadorId: true, equipoId: true, goles: true, partidosJugados: true },
    });
    const acc = new Map<string, { jugadorId: string; goles: number; partidos: number; porEquipo: Map<string, number> }>();
    for (const r of rows) {
      let a = acc.get(r.jugadorId);
      if (!a) {
        a = { jugadorId: r.jugadorId, goles: 0, partidos: 0, porEquipo: new Map() };
        acc.set(r.jugadorId, a);
      }
      a.goles += r.goles;
      a.partidos += r.partidosJugados;
      a.porEquipo.set(r.equipoId, (a.porEquipo.get(r.equipoId) ?? 0) + r.goles);
    }
    const list = [...acc.values()].sort((a, b) => b.goles - a.goles).slice(0, f.limit ?? 20);
    const mapJ = await this.mapJugadores(list.map((l) => l.jugadorId));
    const mapE = await this.mapEquipos(
      list.map((l) => this.equipoPrincipal(l.porEquipo)).filter((x): x is string => !!x),
    );
    return list.map((l, i) => ({
      posicion: i + 1,
      goles: l.goles,
      partidos: l.partidos,
      jugador: mapJ.get(l.jugadorId) ?? null,
      equipo: mapE.get(this.equipoPrincipal(l.porEquipo) ?? '') ?? null,
    }));
  }

  async tarjetas(f: EstadisticasFiltros) {
    const ids = await this.torneoIds(f);
    if (!ids.length) return [];
    const rows = await this.prisma.estadisticaJugador.findMany({
      where: { torneoId: { in: ids }, OR: [{ amarillas: { gt: 0 } }, { rojas: { gt: 0 } }] },
      select: { jugadorId: true, equipoId: true, amarillas: true, rojas: true },
    });
    const acc = new Map<string, { jugadorId: string; amarillas: number; rojas: number; porEquipo: Map<string, number> }>();
    for (const r of rows) {
      let a = acc.get(r.jugadorId);
      if (!a) {
        a = { jugadorId: r.jugadorId, amarillas: 0, rojas: 0, porEquipo: new Map() };
        acc.set(r.jugadorId, a);
      }
      a.amarillas += r.amarillas;
      a.rojas += r.rojas;
      a.porEquipo.set(r.equipoId, (a.porEquipo.get(r.equipoId) ?? 0) + r.amarillas + r.rojas);
    }
    const list = [...acc.values()]
      .sort((a, b) => b.rojas - a.rojas || b.amarillas - a.amarillas)
      .slice(0, f.limit ?? 20);
    const mapJ = await this.mapJugadores(list.map((l) => l.jugadorId));
    const mapE = await this.mapEquipos(
      list.map((l) => this.equipoPrincipal(l.porEquipo)).filter((x): x is string => !!x),
    );
    return list.map((l, i) => ({
      posicion: i + 1,
      amarillas: l.amarillas,
      rojas: l.rojas,
      jugador: mapJ.get(l.jugadorId) ?? null,
      equipo: mapE.get(this.equipoPrincipal(l.porEquipo) ?? '') ?? null,
    }));
  }

  async equipos(f: EstadisticasFiltros) {
    const ids = await this.torneoIds(f);
    if (!ids.length) return [];
    const rows = await this.prisma.estadisticaEquipo.findMany({
      where: { torneoId: { in: ids } },
      select: {
        equipoId: true,
        partidosJugados: true,
        victorias: true,
        empates: true,
        derrotas: true,
        golesFavor: true,
        golesContra: true,
        puntos: true,
      },
    });
    const acc = new Map<
      string,
      { equipoId: string; pj: number; g: number; e: number; p: number; gf: number; gc: number; pts: number; torneos: number }
    >();
    for (const r of rows) {
      let a = acc.get(r.equipoId);
      if (!a) {
        a = { equipoId: r.equipoId, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, torneos: 0 };
        acc.set(r.equipoId, a);
      }
      a.pj += r.partidosJugados;
      a.g += r.victorias;
      a.e += r.empates;
      a.p += r.derrotas;
      a.gf += r.golesFavor;
      a.gc += r.golesContra;
      a.pts += r.puntos;
      a.torneos += 1;
    }
    const list = [...acc.values()]
      .sort((a, b) => b.pts - a.pts || b.g - a.g || b.gf - b.gc - (a.gf - a.gc))
      .slice(0, f.limit ?? 20);
    const mapE = await this.mapEquipos(list.map((l) => l.equipoId));
    return list.map((l, i) => ({
      posicion: i + 1,
      torneos: l.torneos,
      partidosJugados: l.pj,
      victorias: l.g,
      empates: l.e,
      derrotas: l.p,
      golesFavor: l.gf,
      golesContra: l.gc,
      diferenciaGoles: l.gf - l.gc,
      puntos: l.pts,
      equipo: mapE.get(l.equipoId) ?? null,
    }));
  }

  /** KPIs para tarjetas de resumen. */
  async resumen(f: EstadisticasFiltros) {
    const ids = await this.torneoIds(f);
    if (!ids.length) {
      return { torneos: 0, partidos: 0, goles: 0, amarillas: 0, rojas: 0, equipos: 0, jugadores: 0 };
    }
    const [aggJ, partidos, equipos, jugadores] = await Promise.all([
      this.prisma.estadisticaJugador.aggregate({
        where: { torneoId: { in: ids } },
        _sum: { goles: true, amarillas: true, rojas: true },
      }),
      this.prisma.partido.count({ where: { torneoId: { in: ids }, estado: 'finalizado' } }),
      this.prisma.estadisticaEquipo
        .findMany({ where: { torneoId: { in: ids } }, select: { equipoId: true }, distinct: ['equipoId'] })
        .then((r) => r.length),
      this.prisma.estadisticaJugador
        .findMany({ where: { torneoId: { in: ids } }, select: { jugadorId: true }, distinct: ['jugadorId'] })
        .then((r) => r.length),
    ]);
    return {
      torneos: ids.length,
      partidos,
      goles: aggJ._sum.goles ?? 0,
      amarillas: aggJ._sum.amarillas ?? 0,
      rojas: aggJ._sum.rojas ?? 0,
      equipos,
      jugadores,
    };
  }
}
