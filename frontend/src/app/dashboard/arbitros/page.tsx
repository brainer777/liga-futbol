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

type Arbitro = {
  id: string; nombre: string; telefono?: string; email?: string;
  estado: 'activo' | 'inactivo';
  _count?: { partidos: number };
};

const fields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'telefono', label: 'Teléfono' },
  { name: 'email', label: 'Email', type: 'email' },
];

export default function ArbitrosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Arbitro | null>(null);

  const { data: items = [], isLoading } = useQuery<Arbitro[]>({
    queryKey: ['arbitros'],
    queryFn: () => api.get('/arbitros?includeInactive=true').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/arbitros', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arbitros'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/arbitros/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arbitros'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/arbitros/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arbitros'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Arbitro, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'telefono', header: 'Teléfono' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'partidos', header: 'Partidos',
      cell: ({ row }) => <Badge variant="outline">{row.original._count?.partidos ?? 0}</Badge>,
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
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar árbitro?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Árbitros</h1>
          <p className="text-muted-foreground text-sm">Registro de árbitros asignables a los partidos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo árbitro</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar árbitro' : 'Nuevo árbitro'}
        fields={fields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />
    </div>
  );
}
