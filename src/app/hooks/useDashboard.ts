import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useDashboard(pollMs = 30000) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await apiRequest<Record<string, unknown>>('/dashboard');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs, user?.role]);

  return { data, loading, error, refresh: load };
}
