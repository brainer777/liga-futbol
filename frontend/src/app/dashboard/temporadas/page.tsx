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

type Temporada = {
  id: string; nombre: string; anio: number;
  fechaInicio: string; fechaFin: string; estado: 'activa' | 'cerrada' | 'planificada';
};

const fields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Temporada 2026' },
  { name: 'anio', label: 'Año', type: 'number', required: true },
  { name: 'fechaInicio', label: 'Fecha de inicio', type: 'date', required: true },
  { name: 'fechaFin', label: 'Fecha de fin', type: 'date', required: true },
];

export default function TemporadasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Temporada | null>(null);

  const { data: items = [], isLoading } = useQuery<Temporada[]>({
    queryKey: ['temporadas'],
    queryFn: () => api.get('/temporadas').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/temporadas', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['temporadas'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/temporadas/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['temporadas'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/temporadas/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['temporadas'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Temporada, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'anio', header: 'Año' },
    { accessorKey: 'fechaInicio', header: 'Inicio', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { accessorKey: 'fechaFin', header: 'Fin', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => <Badge variant={getValue() === 'activa' ? 'success' : 'secondary'}>{getValue() as string}</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar temporada?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Temporadas</h1>
          <p className="text-muted-foreground text-sm">Gestiona las temporadas anuales del sistema.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar temporada' : 'Nueva temporada'}
        fields={fields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />
    </div>
  );
}
