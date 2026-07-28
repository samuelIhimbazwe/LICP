import { useCallback, useEffect, useState } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface AiSource {
  id: string;
  title: string;
  excerpt?: string;
  jurisdiction?: string;
  type?: string;
  url?: string;
  external?: boolean;
  module?: string;
  relevanceScore?: number;
}

export interface AiQueryResult {
  id: string;
  answer: string;
  summary?: string;
  recommendations?: string[];
  confidence: number;
  confidenceLevel: string;
  processingTimeMs?: number;
  sources: AiSource[];
  usedExternalLlm?: boolean;
  hasLocalSources?: boolean;
}

export interface AiRiskResult {
  id?: string;
  riskLevel: string;
  score: number;
  confidence: number;
  factors: Array<{
    name: string;
    severity: string;
    description?: string;
    likelihood?: string;
    impact?: string;
    mitigation: string;
  }>;
  recommendations: string[];
  complianceIssues?: Array<{
    id: string;
    title: string;
    severity: string;
    description: string;
    status?: string;
    category?: string;
  }>;
  processingTimeMs?: number;
}

export interface AiClauseResult {
  id?: string;
  riskLevel: string;
  score: number;
  confidence?: number;
  clauseType?: string;
  issues: Array<{
    type: string;
    severity: string;
    location: string;
    description?: string;
    recommendation: string;
  }>;
  suggestions: string[];
  alternativeLanguage?: string;
  flaggedTerms?: string[];
}

export interface AiCompareResult {
  id?: string;
  additions: number;
  deletions: number;
  modifications: number;
  similarityScore: number;
  changes: Array<{
    type: string;
    section: string;
    context: string;
    originalText?: string;
    newText?: string;
    significance?: string;
  }>;
  summary: string;
  originalText?: string;
  revisedText?: string;
}

export interface AiHistoryItem {
  id: string;
  query: string;
  response: string;
  confidence: number;
  createdAt: string;
  feedback?: string | null;
}

export interface AiStats {
  queriesToday: number;
  avgConfidence: number;
  avgResponseSeconds: number;
  helpfulRate: number;
  totalQueries: number;
}

export interface AiInsight {
  id: string;
  type: 'trend' | 'risk' | 'opportunity' | 'alert';
  title: string;
  description: string;
  sources: Array<string | { label: string; href: string }>;
  priority: 'high' | 'medium' | 'low';
}

export interface AiComplianceCheckResult {
  id?: string;
  query: string;
  summary: string;
  items: Array<{
    id: string;
    title: string;
    status: string;
    explanation: string;
    category: string;
  }>;
  regulations: Array<{ id: string; title: string; type?: string; jurisdiction?: string | null }>;
  processingTimeMs?: number;
}

export function useAI() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AiHistoryItem[]>([]);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);

  const loadHistory = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    try {
      const data = await apiRequest<{ history?: AiHistoryItem[] }>('/ai/history');
      setHistory(data.history ?? []);
    } catch {
      setHistory([]);
    }
  }, [authLoading, isAuthenticated]);

  const loadStats = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    try {
      const data = await apiRequest<{ stats: AiStats }>('/ai/stats');
      setStats(data.stats);
    } catch {
      setStats(null);
    }
  }, [authLoading, isAuthenticated]);

  const loadInsights = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    try {
      const data = await apiRequest<{ insights: AiInsight[] }>('/ai/insights');
      setInsights(data.insights ?? []);
    } catch {
      setInsights([]);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    loadHistory();
    loadStats();
    loadInsights();
  }, [loadHistory, loadStats, loadInsights]);

  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  };

  const query = (text: string) =>
    withLoading(async () => {
      const result = await apiRequest<AiQueryResult>('/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: text }),
      });
      await Promise.all([loadHistory(), loadStats()]);
      return result;
    });

  const complianceCheck = (text: string) =>
    withLoading(async () => {
      const result = await apiRequest<AiComplianceCheckResult>('/ai/compliance-check', {
        method: 'POST',
        body: JSON.stringify({ query: text }),
      });
      await Promise.all([loadHistory(), loadStats(), loadInsights()]);
      return result;
    });

  const assessRisk = (action: string) =>
    withLoading(async () => {
      const result = await apiRequest<AiRiskResult>('/ai/risk-assessment', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await Promise.all([loadHistory(), loadStats(), loadInsights()]);
      return result;
    });

  const analyzeClause = (clause: string) =>
    withLoading(async () => {
      const result = await apiRequest<AiClauseResult>('/ai/clause-analysis', {
        method: 'POST',
        body: JSON.stringify({ clause }),
      });
      await Promise.all([loadHistory(), loadStats()]);
      return result;
    });

  const compareDocuments = (docA: string, docB: string) =>
    withLoading(async () => {
      const result = await apiRequest<AiCompareResult>('/ai/document-compare', {
        method: 'POST',
        body: JSON.stringify({ docA, docB }),
      });
      await Promise.all([loadHistory(), loadStats()]);
      return result;
    });

  const sendFeedback = async (queryId: string, helpful: boolean, comment?: string) => {
    await apiRequest('/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ queryId, helpful, comment }),
    });
    await loadStats();
  };

  const loadHistoryItem = async (id: string) => {
    const data = await apiRequest<{ query: AiHistoryItem & { sources?: unknown; answer?: string } }>(
      `/ai/history/${id}`
    );
    return data.query;
  };

  return {
    query,
    complianceCheck,
    assessRisk,
    analyzeClause,
    compareDocuments,
    sendFeedback,
    loadHistoryItem,
    history,
    stats,
    insights,
    loading,
    refreshHistory: loadHistory,
    refreshStats: loadStats,
    refreshInsights: loadInsights,
    ApiError,
  };
}
