import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResultadosService } from '../resultados/resultados.service';
import { buildCsv, CsvCell } from './csv.util';

/**
 * Genera reportes CSV de un torneo. Columnas elegidas explícitamente
 * (whitelist) — NUNCA se vuelcan entidades crudas: nada de documento, fecha de
 * nacimiento de jugadores ni contacto de clubes/delegados.
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultados: ResultadosService,
  ) {}

  private async asegurarTorneo(id: string): Promise<string> {
    const t = await this.prisma.torneo.findUnique({ where: { id }, select: { nombre: true } });
    if (!t) throw new NotFoundException(`Torneo ${id} no encontrado`);
    return t.nombre;
  }

  async tablaCsv(torneoId: string): Promise<string> {
    await this.asegurarTorneo(torneoId);
    const filas = await this.resultados.tablaPosiciones(torneoId);
    const rows: CsvCell[][] = filas.map((f: any) => [
      f.posicion,
      f.equipo?.nombre ?? '',
      f.partidosJugados,
      f.ganados,
      f.empatados,
      f.perdidos,
      f.golesFavor,
      f.golesContra,
      f.diferenciaGoles,
      f.puntos,
    ]);
    return buildCsv(
      ['Pos', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'],
      rows,
    );
  }

  async goleadoresCsv(torneoId: string): Promise<string> {
    await this.asegurarTorneo(torneoId);
    const list = await this.resultados.goleadores(torneoId);
    const rows: CsvCell[][] = list.map((g: any, i: number) => [
      i + 1,
      g.jugador?.apellidos ?? '',
      g.jugador?.nombres ?? '',
      g.equipo?.nombre ?? '',
      g.goles,
    ]);
    return buildCsv(['#', 'Apellidos', 'Nombres', 'Equipo', 'Goles'], rows);
  }

  async tarjetasCsv(torneoId: string): Promise<string> {
    await this.asegurarTorneo(torneoId);
    const list = await this.resultados.tarjetas(torneoId);
    const rows: CsvCell[][] = list.map((t: any, i: number) => [
      i + 1,
      t.jugador?.apellidos ?? '',
      t.jugador?.nombres ?? '',
      t.equipo?.nombre ?? '',
      t.amarillas,
      t.rojas,
    ]);
    return buildCsv(['#', 'Apellidos', 'Nombres', 'Equipo', 'Amarillas', 'Rojas'], rows);
  }

  async fixtureCsv(torneoId: string): Promise<string> {
    await this.asegurarTorneo(torneoId);
    const partidos = await this.prisma.partido.findMany({
      where: { torneoId },
      orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
      select: {
        jornada: true,
        etapaEliminatoria: true,
        estado: true,
        fechaProgramada: true,
        horaProgramada: true,
        cancha: true,
        equipoLocal: { select: { nombre: true } },
        equipoVisitante: { select: { nombre: true } },
        resultado: { select: { golesLocal: true, golesVisitante: true, cerrado: true } },
      },
    });
    const rows: CsvCell[][] = partidos.map((p) => {
      const ronda = p.etapaEliminatoria || (p.jornada != null ? `Jornada ${p.jornada}` : '');
      const marcador = p.resultado ? `${p.resultado.golesLocal}-${p.resultado.golesVisitante}` : '';
      const fecha = p.fechaProgramada ? p.fechaProgramada.toISOString().slice(0, 10) : '';
      return [
        ronda,
        p.equipoLocal?.nombre ?? '',
        p.equipoVisitante?.nombre ?? '',
        marcador,
        p.estado,
        fecha,
        p.horaProgramada ?? '',
        p.cancha ?? '',
      ];
    });
    return buildCsv(
      ['Ronda', 'Local', 'Visitante', 'Resultado', 'Estado', 'Fecha', 'Hora', 'Cancha'],
      rows,
    );
  }
}
