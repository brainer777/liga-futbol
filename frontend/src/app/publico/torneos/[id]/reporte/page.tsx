'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

type Equipo = { nombre: string } | null;
type Torneo = { nombre: string; categoria: { nombre: string } | null; temporada: { nombre: string; anio: number } | null };
type FilaTabla = {
  posicion: number; equipoId: string; partidosJugados: number; ganados: number; empatados: number;
  perdidos: number; golesFavor: number; golesContra: number; diferenciaGoles: number; puntos: number;
  equipo: Equipo;
};
type Goleador = { goles: number; jugador: { nombres: string; apellidos: string } | null; equipo: Equipo };
type Tarjeta = { amarillas: number; rojas: number; jugador: { nombres: string; apellidos: string } | null; equipo: Equipo };

const jugadorLabel = (j: { nombres: string; apellidos: string } | null) =>
  j ? `${j.apellidos}, ${j.nombres}` : '—';

export default function ReportePublicoPage() {
  const { id } = useParams<{ id: string }>();

  const torneo = useQuery<Torneo>({
    queryKey: ['publico', 'torneo', id],
    queryFn: () => api.get(`/publico/torneos/${id}`).then((r) => r.data),
  });
  const tabla = useQuery<FilaTabla[]>({
    queryKey: ['publico', 'tabla', id],
    queryFn: () => api.get(`/publico/torneos/${id}/tabla`).then((r) => r.data),
  });
  const goleadores = useQuery<Goleador[]>({
    queryKey: ['publico', 'goleadores', id],
    queryFn: () => api.get(`/publico/torneos/${id}/goleadores`).then((r) => r.data),
  });
  const tarjetas = useQuery<Tarjeta[]>({
    queryKey: ['publico', 'tarjetas', id],
    queryFn: () => api.get(`/publico/torneos/${id}/tarjetas`).then((r) => r.data),
  });

  const cargando = torneo.isLoading || tabla.isLoading || goleadores.isLoading || tarjetas.isLoading;

  return (
    <div className="space-y-6">
      {/* Barra de acciones (no se imprime) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/publico/torneos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al torneo
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Encabezado del reporte */}
      <div className="text-center border-b pb-3">
        <h1 className="text-xl font-bold">{torneo.data?.nombre ?? 'Reporte del torneo'}</h1>
        <p className="text-sm text-muted-foreground">
          {torneo.data?.categoria?.nombre} · {torneo.data?.temporada?.nombre}
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando reporte…</p>}

      {/* Tabla de posiciones */}
      <section className="break-inside-avoid">
        <h2 className="font-semibold mb-2">Tabla de posiciones</h2>
        {tabla.data?.length ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-2 w-8">#</th>
                <th className="py-1 pr-2">Equipo</th>
                {['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
                  <th key={h} className="py-1 px-1 text-center w-10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.data.map((f) => (
                <tr key={f.equipoId} className="border-b">
                  <td className="py-1 pr-2">{f.posicion}</td>
                  <td className="py-1 pr-2">{f.equipo?.nombre ?? '—'}</td>
                  <td className="py-1 px-1 text-center">{f.partidosJugados}</td>
                  <td className="py-1 px-1 text-center">{f.ganados}</td>
                  <td className="py-1 px-1 text-center">{f.empatados}</td>
                  <td className="py-1 px-1 text-center">{f.perdidos}</td>
                  <td className="py-1 px-1 text-center">{f.golesFavor}</td>
                  <td className="py-1 px-1 text-center">{f.golesContra}</td>
                  <td className="py-1 px-1 text-center">{f.diferenciaGoles}</td>
                  <td className="py-1 px-1 text-center font-bold">{f.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">Sin partidos jugados.</p>
        )}
      </section>

      {/* Goleadores */}
      <section className="break-inside-avoid">
        <h2 className="font-semibold mb-2">Goleadores</h2>
        {goleadores.data?.length ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-2 w-8">#</th><th className="py-1 pr-2">Jugador</th>
                <th className="py-1 pr-2">Equipo</th><th className="py-1 px-1 text-center w-14">Goles</th>
              </tr>
            </thead>
            <tbody>
              {goleadores.data.map((g, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{i + 1}</td>
                  <td className="py-1 pr-2">{jugadorLabel(g.jugador)}</td>
                  <td className="py-1 pr-2">{g.equipo?.nombre ?? '—'}</td>
                  <td className="py-1 px-1 text-center font-bold">{g.goles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">Sin goles registrados.</p>
        )}
      </section>

      {/* Tarjetas */}
      <section className="break-inside-avoid">
        <h2 className="font-semibold mb-2">Tarjetas</h2>
        {tarjetas.data?.length ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-2 w-8">#</th><th className="py-1 pr-2">Jugador</th>
                <th className="py-1 pr-2">Equipo</th>
                <th className="py-1 px-1 text-center w-16">Amar.</th><th className="py-1 px-1 text-center w-16">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {tarjetas.data.map((t, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{i + 1}</td>
                  <td className="py-1 pr-2">{jugadorLabel(t.jugador)}</td>
                  <td className="py-1 pr-2">{t.equipo?.nombre ?? '—'}</td>
                  <td className="py-1 px-1 text-center">{t.amarillas}</td>
                  <td className="py-1 px-1 text-center">{t.rojas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">Sin amonestaciones.</p>
        )}
      </section>
    </div>
  );
}
