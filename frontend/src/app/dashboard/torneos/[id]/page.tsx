'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Trophy, Users, Shield, Calendar, Hash, MapPin, Play, Pencil, Trash2, RefreshCw, Clock, FileText,
  Target, Award, AlertTriangle, ListChecks, ArrowLeft, Download, Printer, Swords, Flag, Building2, Settings2,
} from 'lucide-react';
import { api, getApiErrorMessage, downloadFile } from '@/lib/api';
import { useBranding } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormModal, FieldDef } from '@/components/form-modal';
import { ResultadoModal } from '@/components/dashboard/resultado-modal';

type Partido = {
  id: string;
  jornada: number | null;
  etapaEliminatoria: string | null;
  esIda: boolean;
  equipoLocalId: string;
  equipoVisitanteId: string;
  fechaProgramada: string | null;
  horaProgramada: string | null;
  cancha: string | null;
  arbitroId: string | null;
  sedeId: string | null;
  arbitro: { id: string; nombre: string } | null;
  sede: { id: string; nombre: string } | null;
  estado: 'borrador' | 'programado' | 'en_juego' | 'finalizado' | 'suspendido' | 'reprogramado' | 'cancelado';
  observaciones: string | null;
  grupo: { id: string; nombre: string } | null;
  fase: { id: string; nombre: string; tipo: string } | null;
  resultado: { golesLocal: number; golesVisitante: number; cerrado: boolean } | null;
  reprogramaciones: any[];
};

type Torneo = {
  id: string;
  nombre: string;
  formato: string;
  puntosVictoria: number;
  puntosEmpate: number;
  puntosDerrota: number;
  criterioDesempate: string;
  permiteReprogramacion: boolean;
  estado: string;
  temporada: { id: string; nombre: string; anio: number };
  categoria: { id: string; nombre: string };
  inscripciones: { id: string; equipo: { id: string; nombre: string; club: { nombre: string } } }[];
  fases: any[];
};

const FORMATO_LABEL: Record<string, string> = {
  todos_contra_todos: 'Todos contra todos',
  ida_y_vuelta: 'Ida y vuelta',
  triangular: 'Triangular',
  cuadrangular: 'Cuadrangular',
  hexagonal: 'Hexagonal',
  liguilla: 'Liguilla',
  eliminacion_directa: 'Eliminación directa',
  doble_eliminacion: 'Doble eliminación',
  grupos: 'Grupos',
  grupos_y_eliminacion: 'Grupos + eliminación',
};

const estadoBadge: Record<string, any> = {
  borrador: 'secondary',
  programado: 'success',
  en_juego: 'warning',
  finalizado: 'success',
  suspendido: 'warning',
  reprogramado: 'warning',
  cancelado: 'destructive',
};

export default function TorneoDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params?.id as string;
  // Slug de la liga para la vista pública imprimible (las rutas /publico llevan slug).
  const { data: branding } = useBranding();
  const reporteHref = branding?.slug ? `/publico/${branding.slug}/torneos/${id}/reporte` : '/publico';
  const [generarOpen, setGenerarOpen] = React.useState(false);
  const [reprogramarFor, setReprogramarFor] = React.useState<Partido | null>(null);
  const [editarFor, setEditarFor] = React.useState<Partido | null>(null);
  const [resultadoFor, setResultadoFor] = React.useState<Partido | null>(null);
  const [avanzarOpen, setAvanzarOpen] = React.useState(false);
  const [ganadoresPick, setGanadoresPick] = React.useState<Record<string, string>>({});

  const { data: torneo, isLoading, refetch } = useQuery<Torneo>({
    queryKey: ['torneo', id],
    queryFn: () => api.get(`/torneos/${id}`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: partidos = [] } = useQuery<Partido[]>({
    queryKey: ['partidos-torneo', id],
    queryFn: () => api.get(`/torneos/${id}/partidos`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: arbitros = [] } = useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['arbitros'],
    queryFn: () => api.get('/arbitros').then((r) => r.data),
  });
  const { data: sedes = [] } = useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['sedes'],
    queryFn: () => api.get('/sedes').then((r) => r.data),
  });
  const { data: tabla = [] } = useQuery<any[]>({
    queryKey: ['tabla-torneo', id],
    queryFn: () => api.get(`/resultados/torneo/${id}/tabla`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: goleadores = [] } = useQuery<any[]>({
    queryKey: ['goleadores-torneo', id],
    queryFn: () => api.get(`/resultados/torneo/${id}/goleadores`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: tarjetas = [] } = useQuery<any[]>({
    queryKey: ['tarjetas-torneo', id],
    queryFn: () => api.get(`/resultados/torneo/${id}/tarjetas`).then((r) => r.data),
    enabled: !!id,
  });
  const { data: sanciones = [] } = useQuery<any[]>({
    queryKey: ['sanciones-torneo', id],
    queryFn: () => api.get(`/resultados/torneo/${id}/sanciones`).then((r) => r.data),
    enabled: !!id,
  });

  const generarFixture = useMutation({
    mutationFn: (data: any) => api.post(`/torneos/${id}/generar-fixture`, data).then((r) => r.data),
    onSuccess: (res) => {
      alert(`Fixture generado: ${res.totalPartidos} partido(s). ${res.warnings?.length ? 'Avisos: ' + res.warnings.join(' / ') : ''}`);
      qc.invalidateQueries({ queryKey: ['torneo', id] });
      qc.invalidateQueries({ queryKey: ['partidos-torneo', id] });
      setGenerarOpen(false);
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const reprogramar = useMutation({
    mutationFn: ({ partidoId, data }: { partidoId: string; data: any }) =>
      api.post(`/partidos/${partidoId}/reprogramar`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partidos-torneo', id] });
      qc.invalidateQueries({ queryKey: ['torneo', id] });
      setReprogramarFor(null);
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const editarPartido = useMutation({
    mutationFn: ({ partidoId, data }: { partidoId: string; data: any }) =>
      api.patch(`/partidos/${partidoId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partidos-torneo', id] });
      qc.invalidateQueries({ queryKey: ['torneo', id] });
      setEditarFor(null);
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const eliminarPartido = useMutation({
    mutationFn: (partidoId: string) => api.delete(`/partidos/${partidoId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partidos-torneo', id] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const updateSancion = useMutation({
    mutationFn: ({ id: sid, data }: { id: string; data: any }) =>
      api.patch(`/resultados/sanciones/${sid}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sanciones-torneo', id] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const refrescarTorneo = () => {
    qc.invalidateQueries({ queryKey: ['torneo', id] });
    qc.invalidateQueries({ queryKey: ['partidos-torneo', id] });
  };
  const generarEliminatorias = useMutation({
    mutationFn: () => api.post(`/torneos/${id}/generar-eliminatorias`, {}).then((r) => r.data),
    onSuccess: (res) => { alert(`Eliminatorias generadas: ${res.etapa}.`); refrescarTorneo(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const avanzarEliminatoria = useMutation({
    mutationFn: (ganadores: Record<string, string>) =>
      api.post(`/torneos/${id}/avanzar-eliminatoria`, { ganadores }).then((r) => r.data),
    onSuccess: (res) => {
      alert(res.campeonId ? '🏆 ' + (res.mensaje ?? 'Hay campeón.') : `Siguiente ronda: ${res.etapa}.`);
      setAvanzarOpen(false);
      refrescarTorneo();
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  if (isLoading) return <div className="text-muted-foreground">Cargando torneo…</div>;
  if (!torneo) return <div className="text-destructive">No se encontró el torneo.</div>;

  // Agrupar los partidos en secciones según su naturaleza (no según el formato del torneo),
  // así un torneo de grupos+eliminación muestra cada grupo por separado y las llaves por etapa.
  const secciones: { nombre: string; orden: number; partidos: Partido[] }[] = [];
  const seccionIdx = new Map<string, { nombre: string; orden: number; partidos: Partido[] }>();
  const seccion = (key: string, nombre: string, orden: number) => {
    let s = seccionIdx.get(key);
    if (!s) { s = { nombre, orden, partidos: [] }; seccionIdx.set(key, s); secciones.push(s); }
    return s;
  };
  for (const p of partidos) {
    if (p.grupo) {
      seccion(`g:${p.grupo.nombre}`, `Grupo ${p.grupo.nombre}`, 0).partidos.push(p);
    } else if (p.etapaEliminatoria) {
      // las etapas van después de los grupos, ordenadas por su jornada (avance del bracket)
      seccion(`e:${p.etapaEliminatoria}`, p.etapaEliminatoria, 1000 + (p.jornada ?? 0)).partidos.push(p);
    } else {
      seccion(`j:${p.jornada ?? 0}`, `Jornada ${p.jornada ?? 0}`, p.jornada ?? 0).partidos.push(p);
    }
  }
  secciones.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
  for (const s of secciones) s.partidos.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0));
  const grupos = secciones;

  const equipoMap = new Map(torneo.inscripciones.map((i) => [i.equipo.id, i.equipo]));
  const nombreEquipo = (eid: string) => equipoMap.get(eid)?.nombre ?? '—';

  // --- Estado de la eliminación (group → knockout) ---
  const esGruposElim = torneo.formato === 'grupos_y_eliminacion';
  const partidosGrupo = partidos.filter((p) => p.grupo);
  const partidosElim = partidos.filter((p) => p.etapaEliminatoria);
  const gruposCompletos = partidosGrupo.length > 0 && partidosGrupo.every((p) => p.estado === 'finalizado');
  const hayElim = partidosElim.length > 0;
  const puedeGenerarElim = esGruposElim && gruposCompletos && !hayElim;
  const maxJornadaElim = hayElim ? Math.max(...partidosElim.map((p) => p.jornada ?? 0)) : 0;
  const rondaActualElim = partidosElim.filter((p) => (p.jornada ?? 0) === maxJornadaElim);
  const rondaActualCompleta = hayElim && rondaActualElim.every((p) => p.estado === 'finalizado');
  const esFinalJugada = rondaActualCompleta && rondaActualElim.length === 1;
  const puedeAvanzar = rondaActualCompleta;
  const llavesEmpatadas = rondaActualElim.filter(
    (p) => p.resultado && p.resultado.golesLocal === p.resultado.golesVisitante,
  );
  const onAvanzar = () => {
    if (llavesEmpatadas.length > 0) { setGanadoresPick({}); setAvanzarOpen(true); }
    else avanzarEliminatoria.mutate({});
  };

  const generarFields: FieldDef[] = [
    { name: 'fechaInicio', label: 'Fecha de inicio (opcional)', type: 'date' },
    { name: 'horaDefault', label: 'Hora por defecto (HH:mm)', placeholder: '15:00' },
    { name: 'diasEntreJornadas', label: 'Días entre jornadas', type: 'number' },
  ];
  if (torneo.formato === 'grupos' || torneo.formato === 'grupos_y_eliminacion') {
    generarFields.splice(0, 0, { name: 'cantidadGrupos', label: 'Cantidad de grupos', type: 'number' });
  }
  if (torneo.formato === 'grupos_y_eliminacion') {
    generarFields.splice(1, 0, { name: 'clasificadosPorGrupo', label: 'Clasificados por grupo (1 o 2)', type: 'number' });
  }
  if (torneo.formato === 'grupos') {
    generarFields.push({ name: 'gruposIdaVuelta', label: 'Ida y vuelta en grupos', type: 'checkbox' });
  }

  const reprogramarFields: FieldDef[] = [
    { name: 'motivo', label: 'Motivo (obligatorio)', required: true, type: 'textarea' },
    { name: 'fechaProgramada', label: 'Nueva fecha', type: 'date' },
    { name: 'horaProgramada', label: 'Nueva hora (HH:mm)', placeholder: '15:00' },
    { name: 'cancha', label: 'Nueva cancha' },
  ];

  const editarFields: FieldDef[] = [
    { name: 'sedeId', label: 'Sede', type: 'select', options: sedes.map((s) => ({ value: s.id, label: s.nombre })) },
    { name: 'arbitroId', label: 'Árbitro', type: 'select', options: arbitros.map((a) => ({ value: a.id, label: a.nombre })) },
    { name: 'cancha', label: 'Cancha / detalle (opcional)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/torneos')} className="mb-2">
          <ArrowLeft className="h-4 w-4" /> Torneos
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" /> {torneo.nombre}
            </h1>
            <p className="text-muted-foreground text-sm">
              {torneo.temporada.nombre} ({torneo.temporada.anio}) · Categoría <Badge className="ml-1">{torneo.categoria.nombre}</Badge>
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm">
              <Badge variant="outline">{FORMATO_LABEL[torneo.formato] || torneo.formato}</Badge>
              <Badge variant="secondary">Puntos: {torneo.puntosVictoria} / {torneo.puntosEmpate} / {torneo.puntosDerrota}</Badge>
              <Badge variant="secondary">Desempate: {torneo.criterioDesempate}</Badge>
              <Badge variant={torneo.estado === 'en_curso' ? 'success' : 'secondary'}>
                {torneo.estado}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" /> Recargar
            </Button>
            <Button
              onClick={() => setGenerarOpen(true)}
              disabled={torneo.inscripciones.length < 2}
            >
              <Play className="h-4 w-4" /> {partidos.length > 0 ? 'Regenerar fixture' : 'Generar fixture'}
            </Button>
          </div>
        </div>
      </div>

      {/* Exportar / Reportes */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
        <span className="text-xs font-medium text-muted-foreground px-1 inline-flex items-center gap-1">
          <Download className="h-3.5 w-3.5" /> Exportar CSV:
        </span>
        {[
          { key: 'tabla', label: 'Posiciones' },
          { key: 'goleadores', label: 'Goleadores' },
          { key: 'tarjetas', label: 'Tarjetas' },
          { key: 'fixture', label: 'Fixture' },
        ].map((r) => (
          <Button
            key={r.key}
            variant="outline"
            size="sm"
            onClick={() =>
              downloadFile(`/reportes/torneos/${params.id}/${r.key}.csv`, `${r.key}-${params.id}.csv`)
                .catch((e) => alert(getApiErrorMessage(e)))
            }
          >
            {r.label}
          </Button>
        ))}
        <Link href={reporteHref} target="_blank" className="ml-auto">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4" /> Vista imprimible (PDF)
          </Button>
        </Link>
      </div>

      {/* Tabs / Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-4 w-4" /> Equipos inscritos</CardTitle>
            <CardDescription>{torneo.inscripciones.length} equipo(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {torneo.inscripciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay equipos inscritos.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {torneo.inscripciones.map((i) => (
                  <Badge key={i.id} variant="secondary" className="text-sm">
                    {i.equipo.nombre} <span className="text-muted-foreground ml-1">· {i.equipo.club.nombre}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Target className="h-4 w-4" /> Partidos</CardTitle>
            <CardDescription>
              {partidos.length} totales · {partidos.filter(p => p.estado === 'finalizado').length} finalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Programados</span><span className="font-semibold">{partidos.filter(p => p.estado === 'programado').length}</span></div>
            <div className="flex justify-between"><span>En juego</span><span className="font-semibold">{partidos.filter(p => p.estado === 'en_juego').length}</span></div>
            <div className="flex justify-between"><span>Suspendidos</span><span className="font-semibold">{partidos.filter(p => p.estado === 'suspendido').length}</span></div>
            <div className="flex justify-between"><span>Reprogramados</span><span className="font-semibold">{partidos.filter(p => p.estado === 'reprogramado').length}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Sanciones</CardTitle>
            <CardDescription>{sanciones.length} registrada(s)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Pendientes</span><span className="font-semibold text-amber-600">{sanciones.filter(s => s.estado === 'pendiente').length}</span></div>
            <div className="flex justify-between"><span>Cumplidas</span><span className="font-semibold text-emerald-600">{sanciones.filter(s => s.estado === 'cumplida').length}</span></div>
            <div className="flex justify-between"><span>Condonadas</span><span className="font-semibold">{sanciones.filter(s => s.estado === 'condonada').length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE POSICIONES */}
      {tabla.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-4 w-4" /> Tabla de posiciones</CardTitle>
            <CardDescription>
              Criterio: {torneo.criterioDesempate} · {tabla.length} equipo(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Equipo</th>
                    <th className="px-3 py-2 text-center">PJ</th>
                    <th className="px-3 py-2 text-center">G</th>
                    <th className="px-3 py-2 text-center">E</th>
                    <th className="px-3 py-2 text-center">P</th>
                    <th className="px-3 py-2 text-center">GF</th>
                    <th className="px-3 py-2 text-center">GC</th>
                    <th className="px-3 py-2 text-center">DG</th>
                    <th className="px-3 py-2 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((fila) => (
                    <tr key={fila.equipoId} className="border-t">
                      <td className="px-3 py-2 font-bold">{fila.posicion}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{fila.equipo?.nombre}</div>
                        <div className="text-xs text-muted-foreground">{fila.equipo?.club?.nombre}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{fila.partidosJugados}</td>
                      <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{fila.ganados}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{fila.empatados}</td>
                      <td className="px-3 py-2 text-center text-destructive">{fila.perdidos}</td>
                      <td className="px-3 py-2 text-center">{fila.golesFavor}</td>
                      <td className="px-3 py-2 text-center">{fila.golesContra}</td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {fila.diferenciaGoles > 0 ? '+' : ''}{fila.diferenciaGoles}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-lg">{fila.puntos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GOLEADORES + TARJETAS */}
      {(goleadores.length > 0 || tarjetas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goleadores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-4 w-4" /> Goleadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {goleadores.slice(0, 10).map((g: any, i: number) => (
                    <div key={g.jugadorId} className="flex items-center justify-between border-b last:border-0 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6">{i + 1}.</span>
                        <div>
                          <div className="font-medium">{g.jugador ? `${g.jugador.apellidos}, ${g.jugador.nombres}` : 'Jugador'}</div>
                          <div className="text-xs text-muted-foreground">{g.equipo?.nombre || ''}</div>
                        </div>
                      </div>
                      <Badge variant="success">{g.goles} gol(es)</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tarjetas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Award className="h-4 w-4" /> Tarjetas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {tarjetas.slice(0, 10).map((t: any, i: number) => (
                    <div key={t.jugadorId} className="flex items-center justify-between border-b last:border-0 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6">{i + 1}.</span>
                        <div>
                          <div className="font-medium">{t.jugador ? `${t.jugador.apellidos}, ${t.jugador.nombres}` : 'Jugador'}</div>
                          <div className="text-xs text-muted-foreground">{t.equipo?.nombre || ''}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {t.amarillas > 0 && <Badge variant="warning" className="bg-amber-200 text-amber-900">{t.amarillas}A</Badge>}
                        {t.rojas > 0 && <Badge variant="destructive">{t.rojas}R</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* FIXTURE */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-4 w-4" /> Fixture</CardTitle>
              <CardDescription>
                {partidos.length === 0
                  ? 'Aún no se generó el fixture. Hacé clic en "Generar fixture".'
                  : `${partidos.length} partido(s) en ${grupos.length} sección(es).`}
              </CardDescription>
            </div>
            {esGruposElim && (
              <div className="flex flex-col items-end gap-1">
                {puedeGenerarElim && (
                  <Button size="sm" onClick={() => generarEliminatorias.mutate()} disabled={generarEliminatorias.isPending}>
                    <Swords className="h-4 w-4" /> Generar eliminatorias
                  </Button>
                )}
                {hayElim && puedeAvanzar && (
                  <Button size="sm" onClick={onAvanzar} disabled={avanzarEliminatoria.isPending}>
                    <Swords className="h-4 w-4" /> {esFinalJugada ? 'Definir campeón' : 'Generar siguiente ronda'}
                  </Button>
                )}
                {esGruposElim && !gruposCompletos && !hayElim && (
                  <span className="text-xs text-muted-foreground">Completá la fase de grupos para generar las llaves.</span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {grupos.length === 0 ? null : (
            <div className="space-y-4">
              {grupos.map((g) => (
                <div key={g.nombre} className="border rounded-md p-3">
                  <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                    {g.nombre}
                  </h4>
                  <div className="space-y-2">
                    {g.partidos.map((p) => {
                      const local = equipoMap.get(p.equipoLocalId);
                      const visitante = equipoMap.get(p.equipoVisitanteId);
                      const reproCount = p.reprogramaciones?.length || 0;
                      return (
                        <div key={p.id} className="flex items-center gap-2 border rounded-md p-2 bg-muted/30">
                          <div className="flex-1 grid grid-cols-3 gap-2 items-center text-sm">
                            <div className="text-right font-medium">{local?.nombre || 'Local'}</div>
                            <div className="text-center text-muted-foreground">
                              {p.resultado
                                ? <span className="font-bold text-foreground">{p.resultado.golesLocal}–{p.resultado.golesVisitante}</span>
                                : <span className="text-xs">vs</span>}
                            </div>
                            <div className="text-left font-medium">{visitante?.nombre || 'Visitante'}</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {p.fechaProgramada && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(p.fechaProgramada).toLocaleDateString()}
                                {p.horaProgramada && <span className="flex items-center gap-1 ml-1"><Clock className="h-3 w-3" />{p.horaProgramada}</span>}
                              </span>
                            )}
                            {p.sede && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{p.sede.nombre}</span>}
                            {p.cancha && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.cancha}</span>}
                            {p.arbitro && <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{p.arbitro.nombre}</span>}
                            {p.grupo && <Badge variant="outline">Grupo {p.grupo.nombre}</Badge>}
                            <Badge variant={estadoBadge[p.estado] || 'secondary'}>{p.estado}</Badge>
                            {reproCount > 0 && <span className="text-amber-600" title={`${reproCount} reprogramación(es)`}>↻{reproCount}</span>}
                          </div>
                          <div className="flex gap-1">
                            {p.estado !== 'finalizado' && p.estado !== 'cancelado' && (
                              <Button variant="default" size="sm" onClick={() => setResultadoFor(p)}>
                                <Target className="h-3 w-3" /> Resultado
                              </Button>
                            )}
                            {p.estado !== 'cancelado' && (
                              <Button variant="ghost" size="icon" title="Asignar sede / árbitro" onClick={() => setEditarFor(p)}>
                                <Settings2 className="h-3 w-3" />
                              </Button>
                            )}
                            {torneo.permiteReprogramacion && p.estado !== 'finalizado' && (
                              <Button variant="ghost" size="icon" title="Reprogramar" onClick={() => setReprogramarFor(p)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title="Eliminar partido"
                              onClick={() => { if (confirm('¿Eliminar este partido?')) eliminarPartido.mutate(p.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SANCIONES */}
      {sanciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Sanciones del torneo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Motivo</th>
                    <th className="px-3 py-2 text-left">Fechas</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sanciones.map((s: any) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{s.motivo}</Badge>
                      </td>
                      <td className="px-3 py-2">{s.fechasCumplidas} / {s.fechasCumplir}</td>
                      <td className="px-3 py-2">
                        <Badge variant={s.estado === 'pendiente' ? 'warning' : s.estado === 'cumplida' ? 'success' : 'secondary'}>
                          {s.estado}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{s.descripcion}</td>
                      <td className="px-3 py-2 text-right">
                        {s.estado === 'pendiente' && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline"
                              onClick={() => updateSancion.mutate({ id: s.id, data: { estado: 'cumplida', fechasCumplidas: s.fechasCumplir } })}>
                              Cumplida
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => updateSancion.mutate({ id: s.id, data: { estado: 'condonada' } })}>
                              Condonar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fases */}
      {torneo.fases?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fases del torneo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {torneo.fases.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div>
                    <span className="font-medium">#{f.orden} {f.nombre}</span>
                    <span className="text-muted-foreground ml-2">({f.tipo})</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{f._count?.partidos || f.partidos?.length || 0} partidos</Badge>
                    <Badge variant="secondary">{f.grupos?.length || 0} grupos</Badge>
                    <Badge variant={f.estado === 'activa' ? 'success' : f.estado === 'finalizada' ? 'secondary' : 'outline'}>
                      {f.estado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modales */}
      <FormModal
        open={generarOpen}
        title="Generar fixture del torneo"
        fields={generarFields}
        initialValues={{
          diasEntreJornadas: 7,
          ...(['grupos', 'grupos_y_eliminacion'].includes(torneo.formato) ? { cantidadGrupos: 2 } : {}),
        }}
        onClose={() => setGenerarOpen(false)}
        onSubmit={(values) => {
          const v: any = { ...values };
          if (!v.fechaInicio) delete v.fechaInicio;
          if (!v.horaDefault) delete v.horaDefault;
          if (!v.cantidadGrupos) delete v.cantidadGrupos;
          if (!v.clasificadosPorGrupo) delete v.clasificadosPorGrupo;
          return generarFixture.mutateAsync(v);
        }}
      />

      <FormModal
        open={!!reprogramarFor}
        title={reprogramarFor ? `Reprogramar partido` : ''}
        fields={reprogramarFields}
        initialValues={reprogramarFor ? {
          fechaProgramada: reprogramarFor.fechaProgramada?.slice(0, 10) || '',
          horaProgramada: reprogramarFor.horaProgramada || '',
          cancha: reprogramarFor.cancha || '',
        } : undefined}
        onClose={() => setReprogramarFor(null)}
        onSubmit={(values) => {
          if (!reprogramarFor) return Promise.resolve();
          const v: any = { ...values };
          if (!v.fechaProgramada) delete v.fechaProgramada;
          if (!v.horaProgramada) delete v.horaProgramada;
          if (!v.cancha) delete v.cancha;
          return reprogramar.mutateAsync({ partidoId: reprogramarFor.id, data: v });
        }}
      />

      <FormModal
        open={!!editarFor}
        title={editarFor ? 'Asignar sede / árbitro' : ''}
        fields={editarFields}
        initialValues={editarFor ? {
          sedeId: editarFor.sedeId || '',
          arbitroId: editarFor.arbitroId || '',
          cancha: editarFor.cancha || '',
        } : undefined}
        onClose={() => setEditarFor(null)}
        onSubmit={(values) => {
          if (!editarFor) return Promise.resolve();
          const v: any = { ...values };
          // Select vacío ('') = limpiar la asignación → null (el backend lo acepta).
          v.sedeId = v.sedeId || null;
          v.arbitroId = v.arbitroId || null;
          v.cancha = v.cancha ? v.cancha : null;
          return editarPartido.mutateAsync({ partidoId: editarFor.id, data: v });
        }}
      />

      {resultadoFor && (
        <ResultadoModal
          partido={{
            id: resultadoFor.id,
            equipoLocal: equipoMap.get(resultadoFor.equipoLocalId)!,
            equipoVisitante: equipoMap.get(resultadoFor.equipoVisitanteId)!,
            torneoId: id,
          }}
          onClose={() => setResultadoFor(null)}
          onSaved={() => {
            setResultadoFor(null);
            qc.invalidateQueries({ queryKey: ['partidos-torneo', id] });
            qc.invalidateQueries({ queryKey: ['tabla-torneo', id] });
            qc.invalidateQueries({ queryKey: ['goleadores-torneo', id] });
            qc.invalidateQueries({ queryKey: ['tarjetas-torneo', id] });
            qc.invalidateQueries({ queryKey: ['sanciones-torneo', id] });
            qc.invalidateQueries({ queryKey: ['torneo', id] });
          }}
        />
      )}

      {avanzarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg w-full max-w-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Swords className="h-5 w-5" /> Definir quién pasa</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hay llave(s) empatada(s). Elegí el equipo que avanza (penales/repetición) para poder generar la ronda siguiente.
              </p>
            </div>
            <div className="space-y-2">
              {llavesEmpatadas.map((p) => (
                <div key={p.id} className="border rounded-md p-3">
                  <div className="text-sm font-medium mb-2">
                    {nombreEquipo(p.equipoLocalId)} {p.resultado?.golesLocal}–{p.resultado?.golesVisitante} {nombreEquipo(p.equipoVisitanteId)}
                  </div>
                  <div className="flex gap-2">
                    {[p.equipoLocalId, p.equipoVisitanteId].map((eid) => (
                      <Button
                        key={eid}
                        size="sm"
                        variant={ganadoresPick[p.id] === eid ? 'default' : 'outline'}
                        onClick={() => setGanadoresPick({ ...ganadoresPick, [p.id]: eid })}
                      >
                        Pasa {nombreEquipo(eid)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvanzarOpen(false)} disabled={avanzarEliminatoria.isPending}>Cancelar</Button>
              <Button
                onClick={() => avanzarEliminatoria.mutate(ganadoresPick)}
                disabled={avanzarEliminatoria.isPending || llavesEmpatadas.some((p) => !ganadoresPick[p.id])}
              >
                {avanzarEliminatoria.isPending ? 'Avanzando…' : 'Confirmar y avanzar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
