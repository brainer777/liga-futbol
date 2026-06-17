'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Swords, Play, Target, Users, ArrowRight, CalendarPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Torneo = {
  id: string;
  nombre: string;
  formato: string;
  estado: string;
  temporada: { nombre: string; anio: number } | null;
  categoria: { nombre: string } | null;
  _count: { inscripciones: number; partidos: number; fases: number };
};

const FORMATO_LABEL: Record<string, string> = {
  todos_contra_todos: 'Todos contra todos',
  ida_y_vuelta: 'Ida y vuelta',
  triangular: 'Triangular',
  cuadrangular: 'Cuadrangular',
  hexagonal: 'Hexagonal',
  liguilla: 'Liguilla',
  eliminacion_directa: 'Eliminación directa',
  doble_eliminacion: 'Doble eliminación',
  grupos: 'Grupos',
  grupos_y_eliminacion: 'Grupos + eliminación',
};

// Para ordenar: primero los torneos "vivos".
const ORDEN_ESTADO: Record<string, number> = { en_curso: 0, borrador: 1, finalizado: 2, cancelado: 3 };

export default function FixturePage() {
  const { data: torneos = [], isLoading, isError } = useQuery<Torneo[]>({
    queryKey: ['torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });

  const ordenados = [...torneos].sort(
    (a, b) => (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> Fixture y resultados
        </h1>
        <p className="text-muted-foreground text-sm">
          Generá el calendario de partidos de cada torneo y cargá los resultados.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando torneos…</p>}
      {isError && <p className="text-sm text-destructive">No se pudieron cargar los torneos.</p>}
      {!isLoading && !isError && ordenados.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Todavía no hay torneos. Creá uno en{' '}
            <Link href="/dashboard/torneos" className="text-primary underline">Torneos</Link>.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {ordenados.map((t) => (
          <TorneoCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function TorneoCard({ t }: { t: Torneo }) {
  const equipos = t._count.inscripciones;
  const partidos = t._count.partidos;
  const sinEquipos = equipos < 2;
  const sinFixture = !sinEquipos && partidos === 0;
  const conFixture = partidos > 0;

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{t.nombre}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t.categoria?.nombre ?? '—'} · {t.temporada?.nombre ?? '—'}
            </div>
          </div>
          <Badge variant={t.estado === 'en_curso' ? 'success' : 'secondary'} className="shrink-0">
            {t.estado}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{FORMATO_LABEL[t.formato] ?? t.formato}</Badge>
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{equipos} equipos</Badge>
          <Badge variant="outline" className="gap-1"><Target className="h-3 w-3" />{partidos} partidos</Badge>
        </div>

        {/* Acción principal según en qué punto del flujo está el torneo */}
        <div className="mt-auto pt-1">
          {sinEquipos && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2.5">
              <span className="text-xs text-muted-foreground">Inscribí al menos 2 equipos para poder generar el fixture.</span>
              <Link href="/dashboard/inscripciones">
                <Button variant="outline" size="sm" className="shrink-0">Inscribir equipos</Button>
              </Link>
            </div>
          )}
          {sinFixture && (
            <Link href={`/dashboard/torneos/${t.id}`}>
              <Button className="w-full">
                <Play className="h-4 w-4" /> Generar fixture
              </Button>
            </Link>
          )}
          {conFixture && (
            <Link href={`/dashboard/torneos/${t.id}`}>
              <Button className="w-full">
                <CalendarPlus className="h-4 w-4" /> Cargar resultados <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
