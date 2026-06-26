'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Liga del usuario (de `GET /auth/mis-ligas`), para el selector y el init. */
export type LigaResumen = { id: string; nombre: string; slug: string };

/**
 * Liga activa del dashboard (multi-liga). Su slug se transporta en el header
 * `X-Liga-Slug` (lo adjunta el interceptor de `lib/api` a las requests de datos,
 * NO a las `/publico/*`). Se persiste para sobrevivir refrescos; el layout del
 * dashboard valida que el slug pertenezca a las ligas del usuario y lo resetea
 * si no (p.ej. tras cambiar de usuario). Se limpia en logout.
 */
type LigaState = {
  activeSlug: string | null;
  setActiveSlug: (slug: string) => void;
  reset: () => void;
};

export const useLigaStore = create<LigaState>()(
  persist(
    (set) => ({
      activeSlug: null,
      setActiveSlug: (slug) => set({ activeSlug: slug }),
      reset: () => set({ activeSlug: null }),
    }),
    {
      name: 'liga-futbol-liga-activa',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
