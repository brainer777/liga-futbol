'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ListChecks, Target, AlertTriangle, CalendarDays, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type ClubSeguro = { nombre?: string; sigla?: string | null; logoUrl?: string | null } | null;
type EquipoSeguro = { id?: string; nombre: string; club?: ClubSeguro } | null;

type Torneo = {
  id: string; nombre: string; formato: string; estado: string;
  categoria: { nombre: string } | null;
  temporada: { nombre: string; anio: number } | null;
};
type FilaTabla = {
  posicion: number; equipoId: string; partidosJugados: number; ganados: number; empatados: number;
  perdidos: number; golesFavor: number; golesContra: number; diferenciaGoles: number; puntos: number;
  equipo: EquipoSeguro;
};
type Goleador = { goles: number; jugador: { nombres: string; apellidos: string } | null; equipo: EquipoSeguro };
type Tarjeta = { amarillas: number; rojas: number; jugador: { nombres: string; apellidos: string } | null; equipo: EquipoSeguro };
type Partido = {
  id: string; jornada: number | null; etapaEliminatoria: string | null; estado: string;
  fechaProgramada: string | null; horaProgramada: string | null;
  fase: { nombre: string } | null; grupo: { nombre: string } | null;
  equipoLocal: EquipoSeguro; equipoVisitante: EquipoSeguro;
  resultado: { golesLocal: number; golesVisitante: number; cerrado: boolean } | null;
};

const TABS = [
  { key: 'tabla', label: 'Posiciones', icon: ListChecks },
  { key: 'goleadores', label: 'Goleadores', icon: Target },
  { key: 'tarjetas', label: 'Tarjetas', icon: AlertTriangle },
  { key: 'fixture', label: 'Fixture', icon: CalendarDays },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function equipoLabel(e: EquipoSeguro): string {
  if (!e) return '—';
  return e.nombre;
}

export default function TorneoPublicoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tab, setTab] = React.useState<TabKey>('tabla');

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
  const fixture = useQuery<Partido[]>({
    queryKey: ['publico', 'fixture', id],
    queryFn: () => api.get(`/publico/torneos/${id}/fixture`).then((r) => r.data),
  });

  if (torneo.isError) {
    return (
      <div className="space-y-4">
        <Link href="/publico" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Torneo no disponible.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/publico" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a torneos
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{torneo.data?.nombre ?? 'Torneo'}</h1>
          <p className="text-muted-foreground text-sm">
            {torneo.data?.categoria?.nombre} · {torneo.data?.temporada?.nombre}
          </p>
        </div>
        <Link
          href={`/publico/torneos/${id}/reporte`}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent shrink-0"
        >
          <Printer className="h-4 w-4" /> Reporte
        </Link>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ' +
                (active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')
              }
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'tabla' && <TablaView q={tabla} />}
      {tab === 'goleadores' && <GoleadoresView q={goleadores} />}
      {tab === 'tarjetas' && <TarjetasView q={tarjetas} />}
      {tab === 'fixture' && <FixtureView q={fixture} />}
    </div>
  );
}

function Estado({ q, vacio }: { q: { isLoading: boolean; isError: boolean; data?: any[] }; vacio: string }) {
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (q.isError) return <p className="text-sm text-destructive">No se pudo cargar.</p>;
  if (!q.data || q.data.length === 0) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return null;
}

function TablaView({ q }: { q: ReturnType<typeof useQuery<FilaTabla[]>> }) {
  const estado = <Estado q={q} vacio="Todavía no hay partidos jugados." />;
  if (q.isLoading || q.isError || !q.data?.length) return estado;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 w-8">#</th>
            <th className="text-left px-3 py-2">Equipo</th>
            {['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
              <th key={h} className="text-center px-2 py-2 w-10">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.data.map((f) => (
            <tr key={f.equipoId} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{f.posicion}</td>
              <td className="px-3 py-2 font-medium">{equipoLabel(f.equipo)}</td>
              <td className="text-center px-2 py-2">{f.partidosJugados}</td>
              <td className="text-center px-2 py-2">{f.ganados}</td>
              <td className="text-center px-2 py-2">{f.empatados}</td>
              <td className="text-center px-2 py-2">{f.perdidos}</td>
              <td className="text-center px-2 py-2">{f.golesFavor}</td>
              <td className="text-center px-2 py-2">{f.golesContra}</td>
              <td className="text-center px-2 py-2">{f.diferenciaGoles}</td>
              <td className="text-center px-2 py-2 font-bold">{f.puntos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoleadoresView({ q }: { q: ReturnType<typeof useQuery<Goleador[]>> }) {
  if (q.isLoading || q.isError || !q.data?.length) return <Estado q={q} vacio="Todavía no hay goles registrados." />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr><th className="text-left px-3 py-2 w-8">#</th><th className="text-left px-3 py-2">Jugador</th><th className="text-left px-3 py-2">Equipo</th><th className="text-center px-3 py-2 w-16">Goles</th></tr>
        </thead>
        <tbody>
          {q.data.map((g, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{g.jugador ? `${g.jugador.apellidos}, ${g.jugador.nombres}` : '—'}</td>
              <td className="px-3 py-2">{equipoLabel(g.equipo)}</td>
              <td className="text-center px-3 py-2 font-bold">{g.goles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TarjetasView({ q }: { q: ReturnType<typeof useQuery<Tarjeta[]>> }) {
  if (q.isLoading || q.isError || !q.data?.length) return <Estado q={q} vacio="Sin amonestaciones registradas." />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr><th className="text-left px-3 py-2 w-8">#</th><th className="text-left px-3 py-2">Jugador</th><th className="text-left px-3 py-2">Equipo</th><th className="text-center px-2 py-2 w-16">🟨</th><th className="text-center px-2 py-2 w-16">🟥</th></tr>
        </thead>
        <tbody>
          {q.data.map((t, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{t.jugador ? `${t.jugador.apellidos}, ${t.jugador.nombres}` : '—'}</td>
              <td className="px-3 py-2">{equipoLabel(t.equipo)}</td>
              <td className="text-center px-2 py-2">{t.amarillas}</td>
              <td className="text-center px-2 py-2">{t.rojas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixtureView({ q }: { q: ReturnType<typeof useQuery<Partido[]>> }) {
  if (q.isLoading || q.isError || !q.data?.length) return <Estado q={q} vacio="Todavía no hay fixture generado." />;
  // Agrupar por jornada (o etapa eliminatoria)
  const grupos = new Map<string, Partido[]>();
  for (const p of q.data) {
    const key = p.etapaEliminatoria || (p.jornada != null ? `Jornada ${p.jornada}` : 'Partidos');
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }
  return (
    <div className="space-y-4">
      {Array.from(grupos.entries()).map(([titulo, partidos]) => (
        <div key={titulo}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{titulo}</h3>
          <div className="space-y-2">
            {partidos.map((p) => {
              const cerrado = p.resultado?.cerrado;
              return (
                <Card key={p.id}>
                  <CardContent className="p-3 flex items-center gap-3 text-sm">
                    <div className="flex-1 text-right font-medium">{equipoLabel(p.equipoLocal)}</div>
                    <div className="px-3 py-1 rounded-md bg-muted font-bold tabular-nums min-w-[3.5rem] text-center">
                      {p.resultado ? `${p.resultado.golesLocal} - ${p.resultado.golesVisitante}` : 'vs'}
                    </div>
                    <div className="flex-1 font-medium">{equipoLabel(p.equipoVisitante)}</div>
                    <Badge variant={cerrado ? 'success' : 'secondary'} className="shrink-0">
                      {cerrado ? 'Final' : p.estado}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
