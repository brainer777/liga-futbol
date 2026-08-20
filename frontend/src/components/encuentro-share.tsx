'use client';

import * as React from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Loader2 } from 'lucide-react';
import { useBranding, fileUrl } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  EquipoCard, Formato, FORMATOS, toDataUrl, Escudo, MarcoMiranda,
} from './resultado-share';

export type EncuentroShareData = {
  local: EquipoCard;
  visitante: EquipoCard;
  torneo: string;
  categoria?: string | null;
  fecha?: string | null;
  hora?: string | null;
  sede?: string | null;
  jornada?: number | null;
};

/** Tarjeta de anuncio del próximo partido (sin marcador todavía). */
const Card = React.forwardRef<
  HTMLDivElement,
  {
    data: EncuentroShareData;
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
        'bg-slate-50 text-slate-900 flex flex-col items-center relative overflow-hidden',
        formato === 'historia' ? 'justify-center gap-32 p-20' : 'justify-between p-16',
      )}
    >
      <MarcoMiranda pos="top" />

      <div className="flex flex-col items-center gap-4">
        {ligaLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ligaLogo} alt="" style={{ height: 110, width: 110 }} className="object-contain" />
        ) : null}
        <div className="text-3xl font-bold tracking-wide text-center">{ligaNombre}</div>
        <div className="text-lg font-medium uppercase tracking-[0.3em] text-slate-400">Próximo partido</div>
      </div>

      <div className={cn('flex items-center justify-center w-full', formato === 'historia' ? 'gap-6' : 'gap-10')}>
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={localSrc} e={data.local} size={f.escudo} />
          <div className="text-3xl font-bold text-center leading-tight line-clamp-2">{data.local.nombre}</div>
        </div>
        <div className="font-black leading-none text-slate-300 text-6xl">VS</div>
        <div className="flex flex-col items-center gap-5 flex-1 min-w-0">
          <Escudo src={visitanteSrc} e={data.visitante} size={f.escudo} />
          <div className="text-3xl font-bold text-center leading-tight line-clamp-2">{data.visitante.nombre}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        {(fechaTxt || data.hora) && (
          <div className="text-4xl font-bold">
            {[fechaTxt, data.hora].filter(Boolean).join(' · ')}
          </div>
        )}
        {data.sede && <div className="text-2xl text-slate-500">{data.sede}</div>}
        <div className="text-2xl font-semibold mt-2">{data.torneo}</div>
        <div className="text-lg text-slate-500">
          {[data.categoria, data.jornada != null ? `Fecha ${data.jornada}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>

      <MarcoMiranda pos="bottom" />
    </div>
  );
});

export function EncuentroShareModal({
  data,
  onClose,
  ligaSlug,
}: {
  data: EncuentroShareData;
  onClose: () => void;
  ligaSlug?: string;
}) {
  const { data: branding } = useBranding(ligaSlug);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [formato, setFormato] = React.useState<Formato>('post');
  const [localSrc, setLocalSrc] = React.useState<string | null>(null);
  const [visitanteSrc, setVisitanteSrc] = React.useState<string | null>(null);
  const [ligaLogo, setLigaLogo] = React.useState<string | null>(null);
  const [prep, setPrep] = React.useState(true);
  const [bajando, setBajando] = React.useState(false);

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
      a.download = `encuentro-${slug}-${formato}.png`;
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
          <h3 className="font-semibold">Anuncio del próximo partido</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

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
