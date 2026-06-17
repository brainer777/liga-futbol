'use client';

import { BarChart3 } from 'lucide-react';
import { EstadisticasGlobales } from '@/components/estadisticas-globales';

export default function DashboardEstadisticasPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Estadísticas
        </h1>
        <p className="text-muted-foreground text-sm">Acumulado de la liga sumando todos los torneos publicados.</p>
      </div>

      <EstadisticasGlobales basePath="/estadisticas" scope="dashboard" />
    </div>
  );
}
