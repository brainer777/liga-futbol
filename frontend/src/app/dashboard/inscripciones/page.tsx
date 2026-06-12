'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, DollarSign, Eye } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { FormModal, FieldDef } from '@/components/form-modal';

type Inscripcion = {
  id: string;
  torneo: { id: string; nombre: string; categoria: { nombre: string } };
  equipo: { id: string; nombre: string; club: { nombre: string } };
  fechaInscripcion: string;
  costoInscripcion: string | number;
  fechaLimitePago: string | null;
  montoPagado: string | number;
  saldoPendiente: string | number;
  estado: 'preinscrito' | 'pendiente_pago' | 'pago_parcial' | 'pagado' | 'aprobado' | 'observado' | 'rechazado' | 'vencido';
  pagos: any[];
};

const estadoVariant: Record<string, any> = {
  pendiente_pago: 'warning',
  pago_parcial: 'warning',
  pagado: 'success',
  aprobado: 'success',
  preinscrito: 'secondary',
  observado: 'outline',
  rechazado: 'destructive',
  vencido: 'destructive',
};

export default function InscripcionesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Inscripcion | null>(null);
  const [pagosOpenFor, setPagosOpenFor] = React.useState<Inscripcion | null>(null);
  const [pagoForm, setPagoForm] = React.useState<{ monto: string; metodoPago: 'efectivo' | 'transferencia'; numeroRecibo: string; referenciaTransferencia: string }>({
    monto: '',
    metodoPago: 'efectivo',
    numeroRecibo: '',
    referenciaTransferencia: '',
  });

  const { data: items = [], isLoading } = useQuery<Inscripcion[]>({
    queryKey: ['inscripciones'],
    queryFn: () => api.get('/inscripciones').then((r) => r.data),
  });
  const { data: torneos = [] } = useQuery<any[]>({
    queryKey: ['torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });
  const { data: equipos = [] } = useQuery<any[]>({
    queryKey: ['equipos'],
    queryFn: () => api.get('/equipos').then((r) => r.data),
  });

  const fields: FieldDef[] = [
    { name: 'torneoId', label: 'Torneo', type: 'select', required: true, options: torneos.map((t) => ({ value: t.id, label: t.nombre })) },
    { name: 'equipoId', label: 'Equipo', type: 'select', required: true, options: equipos.map((e) => ({ value: e.id, label: e.nombre })) },
    { name: 'costoInscripcion', label: 'Costo de inscripción', type: 'number', required: true },
    { name: 'fechaLimitePago', label: 'Fecha límite de pago', type: 'date' },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
  ];

  const create = useMutation({
    mutationFn: (data: any) => api.post('/inscripciones', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inscripciones'] }); setOpen(false); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/inscripciones/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inscripciones'] }); setOpen(false); setEditing(null); },
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inscripciones/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscripciones'] }),
    onError: (e) => alert(getApiErrorMessage(e)),
  });
  const addPago = useMutation({
    mutationFn: (data: any) => api.post('/pagos', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      setPagosOpenFor(null);
      setPagoForm({ monto: '', metodoPago: 'efectivo', numeroRecibo: '', referenciaTransferencia: '' });
    },
    onError: (e) => alert(getApiErrorMessage(e)),
  });

  const columns: ColumnDef<Inscripcion, any>[] = [
    { id: 'equipo', header: 'Equipo', cell: ({ row }) => `${row.original.equipo.nombre} (${row.original.equipo.club.nombre})` },
    { id: 'torneo', header: 'Torneo', cell: ({ row }) => row.original.torneo.nombre },
    { id: 'cat', header: 'Categoría', cell: ({ row }) => <Badge>{row.original.torneo.categoria.nombre}</Badge> },
    { id: 'costo', header: 'Costo', cell: ({ row }) => `$${Number(row.original.costoInscripcion).toFixed(2)}` },
    { id: 'pagado', header: 'Pagado', cell: ({ row }) => `$${Number(row.original.montoPagado).toFixed(2)}` },
    { id: 'saldo', header: 'Saldo', cell: ({ row }) => <span className={Number(row.original.saldoPendiente) > 0 ? 'text-destructive font-semibold' : 'text-emerald-600'}>${Number(row.original.saldoPendiente).toFixed(2)}</span> },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ getValue }) => <Badge variant={estadoVariant[getValue() as string] || 'secondary'}>{getValue() as string}</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" title="Ver / registrar pagos" onClick={() => setPagosOpenFor(row.original)}>
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar inscripción?')) remove.mutate(row.original.id); }}>
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
          <h1 className="text-2xl font-bold">Inscripciones</h1>
          <p className="text-muted-foreground text-sm">Inscripciones por torneo y categoría, con control de pagos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva inscripción</Button>
      </div>
      <DataTable columns={columns} data={items} isLoading={isLoading} />

      <FormModal
        open={open}
        title={editing ? 'Editar inscripción' : 'Nueva inscripción'}
        fields={fields}
        initialValues={editing ? { ...editing, torneoId: editing.torneo.id, equipoId: editing.equipo.id, fechaLimitePago: editing.fechaLimitePago ? editing.fechaLimitePago.slice(0, 10) : '' } : undefined}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSubmit={(values) => {
          const v = { ...values };
          if (!v.fechaLimitePago) delete v.fechaLimitePago;
          return editing ? update.mutateAsync({ id: editing.id, data: v }) : create.mutateAsync(v);
        }}
      />

      {/* Modal de pagos */}
      {pagosOpenFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Pagos — {pagosOpenFor.equipo.nombre}</h2>
              <button onClick={() => setPagosOpenFor(null)} className="text-muted-foreground">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <div><span className="text-muted-foreground">Costo:</span> <strong>${Number(pagosOpenFor.costoInscripcion).toFixed(2)}</strong></div>
              <div><span className="text-muted-foreground">Pagado:</span> <strong>${Number(pagosOpenFor.montoPagado).toFixed(2)}</strong></div>
              <div><span className="text-muted-foreground">Saldo:</span> <strong>${Number(pagosOpenFor.saldoPendiente).toFixed(2)}</strong></div>
            </div>

            <div className="border rounded-md overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Método</th>
                    <th className="px-3 py-2 text-left">Referencia</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosOpenFor.pagos.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Sin pagos registrados.</td></tr>
                  ) : pagosOpenFor.pagos.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">{new Date(p.fechaPago).toLocaleDateString()}</td>
                      <td className="px-3 py-2"><Badge variant={p.metodoPago === 'efectivo' ? 'success' : 'secondary'}>{p.metodoPago}</Badge></td>
                      <td className="px-3 py-2">{p.numeroRecibo || p.referenciaTransferencia || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold">${Number(p.monto).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold mb-2">Registrar nuevo pago</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Monto</label>
                  <input type="number" step="0.01" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm">Método</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={pagoForm.metodoPago} onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value as any })}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              {pagoForm.metodoPago === 'efectivo' ? (
                <div>
                  <label className="text-sm">Número de recibo *</label>
                  <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={pagoForm.numeroRecibo} onChange={(e) => setPagoForm({ ...pagoForm, numeroRecibo: e.target.value })} />
                </div>
              ) : (
                <div>
                  <label className="text-sm">Referencia de transferencia *</label>
                  <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={pagoForm.referenciaTransferencia} onChange={(e) => setPagoForm({ ...pagoForm, referenciaTransferencia: e.target.value })} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPagosOpenFor(null)}>Cerrar</Button>
                <Button
                  disabled={addPago.isPending}
                  onClick={() => {
                    const monto = Number(pagoForm.monto);
                    if (!monto || monto <= 0) return alert('Monto debe ser > 0');
                    if (pagoForm.metodoPago === 'efectivo' && !pagoForm.numeroRecibo) return alert('Número de recibo obligatorio');
                    if (pagoForm.metodoPago === 'transferencia' && !pagoForm.referenciaTransferencia) return alert('Referencia obligatoria');
                    addPago.mutate({
                      inscripcionId: pagosOpenFor.id,
                      monto,
                      metodoPago: pagoForm.metodoPago,
                      numeroRecibo: pagoForm.numeroRecibo || undefined,
                      referenciaTransferencia: pagoForm.referenciaTransferencia || undefined,
                    });
                  }}
                >
                  {addPago.isPending ? 'Registrando…' : 'Registrar pago'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
