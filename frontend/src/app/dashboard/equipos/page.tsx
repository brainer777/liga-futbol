'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';

type Equipo = {
  id: string; nombre: string;
  club: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
  delegadoNombre?: string; delegadoTelefono?: string; delegadoEmail?: string;
  estado: 'activo' | 'inactivo';
  _count?: { jugadores?: number };
};

export default function EquiposPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Equipo | null>(null);

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

  const fields: FieldDef[] = [
    { name: 'clubId', label: 'Club', type: 'select', required: true, options: clubes.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'categoriaId', label: 'Categoría', type: 'select', required: true, options: categorias.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'nombre', label: 'Nombre del equipo', required: true, placeholder: 'Primera, Sub14, etc.' },
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
    { accessorKey: 'nombre', header: 'Equipo' },
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
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}>
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
    </div>
  );
}
