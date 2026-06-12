'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Trash2, Eye, Upload, FileText, Check, X, UserMinus,
} from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';

type Documento = {
  id: string; tipoDocumento: string; archivoUrl: string; nombreArchivo?: string;
  tipoArchivo?: string; tamanoBytes?: number; estado: 'pendiente' | 'aprobado' | 'rechazado' | 'vencido';
  observaciones?: string; createdAt: string; validadoEn?: string;
};

type EquipoVinculado = {
  id: string;
  equipoId: string;
  jugadorId: string;
  dorsal?: number;
  posicion?: string;
  estadoHabilitacion: 'pendiente' | 'habilitado' | 'observado' | 'rechazado' | 'suspendido';
  motivoObservacion?: string;
  equipo: { id: string; nombre: string; club: { nombre: string }; categoria: { nombre: string } };
};

type Jugador = {
  id: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  anioNacimiento?: number | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  estadoValidacion: 'pendiente' | 'habilitado' | 'observado' | 'rechazado' | 'suspendido';
  documentos: Documento[];
  equipos: EquipoVinculado[];
};

const TIPO_DOC_LABEL: Record<string, string> = {
  cedula: 'Cédula',
  dni: 'DNI',
  pasaporte: 'Pasaporte',
  partida_nacimiento: 'Partida de nacimiento',
  foto: 'Foto',
  autorizacion: 'Autorización',
  otro: 'Otro',
};

const estadoColor: Record<string, any> = {
  habilitado: 'success',
  pendiente: 'warning',
  observado: 'warning',
  rechazado: 'destructive',
  suspendido: 'destructive',
};

export default function JugadoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Jugador | null>(null);
  const [detail, setDetail] = React.useState<Jugador | null>(null);
  const [search, setSearch] = React.useState('');

  const { data: items = [], isLoading } = useQuery<Jugador[]>({
    queryKey: ['jugadores'],
    queryFn: () => api.get('/jugadores').then((r) => r.data),
  });
  const { data: categorias = [] } = useQuery<any[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });
  const { data: equipos = [] } = useQuery<any[]>({
    queryKey: ['equipos'],
    queryFn: () => api.get('/equipos').then((r) => r.data),
  });

  const filtered = React.useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(
      (j) =>
        `${j.nombres} ${j.apellidos}`.toLowerCase().includes(s) ||
        (j.numeroDocumento || '').includes(s),
    );
  }, [items, search]);

  const fields: FieldDef[] = [
    { name: 'nombres', label: 'Nombres', required: true },
    { name: 'apellidos', label: 'Apellidos', required: true },
    { name: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
    { name: 'anioNacimiento', label: 'Año de nacimiento (sólo si no hay cédula)', type: 'number' },
    { name: 'tipoDocumento', label: 'Tipo de documento', type: 'select', options: [
      { value: '', label: '— Sin documento —' },
      { value: 'DNI', label: 'DNI' },
      { value: 'CI', label: 'Cédula (CI)' },
      { value: 'Pasaporte', label: 'Pasaporte' },
      { value: 'Registro civil', label: 'Registro civil' },
      { value: 'Otro', label: 'Otro' },
    ] },
    { name: 'numeroDocumento', label: 'Número de documento' },
    { name: 'categoriaId', label: 'Categoría para validar edad al crear', type: 'select',
      options: categorias.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
  ];

  const create = useMutation({
    mutationFn: (data: any) => {
      // si no se eligió tipo documento, lo limpiamos
      if (!data.tipoDocumento) {
        delete data.tipoDocumento;
        delete data.numeroDocumento;
      }
      if (!data.anioNacimiento) delete data.anioNacimiento;
      return api.post('/jugadores', data).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      if (!data.tipoDocumento) {
        delete data.tipoDocumento;
        delete data.numeroDocumento;
      }
      return api.patch(`/jugadores/${id}`, data).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/jugadores/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jugadores'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  // Documentos
  const subirDocumento = useMutation({
    mutationFn: async ({ jugadorId, file, tipoDocumento }: { jugadorId: string; file: File; tipoDocumento: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      const up = await api.post(`/uploads?subfolder=documentos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return api.post('/jugadores/documentos', {
        jugadorId,
        tipoDocumento,
        archivoUrl: up.data.url,
        nombreArchivo: up.data.filename,
        tipoArchivo: up.data.mimetype,
        tamanoBytes: up.data.size,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jugadores'] });
      refreshDetail();
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const cambiarEstadoDoc = useMutation({
    mutationFn: ({ id, estado, observaciones }: { id: string; estado: string; observaciones?: string }) =>
      api.patch(`/jugadores/documentos/${id}`, { estado, observaciones }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); refreshDetail(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const eliminarDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/jugadores/documentos/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); refreshDetail(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  // Vincular a equipo
  const agregarAEquipo = useMutation({
    mutationFn: (data: any) => api.post('/jugadores/equipo-jugador', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); refreshDetail(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const quitarDeEquipo = useMutation({
    mutationFn: (id: string) => api.delete(`/jugadores/equipo-jugador/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); refreshDetail(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const cambiarHab = useMutation({
    mutationFn: ({ id, estadoHabilitacion }: { id: string; estadoHabilitacion: string }) =>
      api.patch(`/jugadores/equipo-jugador/${id}`, { estadoHabilitacion }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jugadores'] }); refreshDetail(); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const refreshDetail = async () => {
    if (!detail) return;
    const fresh = await api.get(`/jugadores/${detail.id}`).then((r) => r.data);
    setDetail(fresh);
  };

  const calcularEdad = (fecha: string) => {
    const fn = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fn.getFullYear();
    const m = hoy.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
    return edad;
  };

  const columns: ColumnDef<Jugador, any>[] = [
    {
      id: 'nombre', header: 'Jugador',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.apellidos}, {row.original.nombres}</div>
          <div className="text-xs text-muted-foreground">
            {calcularEdad(row.original.fechaNacimiento)} años · {row.original.numeroDocumento || 'Sin documento'}
          </div>
        </div>
      ),
    },
    { accessorKey: 'tipoDocumento', header: 'Tipo doc.' },
    {
      accessorKey: 'estadoValidacion', header: 'Estado',
      cell: ({ getValue }) => <Badge variant={estadoColor[getValue() as string] || 'secondary'}>{getValue() as string}</Badge>,
    },
    {
      id: 'docs', header: 'Documentos',
      cell: ({ row }) => <Badge variant="outline">{row.original.documentos?.length || 0}</Badge>,
    },
    {
      id: 'equipos', header: 'Equipos',
      cell: ({ row }) => <Badge variant="outline">{row.original.equipos?.length || 0}</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" title="Ver detalle" onClick={async () => {
            const fresh = await api.get(`/jugadores/${row.original.id}`).then((r) => r.data);
            setDetail(fresh);
          }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Eliminar" onClick={() => { if (confirm('¿Eliminar jugador?')) remove.mutate(row.original.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jugadores</h1>
          <p className="text-muted-foreground text-sm">Registro de jugadores con validación de edad y documentación.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo jugador
        </Button>
      </div>

      <InputSearch value={search} onChange={setSearch} />

      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchPlaceholder="(Filtro en vivo arriba)" />

      <FormModal
        open={open}
        title={editing ? 'Editar jugador' : 'Nuevo jugador'}
        fields={fields}
        initialValues={editing ? {
          ...editing,
          fechaNacimiento: editing.fechaNacimiento?.slice(0, 10),
        } : undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />

      {/* ===== Modal de detalle ===== */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-card z-10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{detail.apellidos}, {detail.nombres}</h2>
                <p className="text-sm text-muted-foreground">
                  {calcularEdad(detail.fechaNacimiento)} años · {detail.tipoDocumento || 'Sin documento'} {detail.numeroDocumento || ''}
                </p>
                <Badge variant={estadoColor[detail.estadoValidacion] || 'secondary'} className="mt-1">
                  {detail.estadoValidacion}
                </Badge>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted-foreground">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* === Documentos === */}
              <section>
                <h3 className="font-semibold mb-3">Documentos</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Archivo</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Subido</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.documentos.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Sin documentos.</td></tr>
                      ) : detail.documentos.map((d) => (
                        <tr key={d.id} className="border-t">
                          <td className="px-3 py-2">{TIPO_DOC_LABEL[d.tipoDocumento] || d.tipoDocumento}</td>
                          <td className="px-3 py-2">
                            <a className="text-primary underline" href={`${(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api').replace(/\/api$/, '')}${d.archivoUrl}`} target="_blank" rel="noreferrer">
                              <FileText className="inline h-3 w-3 mr-1" />{d.nombreArchivo || 'Ver'}
                            </a>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={d.estado === 'aprobado' ? 'success' : d.estado === 'rechazado' ? 'destructive' : 'warning'}>
                              {d.estado}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{new Date(d.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              {d.estado === 'pendiente' && (
                                <>
                                  <Button size="icon" variant="ghost" title="Aprobar"
                                    onClick={() => cambiarEstadoDoc.mutate({ id: d.id, estado: 'aprobado' })}>
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" title="Rechazar"
                                    onClick={() => cambiarEstadoDoc.mutate({ id: d.id, estado: 'rechazado' })}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" title="Eliminar"
                                onClick={() => { if (confirm('¿Eliminar documento?')) eliminarDoc.mutate(d.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <UploadDocForm
                  onUpload={(file, tipo) => subirDocumento.mutate({ jugadorId: detail.id, file, tipoDocumento: tipo })}
                  loading={subirDocumento.isPending}
                />
              </section>

              {/* === Equipos vinculados === */}
              <section>
                <h3 className="font-semibold mb-3">Equipos donde juega</h3>
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Equipo</th>
                        <th className="px-3 py-2 text-left">Categoría</th>
                        <th className="px-3 py-2 text-left">Dorsal</th>
                        <th className="px-3 py-2 text-left">Posición</th>
                        <th className="px-3 py-2 text-left">Habilitación</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.equipos.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No está en ningún equipo.</td></tr>
                      ) : detail.equipos.map((e) => (
                        <tr key={e.id} className="border-t">
                          <td className="px-3 py-2">
                            {e.equipo.nombre}
                            <div className="text-xs text-muted-foreground">{e.equipo.club.nombre}</div>
                          </td>
                          <td className="px-3 py-2"><Badge>{e.equipo.categoria.nombre}</Badge></td>
                          <td className="px-3 py-2">{e.dorsal ?? '—'}</td>
                          <td className="px-3 py-2">{e.posicion ?? '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant={estadoColor[e.estadoHabilitacion] || 'secondary'}>{e.estadoHabilitacion}</Badge>
                            {e.motivoObservacion && <div className="text-xs text-amber-600 mt-1">{e.motivoObservacion}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              {e.estadoHabilitacion === 'observado' && (
                                <>
                                  <Button size="icon" variant="ghost" title="Habilitar"
                                    onClick={() => cambiarHab.mutate({ id: e.id, estadoHabilitacion: 'habilitado' })}>
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" title="Rechazar"
                                    onClick={() => cambiarHab.mutate({ id: e.id, estadoHabilitacion: 'rechazado' })}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" title="Quitar del equipo"
                                onClick={() => { if (confirm('¿Quitar del equipo?')) quitarDeEquipo.mutate(e.id); }}>
                                <UserMinus className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AddToEquipoForm
                  equipos={equipos.filter((eq) => !detail.equipos.find((e) => e.equipoId === eq.id))}
                  onAdd={(data) => agregarAEquipo.mutate({ jugadorId: detail.id, ...data })}
                  loading={agregarAEquipo.isPending}
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Componentes auxiliares =====

function InputSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre o documento…"
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function UploadDocForm({ onUpload, loading }: { onUpload: (file: File, tipo: string) => void; loading: boolean }) {
  const [tipo, setTipo] = React.useState('cedula');
  const [file, setFile] = React.useState<File | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="text-sm block">Tipo</label>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="cedula">Cédula</option>
          <option value="dni">DNI</option>
          <option value="pasaporte">Pasaporte</option>
          <option value="partida_nacimiento">Partida de nacimiento</option>
          <option value="foto">Foto</option>
          <option value="autorizacion">Autorización</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="text-sm block">Archivo</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept="image/*,application/pdf" className="text-sm" />
      </div>
      <Button
        onClick={() => { if (file) onUpload(file, tipo); setFile(null); }}
        disabled={!file || loading}
      >
        <Upload className="h-4 w-4" /> {loading ? 'Subiendo…' : 'Subir documento'}
      </Button>
    </div>
  );
}

function AddToEquipoForm({ equipos, onAdd, loading }: { equipos: any[]; onAdd: (data: any) => void; loading: boolean }) {
  const [equipoId, setEquipoId] = React.useState('');
  const [dorsal, setDorsal] = React.useState('');
  const [posicion, setPosicion] = React.useState('');
  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
      <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
        <option value="">Seleccione equipo…</option>
        {equipos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre} ({e.categoria.nombre}) — {e.club.nombre}
          </option>
        ))}
      </select>
      <input type="number" placeholder="Dorsal" min={1} max={99}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={dorsal} onChange={(e) => setDorsal(e.target.value)} />
      <input type="text" placeholder="Posición"
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={posicion} onChange={(e) => setPosicion(e.target.value)} />
      <Button
        onClick={() => {
          if (!equipoId) return alert('Elegí un equipo');
          onAdd({ equipoId, dorsal: dorsal ? Number(dorsal) : undefined, posicion: posicion || undefined });
          setEquipoId(''); setDorsal(''); setPosicion('');
        }}
        disabled={loading || !equipoId}
      >
        {loading ? 'Agregando…' : 'Agregar a equipo'}
      </Button>
    </div>
  );
}
