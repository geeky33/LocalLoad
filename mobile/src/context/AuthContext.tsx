import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { tokenStorage } from '../services/tokenStorage';
import { User } from '../types';

interface Stats {
  crowdReports: number;
  delayReports: number;
}

interface AuthValue {
  user: User | null;
  stats: Stats | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setStats(data.stats);
  }, []);

  // Restore the session on launch if a token is stored.
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (token) {
          await refresh();
          connectSocket(token);
        }
      } catch {
        await tokenStorage.clear(); // expired / invalid token
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const startSession = useCallback(async (token: string, u: User) => {
    await tokenStorage.set(token);
    setUser(u);
    connectSocket(token);
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      stats,
      loading,
      refresh,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        await startSession(data.token, data.user);
      },
      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        await startSession(data.token, data.user);
      },
      logout: async () => {
        await tokenStorage.clear();
        disconnectSocket();
        setUser(null);
        setStats(null);
      },
    }),
    [user, stats, loading, refresh, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
