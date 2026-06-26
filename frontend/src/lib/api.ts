import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useLigaStore } from '@/store/liga.store';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;

      // Liga activa del dashboard → X-Liga-Slug, SOLO en requests de datos.
      // Se excluye /publico/* (esas resuelven su liga por el slug de la URL, vía
      // ligaHeader explícito) para no contaminar el portal público si un admin
      // logueado lo visita. No pisa un header ya puesto explícitamente.
      const url = config.url ?? '';
      const activeSlug = useLigaStore.getState().activeSlug;
      const yaTieneSlug = !!(config.headers as any)['X-Liga-Slug'];
      if (activeSlug && !yaTieneSlug && !url.startsWith('/publico')) {
        (config.headers as any)['X-Liga-Slug'] = activeSlug;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token inválido o expirado: limpiar y mandar al login (excepto si ya estamos allí)
      if (!window.location.pathname.startsWith('/login')) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Header de tenant para el portal PÚBLICO: la liga se resuelve por el slug de la
 * URL (`/publico/:slug/...`), no por usuario. Se pasa explícito en cada request
 * público — NO globalmente — para no filtrar el slug a las llamadas del dashboard
 * (que comparten endpoints como `/publico/configuracion`).
 */
export function ligaHeader(slug?: string | null) {
  return slug ? { headers: { 'X-Liga-Slug': slug } } : undefined;
}

/**
 * Descarga un archivo desde un endpoint autenticado: lo pide como blob (con el
 * token vía interceptor) y dispara la descarga en el navegador con `filename`.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    if (data?.message) {
      if (Array.isArray(data.message)) return data.message.join(', ');
      return String(data.message);
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Error desconocido';
}
