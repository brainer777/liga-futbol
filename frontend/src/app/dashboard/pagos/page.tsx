'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';

type Pago = {
  id: string; fechaPago: string; monto: string | number;
  metodoPago: 'efectivo' | 'transferencia';
  numeroRecibo?: string; referenciaTransferencia?: string;
  inscripcion: { id: string; equipo: { nombre: string; club: { nombre: string } }; torneo: { nombre: string } };
};

export default function PagosPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<Pago[]>({
    queryKey: ['pagos'],
    queryFn: () => api.get('/pagos').then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/pagos/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const total = items.reduce((acc, p) => acc + Number(p.monto), 0);
  const totalEfectivo = items.filter((p) => p.metodoPago === 'efectivo').reduce((acc, p) => acc + Number(p.monto), 0);
  const totalTransferencia = items.filter((p) => p.metodoPago === 'transferencia').reduce((acc, p) => acc + Number(p.monto), 0);

  const columns: ColumnDef<Pago, any>[] = [
    { accessorKey: 'fechaPago', header: 'Fecha', cell: ({ getValue }) => new Date(getValue() as string).toLocaleString() },
    { id: 'equipo', header: 'Equipo', cell: ({ row }) => `${row.original.inscripcion.equipo.nombre} (${row.original.inscripcion.equipo.club.nombre})` },
    { id: 'torneo', header: 'Torneo', cell: ({ row }) => row.original.inscripcion.torneo.nombre },
    {
      accessorKey: 'metodoPago', header: 'Método',
      cell: ({ getValue }) => <Badge variant={getValue() === 'efectivo' ? 'success' : 'secondary'}>{getValue() as string}</Badge>,
    },
    { id: 'ref', header: 'Referencia', cell: ({ row }) => row.original.numeroRecibo || row.original.referenciaTransferencia || '—' },
    { id: 'monto', header: 'Monto', cell: ({ row }) => <span className="font-semibold">${Number(row.original.monto).toFixed(2)}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar pago? Se recalculará la inscripción.')) remove.mutate(row.original.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pagos</h1>
        <p className="text-muted-foreground text-sm">Registro de pagos en efectivo y por transferencia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground uppercase">Total recaudado</p>
          <p className="text-2xl font-bold mt-1">${total.toFixed(2)}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground uppercase">En efectivo</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">${totalEfectivo.toFixed(2)}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs text-muted-foreground uppercase">Por transferencia</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">${totalTransferencia.toFixed(2)}</p>
        </div>
      </div>

      <DataTable columns={columns} data={items} isLoading={isLoading} />
    </div>
  );
}
