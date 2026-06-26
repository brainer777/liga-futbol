'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useLigaStore } from './liga.store';

export type Rol = { id: string; nombre: string; ligaId: string | null };
export type AuthUser = {
  id: string;
  nombre: string;
  email: string;
  roles: Rol[];
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (token, user) => set({ accessToken: token, user }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ accessToken: null, user: null });
        useLigaStore.getState().reset(); // no arrastrar la liga activa al próximo usuario
      },
    }),
    {
      name: 'liga-futbol-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
