'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href="/publico" className="flex items-center gap-2 font-bold">
            <span className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">⚽</span>
            <span>
              Liga de Fútbol
              <span className="block text-[11px] font-normal text-muted-foreground leading-none">Portal público</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <LogIn className="h-4 w-4" /> Ingresar
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Liga de Fútbol — resultados y posiciones en vivo
      </footer>
    </div>
  );
}
