'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => (s as any).hasHydrated);

  useEffect(() => {
    // Zustand persist hydra async; nos aseguramos de que esté listo
    const t = setTimeout(() => {
      if (!useAuthStore.getState().accessToken) {
        router.replace('/login');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [router]);

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Redirigiendo al login…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-x-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
