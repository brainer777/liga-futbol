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

type Categoria = {
  id: string;
  nombre: string;
  edadMinima: number | null;
  edadMaxima: number | null;
  permiteSinCedula: boolean;
  validaPorAnioNacimiento: boolean;
  estado: 'activo' | 'inactivo';
};

const fields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Sub14' },
  { name: 'edadMinima', label: 'Edad mínima', type: 'number' },
  { name: 'edadMaxima', label: 'Edad máxima', type: 'number' },
  { name: 'permiteSinCedula', label: 'Permite sin cédula', type: 'checkbox', defaultValue: false },
  { name: 'validaPorAnioNacimiento', label: 'Valida por año de nacimiento', type: 'checkbox', defaultValue: false },
];

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Categoria | null>(null);

  const { data: items = [], isLoading } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias?includeInactive=true').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/categorias', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/categorias/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categorias/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Categoria, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'edadMinima', header: 'Edad mín.' },
    { accessorKey: 'edadMaxima', header: 'Edad máx.' },
    {
      id: 'doc',
      header: 'Documentación',
      cell: ({ row }) => {
        const c = row.original;
        if (c.permiteSinCedula) return <Badge variant="warning">Permite sin cédula</Badge>;
        return <Badge variant="secondary">Cédula obligatoria</Badge>;
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.estado === 'activo' ? 'success' : 'secondary'}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`¿Eliminar la categoría "${row.original.nombre}"?`)) {
                remove.mutate(row.original.id);
              }
            }}
          >
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
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground text-sm">Configura las categorías deportivas y sus reglas de edad/documentación.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      <DataTable columns={columns} data={items} isLoading={isLoading} searchPlaceholder="Buscar categoría…" />

      <FormModal
        open={open}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        fields={fields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => {
          if (editing) return update.mutateAsync({ id: editing.id, data: values });
          return create.mutateAsync(values);
        }}
      />
    </div>
  );
}
