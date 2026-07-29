// Analytics & Reporting Types

export type ReportType = 'compliance' | 'regulatory' | 'contract' | 'team' | 'audit' | 'executive' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type MetricTrend = 'up' | 'down' | 'stable';
export type RagStatus = 'green' | 'amber' | 'red' | 'neutral';

export interface HeadlineKpi {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  target?: number;
  targetLabel?: string;
  delta?: number;
  deltaLabel?: string;
  trend: MetricTrend;
  invertTrend?: boolean;
  status: RagStatus;
  href?: string;
  sparkline?: number[];
}

export interface StatusMixItem {
  name: string;
  count: number;
}

export interface ExceptionRow {
  id: string;
  type: 'obligation' | 'regulatory' | 'contract' | 'audit';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  href: string;
}

export interface ComplianceMetrics {
  totalObligations: number;
  completedObligations: number;
  overdueObligations: number;
  upcomingObligations: number;
  completionRate: number;
  averageCompletionTime: number; // in days
  complianceScore: number;
  trend: MetricTrend;
}

export interface RegulatoryMetrics {
  totalUpdates: number;
  highImpactUpdates: number;
  mediumImpactUpdates: number;
  lowImpactUpdates: number;
  averageResponseTime: number; // in hours
  assessmentsCompleted: number;
  assessmentsPending: number;
}

export interface DocumentMetrics {
  totalDocuments: number;
  documentsProcessed: number;
  averageProcessingTime: number; // in hours
  documentsByType: { type: string; count: number }[];
  documentsByStatus: { status: string; count: number }[];
  monthlyVolume: { month: string; count: number }[];
}

export interface TeamPerformanceMetrics {
  teamMemberId: string;
  memberName: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageTaskTime: number; // in hours
  complianceScore: number;
  documentsReviewed: number;
  performanceRating: number;
}

export interface ObligationTrend {
  month: string;
  completed: number;
  overdue: number;
  total: number;
  completionRate: number;
}

export interface RegulatoryImpactTrend {
  month: string;
  highImpact: number;
  mediumImpact: number;
  lowImpact: number;
  totalUpdates: number;
}

export interface AuditReadinessMetrics {
  overallReadiness: number;
  criticalIssues: number;
  pendingActions: number;
  documentationComplete: number;
  documentationTotal: number;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  complianceGaps: AuditGap[];
}

export interface AuditGap {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
  dueDate?: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  sections: ReportSection[];
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  isPublic: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'summary';
  dataSource: string;
  configuration: Record<string, any>;
  order: number;
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  templateId?: string;
  sections: ReportSection[];
  filters: ReportFilter[];
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  recipients: string[];
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface GeneratedReport {
  id: string;
  reportId: string;
  reportName: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  generatedBy: string;
  fileUrl: string;
  fileSize: number;
  parameters: Record<string, any>;
}

export interface ExecutiveSummary {
  id: string;
  period: string;
  generatedAt: Date;
  keyMetrics: {
    complianceScore: number;
    activeObligations: number;
    criticalAlerts: number;
    documentVolume: number;
  };
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  trends: {
    compliance: MetricTrend;
    regulatory: MetricTrend;
    documents: MetricTrend;
  };
}
