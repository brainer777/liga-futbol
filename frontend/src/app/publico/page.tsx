'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/lib/branding';

/**
 * `/publico` sin slug. El portal público se sirve bajo `/publico/:slug/...`; esta
 * página resuelve la liga por defecto y redirige a su slug.
 *
 * Sin slug, `/publico/configuracion` cae al fallback del backend: si hay UNA sola
 * liga devuelve su slug → redirigimos. Con 2+ ligas el fallback da error
 * (fail-closed) y no listamos ligas (los enlaces públicos llevan el slug); se
 * muestra un aviso para que usen la URL de su liga.
 */
export default function PublicoIndexPage() {
  const router = useRouter();
  const { data: branding, isLoading, isError } = useBranding();

  React.useEffect(() => {
    if (branding?.slug) router.replace(`/publico/${branding.slug}`);
  }, [branding?.slug, router]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold">Indicá tu liga</h1>
          <p className="text-sm text-muted-foreground">
            Accedé al portal con el enlace de tu liga (<code>/publico/tu-liga</code>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
      {isLoading ? 'Cargando…' : 'Redirigiendo…'}
    </div>
  );
}
