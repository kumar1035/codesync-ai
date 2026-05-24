'use client';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user, tokens } = res.data.data;
    setAuth(user, tokens.accessToken, tokens.refreshToken);
    router.push('/dashboard');
    return user;
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await api.post('/api/auth/register', { username, email, password });
    const { user, tokens } = res.data.data;
    setAuth(user, tokens.accessToken, tokens.refreshToken);
    router.push('/dashboard');
    return user;
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    router.push('/');
  };

  return { user, isAuthenticated, login, register, logout };
}
