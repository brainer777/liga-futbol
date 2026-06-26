'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLigaStore, type LigaResumen } from '@/store/liga.store';

/**
 * Selector de liga activa (multi-liga). Solo se muestra si el usuario tiene 2+
 * ligas; con una sola, el nombre ya está en la cabecera del sidebar.
 *
 * Al cambiar: fija la liga (su slug se transporta en X-Liga-Slug por el
 * interceptor) y BORRA la caché de datos de la liga anterior —menos la lista de
 * ligas— para que todo se vuelva a pedir con el nuevo contexto (sin filas viejas).
 */
export function LigaSelector() {
  const qc = useQueryClient();
  const activeSlug = useLigaStore((s) => s.activeSlug);
  const setActiveSlug = useLigaStore((s) => s.setActiveSlug);

  const { data: ligas = [] } = useQuery<LigaResumen[]>({
    queryKey: ['mis-ligas'],
    queryFn: () => api.get('/auth/mis-ligas').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  if (ligas.length <= 1) return null;

  const onChange = (slug: string) => {
    if (slug === activeSlug) return;
    setActiveSlug(slug);
    // resetQueries (no removeQueries): resetea al estado inicial —así no quedan
    // filas de la liga anterior— Y refetchea los observers activos, de modo que
    // la pantalla actual se actualiza in-place con la nueva liga (no solo al
    // navegar). Se excluye la lista de ligas, que no depende del tenant.
    qc.resetQueries({ predicate: (q) => q.queryKey[0] !== 'mis-ligas' });
  };

  return (
    <div className="px-3 pt-3">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Liga activa
      </label>
      <select
        value={activeSlug ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ligas.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
