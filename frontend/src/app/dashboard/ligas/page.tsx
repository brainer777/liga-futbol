'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Power, PowerOff } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';

type Liga = {
  id: string;
  nombre: string;
  slug: string;
  estado: 'activo' | 'inactivo';
  _count?: { torneos: number; equipos: number; usuarioRoles: number };
};

// Crear: nombre + slug. Editar: solo el nombre (el slug es inmutable porque vive
// en las URLs públicas /publico/:slug y en el header X-Liga-Slug).
const createFields: FieldDef[] = [
  { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Liga Norte' },
  {
    name: 'slug',
    label: 'Slug (URL)',
    required: true,
    placeholder: 'liga-norte',
    hint: 'Minúsculas, números y guiones. Se usa en la URL pública y no se puede cambiar luego.',
  },
];
const editFields: FieldDef[] = [{ name: 'nombre', label: 'Nombre', required: true }];

// Sugerencia de slug a partir del nombre (kebab-case sin acentos).
function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function LigasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Liga | null>(null);

  const { data: items = [], isLoading } = useQuery<Liga[]>({
    queryKey: ['ligas'],
    queryFn: () => api.get('/ligas').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/ligas', { nombre: data.nombre, slug: data.slug }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ligas'] });
      qc.invalidateQueries({ queryKey: ['mis-ligas'] });
      setOpen(false);
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/ligas/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ligas'] });
      qc.invalidateQueries({ queryKey: ['mis-ligas'] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const toggleEstado = (l: Liga) => {
    const nuevo = l.estado === 'activo' ? 'inactivo' : 'activo';
    const verbo = nuevo === 'inactivo' ? 'desactivar' : 'activar';
    if (!confirm(`¿${verbo[0].toUpperCase()}${verbo.slice(1)} la liga "${l.nombre}"?`)) return;
    update.mutate({ id: l.id, data: { estado: nuevo } });
  };

  const columns: ColumnDef<Liga, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'slug', header: 'Slug', cell: ({ getValue }) => <code className="text-xs">{getValue() as string}</code> },
    { id: 'torneos', header: 'Torneos', cell: ({ row }) => <Badge variant="outline">{row.original._count?.torneos ?? 0}</Badge> },
    { id: 'equipos', header: 'Equipos', cell: ({ row }) => <Badge variant="outline">{row.original._count?.equipos ?? 0}</Badge> },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ getValue }) => <Badge variant={getValue() === 'activo' ? 'success' : 'secondary'}>{getValue() as string}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" title="Editar nombre" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={row.original.estado === 'activo' ? 'Desactivar' : 'Activar'}
            onClick={() => toggleEstado(row.original)}
          >
            {row.original.estado === 'activo' ? (
              <PowerOff className="h-4 w-4 text-destructive" />
            ) : (
              <Power className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ligas</h1>
          <p className="text-muted-foreground text-sm">Gestión de las ligas de la plataforma. Desactivar saca a la liga de circulación sin borrar sus datos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva liga</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar liga' : 'Nueva liga'}
        fields={editing ? editFields : createFields}
        initialValues={editing || undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => {
          if (editing) return update.mutateAsync({ id: editing.id, data: { nombre: values.nombre } });
          // Si no escribieron slug, lo derivamos del nombre.
          const slug = (values.slug && values.slug.trim()) || slugify(values.nombre || '');
          return create.mutateAsync({ nombre: values.nombre, slug });
        }}
      />
    </div>
  );
}
