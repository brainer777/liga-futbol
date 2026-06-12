'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export type Branding = {
  nombreLiga: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colorPrimario: string; // triple HSL "H S% L%"
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const FILE_BASE = API_BASE.replace(/\/api$/, '');

/** Convierte una URL relativa de /uploads en absoluta contra el host del backend. */
export function fileUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${FILE_BASE}${path}`;
}

/** Branding público (nombre, logo, favicon, color). Cacheado; se invalida al guardar. */
export function useBranding() {
  return useQuery<Branding>({
    queryKey: ['branding'],
    queryFn: () => api.get('/publico/configuracion').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

/** "#16a34a" → "142 70% 35%" (lo que consume la variable CSS --primary). */
export function hexToHslTriple(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** "142 70% 35%" → "#16a34a" (para el valor inicial del color picker). */
export function hslTripleToHex(triple: string): string {
  const match = triple.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return '#16a34a';
  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
