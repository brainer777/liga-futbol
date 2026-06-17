'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Target, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

type ClubSeguro = { nombre?: string; sigla?: string | null; logoUrl?: string | null } | null;
type EquipoSeguro = { id?: string; nombre: string; club?: ClubSeguro } | null;
type Jugador = { nombres: string; apellidos: string } | null;

type Resumen = {
  torneos: number; partidos: number; goles: number;
  amarillas: number; rojas: number; equipos: number; jugadores: number;
};
type Goleador = { posicion: number; goles: number; partidos: number; jugador: Jugador; equipo: EquipoSeguro };
type Tarjeta = { posicion: number; amarillas: number; rojas: number; jugador: Jugador; equipo: EquipoSeguro };
type FilaEquipo = {
  posicion: number; torneos: number; partidosJugados: number;
  victorias: number; empates: number; derrotas: number;
  golesFavor: number; golesContra: number; diferenciaGoles: number; puntos: number;
  equipo: EquipoSeguro;
};

const TABS = [
  { key: 'equipos', label: 'Posiciones', icon: ListChecks },
  { key: 'goleadores', label: 'Goleadores', icon: Target },
  { key: 'tarjetas', label: 'Tarjetas', icon: AlertTriangle },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function equipoLabel(e: EquipoSeguro): string {
  return e?.nombre ?? '—';
}
function jugadorLabel(j: Jugador): string {
  return j ? `${j.apellidos}, ${j.nombres}` : '—';
}

/**
 * Vista de estadísticas globales (acumulado de todos los torneos). Se usa tanto
 * en el portal público como en el dashboard; lo único que cambia es de qué
 * endpoint lee:
 *  - `basePath`: prefijo de los endpoints (`/publico/estadisticas` o `/estadisticas`).
 *  - `scope`: namespace para el queryKey, así no se pisan las cachés entre ambos.
 */
export function EstadisticasGlobales({ basePath, scope }: { basePath: string; scope: string }) {
  const [tab, setTab] = React.useState<TabKey>('equipos');

  const resumen = useQuery<Resumen>({
    queryKey: [scope, 'estadisticas', 'resumen'],
    queryFn: () => api.get(`${basePath}/resumen`).then((r) => r.data),
  });
  const equipos = useQuery<FilaEquipo[]>({
    queryKey: [scope, 'estadisticas', 'equipos'],
    queryFn: () => api.get(`${basePath}/equipos`).then((r) => r.data),
  });
  const goleadores = useQuery<Goleador[]>({
    queryKey: [scope, 'estadisticas', 'goleadores'],
    queryFn: () => api.get(`${basePath}/goleadores`).then((r) => r.data),
  });
  const tarjetas = useQuery<Tarjeta[]>({
    queryKey: [scope, 'estadisticas', 'tarjetas'],
    queryFn: () => api.get(`${basePath}/tarjetas`).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <ResumenCards q={resumen} />

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

      {tab === 'equipos' && <EquiposView q={equipos} />}
      {tab === 'goleadores' && <GoleadoresView q={goleadores} />}
      {tab === 'tarjetas' && <TarjetasView q={tarjetas} />}
    </div>
  );
}

const KPIS: { key: keyof Resumen; label: string }[] = [
  { key: 'torneos', label: 'Torneos' },
  { key: 'equipos', label: 'Equipos' },
  { key: 'jugadores', label: 'Jugadores' },
  { key: 'partidos', label: 'Partidos' },
  { key: 'goles', label: 'Goles' },
  { key: 'amarillas', label: 'Amarillas' },
  { key: 'rojas', label: 'Rojas' },
];

function ResumenCards({ q }: { q: ReturnType<typeof useQuery<Resumen>> }) {
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando estadísticas…</p>;
  if (q.isError) return <p className="text-sm text-destructive">No se pudieron cargar las estadísticas.</p>;
  const d = q.data;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {KPIS.map((k) => (
        <Card key={k.key}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{d?.[k.key] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Estado({ q, vacio }: { q: { isLoading: boolean; isError: boolean; data?: unknown[] }; vacio: string }) {
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (q.isError) return <p className="text-sm text-destructive">No se pudo cargar.</p>;
  if (!q.data || q.data.length === 0) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return null;
}

function EquiposView({ q }: { q: ReturnType<typeof useQuery<FilaEquipo[]>> }) {
  if (q.isLoading || q.isError || !q.data?.length)
    return <Estado q={q} vacio="Todavía no hay partidos jugados." />;
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
            <tr key={f.equipo?.id ?? f.posicion} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{f.posicion}</td>
              <td className="px-3 py-2 font-medium">{equipoLabel(f.equipo)}</td>
              <td className="text-center px-2 py-2">{f.partidosJugados}</td>
              <td className="text-center px-2 py-2">{f.victorias}</td>
              <td className="text-center px-2 py-2">{f.empates}</td>
              <td className="text-center px-2 py-2">{f.derrotas}</td>
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
  if (q.isLoading || q.isError || !q.data?.length)
    return <Estado q={q} vacio="Todavía no hay goles registrados." />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 w-8">#</th>
            <th className="text-left px-3 py-2">Jugador</th>
            <th className="text-left px-3 py-2">Equipo</th>
            <th className="text-center px-2 py-2 w-12">PJ</th>
            <th className="text-center px-3 py-2 w-16">Goles</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((g) => (
            <tr key={g.posicion} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{g.posicion}</td>
              <td className="px-3 py-2 font-medium">{jugadorLabel(g.jugador)}</td>
              <td className="px-3 py-2">{equipoLabel(g.equipo)}</td>
              <td className="text-center px-2 py-2 text-muted-foreground">{g.partidos}</td>
              <td className="text-center px-3 py-2 font-bold">{g.goles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TarjetasView({ q }: { q: ReturnType<typeof useQuery<Tarjeta[]>> }) {
  if (q.isLoading || q.isError || !q.data?.length)
    return <Estado q={q} vacio="Sin amonestaciones registradas." />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 w-8">#</th>
            <th className="text-left px-3 py-2">Jugador</th>
            <th className="text-left px-3 py-2">Equipo</th>
            <th className="text-center px-2 py-2 w-16">🟨</th>
            <th className="text-center px-2 py-2 w-16">🟥</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((t) => (
            <tr key={t.posicion} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{t.posicion}</td>
              <td className="px-3 py-2 font-medium">{jugadorLabel(t.jugador)}</td>
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
