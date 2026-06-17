'use client';

import * as React from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Loader2 } from 'lucide-react';
import { useBranding, fileUrl } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EquipoCard = {
  nombre: string;
  sigla?: string | null;
  logoUrl?: string | null; // logo del equipo
  clubLogoUrl?: string | null; // fallback: logo del club
};

export type ResultadoShareData = {
  local: EquipoCard;
  visitante: EquipoCard;
  golesLocal: number;
  golesVisitante: number;
  torneo: string;
  categoria?: string | null;
  fecha?: string | null;
  jornada?: number | null;
};

type Formato = 'post' | 'historia';

// Dimensiones y tamaños por formato. "post" = cuadrado feed; "historia" = vertical 9:16.
const FORMATOS: Record<Formato, { w: number; h: number; escudo: number; marcador: string; previewScale: number; label: string }> = {
  post: { w: 1080, h: 1080, escudo: 150, marcador: 'text-[120px]', previewScale: 0.34, label: 'Post 1080×1080' },
  historia: { w: 1080, h: 1920, escudo: 300, marcador: 'text-[200px]', previewScale: 0.2, label: 'Historia 1080×1920' },
};

/**
 * Convierte una URL de imagen a data URL para poder incrustarla en el PNG sin
 * que el canvas quede "tainted" por origen cruzado (los /uploads viven en la
 * API, otro origen que el front). Si falla (CORS / 404), devuelve null y la
 * tarjeta cae al placeholder con la inicial.
 */
async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function inicial(e: EquipoCard): string {
  return (e.sigla || e.nombre || '?').trim().slice(0, 3).toUpperCase();
}

function Escudo({ src, e, size }: { src: string | null; e: EquipoCard; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={{ height: size, width: size }} className="object-contain" />;
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-full bg-white/15 flex items-center justify-center text-white font-extrabold text-4xl"
    >
      {inicial(e)}
    </div>
  );
}

/** La tarjeta lista para redes (post cuadrado o historia 9:16). */
const Card = React.forwardRef<
  HTMLDivElement,
  {
    data: ResultadoShareData;
    formato: Formato;
    ligaNombre: string;
    ligaLogo: string | null;
    localSrc: string | null;
    visitanteSrc: string | null;
  }
>(function Card({ data, formato, ligaNombre, ligaLogo, localSrc, visitanteSrc }, ref) {
  const f = FORMATOS[formato];
  const fechaTxt = data.fecha
    ? new Date(data.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  return (
    <div
      ref={ref}
      style={{ width: f.w, height: f.h }}
      className={cn(
        'bg-primary text-white flex flex-col items-center relative overflow-hidden',
        formato === 'historia' ? 'justify-center gap-32 p-20' : 'justify-between p-16',
      )}
    >
      {/* Header: liga */}
      <div className="flex flex-col items-center gap-4">
        {ligaLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ligaLogo} alt="" style={{ height: 110, width: 110 }} className="object-contain" />
        ) : null}
        <div className="text-3xl font-bold tracking-wide text-center">{ligaNombre}</div>
        <div className="text-lg font-medium uppercase tracking-[0.3em] text-white/70">Resultado final</div>
      </div>

      {/* Marcador */}
      <div className={cn('flex items-center justify-center w-full', formato === 'historia' ? 'gap-6' : 'gap-10')}>
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={localSrc} e={data.local} size={f.escudo} />
          <div className="text-3xl font-bold text-center leading-tight line-clamp-2">{data.local.nombre}</div>
        </div>
        <div className={cn('flex items-center gap-4 font-black leading-none tabular-nums', f.marcador)}>
          <span>{data.golesLocal}</span>
          <span className="text-white/50 text-7xl">-</span>
          <span>{data.golesVisitante}</span>
        </div>
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={visitanteSrc} e={data.visitante} size={f.escudo} />
          <div className="text-3xl font-bold text-center leading-tight line-clamp-2">{data.visitante.nombre}</div>
        </div>
      </div>

      {/* Footer: torneo */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-2xl font-semibold">{data.torneo}</div>
        <div className="text-lg text-white/70">
          {[data.categoria, data.jornada != null ? `Fecha ${data.jornada}` : null, fechaTxt].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
});

export function ResultadoShareModal({ data, onClose }: { data: ResultadoShareData; onClose: () => void }) {
  const { data: branding } = useBranding();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [formato, setFormato] = React.useState<Formato>('post');
  const [localSrc, setLocalSrc] = React.useState<string | null>(null);
  const [visitanteSrc, setVisitanteSrc] = React.useState<string | null>(null);
  const [ligaLogo, setLigaLogo] = React.useState<string | null>(null);
  const [prep, setPrep] = React.useState(true);
  const [bajando, setBajando] = React.useState(false);

  // Prefetch de logos → data URL (evita el canvas "tainted" al exportar).
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const [l, v, lg] = await Promise.all([
        toDataUrl(fileUrl(data.local.logoUrl ?? data.local.clubLogoUrl)),
        toDataUrl(fileUrl(data.visitante.logoUrl ?? data.visitante.clubLogoUrl)),
        toDataUrl(fileUrl(branding?.logoUrl)),
      ]);
      if (!vivo) return;
      setLocalSrc(l); setVisitanteSrc(v); setLigaLogo(lg); setPrep(false);
    })();
    return () => { vivo = false; };
  }, [data, branding?.logoUrl]);

  const f = FORMATOS[formato];

  const descargar = async () => {
    if (!cardRef.current) return;
    setBajando(true);
    try {
      const url = await toPng(cardRef.current, { width: f.w, height: f.h, pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a');
      const slug = `${data.local.sigla || data.local.nombre}-${data.visitante.sigla || data.visitante.nombre}`
        .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `resultado-${slug}-${formato}.png`;
      a.href = url;
      a.click();
    } catch {
      alert('No se pudo generar la imagen. Reintentá en un momento.');
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Imagen para redes</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Selector de formato */}
        <div className="flex gap-1 rounded-md border p-1 mb-3">
          {(Object.keys(FORMATOS) as Formato[]).map((k) => (
            <button
              key={k}
              onClick={() => setFormato(k)}
              className={cn(
                'flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors',
                formato === k ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {FORMATOS[k].label}
            </button>
          ))}
        </div>

        {/* Preview: la tarjeta real mide w×h; se muestra escalada. El export apunta al nodo real, no al escalado. */}
        <div className="rounded-md border overflow-hidden bg-muted/30 flex items-center justify-center" style={{ height: 420 }}>
          <div style={{ width: f.w, height: f.h, transform: `scale(${f.previewScale})`, transformOrigin: 'center' }}>
            <Card
              ref={cardRef}
              data={data}
              formato={formato}
              ligaNombre={branding?.nombreLiga ?? 'Liga de Fútbol'}
              ligaLogo={ligaLogo}
              localSrc={localSrc}
              visitanteSrc={visitanteSrc}
            />
          </div>
        </div>

        <Button className="w-full mt-3" onClick={descargar} disabled={prep || bajando}>
          {prep || bajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {prep ? 'Preparando…' : bajando ? 'Generando…' : `Descargar PNG (${formato === 'post' ? '1080×1080' : '1080×1920'})`}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {formato === 'post' ? 'Post cuadrado para el feed.' : 'Historia vertical para stories.'}
        </p>
      </div>
    </div>
  );
}
