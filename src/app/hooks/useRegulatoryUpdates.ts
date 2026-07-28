import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ApiRegulatoryUpdate {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  impactLevel: string;
  jurisdiction?: string;
  status: string;
  source?: string;
  isRead: boolean;
  datePublished: string;
  effectiveDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  affectedRegulations?: string[];
}

export interface RegulatorySummary {
  pendingReview: number;
  actionRequired: number;
  reviewed: number;
  implemented: number;
  unread: number;
  total: number;
}

export function useRegulatoryUpdates(category = 'all', status = 'all') {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [updates, setUpdates] = useState<ApiRegulatoryUpdate[]>([]);
  const [summary, setSummary] = useState<RegulatorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setUpdates([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      const [list, sum] = await Promise.all([
        apiRequestSafe<{ updates?: ApiRegulatoryUpdate[] }>(`/regulatory/updates${query}`),
        apiRequestSafe<RegulatorySummary>('/regulatory/updates/summary'),
      ]);
      setUpdates(Array.isArray(list.updates) ? list.updates : []);
      setSummary(sum);
      setError(null);
    } catch (err) {
      setUpdates([]);
      setSummary(null);
      setError(err instanceof Error ? err.message : 'Failed to load regulatory updates');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, category, status]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewUpdate = async (id: string, status: string) => {
    await apiRequest(`/regulatory/updates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, isRead: true }),
    });
    await load();
  };

  const createObligationFromUpdate = async (id: string) => {
    await apiRequest(`/regulatory/updates/${id}/create-obligation`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await load();
  };

  const createUpdate = async (data: {
    title: string;
    description: string;
    category: string;
    jurisdiction?: string;
    source?: string;
    impact?: string;
    effectiveDate?: string;
  }) => {
    await apiRequest('/regulatory/updates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  return {
    updates,
    summary,
    loading,
    error,
    refresh: load,
    reviewUpdate,
    createObligationFromUpdate,
    createUpdate,
  };
}
