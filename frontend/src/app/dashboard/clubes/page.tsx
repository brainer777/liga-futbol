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

type Club = {
  id: string; nombre: string; sigla?: string; representante?: string;
  telefono?: string; email?: string; direccion?: string; estado: 'activo' | 'inactivo';
  _count?: { equipos: number };
};

const fields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'sigla', label: 'Sigla' },
  { name: 'representante', label: 'Representante' },
  { name: 'telefono', label: 'Teléfono' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'direccion', label: 'Dirección' },
];

export default function ClubesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Club | null>(null);

  const { data: items = [], isLoading } = useQuery<Club[]>({
    queryKey: ['clubes'],
    queryFn: () => api.get('/clubes?includeInactive=true').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/clubes', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubes'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/clubes/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubes'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/clubes/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clubes'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Club, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'sigla', header: 'Sigla' },
    { accessorKey: 'representante', header: 'Representante' },
    { accessorKey: 'telefono', header: 'Teléfono' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'equipos', header: 'Equipos',
      cell: ({ row }) => <Badge variant="outline">{row.original._count?.equipos ?? 0}</Badge>,
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
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar club?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Clubes</h1>
          <p className="text-muted-foreground text-sm">Registro de clubes y sus datos de contacto.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo club</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar club' : 'Nuevo club'}
        fields={fields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />
    </div>
  );
}
