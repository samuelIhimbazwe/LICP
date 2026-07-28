import { useCallback, useEffect, useState } from 'react';
import { apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  AuditReadinessMetrics,
  ComplianceMetrics,
  DocumentMetrics,
  ExecutiveSummary,
  ObligationTrend,
  RegulatoryImpactTrend,
  RegulatoryMetrics,
  TeamPerformanceMetrics,
} from '../types/analytics';

export function useAnalytics() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null);
  const [regulatoryMetrics, setRegulatoryMetrics] = useState<RegulatoryMetrics | null>(null);
  const [documentMetrics, setDocumentMetrics] = useState<DocumentMetrics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceMetrics[]>([]);
  const [obligationTrends, setObligationTrends] = useState<ObligationTrend[]>([]);
  const [regulatoryImpactTrends, setRegulatoryImpactTrends] = useState<RegulatoryImpactTrend[]>([]);
  const [auditReadinessMetrics, setAuditReadinessMetrics] = useState<AuditReadinessMetrics | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const overview = await apiRequestSafe<{
        compliance?: ComplianceMetrics;
        regulatory?: RegulatoryMetrics;
        documents?: DocumentMetrics;
        obligationTrends?: ObligationTrend[];
        regulatoryImpactTrends?: RegulatoryImpactTrend[];
        executiveSummary?: ExecutiveSummary;
        auditReadiness?: AuditReadinessMetrics;
        team?: TeamPerformanceMetrics[];
      }>('/analytics/overview');

      if (overview) {
        setComplianceMetrics(overview.compliance ?? null);
        setRegulatoryMetrics(overview.regulatory ?? null);
        setDocumentMetrics(overview.documents ?? null);
        setObligationTrends(overview.obligationTrends ?? []);
        setRegulatoryImpactTrends(overview.regulatoryImpactTrends ?? []);
        setExecutiveSummary(overview.executiveSummary ?? null);
        setAuditReadinessMetrics(overview.auditReadiness ?? null);
        setTeamPerformance(overview.team ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    error,
    complianceMetrics,
    regulatoryMetrics,
    documentMetrics,
    teamPerformance,
    obligationTrends,
    regulatoryImpactTrends,
    auditReadinessMetrics,
    executiveSummary,
    refresh: load,
  };
}
