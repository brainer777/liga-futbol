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

type Sede = {
  id: string; nombre: string; direccion?: string;
  estado: 'activo' | 'inactivo';
};

const fields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'direccion', label: 'Dirección' },
];

export default function SedesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Sede | null>(null);

  const { data: items = [], isLoading } = useQuery<Sede[]>({
    queryKey: ['sedes'],
    queryFn: () => api.get('/sedes?includeInactive=true').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/sedes', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sedes'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/sedes/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sedes'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/sedes/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Sede, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'direccion', header: 'Dirección' },
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
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar sede?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Sedes</h1>
          <p className="text-muted-foreground text-sm">Registro de sedes/canchas asignables a los partidos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva sede</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar sede' : 'Nueva sede'}
        fields={fields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />
    </div>
  );
}
