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

type Rol = { id: string; nombre: string };
type Usuario = {
  id: string;
  nombre: string;
  email: string;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  roles: Rol[];
  createdAt: string;
};

const estadoVariant: Record<Usuario['estado'], 'success' | 'secondary' | 'destructive'> = {
  activo: 'success',
  inactivo: 'secondary',
  bloqueado: 'destructive',
};

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Usuario | null>(null);

  const { data: items = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then((r) => r.data),
  });

  const { data: roles = [] } = useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/usuarios', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/usuarios/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/usuarios/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const roleOptions = roles.map((r) => ({ value: r.nombre, label: r.nombre }));

  // Los campos cambian entre alta y edición (password obligatorio solo al crear;
  // estado solo se muestra al editar).
  const fields: FieldDef[] = React.useMemo(() => {
    const base: FieldDef[] = [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      {
        name: 'password',
        label: 'Contraseña',
        type: 'password',
        required: !editing,
        hint: editing ? 'Dejá en blanco para no cambiarla.' : 'Mínimo 6 caracteres.',
      },
    ];
    if (editing) {
      base.push({
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'activo', label: 'Activo' },
          { value: 'inactivo', label: 'Inactivo' },
          { value: 'bloqueado', label: 'Bloqueado' },
        ],
      });
    }
    base.push({
      name: 'roles',
      label: 'Roles',
      type: 'multiselect',
      options: roleOptions,
      hint: 'Definen los permisos del usuario.',
    });
    return base;
  }, [editing, JSON.stringify(roleOptions)]);

  const initialValues = editing
    ? { nombre: editing.nombre, email: editing.email, estado: editing.estado, roles: editing.roles.map((r) => r.nombre) }
    : undefined;

  const handleSubmit = (values: Record<string, any>) => {
    const payload: any = { ...values };
    // No enviar password vacío (en edición significa "no cambiar").
    if (!payload.password) delete payload.password;
    if (editing) {
      return update.mutateAsync({ id: editing.id, data: payload });
    }
    return create.mutateAsync(payload);
  };

  const columns: ColumnDef<Usuario, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'roles', header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length
            ? row.original.roles.map((r) => <Badge key={r.id} variant="outline">{r.nombre}</Badge>)
            : <span className="text-muted-foreground text-xs">—</span>}
        </div>
      ),
    },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => {
        const v = getValue() as Usuario['estado'];
        return <Badge variant={estadoVariant[v]}>{v}</Badge>;
      },
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
            onClick={() => { if (confirm(`¿Eliminar al usuario ${row.original.email}?`)) remove.mutate(row.original.id); }}
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
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground text-sm">Gestión de cuentas y asignación de roles.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo usuario</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        fields={fields}
        initialValues={initialValues}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
