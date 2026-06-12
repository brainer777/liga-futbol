'use client';

import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2, Target } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type EquipoLite = { id: string; nombre: string; club: { nombre: string } };

type EventoTipo = 'gol' | 'gol_en_contra' | 'asistencia' | 'amarilla' | 'roja' | 'doble_amarilla' | 'cambio';

type Evento = {
  id?: string;
  tipo: EventoTipo;
  jugadorId: string;
  equipoId: string;
  minuto?: number;
  observaciones?: string;
};

type Props = {
  partido: {
    id: string;
    equipoLocal: EquipoLite;
    equipoVisitante: EquipoLite;
    torneoId: string;
  };
  onClose: () => void;
  onSaved: () => void;
};

const TIPO_LABEL: Record<EventoTipo, string> = {
  gol: '⚽ Gol',
  gol_en_contra: '🔴 Gol en contra',
  asistencia: '🎯 Asistencia',
  amarilla: '🟨 Amarilla',
  roja: '🟥 Roja directa',
  doble_amarilla: '🟨🟥 Doble amarilla',
  cambio: '🔁 Cambio',
};

export function ResultadoModal({ partido, onClose, onSaved }: Props) {
  const [golesLocal, setGolesLocal] = React.useState(0);
  const [golesVisitante, setGolesVisitante] = React.useState(0);
  const [observaciones, setObservaciones] = React.useState('');
  const [cerrar, setCerrar] = React.useState(true);
  const [eventos, setEventos] = React.useState<Evento[]>([]);
  const [showAddEvento, setShowAddEvento] = React.useState(false);
  const [nuevoEvento, setNuevoEvento] = React.useState<Evento>({
    tipo: 'gol', jugadorId: '', equipoId: partido.equipoLocal.id, minuto: 0,
  });

  // Cargar resultado existente si lo hay
  const { data: resultadoExistente } = useQuery({
    queryKey: ['resultado-partido', partido.id],
    queryFn: () => api.get(`/resultados/partido/${partido.id}`).then((r) => r.data),
  });
  // Cargar plantillas (jugadores por equipo)
  const { data: plantillaLocal = [] } = useQuery<any[]>({
    queryKey: ['plantilla', partido.equipoLocal.id],
    queryFn: () => api.get(`/jugadores/equipo/${partido.equipoLocal.id}/plantilla`).then((r) => r.data),
  });
  const { data: plantillaVisitante = [] } = useQuery<any[]>({
    queryKey: ['plantilla', partido.equipoVisitante.id],
    queryFn: () => api.get(`/jugadores/equipo/${partido.equipoVisitante.id}/plantilla`).then((r) => r.data),
  });

  React.useEffect(() => {
    if (resultadoExistente) {
      setGolesLocal(resultadoExistente.golesLocal ?? 0);
      setGolesVisitante(resultadoExistente.golesVisitante ?? 0);
      setObservaciones(resultadoExistente.observaciones ?? '');
      setEventos(resultadoExistente.eventos || []);
    }
  }, [resultadoExistente]);

  const registrar = useMutation({
    mutationFn: (data: any) => api.post('/resultados', data).then((r) => r.data),
    onSuccess: () => onSaved(),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const agregarEvento = () => {
    if (!nuevoEvento.jugadorId) return alert('Selecciona un jugador');
    if (!nuevoEvento.equipoId) return alert('Selecciona un equipo');
    setEventos([...eventos, { ...nuevoEvento }]);
    setNuevoEvento({ tipo: 'gol', jugadorId: '', equipoId: partido.equipoLocal.id, minuto: 0 });
    setShowAddEvento(false);
  };

  const eliminarEvento = (idx: number) => {
    setEventos(eventos.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    registrar.mutate({
      partidoId: partido.id,
      golesLocal,
      golesVisitante,
      observaciones: observaciones || undefined,
      cerrar,
      eventos: eventos.map((e) => ({
        tipo: e.tipo,
        jugadorId: e.jugadorId,
        equipoId: e.equipoId,
        minuto: e.minuto,
        observaciones: e.observaciones,
      })),
    });
  };

  const jugadoresLocal = plantillaLocal.map((p: any) => p.jugador);
  const jugadoresVisitante = plantillaVisitante.map((p: any) => p.jugador);
  const jugadoresDisponibles = nuevoEvento.equipoId === partido.equipoLocal.id
    ? jugadoresLocal
    : jugadoresVisitante;

  // Calcular goles desde eventos (goles + goles en contra)
  const golesEventosLocal = eventos.filter((e) => e.tipo === 'gol' && e.equipoId === partido.equipoLocal.id).length
    + eventos.filter((e) => e.tipo === 'gol_en_contra' && e.equipoId === partido.equipoVisitante.id).length;
  const golesEventosVisitante = eventos.filter((e) => e.tipo === 'gol' && e.equipoId === partido.equipoVisitante.id).length
    + eventos.filter((e) => e.tipo === 'gol_en_contra' && e.equipoId === partido.equipoLocal.id).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-card z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" /> Registrar resultado
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Marcador */}
          <div>
            <h3 className="font-semibold mb-3">Marcador final</h3>
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{partido.equipoLocal.club.nombre}</div>
                <div className="font-bold text-lg">{partido.equipoLocal.nombre}</div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  className="h-9 w-9 rounded-md border bg-background hover:bg-accent text-xl font-bold"
                  onClick={() => setGolesLocal(Math.max(0, golesLocal - 1))}
                >−</button>
                <input
                  type="number" min={0} max={99}
                  className="h-12 w-16 text-center text-2xl font-bold rounded-md border bg-background"
                  value={golesLocal}
                  onChange={(e) => setGolesLocal(Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  className="h-9 w-9 rounded-md border bg-background hover:bg-accent text-xl font-bold"
                  onClick={() => setGolesLocal(golesLocal + 1)}
                >+</button>
                <span className="text-2xl text-muted-foreground">:</span>
                <button
                  className="h-9 w-9 rounded-md border bg-background hover:bg-accent text-xl font-bold"
                  onClick={() => setGolesVisitante(Math.max(0, golesVisitante - 1))}
                >−</button>
                <input
                  type="number" min={0} max={99}
                  className="h-12 w-16 text-center text-2xl font-bold rounded-md border bg-background"
                  value={golesVisitante}
                  onChange={(e) => setGolesVisitante(Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  className="h-9 w-9 rounded-md border bg-background hover:bg-accent text-xl font-bold"
                  onClick={() => setGolesVisitante(golesVisitante + 1)}
                >+</button>
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">{partido.equipoVisitante.club.nombre}</div>
                <div className="font-bold text-lg">{partido.equipoVisitante.nombre}</div>
              </div>
            </div>
            {(golesLocal !== golesEventosLocal || golesVisitante !== golesEventosVisitante) && (
              <p className="text-xs text-amber-600 mt-2 text-center">
                ⚠️ Los goles del marcador ({golesLocal}-{golesVisitante}) no coinciden con los eventos ({golesEventosLocal}-{golesEventosVisitante}).
                Ajustá uno u otros antes de cerrar.
              </p>
            )}
          </div>

          {/* Eventos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Eventos del partido</h3>
              <Button size="sm" onClick={() => setShowAddEvento(true)}>
                <Plus className="h-3 w-3" /> Agregar evento
              </Button>
            </div>
            {eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                Sin eventos registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {eventos.map((e, i) => {
                  const jugador = (e.equipoId === partido.equipoLocal.id ? jugadoresLocal : jugadoresVisitante)
                    .find((j: any) => j.id === e.jugadorId);
                  return (
                    <div key={i} className="flex items-center gap-2 border rounded-md p-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground w-8">{e.minuto || '—}'</span>
                      <Badge variant={
                        e.tipo === 'gol' || e.tipo === 'asistencia' ? 'success' :
                        e.tipo === 'amarilla' ? 'warning' :
                        e.tipo === 'roja' || e.tipo === 'doble_amarilla' ? 'destructive' : 'secondary'
                      }>
                        {TIPO_LABEL[e.tipo]}
                      </Badge>
                      <span className="flex-1">
                        {jugador ? `${jugador.apellidos}, ${jugador.nombres}` : 'Jugador'}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({e.equipoId === partido.equipoLocal.id ? partido.equipoLocal.nombre : partido.equipoVisitante.nombre})
                        </span>
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => eliminarEvento(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {showAddEvento && (
              <div className="mt-3 border rounded-md p-3 bg-muted/30 space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <select
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={nuevoEvento.tipo}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo: e.target.value as EventoTipo })}
                  >
                    {Object.entries(TIPO_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={nuevoEvento.equipoId}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, equipoId: e.target.value, jugadorId: '' })}
                  >
                    <option value={partido.equipoLocal.id}>{partido.equipoLocal.nombre}</option>
                    <option value={partido.equipoVisitante.id}>{partido.equipoVisitante.nombre}</option>
                  </select>
                  <select
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm col-span-2"
                    value={nuevoEvento.jugadorId}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, jugadorId: e.target.value })}
                  >
                    <option value="">Seleccionar jugador…</option>
                    {jugadoresDisponibles.map((j: any) => (
                      <option key={j.id} value={j.id}>
                        {j.apellidos}, {j.nombres} {j.numeroDocumento ? `(${j.numeroDocumento})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" min={0} max={130} placeholder="Minuto"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={nuevoEvento.minuto ?? ''}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, minuto: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                  <input
                    type="text" placeholder="Observaciones (opcional)"
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={nuevoEvento.observaciones ?? ''}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, observaciones: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={agregarEvento}>Agregar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddEvento(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones + cerrar */}
          <div>
            <h3 className="font-semibold mb-2">Observaciones</h3>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre el partido…"
            />
          </div>

          <div className="flex items-center gap-2 border rounded-md p-3 bg-muted/30">
            <input
              id="cerrar"
              type="checkbox"
              checked={cerrar}
              onChange={(e) => setCerrar(e.target.checked)}
            />
            <label htmlFor="cerrar" className="text-sm">
              <strong>Cerrar resultado y finalizar el partido</strong>
              <p className="text-xs text-muted-foreground">
                Recalcula tabla de posiciones, estadísticas de jugadores y aplica sanciones automáticas.
              </p>
            </label>
          </div>
        </div>

        <div className="p-6 border-t sticky bottom-0 bg-card flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={registrar.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={registrar.isPending}>
            {registrar.isPending ? 'Guardando…' : (cerrar ? 'Registrar y cerrar' : 'Registrar (sin cerrar)')}
          </Button>
        </div>
      </div>
    </div>
  );
}
