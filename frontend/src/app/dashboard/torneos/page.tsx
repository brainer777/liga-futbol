'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Eye, Play } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';
import Link from 'next/link';

type Torneo = {
  id: string; nombre: string;
  temporada: { id: string; nombre: string; anio: number };
  categoria: { id: string; nombre: string };
  formato: string; puntosVictoria: number; puntosEmpate: number; puntosDerrota: number;
  criterioDesempate: string; permiteReprogramacion: boolean;
  estado: string;
  _count?: { inscripciones: number };
};

const formatOptions = [
  { value: 'todos_contra_todos', label: 'Todos contra todos' },
  { value: 'ida_y_vuelta', label: 'Ida y vuelta' },
  { value: 'grupos', label: 'Grupos' },
  { value: 'eliminacion_directa', label: 'Eliminación directa' },
  { value: 'doble_eliminacion', label: 'Doble eliminación' },
  { value: 'grupos_y_eliminacion', label: 'Grupos y eliminación' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'cuadrangular', label: 'Cuadrangular' },
  { value: 'hexagonal', label: 'Hexagonal' },
  { value: 'liguilla', label: 'Liguilla' },
];
const desempateOptions = [
  { value: 'diferencia_goles', label: 'Diferencia de goles' },
  { value: 'gol_average', label: 'Gol average' },
  { value: 'enfrentamiento_directo', label: 'Enfrentamiento directo' },
  { value: 'goles_favor', label: 'Goles a favor' },
  { value: 'partido_extra', label: 'Partido extra' },
];

export default function TorneosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Torneo | null>(null);

  const { data: items = [], isLoading } = useQuery<Torneo[]>({
    queryKey: ['torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });
  const { data: temporadas = [] } = useQuery<any[]>({
    queryKey: ['temporadas'],
    queryFn: () => api.get('/temporadas').then((r) => r.data),
  });
  const { data: categorias = [] } = useQuery<any[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });

  const fields: FieldDef[] = [
    { name: 'temporadaId', label: 'Temporada', type: 'select', required: true, options: temporadas.map((t) => ({ value: t.id, label: `${t.nombre} (${t.anio})` })) },
    { name: 'categoriaId', label: 'Categoría', type: 'select', required: true, options: categorias.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Apertura 2026 Sub14' },
    { name: 'formato', label: 'Formato', type: 'select', required: true, options: formatOptions, defaultValue: 'todos_contra_todos' },
    { name: 'criterioDesempate', label: 'Criterio de desempate', type: 'select', required: true, options: desempateOptions, defaultValue: 'diferencia_goles' },
    { name: 'puntosVictoria', label: 'Puntos por victoria', type: 'number', defaultValue: 3 },
    { name: 'puntosEmpate', label: 'Puntos por empate', type: 'number', defaultValue: 1 },
    { name: 'puntosDerrota', label: 'Puntos por derrota', type: 'number', defaultValue: 0 },
    { name: 'permiteReprogramacion', label: 'Permite reprogramación', type: 'checkbox', defaultValue: true },
  ];

  const create = useMutation({
    mutationFn: (data: any) => api.post('/torneos', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['torneos'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/torneos/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['torneos'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/torneos/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torneos'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Torneo, any>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { id: 'temp', header: 'Temporada', cell: ({ row }) => `${row.original.temporada.nombre} (${row.original.temporada.anio})` },
    { id: 'cat', header: 'Categoría', cell: ({ row }) => <Badge>{row.original.categoria.nombre}</Badge> },
    { accessorKey: 'formato', header: 'Formato' },
    { id: 'pts', header: 'Puntos', cell: ({ row }) => `${row.original.puntosVictoria}/${row.original.puntosEmpate}/${row.original.puntosDerrota}` },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => <Badge variant={getValue() === 'activo' || getValue() === 'en_curso' ? 'success' : 'secondary'}>{getValue() as string}</Badge>,
    },
    { id: 'insc', header: 'Inscripciones', cell: ({ row }) => <Badge variant="outline">{row.original._count?.inscripciones ?? 0}</Badge> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Link href={`/dashboard/torneos/${row.original.id}`}>
            <Button variant="ghost" size="icon" title="Ver detalle / generar fixture">
              <Play className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar torneo?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Torneos</h1>
          <p className="text-muted-foreground text-sm">Crea torneos por temporada y categoría con sus reglas.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo torneo</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />
      <FormModal
        open={open}
        title={editing ? 'Editar torneo' : 'Nuevo torneo'}
        fields={fields}
        initialValues={editing ? { ...editing, temporadaId: editing.temporada.id, categoriaId: editing.categoria.id } : undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => editing ? update.mutateAsync({ id: editing.id, data: values }) : create.mutateAsync(values)}
      />
    </div>
  );
}
