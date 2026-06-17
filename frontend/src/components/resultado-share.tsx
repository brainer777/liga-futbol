'use client';

import * as React from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Loader2 } from 'lucide-react';
import { useBranding, fileUrl } from '@/lib/branding';
import { Button } from '@/components/ui/button';

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

function Escudo({ src, e }: { src: string | null; e: EquipoCard }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-[150px] w-[150px] object-contain" />;
  }
  return (
    <div className="h-[150px] w-[150px] rounded-full bg-white/15 flex items-center justify-center text-white font-extrabold text-4xl">
      {inicial(e)}
    </div>
  );
}

/** La tarjeta 1080×1080 lista para Instagram (post cuadrado). */
const Card = React.forwardRef<
  HTMLDivElement,
  { data: ResultadoShareData; ligaNombre: string; ligaLogo: string | null; localSrc: string | null; visitanteSrc: string | null }
>(function Card({ data, ligaNombre, ligaLogo, localSrc, visitanteSrc }, ref) {
  const fechaTxt = data.fecha ? new Date(data.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <div
      ref={ref}
      style={{ width: 1080, height: 1080 }}
      className="bg-primary text-white flex flex-col items-center justify-between p-16 relative overflow-hidden"
    >
      {/* Header: liga */}
      <div className="flex flex-col items-center gap-4">
        {ligaLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ligaLogo} alt="" className="h-[110px] w-[110px] object-contain" />
        ) : null}
        <div className="text-3xl font-bold tracking-wide text-center">{ligaNombre}</div>
        <div className="text-lg font-medium uppercase tracking-[0.3em] text-white/70">Resultado final</div>
      </div>

      {/* Marcador */}
      <div className="flex items-center justify-center gap-10 w-full">
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={localSrc} e={data.local} />
          <div className="text-3xl font-bold text-center leading-tight line-clamp-2">{data.local.nombre}</div>
        </div>
        <div className="flex items-center gap-4 text-[120px] font-black leading-none tabular-nums">
          <span>{data.golesLocal}</span>
          <span className="text-white/50 text-7xl">-</span>
          <span>{data.golesVisitante}</span>
        </div>
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={visitanteSrc} e={data.visitante} />
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

  const descargar = async () => {
    if (!cardRef.current) return;
    setBajando(true);
    try {
      const url = await toPng(cardRef.current, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a');
      const slug = `${data.local.sigla || data.local.nombre}-${data.visitante.sigla || data.visitante.nombre}`
        .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `resultado-${slug}.png`;
      a.href = url;
      a.click();
    } catch (e) {
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

        {/* Preview: la tarjeta real es 1080px; se muestra escalada. El export apunta al nodo real, no al escalado. */}
        <div className="rounded-md border overflow-hidden bg-muted/30 flex items-center justify-center" style={{ height: 380 }}>
          <div style={{ width: 1080, height: 1080, transform: 'scale(0.35)', transformOrigin: 'center' }}>
            <Card
              ref={cardRef}
              data={data}
              ligaNombre={branding?.nombreLiga ?? 'Liga de Fútbol'}
              ligaLogo={ligaLogo}
              localSrc={localSrc}
              visitanteSrc={visitanteSrc}
            />
          </div>
        </div>

        <Button className="w-full mt-3" onClick={descargar} disabled={prep || bajando}>
          {prep || bajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {prep ? 'Preparando…' : bajando ? 'Generando…' : 'Descargar PNG (1080×1080)'}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">Post cuadrado listo para Instagram.</p>
      </div>
    </div>
  );
}
