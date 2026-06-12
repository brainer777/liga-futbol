'use client';

import { useEffect } from 'react';
import { useBranding, fileUrl } from '@/lib/branding';

/**
 * Aplica el branding a toda la app (no renderiza UI). Va dentro de Providers,
 * así cubre dashboard, login y portal público con un solo fetch público.
 * - Inyecta el color primario en la variable CSS --primary (y --ring) del
 *   <html>; el estilo inline gana sobre :root y .dark, así que el color
 *   elegido manda en ambos temas.
 * - Setea el título de la pestaña y el favicon dinámico.
 */
export function BrandingProvider() {
  const { data } = useBranding();

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    if (data.colorPrimario) {
      root.style.setProperty('--primary', data.colorPrimario);
      root.style.setProperty('--ring', data.colorPrimario);
    }
    if (data.nombreLiga) document.title = `${data.nombreLiga} — Panel`;
    const href = fileUrl(data.faviconUrl);
    if (href) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = href;
    }
  }, [data]);

  return null;
}
