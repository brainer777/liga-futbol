'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useBranding, fileUrl } from '@/lib/branding';
import { BrandingProvider } from '@/components/branding-provider';

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { data: branding } = useBranding(slug);
  const nombre = branding?.nombreLiga ?? 'Liga de Fútbol';
  const base = `/publico/${slug}`;
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Color/favicon/título por-liga (resueltos por el slug de la URL). */}
      <BrandingProvider slug={slug} />
      <header className="border-b bg-card print:hidden">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href={base} className="flex items-center gap-2 font-bold">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(branding.logoUrl)!} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <span className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">⚽</span>
            )}
            <span>
              {nombre}
              <span className="block text-[11px] font-normal text-muted-foreground leading-none">Portal público</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href={base} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent">
              Torneos
            </Link>
            <Link href={`${base}/estadisticas`} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent">
              Estadísticas
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <LogIn className="h-4 w-4" /> Ingresar
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground print:hidden">
        {nombre} — resultados y posiciones en vivo
      </footer>
    </div>
  );
}
