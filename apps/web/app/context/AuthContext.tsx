'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError, getToken, setToken } from '../lib/api';

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
  logout: () => void;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * La session est validée côté serveur au chargement : un jeton présent
   * dans le navigateur ne prouve rien tant que l'API ne l'a pas accepté.
   */
  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setUser(await apiFetch<User>('/auth/me', { auth: true }));
    } catch (err) {
      // Jeton expiré ou révoqué : on nettoie plutôt que de laisser une
      // session fantôme afficher une interface à laquelle l'API répondra 401.
      if (err instanceof ApiError && err.status === 401) setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
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
      const res = await apiFetch<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setToken(res.token);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
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
