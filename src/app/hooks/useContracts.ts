import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ApiContract {
  id: string;
  title: string;
  folderId?: string;
  type: string;
  status: string;
  counterparty?: string;
  contractValue?: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
  autoRenew: boolean;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  fileUrl: string;
  fileSize: number;
  content?: string;
  signedAt?: string;
  checkedOutBy?: string;
}

export interface ApiFolder {
  id: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  documentCount: number;
}

export interface ContractSummary {
  total: number;
  executed: number;
  pendingApproval: number;
  expiringSoon: number;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  usageCount: number;
}

export interface ContractApproval {
  id: string;
  contractId: string;
  submittedBy: string;
  approverName: string;
  status: string;
  comment?: string;
  createdAt: string;
}

export interface ExpiryAlert {
  id: string;
  title: string;
  expiryDate?: string;
  daysUntilExpiry: number | null;
  autoRenew: boolean;
}

export function useContracts(filters?: {
  folder?: string;
  status?: string;
  search?: string;
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [approvals, setApprovals] = useState<ContractApproval[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const folder = filters?.folder ?? 'all';
  const status = filters?.status ?? 'all';
  const search = filters?.search ?? '';

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setContracts([]);
      setFolders([]);
      setSummary(null);
      setTemplates([]);
      setApprovals([]);
      setExpiryAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder !== 'all') params.set('folder', folder);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';

      const [list, folderList, sum, tmpl, appr, exp] = await Promise.all([
        apiRequestSafe<{ contracts?: ApiContract[] }>(`/contracts${query}`),
        apiRequestSafe<{ folders?: ApiFolder[] }>('/contracts/folders'),
        apiRequestSafe<ContractSummary>('/contracts/summary'),
        apiRequestSafe<{ templates?: ContractTemplate[] }>('/contracts/templates'),
        apiRequestSafe<{ approvals?: ContractApproval[] }>('/contracts/approvals'),
        apiRequestSafe<{ alerts?: ExpiryAlert[] }>('/contracts/expiring'),
      ]);
      setContracts(Array.isArray(list.contracts) ? list.contracts : []);
      setFolders(Array.isArray(folderList.folders) ? folderList.folders : []);
      setSummary(sum);
      setTemplates(Array.isArray(tmpl.templates) ? tmpl.templates : []);
      setApprovals(Array.isArray(appr.approvals) ? appr.approvals : []);
      setExpiryAlerts(Array.isArray(exp.alerts) ? exp.alerts : []);
      setError(null);
    } catch (err) {
      setContracts([]);
      setFolders([]);
      setSummary(null);
      setTemplates([]);
      setApprovals([]);
      setExpiryAlerts([]);
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, folder, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const createContract = async (data: {
    title: string;
    type?: string;
    folderId?: string;
    counterparty?: string;
    contractValue?: number;
    expiryDate?: string;
    fileUrl?: string;
    content?: string;
    tags?: string[];
    status?: string;
  }) => {
    await apiRequest('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  const createFromTemplate = async (templateId: string, data: { counterparty?: string; title?: string }) => {
    await apiRequest(`/contracts/from-template/${templateId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  const checkoutContract = async (id: string) => {
    await apiRequest(`/contracts/${id}/checkout`, { method: 'POST', body: '{}' });
    await load();
  };

  const checkinContract = async (id: string) => {
    await apiRequest(`/contracts/${id}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ changeNotes: 'Checked in via Contract Management' }),
    });
    await load();
  };

  const signContract = async (id: string) => {
    await apiRequest(`/contracts/${id}/sign`, { method: 'POST', body: '{}' });
    await load();
  };

  const shareContract = async (id: string) => {
    return apiRequest<{ share?: { token?: string }; link?: string }>(`/contracts/${id}/shares`, {
      method: 'POST',
      body: JSON.stringify({ external: true, permission: 'view', expiresInDays: 7 }),
    });
  };

  const updateContract = async (
    id: string,
    data: Partial<{ title: string; status: string; counterparty: string; contractValue: number; tags: string[] }>
  ) => {
    await apiRequest(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    await load();
  };

  const getVersions = async (id: string) => {
    return apiRequest<{ versions?: Array<{ id: string; version: number; createdAt: string; changeNotes?: string }> }>(
      `/contracts/${id}/versions`
    );
  };

  const decideApproval = async (approvalId: string, status: 'approved' | 'rejected', comment?: string) => {
    await apiRequest(`/contracts/approvals/${approvalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    });
    await load();
  };

  const submitForApproval = async (id: string, approverName?: string) => {
    await apiRequest(`/contracts/${id}/submit-approval`, {
      method: 'POST',
      body: JSON.stringify({ approverName }),
    });
    await load();
  };

  const createTemplate = async (data: { name: string; type: string; description?: string; content?: string }) => {
    await apiRequest('/contracts/templates', { method: 'POST', body: JSON.stringify(data) });
    await load();
  };

  return {
    contracts,
    folders,
    summary,
    templates,
    approvals,
    expiryAlerts,
    loading,
    error,
    refresh: load,
    createContract,
    createFromTemplate,
    checkoutContract,
    checkinContract,
    signContract,
    shareContract,
    updateContract,
    getVersions,
    decideApproval,
    submitForApproval,
    createTemplate,
  };
}
