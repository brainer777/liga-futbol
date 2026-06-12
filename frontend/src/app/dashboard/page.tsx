'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Shield, Calendar, FileText, DollarSign, UserPlus } from 'lucide-react';

const cards = [
  { href: '/dashboard/categorias', title: 'Categorías', description: 'Sub8 a Master', icon: Trophy, color: 'from-emerald-500 to-green-600' },
  { href: '/dashboard/temporadas', title: 'Temporadas', description: 'Temporadas anuales', icon: Calendar, color: 'from-blue-500 to-indigo-600' },
  { href: '/dashboard/clubes', title: 'Clubes', description: 'Clubes registrados', icon: Shield, color: 'from-orange-500 to-red-600' },
  { href: '/dashboard/equipos', title: 'Equipos', description: 'Equipos por categoría', icon: Users, color: 'from-purple-500 to-fuchsia-600' },
  { href: '/dashboard/torneos', title: 'Torneos', description: 'Torneos activos', icon: Trophy, color: 'from-cyan-500 to-blue-600' },
  { href: '/dashboard/inscripciones', title: 'Inscripciones', description: 'Inscripciones y pagos', icon: FileText, color: 'from-amber-500 to-orange-600' },
  { href: '/dashboard/jugadores', title: 'Jugadores', description: 'Validación de edad y docs', icon: UserPlus, color: 'from-rose-500 to-pink-600' },
  { href: '/dashboard/pagos', title: 'Pagos', description: 'Pagos y comprobantes', icon: DollarSign, color: 'from-pink-500 to-rose-600' },
];

export default function DashboardHome() {
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias').then((r) => r.data) });
  const { data: clubes = [] } = useQuery({ queryKey: ['clubes'], queryFn: () => api.get('/clubes').then((r) => r.data) });
  const { data: equipos = [] } = useQuery({ queryKey: ['equipos'], queryFn: () => api.get('/equipos').then((r) => r.data) });
  const { data: jugadores = [] } = useQuery({ queryKey: ['jugadores'], queryFn: () => api.get('/jugadores').then((r) => r.data) });
  const { data: inscripciones = [] } = useQuery({ queryKey: ['inscripciones'], queryFn: () => api.get('/inscripciones').then((r) => r.data) });
  const { data: pagos = [] } = useQuery({ queryKey: ['pagos'], queryFn: () => api.get('/pagos').then((r) => r.data) });

  const totalPagado = pagos.reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
  const totalPendiente = inscripciones.reduce(
    (acc: number, i: any) => acc + Number(i.saldoPendiente || 0),
    0,
  );

  const stats = [
    { label: 'Categorías activas', value: categorias.length },
    { label: 'Clubes registrados', value: clubes.length },
    { label: 'Equipos', value: equipos.length },
    { label: 'Jugadores', value: jugadores.length },
    { label: 'Inscripciones', value: inscripciones.length },
    { label: 'Saldo pendiente', value: `$${totalPendiente.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido 👋</h1>
        <p className="text-muted-foreground">Sprint 1 — Núcleo administrativo operativo.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Módulos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.href} href={c.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white mb-2`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription>{c.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
