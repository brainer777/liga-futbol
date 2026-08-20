'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useBranding, fileUrl } from '@/lib/branding';

type LigaPublica = { nombre: string; slug: string; logoUrl: string | null };

/**
 * `/publico` sin slug. El portal público se sirve bajo `/publico/:slug/...`; esta
 * página resuelve la liga por defecto y redirige a su slug.
 *
 * Sin slug, `/publico/configuracion` cae al fallback del backend: si hay UNA sola
 * liga devuelve su slug → redirigimos. Con 2+ ligas el fallback no elige (branding
 * tolerante, slug null) y esta página lista las ligas activas para que el
 * visitante elija la suya.
 */
export default function PublicoIndexPage() {
  const router = useRouter();
  const { data: branding, isLoading, isError } = useBranding();
  const sinLigaUnica = isError || (branding && !branding.slug);

  const { data: ligas = [], isLoading: ligasLoading } = useQuery<LigaPublica[]>({
    queryKey: ['publico-ligas'],
    queryFn: () => api.get('/publico/ligas').then((r) => r.data),
    enabled: !!sinLigaUnica,
  });

  React.useEffect(() => {
    if (branding?.slug) router.replace(`/publico/${branding.slug}`);
  }, [branding?.slug, router]);

  if (sinLigaUnica) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <h1 className="text-lg font-semibold text-center">Elegí tu liga</h1>
          {ligasLoading ? (
            <p className="text-sm text-muted-foreground text-center">Cargando…</p>
          ) : ligas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No hay ligas disponibles por ahora.
            </p>
          ) : (
            <div className="space-y-2">
              {ligas.map((l) => (
                <Link
                  key={l.slug}
                  href={`/publico/${l.slug}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {l.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fileUrl(l.logoUrl) ?? undefined} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="font-medium">{l.nombre}</span>
                </Link>
              ))}
            </div>
          )}
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
