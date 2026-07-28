import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ApiIntegration {
  id: string;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
  recordsSynced: number;
  errorCount: number;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string;
  createdAt: string;
}

export interface IntegrationLog {
  id: string;
  action: string;
  message?: string;
  integrationId?: string;
  timestamp: string;
  status?: string;
}

export function useIntegrations() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setIntegrations([]);
      setApiKeys([]);
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, keys, logList] = await Promise.all([
        apiRequestSafe<{ integrations?: ApiIntegration[] }>('/integrations'),
        apiRequestSafe<{ keys?: ApiKey[] }>('/integrations/keys/list').catch(() => ({ keys: [] })),
        apiRequestSafe<{ logs?: IntegrationLog[] }>('/integrations/logs').catch(() => ({ logs: [] })),
      ]);
      setIntegrations(list.integrations ?? []);
      setApiKeys(keys.keys ?? []);
      setLogs(logList.logs ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const testConnection = async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/integrations/${id}/test`, {
      method: 'POST',
      body: '{}',
    });
  };

  const syncIntegration = async (id: string) => {
    return apiRequest(`/integrations/${id}/sync`, { method: 'POST', body: '{}' });
  };

  const updateIntegration = async (
    id: string,
    body: {
      status?: 'connected' | 'disconnected' | 'configuring' | 'error';
      isActive?: boolean;
      config?: Record<string, unknown>;
    }
  ) => {
    const result = await apiRequest<{ integration: ApiIntegration }>(`/integrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
    return result;
  };

  const disableIntegration = async (id: string) => {
    const result = await apiRequest(`/integrations/${id}/disable`, { method: 'POST', body: '{}' });
    await load();
    return result;
  };

  const createIntegration = async (body: {
    name: string;
    type: 'regulatory' | 'e_sign' | 'dms' | 'erp_hris';
    endpoint?: string;
    apiKey?: string;
    syncFrequency?: 'daily' | 'weekly' | 'hourly';
  }) => {
    const result = await apiRequest<{ integration: ApiIntegration }>('/integrations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await load();
    return result;
  };

  const createApiKey = async (name: string) => {
    return apiRequest<{ key: { id: string; name: string; token: string; prefix: string } }>(
      '/integrations/keys',
      { method: 'POST', body: JSON.stringify({ name }) }
    );
  };

  const revokeApiKey = async (id: string) => {
    await apiRequest(`/integrations/keys/${id}`, { method: 'DELETE' });
    await load();
  };

  return {
    integrations,
    apiKeys,
    logs,
    loading,
    error,
    refresh: load,
    testConnection,
    syncIntegration,
    updateIntegration,
    disableIntegration,
    createIntegration,
    createApiKey,
    revokeApiKey,
  };
}
