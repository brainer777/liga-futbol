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
 *
 * `slug` (portal público): la liga viene de la URL `/publico/:slug`. Sin slug
 * (dashboard/login) resuelve por fallback/auth. El layout público monta una 2ª
 * instancia con su slug para que color/favicon/título sean por-liga incluso con
 * múltiples ligas (donde el fetch sin slug es fail-closed y no aplica nada).
 */
export function BrandingProvider({ slug }: { slug?: string } = {}) {
  const { data } = useBranding(slug);

  useEffect(() => {
    // Solo aplicamos si hay una liga REALMENTE resuelta (slug presente). Sin slug
    // y con 2+ ligas el backend devuelve defaults con slug null: en ese caso NO
    // tocamos nada, así la instancia con slug (dashboard/portal) manda y no hay
    // pelea de --primary entre dos providers. Con 1 liga el fallback sí trae slug.
    if (!data?.slug) return;
    const root = document.documentElement;
    if (data.colorPrimario) {
      root.style.setProperty('--primary', data.colorPrimario);
      root.style.setProperty('--ring', data.colorPrimario);
    }
    if (data.nombreLiga) document.title = slug ? data.nombreLiga : `${data.nombreLiga} — Panel`;
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
  }, [data, slug]);

  return null;
}
