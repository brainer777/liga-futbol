'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';

type Registro = {
  id: string;
  usuarioEmail: string | null;
  metodo: string;
  ruta: string;
  entidad: string | null;
  entidadId: string | null;
  statusCode: number;
  exitoso: boolean;
  ip: string | null;
  createdAt: string;
};

const metodoVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  POST: 'success',
  PATCH: 'warning',
  PUT: 'warning',
  DELETE: 'destructive',
};

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function AuditoriaPage() {
  const { data: items = [], isLoading } = useQuery<Registro[]>({
    queryKey: ['auditoria'],
    queryFn: () => api.get('/auditoria?limit=300').then((r) => r.data),
  });

  const columns: ColumnDef<Registro, any>[] = [
    {
      accessorKey: 'createdAt', header: 'Fecha',
      cell: ({ getValue }) => <span className="whitespace-nowrap text-xs">{fmtFecha(getValue() as string)}</span>,
    },
    {
      accessorKey: 'usuarioEmail', header: 'Usuario',
      cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground text-xs">anónimo</span>,
    },
    {
      accessorKey: 'metodo', header: 'Acción',
      cell: ({ getValue }) => {
        const m = getValue() as string;
        return <Badge variant={metodoVariant[m] || 'secondary'}>{m}</Badge>;
      },
    },
    { accessorKey: 'entidad', header: 'Entidad' },
    {
      accessorKey: 'entidadId', header: 'ID',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return v ? <span className="font-mono text-xs" title={v}>{v.slice(0, 8)}…</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'estado', header: 'Resultado',
      cell: ({ row }) => (
        <Badge variant={row.original.exitoso ? 'success' : 'destructive'}>{row.original.statusCode}</Badge>
      ),
    },
    {
      accessorKey: 'ip', header: 'IP',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{(getValue() as string) || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" /> Auditoría
        </h1>
        <p className="text-muted-foreground text-sm">
          Registro de acciones (creaciones, ediciones y borrados). No incluye lecturas ni datos sensibles.
        </p>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} searchPlaceholder="Buscar por usuario, entidad…" />
    </div>
  );
}
