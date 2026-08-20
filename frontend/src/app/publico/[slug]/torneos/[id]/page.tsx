'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ListChecks, Target, AlertTriangle, CalendarDays, Printer, Share2, MapPin, Flag, Building2 } from 'lucide-react';
import { api, ligaHeader } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResultadoShareModal, ResultadoShareData } from '@/components/resultado-share';
import { EncuentroShareModal, EncuentroShareData } from '@/components/encuentro-share';

type ClubSeguro = { nombre?: string; sigla?: string | null; logoUrl?: string | null } | null;
type EquipoSeguro = { id?: string; nombre: string; logoUrl?: string | null; club?: ClubSeguro } | null;

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
  fechaProgramada: string | null; horaProgramada: string | null; cancha: string | null;
  fase: { nombre: string } | null; grupo: { nombre: string } | null;
  sede: { nombre: string } | null; arbitro: { nombre: string } | null;
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
  const params = useParams<{ slug: string; id: string }>();
  const { slug, id } = params;
  const cfg = ligaHeader(slug);
  const [tab, setTab] = React.useState<TabKey>('tabla');
  const [shareFor, setShareFor] = React.useState<ResultadoShareData | null>(null);
  const [shareEncuentroFor, setShareEncuentroFor] = React.useState<EncuentroShareData | null>(null);

  const torneo = useQuery<Torneo>({
    queryKey: ['publico', slug, 'torneo', id],
    queryFn: () => api.get(`/publico/torneos/${id}`, cfg).then((r) => r.data),
  });
  const tabla = useQuery<FilaTabla[]>({
    queryKey: ['publico', slug, 'tabla', id],
    queryFn: () => api.get(`/publico/torneos/${id}/tabla`, cfg).then((r) => r.data),
  });
  const goleadores = useQuery<Goleador[]>({
    queryKey: ['publico', slug, 'goleadores', id],
    queryFn: () => api.get(`/publico/torneos/${id}/goleadores`, cfg).then((r) => r.data),
  });
  const tarjetas = useQuery<Tarjeta[]>({
    queryKey: ['publico', slug, 'tarjetas', id],
    queryFn: () => api.get(`/publico/torneos/${id}/tarjetas`, cfg).then((r) => r.data),
  });
  const fixture = useQuery<Partido[]>({
    queryKey: ['publico', slug, 'fixture', id],
    queryFn: () => api.get(`/publico/torneos/${id}/fixture`, cfg).then((r) => r.data),
  });

  if (torneo.isError) {
    return (
      <div className="space-y-4">
        <Link href={`/publico/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Torneo no disponible.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href={`/publico/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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
          href={`/publico/${slug}/torneos/${id}/reporte`}
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
      {tab === 'fixture' && (
        <FixtureView
          q={fixture}
          onShareResultado={(p) =>
            setShareFor({
              local: {
                nombre: p.equipoLocal?.nombre ?? 'Local',
                sigla: p.equipoLocal?.club?.sigla,
                logoUrl: p.equipoLocal?.logoUrl,
                clubLogoUrl: p.equipoLocal?.club?.logoUrl,
              },
              visitante: {
                nombre: p.equipoVisitante?.nombre ?? 'Visitante',
                sigla: p.equipoVisitante?.club?.sigla,
                logoUrl: p.equipoVisitante?.logoUrl,
                clubLogoUrl: p.equipoVisitante?.club?.logoUrl,
              },
              golesLocal: p.resultado!.golesLocal,
              golesVisitante: p.resultado!.golesVisitante,
              torneo: torneo.data?.nombre ?? 'Torneo',
              categoria: torneo.data?.categoria?.nombre,
              fecha: p.fechaProgramada,
              jornada: p.jornada,
            })
          }
          onShareEncuentro={(p) =>
            setShareEncuentroFor({
              local: {
                nombre: p.equipoLocal?.nombre ?? 'Local',
                sigla: p.equipoLocal?.club?.sigla,
                logoUrl: p.equipoLocal?.logoUrl,
                clubLogoUrl: p.equipoLocal?.club?.logoUrl,
              },
              visitante: {
                nombre: p.equipoVisitante?.nombre ?? 'Visitante',
                sigla: p.equipoVisitante?.club?.sigla,
                logoUrl: p.equipoVisitante?.logoUrl,
                clubLogoUrl: p.equipoVisitante?.club?.logoUrl,
              },
              torneo: torneo.data?.nombre ?? 'Torneo',
              categoria: torneo.data?.categoria?.nombre,
              fecha: p.fechaProgramada,
              hora: p.horaProgramada,
              sede: p.sede?.nombre,
              jornada: p.jornada,
            })
          }
        />
      )}

      {shareFor && <ResultadoShareModal data={shareFor} ligaSlug={slug} onClose={() => setShareFor(null)} />}
      {shareEncuentroFor && (
        <EncuentroShareModal data={shareEncuentroFor} ligaSlug={slug} onClose={() => setShareEncuentroFor(null)} />
      )}
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

function FixtureView({
  q, onShareResultado, onShareEncuentro,
}: {
  q: ReturnType<typeof useQuery<Partido[]>>;
  onShareResultado: (p: Partido) => void;
  onShareEncuentro: (p: Partido) => void;
}) {
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
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right font-medium">{equipoLabel(p.equipoLocal)}</div>
                      <div className="px-3 py-1 rounded-md bg-muted font-bold tabular-nums min-w-[3.5rem] text-center">
                        {p.resultado ? `${p.resultado.golesLocal} - ${p.resultado.golesVisitante}` : 'vs'}
                      </div>
                      <div className="flex-1 font-medium">{equipoLabel(p.equipoVisitante)}</div>
                      <Badge variant={cerrado ? 'success' : 'secondary'} className="shrink-0">
                        {cerrado ? 'Final' : p.estado}
                      </Badge>
                      {cerrado && p.resultado ? (
                        <button
                          onClick={() => onShareResultado(p)}
                          title="Imagen del resultado para redes"
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Imagen
                        </button>
                      ) : p.estado !== 'cancelado' && (
                        <button
                          onClick={() => onShareEncuentro(p)}
                          title="Imagen del próximo partido para redes"
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Anunciar
                        </button>
                      )}
                    </div>
                    {(p.fechaProgramada || p.sede || p.cancha || p.arbitro) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {p.fechaProgramada && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(p.fechaProgramada).toLocaleDateString()}{p.horaProgramada ? ` ${p.horaProgramada}` : ''}
                          </span>
                        )}
                        {p.sede && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{p.sede.nombre}</span>}
                        {p.cancha && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.cancha}</span>}
                        {p.arbitro && <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{p.arbitro.nombre}</span>}
                      </div>
                    )}
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
