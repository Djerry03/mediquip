'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'customer' | 'admin';
  defaultQuartierId?: string;
  defaultPointRepere?: string;
  newsletterOptIn: boolean;
};

type AuthContextType = {
  user: User | null;
  /** `true` tant que la session n'a pas été vérifiée auprès de l'API. */
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    newsletterOptIn?: boolean;
  }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** La session HttpOnly est validée côté serveur au chargement. */
  const refresh = useCallback(async () => {
    try {
      setUser(await apiFetch<User>('/auth/me', { auth: true }));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      newsletterOptIn?: boolean;
    }) => {
      const res = await apiFetch<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', auth: true });
    } catch {
      // Même si l'API est hors ligne, on ferme l'interface locale. Le cookie
      // HttpOnly expirera à la fermeture du navigateur.
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    const updated = await apiFetch<User>('/auth/me', {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(patch),
    });
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateProfile,
      refresh,
    }),
    [user, loading, login, register, logout, updateProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
