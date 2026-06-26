'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { EstadisticasGlobales } from '@/components/estadisticas-globales';

export default function EstadisticasPublicasPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="space-y-5">
      <Link href={`/publico/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a torneos
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Estadísticas
        </h1>
        <p className="text-muted-foreground text-sm">Acumulado histórico de toda la liga, sumando todos los torneos.</p>
      </div>

      <EstadisticasGlobales basePath="/publico/estadisticas" scope="publico" ligaSlug={slug} />
    </div>
  );
}
