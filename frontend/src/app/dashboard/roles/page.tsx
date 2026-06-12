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

type Rol = {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
  createdAt: string;
};

export default function RolesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Rol | null>(null);

  const { data: items = [], isLoading } = useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/roles', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/roles/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const fields: FieldDef[] = React.useMemo(() => {
    const base: FieldDef[] = [
      { name: 'nombre', label: 'Nombre', required: true, placeholder: 'p. ej. Coordinador' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    ];
    if (editing) {
      base.push({
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'activo', label: 'Activo' },
          { value: 'inactivo', label: 'Inactivo' },
        ],
      });
    }
    return base;
  }, [editing]);

  const initialValues = editing
    ? { nombre: editing.nombre, descripcion: editing.descripcion ?? '', estado: editing.estado }
    : undefined;

  const handleSubmit = (values: Record<string, any>) => {
    const payload: any = { ...values };
    if (!payload.descripcion) delete payload.descripcion;
    if (editing) return update.mutateAsync({ id: editing.id, data: payload });
    return create.mutateAsync(payload);
  };

  const columns: ColumnDef<Rol, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'descripcion', header: 'Descripción',
      cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground text-xs">—</span>,
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { if (confirm(`¿Eliminar el rol "${row.original.nombre}"?`)) remove.mutate(row.original.id); }}
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
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-muted-foreground text-sm">Definí los roles que se asignan a los usuarios.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo rol</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar rol' : 'Nuevo rol'}
        fields={fields}
        initialValues={initialValues}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
