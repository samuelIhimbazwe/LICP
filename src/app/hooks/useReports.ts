import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  audience: string;
  sections: string[];
  recommendedFormats: string[];
  scheduleHint: string;
}

export interface ReportSectionMeta {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface ReportPreview {
  title: string;
  organizationName: string;
  generatedAt: string;
  periodLabel: string;
  sections: Array<{
    id: string;
    title: string;
    summary?: string;
    metrics?: Array<{ label: string; value: string }>;
    bullets?: string[];
    tables?: Array<{ title: string; headers: string[]; rows: string[][] }>;
  }>;
}

export interface ReportFilters {
  dateRange?: 'last-week' | 'last-month' | 'last-quarter' | 'last-year' | 'custom';
  jurisdiction?: string;
  department?: string;
  status?: string;
}

export function useReports() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [customReports, setCustomReports] = useState<Array<{ id: string; name: string; sections: string[] }>>([]);
  const [generatedReports, setGeneratedReports] = useState<
    Array<{ id: string; reportName: string; format: string; createdAt: string; fileSize: number }>
  >([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [sections, setSections] = useState<ReportSectionMeta[]>([]);
  const [scheduledReports, setScheduledReports] = useState<
    Array<{
      id: string;
      reportName: string;
      frequency: string;
      format: string;
      recipients: string[];
      nextRunDate: string;
      lastRunDate?: string;
      isActive: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [custom, generated, catalog, scheduled] = await Promise.all([
        apiRequestSafe<{ reports?: Array<{ id: string; name: string; sections: string[] }> }>('/reports/custom'),
        apiRequestSafe<{ reports?: Array<{ id: string; reportName: string; format: string; createdAt: string; fileSize: number }> }>(
          '/reports/generated'
        ),
        apiRequestSafe<{ templates?: ReportTemplate[]; sections?: ReportSectionMeta[] }>('/reports/catalog'),
        apiRequestSafe<{
          schedules?: Array<{
            id: string;
            reportName: string;
            frequency: string;
            format: string;
            recipients: unknown;
            nextRunDate: string;
            lastRunDate?: string;
            isActive: boolean;
          }>;
        }>('/reports/scheduled'),
      ]);
      setCustomReports(custom.reports ?? []);
      setGeneratedReports(generated.reports ?? []);
      setTemplates(catalog.templates ?? []);
      setSections(catalog.sections ?? []);
      setScheduledReports(
        (scheduled.schedules ?? []).map((s) => ({
          ...s,
          recipients: Array.isArray(s.recipients) ? (s.recipients as string[]) : [],
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const saveReport = async (data: {
    name: string;
    sections: string[];
    templateId?: string;
    filters?: ReportFilters;
    description?: string;
  }) => {
    const result = await apiRequest<{ report: { id: string } }>('/reports/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
    return result.report;
  };

  const previewReport = async (data: { title: string; sections: string[]; filters?: ReportFilters; templateId?: string }) => {
    const result = await apiRequest<{ preview: ReportPreview }>('/reports/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.preview;
  };

  const generateReport = async (reportId: string, format: string) => {
    const result = await apiRequest<{
      generated: { id: string; reportName: string; format: string };
    }>(`/reports/custom/${reportId}/generate?format=${format}`, { method: 'POST', body: '{}' });
    await load();
    return result.generated;
  };

  const generateFromTemplate = async (templateId: string, format: string, filters?: ReportFilters) => {
    const result = await apiRequest<{
      generated: { id: string; reportName: string; format: string };
      preview: ReportPreview;
    }>(`/reports/templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ format, filters }),
    });
    await load();
    return result;
  };

  const downloadGenerated = async (id: string, filename: string) => {
    const response = await fetch(`${API_BASE}/reports/generated/${id}/download`, { credentials: 'include' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? 'Download failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateAndDownload = async (
    generated: { id: string; reportName: string; format: string },
    fallbackName: string
  ) => {
    const ext = generated.format === 'pdf' ? 'pdf' : generated.format === 'json' ? 'json' : 'csv';
    const safeName = (generated.reportName || fallbackName).replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'report';
    await downloadGenerated(generated.id, `${safeName}.${ext}`);
  };

  const scheduleReport = async (data: {
    reportId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    format: string;
    recipients: string[];
  }) => {
    await apiRequest('/reports/scheduled', { method: 'POST', body: JSON.stringify(data) });
    await load();
  };

  const runScheduledReport = async (scheduleId: string) => {
    const result = await apiRequest<{ generated: { id: string; reportName: string; format: string } }>(
      `/reports/scheduled/${scheduleId}/run`,
      { method: 'POST', body: '{}' }
    );
    await load();
    return result.generated;
  };

  return {
    customReports,
    generatedReports,
    templates,
    sections,
    scheduledReports,
    loading,
    saveReport,
    previewReport,
    generateReport,
    generateFromTemplate,
    generateAndDownload,
    scheduleReport,
    runScheduledReport,
    downloadGenerated,
    refresh: load,
  };
}
