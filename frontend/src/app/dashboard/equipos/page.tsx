'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { fileUrl } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';
import { Shield } from 'lucide-react';

type Equipo = {
  id: string; nombre: string; logoUrl?: string | null;
  club: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
  delegadoNombre?: string; delegadoTelefono?: string; delegadoEmail?: string;
  estado: 'activo' | 'inactivo';
  _count?: { jugadores?: number };
};

/** Escudo del equipo (logo o placeholder). */
function EquipoLogo({ url, className = 'h-8 w-8' }: { url?: string | null; className?: string }) {
  const src = fileUrl(url);
  return (
    <div className={`${className} shrink-0 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" />
      ) : (
        <Shield className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

export default function EquiposPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Equipo | null>(null);
  const [plantillaDe, setPlantillaDe] = React.useState<Equipo | null>(null);

  const { data: items = [], isLoading } = useQuery<Equipo[]>({
    queryKey: ['equipos'],
    queryFn: () => api.get('/equipos').then((r) => r.data),
  });
  const { data: clubes = [] } = useQuery<any[]>({
    queryKey: ['clubes'],
    queryFn: () => api.get('/clubes').then((r) => r.data),
  });
  const { data: categorias = [] } = useQuery<any[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });
  const { data: plantilla = [], isLoading: plantillaLoading } = useQuery<any[]>({
    queryKey: ['plantilla', plantillaDe?.id],
    queryFn: () => api.get(`/jugadores/equipo/${plantillaDe!.id}/plantilla`).then((r) => r.data),
    enabled: !!plantillaDe,
  });

  const fields: FieldDef[] = [
    { name: 'clubId', label: 'Club', type: 'select', required: true, options: clubes.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'categoriaId', label: 'Categoría', type: 'select', required: true, options: categorias.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'nombre', label: 'Nombre del equipo', required: true, placeholder: 'Primera, Sub14, etc.' },
    { name: 'logoUrl', label: 'Logo / escudo', type: 'logo', hint: 'Imagen cuadrada (PNG/JPG/WebP), máx. 20 MB.' },
    { name: 'delegadoNombre', label: 'Nombre del delegado' },
    { name: 'delegadoTelefono', label: 'Teléfono del delegado' },
    { name: 'delegadoEmail', label: 'Email del delegado', type: 'email' },
  ];

  const create = useMutation({
    mutationFn: (data: any) => api.post('/equipos', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipos'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/equipos/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipos'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/equipos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipos'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Equipo, any>[] = [
    {
      id: 'nombre', header: 'Equipo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <EquipoLogo url={row.original.logoUrl} />
          <span className="font-medium">{row.original.nombre}</span>
        </div>
      ),
    },
    { id: 'club', header: 'Club', cell: ({ row }) => row.original.club.nombre },
    { id: 'categoria', header: 'Categoría', cell: ({ row }) => <Badge>{row.original.categoria.nombre}</Badge> },
    { accessorKey: 'delegadoNombre', header: 'Delegado' },
    { accessorKey: 'delegadoTelefono', header: 'Teléfono' },
    {
      id: 'plantilla', header: 'Plantilla',
      cell: ({ row }) => <Badge variant="outline">{row.original._count?.jugadores ?? 0}</Badge>,
    },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => <Badge variant={getValue() === 'activo' ? 'success' : 'secondary'}>{getValue() as string}</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" title="Ver plantilla" onClick={() => setPlantillaDe(row.original)}>
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar equipo?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Equipos</h1>
          <p className="text-muted-foreground text-sm">Equipos registrados por club y categoría.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo equipo</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar equipo' : 'Nuevo equipo'}
        fields={fields}
        initialValues={editing ? { ...editing, clubId: editing.club.id, categoriaId: editing.categoria.id } : undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />

      {/* ===== Modal de plantilla (roster del equipo) ===== */}
      {plantillaDe && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-card z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EquipoLogo url={plantillaDe.logoUrl} className="h-12 w-12" />
                <div>
                  <h2 className="text-xl font-semibold">{plantillaDe.nombre}</h2>
                  <p className="text-sm text-muted-foreground">
                    {plantillaDe.club.nombre} · <Badge>{plantillaDe.categoria.nombre}</Badge>
                  </p>
                </div>
              </div>
              <button onClick={() => setPlantillaDe(null)} className="text-muted-foreground">✕</button>
            </div>
            <div className="p-6">
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left w-12">#</th>
                      <th className="px-3 py-2 text-left">Jugador</th>
                      <th className="px-3 py-2 text-left">Posición</th>
                      <th className="px-3 py-2 text-left">Habilitación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantillaLoading ? (
                      <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Cargando…</td></tr>
                    ) : plantilla.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Sin jugadores en la plantilla.</td></tr>
                    ) : plantilla.map((ej) => (
                      <tr key={ej.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{ej.dorsal ?? '—'}</td>
                        <td className="px-3 py-2">{ej.jugador.apellidos}, {ej.jugador.nombres}</td>
                        <td className="px-3 py-2">{ej.posicion ?? '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={ej.estadoHabilitacion === 'habilitado' ? 'success' : ej.estadoHabilitacion === 'rechazado' ? 'destructive' : 'warning'}>
                            {ej.estadoHabilitacion}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Para agregar jugadores, usá la sección <strong>Jugadores</strong> → ficha del jugador → “Agregar a equipo”.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
