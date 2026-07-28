import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe, API_BASE, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ApiObligation {
  id: string;
  title: string;
  description: string;
  regulation: string;
  jurisdiction?: string;
  department?: string;
  requirementLevel: string;
  status: string;
  deadline: string;
  assignedTo?: string[];
  assignedTeam?: string;
  priority: string;
  evidenceCount?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  regulation: string;
  department?: string;
  deadline: string;
  status: string;
  evidenceCount: number;
}

export interface ComplianceSummary {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  overallRate: number;
}

export interface ApiEvidence {
  id: string;
  obligationId: string;
  fileName: string;
  fileUrl?: string;
  uploadedBy: string;
  notes?: string;
  description?: string;
  uploadedAt: string;
}

export interface ComplianceAction {
  id: string;
  obligationId?: string;
  action: string;
  performedBy: string;
  timestamp: string;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
}

export interface HeatMapEntry {
  department: string;
  regulation: string;
  complianceRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  total: number;
}

export function useCompliance(statusFilter = 'all') {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [obligations, setObligations] = useState<ApiObligation[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [evidence, setEvidence] = useState<ApiEvidence[]>([]);
  const [auditActions, setAuditActions] = useState<ComplianceAction[]>([]);
  const [heatMap, setHeatMap] = useState<HeatMapEntry[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setObligations([]);
      setSummary(null);
      setEvidence([]);
      setAuditActions([]);
      setHeatMap([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [list, sum, ev, audit, heat, calendar] = await Promise.all([
        apiRequestSafe<{ obligations?: ApiObligation[] }>(`/compliance/obligations${query}`),
        apiRequestSafe<ComplianceSummary>('/compliance/summary'),
        apiRequestSafe<{ evidence?: ApiEvidence[] }>('/compliance/evidence'),
        apiRequestSafe<{ actions?: ComplianceAction[] }>('/compliance/audit-trail'),
        apiRequestSafe<{ heatMap?: HeatMapEntry[] }>('/compliance/heat-map'),
        apiRequestSafe<{ events?: CalendarEvent[] }>('/compliance/calendar'),
      ]);
      setObligations(Array.isArray(list.obligations) ? list.obligations : []);
      setSummary(sum);
      setEvidence(Array.isArray(ev.evidence) ? ev.evidence : []);
      setAuditActions(Array.isArray(audit.actions) ? audit.actions : []);
      setHeatMap(Array.isArray(heat.heatMap) ? heat.heatMap : []);
      setCalendarEvents(Array.isArray(calendar.events) ? calendar.events : []);
      setError(null);
    } catch (err) {
      setObligations([]);
      setSummary(null);
      setEvidence([]);
      setAuditActions([]);
      setHeatMap([]);
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const createObligation = async (data: {
    title: string;
    description?: string;
    regulation?: string;
    jurisdiction?: string;
    department?: string;
    requirementLevel?: string;
    deadline: string;
    assignedTo: string;
    status?: string;
  }) => {
    await apiRequest('/compliance/obligations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  const updateObligation = async (
    id: string,
    data: Partial<{ status: string; title: string; description: string }>
  ) => {
    try {
      await apiRequest(`/compliance/obligations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        throw new Error(err.message);
      }
      throw err;
    }
  };

  const uploadEvidence = async (
    obligationId: string,
    data: { fileName: string; notes?: string; fileUrl?: string }
  ) => {
    await apiRequest(`/compliance/obligations/${obligationId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  const exportReport = async () => {
    const response = await fetch(`${API_BASE}/compliance/obligations/export`, { credentials: 'include' });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'compliance-obligations.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return {
    obligations,
    summary,
    evidence,
    auditActions,
    heatMap,
    calendarEvents,
    loading,
    error,
    refresh: load,
    createObligation,
    updateObligation,
    uploadEvidence,
    exportReport,
  };
}
