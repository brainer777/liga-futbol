'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useLigaStore, type LigaResumen } from '@/store/liga.store';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/dashboard/sidebar';
import { BrandingProvider } from '@/components/branding-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const activeSlug = useLigaStore((s) => s.activeSlug);
  const setActiveSlug = useLigaStore((s) => s.setActiveSlug);

  useEffect(() => {
    // Zustand persist hidrata async; nos aseguramos de que esté listo
    const t = setTimeout(() => {
      if (!useAuthStore.getState().accessToken) {
        router.replace('/login');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [router]);

  // Ligas a las que el usuario puede acceder (define cuál es la liga activa).
  const { data: ligas, isLoading, isError } = useQuery<LigaResumen[]>({
    queryKey: ['mis-ligas'],
    queryFn: () => api.get('/auth/mis-ligas').then((r) => r.data),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  // La liga activa debe pertenecer al usuario; si no (primer ingreso, slug viejo
  // de otro usuario), se fija a la primera. Garantiza un slug concreto antes de
  // dejar pasar cualquier request de datos.
  useEffect(() => {
    if (!ligas || ligas.length === 0) return;
    if (!ligas.some((l) => l.slug === activeSlug)) {
      setActiveSlug(ligas[0].slug);
    }
  }, [ligas, activeSlug, setActiveSlug]);

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Redirigiendo al login…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        No se pudieron cargar tus ligas.
      </div>
    );
  }

  if (ligas && ligas.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-muted-foreground">Tu usuario no tiene ligas asignadas.</p>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="text-sm text-primary hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  // Gate: esperar a tener un slug válido antes de renderizar el dashboard, así
  // ninguna query de datos sale con una liga inválida (evita 403 en multi-liga).
  const ligaLista = !!ligas && ligas.some((l) => l.slug === activeSlug);
  if (isLoading || !ligaLista) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Branding por liga activa (explícito; el global sin slug es fail-closed en multi-liga). */}
      <BrandingProvider slug={activeSlug ?? undefined} />
      <Sidebar />
      <main className="flex-1 overflow-x-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
