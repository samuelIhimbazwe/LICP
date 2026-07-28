import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  linkUrl?: string;
  timestamp: string;
}

export function useNotifications(options?: { limit?: number; pollMs?: number }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const limit = options?.limit ?? 50;
  const pollMs = options?.pollMs ?? 30000;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        apiRequestSafe<{ notifications?: AppNotification[] }>(`/notifications?limit=${limit}`),
        apiRequestSafe<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(Array.isArray(list.notifications) ? list.notifications : []);
      setUnreadCount(count.count ?? 0);
      setError(null);
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, limit]);

  useEffect(() => {
    if (authLoading) return;
    load();
    if (!pollMs || !isAuthenticated) return;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs, authLoading, isAuthenticated]);

  const markRead = async (id: string) => {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    await load();
  };

  const markAllRead = async () => {
    await apiRequest('/notifications/mark-all-read', { method: 'POST' });
    await load();
  };

  return { notifications, unreadCount, loading, error, refresh: load, markRead, markAllRead };
}
