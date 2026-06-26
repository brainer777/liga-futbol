'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ChevronRight } from 'lucide-react';
import { api, ligaHeader } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type TorneoPublico = {
  id: string;
  nombre: string;
  formato: string;
  estado: string;
  categoria: { id: string; nombre: string } | null;
  temporada: { id: string; nombre: string; anio: number } | null;
  _count: { partidos: number; inscripciones: number };
};

export default function PortalPublicoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: torneos = [], isLoading, isError } = useQuery<TorneoPublico[]>({
    queryKey: ['publico', slug, 'torneos'],
    queryFn: () => api.get('/publico/torneos', ligaHeader(slug)).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Torneos
        </h1>
        <p className="text-muted-foreground text-sm">Seguí los resultados, la tabla de posiciones y el fixture.</p>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Cargando torneos…</p>}
      {isError && <p className="text-destructive text-sm">No se pudieron cargar los torneos.</p>}
      {!isLoading && !isError && torneos.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Todavía no hay torneos publicados.</CardContent></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {torneos.map((t) => (
          <Link key={t.id} href={`/publico/${slug}/torneos/${t.id}`}>
            <Card className="hover:border-primary transition-colors h-full">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.nombre}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.categoria?.nombre ?? '—'} · {t.temporada?.nombre ?? '—'}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary">{t.formato.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline">{t._count.inscripciones} equipos</Badge>
                    <Badge variant="outline">{t._count.partidos} partidos</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
