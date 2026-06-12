'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function RootPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) router.replace('/dashboard');
    else router.replace('/login');
  }, [accessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      ⚽ Liga de Fútbol — cargando…
    </div>
  );
}
