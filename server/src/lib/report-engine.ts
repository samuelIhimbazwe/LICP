import { prisma } from './prisma.js';
import {
  computeAnalyticsCompliance,
  computeAuditReadiness,
  computeDocumentMetrics,
  computeExecutiveSummary,
  computeObligationTrends,
  computeRegulatoryImpactTrends,
  computeRegulatoryMetrics,
  computeTeamPerformance,
} from './analytics.js';
import { buildStructuredReportPdf } from './pdf.js';

export type ReportAudience = 'executive' | 'compliance' | 'audit' | 'legal' | 'board' | 'operations';
export type ReportFormat = 'pdf' | 'csv' | 'json' | 'excel';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  jurisdiction?: string;
  department?: string;
  status?: string;
  dateRange?: 'last-week' | 'last-month' | 'last-quarter' | 'last-year' | 'custom';
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportSection {
  id: string;
  title: string;
  summary?: string;
  metrics?: Array<{ label: string; value: string }>;
  bullets?: string[];
  tables?: ReportTable[];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  organizationName: string;
  generatedAt: string;
  generatedBy: string;
  generatedByRole?: string;
  periodLabel: string;
  filters: ReportFilters;
  sections: ReportSection[];
}

export const REPORT_SECTION_CATALOG: Array<{
  id: string;
  title: string;
  description: string;
  category: string;
}> = [
  { id: 'compliance-metrics', title: 'Compliance KPIs', description: 'Score, completion rate, overdue and upcoming obligations', category: 'Compliance' },
  { id: 'obligation-trends', title: 'Obligation Trends', description: 'Monthly completion and overdue trends (6 months)', category: 'Compliance' },
  { id: 'obligation-register', title: 'Obligation Register', description: 'Detailed obligation listing with status, owner, and deadlines', category: 'Compliance' },
  { id: 'regulatory-impact', title: 'Regulatory Impact', description: 'High/medium/low impact update counts and response metrics', category: 'Regulatory' },
  { id: 'regulatory-register', title: 'Regulatory Update Register', description: 'Published updates with jurisdiction, status, and impact', category: 'Regulatory' },
  { id: 'document-metrics', title: 'Document & Contract Metrics', description: 'Volume, processing time, and status breakdown', category: 'Legal' },
  { id: 'contract-expiry', title: 'Contract Expiry Watchlist', description: 'Contracts approaching renewal or expiration', category: 'Legal' },
  { id: 'team-performance', title: 'Team Performance', description: 'Tasks completed, in progress, and compliance scores by member', category: 'Operations' },
  { id: 'executive-summary', title: 'Executive Summary', description: 'Key metrics, highlights, concerns, and recommendations', category: 'Executive' },
  { id: 'audit-readiness', title: 'Audit Readiness', description: 'Overall readiness score and documentation completeness', category: 'Audit' },
  { id: 'compliance-gaps', title: 'Compliance Gaps', description: 'Open gaps ranked by severity with due dates', category: 'Audit' },
  { id: 'integration-health', title: 'Integration Health', description: 'Connector status, last sync, and error counts', category: 'Operations' },
  { id: 'security-snapshot', title: 'Security Snapshot', description: 'Recent audit events and login activity summary', category: 'Audit' },
];

export const REPORT_TEMPLATES: Array<{
  id: string;
  name: string;
  type: string;
  description: string;
  audience: ReportAudience;
  sections: string[];
  recommendedFormats: ReportFormat[];
  scheduleHint: string;
}> = [
  {
    id: 'compliance-overview',
    name: 'Compliance Overview',
    type: 'compliance',
    description: 'Obligation KPIs, trends, and register — aligned with OneTrust control/evidence reporting',
    audience: 'compliance',
    sections: ['compliance-metrics', 'obligation-trends', 'obligation-register'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'Weekly for Compliance Officer',
  },
  {
    id: 'executive-dashboard',
    name: 'Executive Dashboard',
    type: 'executive',
    description: 'Board-ready summary with KPIs and risk highlights — similar to Legal Tracker GC Dashboard',
    audience: 'executive',
    sections: ['executive-summary', 'compliance-metrics', 'regulatory-impact', 'audit-readiness'],
    recommendedFormats: ['pdf'],
    scheduleHint: 'Monthly for leadership',
  },
  {
    id: 'board-compliance-brief',
    name: 'Board Compliance Brief',
    type: 'board',
    description: 'Concise board pack: compliance score, critical gaps, regulatory exposure',
    audience: 'board',
    sections: ['executive-summary', 'compliance-gaps', 'regulatory-impact'],
    recommendedFormats: ['pdf'],
    scheduleHint: 'Quarterly before board meetings',
  },
  {
    id: 'audit-readiness-pack',
    name: 'Audit Readiness Pack',
    type: 'audit',
    description: 'Evidence readiness, gaps, obligation register — Diligent/MetricStream audit style',
    audience: 'audit',
    sections: ['audit-readiness', 'compliance-gaps', 'obligation-register', 'security-snapshot'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'Before internal or external audits',
  },
  {
    id: 'regulatory-impact-report',
    name: 'Regulatory Impact Report',
    type: 'regulatory',
    description: 'Regulatory feed analysis with jurisdiction and impact breakdown',
    audience: 'compliance',
    sections: ['regulatory-impact', 'regulatory-register', 'obligation-register'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'After major regulatory sync',
  },
  {
    id: 'obligation-register-export',
    name: 'Obligation Register Export',
    type: 'compliance',
    description: 'Full obligation listing for auditors and regulators',
    audience: 'audit',
    sections: ['obligation-register'],
    recommendedFormats: ['csv', 'excel'],
    scheduleHint: 'On demand or monthly',
  },
  {
    id: 'contract-portfolio-summary',
    name: 'Contract Portfolio Summary',
    type: 'legal',
    description: 'Contract volumes, statuses, and expiry watchlist',
    audience: 'legal',
    sections: ['document-metrics', 'contract-expiry'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'Monthly for legal operations',
  },
  {
    id: 'team-performance-review',
    name: 'Team Performance Review',
    type: 'operations',
    description: 'Workload and compliance scores by team member',
    audience: 'operations',
    sections: ['team-performance', 'compliance-metrics'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'Monthly for managers',
  },
  {
    id: 'security-access-audit',
    name: 'Security & Access Audit',
    type: 'audit',
    description: 'Login activity and security event snapshot for administrators',
    audience: 'audit',
    sections: ['security-snapshot', 'integration-health'],
    recommendedFormats: ['pdf', 'csv'],
    scheduleHint: 'Weekly for administrators',
  },
  {
    id: 'full-legal-operations',
    name: 'Full System Report',
    type: 'comprehensive',
    description: 'Complete LICP pack — every module section for board, audit, and executive review',
    audience: 'executive',
    sections: REPORT_SECTION_CATALOG.map((s) => s.id),
    recommendedFormats: ['pdf'],
    scheduleHint: 'Quarterly comprehensive review',
  },
];

/** All catalog section IDs — used for “whole system” PDF packs. */
export const ALL_REPORT_SECTION_IDS = REPORT_SECTION_CATALOG.map((s) => s.id);

function resolveDateRange(filters: ReportFilters): { from: Date; to: Date; label: string } {
  const to = filters.dateTo ? new Date(filters.dateTo) : new Date();
  if (filters.dateFrom) {
    return { from: new Date(filters.dateFrom), to, label: `${filters.dateFrom} to ${filters.dateTo ?? 'now'}` };
  }
  const from = new Date(to);
  switch (filters.dateRange) {
    case 'last-week':
      from.setDate(from.getDate() - 7);
      return { from, to, label: 'Last 7 days' };
    case 'last-quarter':
      from.setMonth(from.getMonth() - 3);
      return { from, to, label: 'Last quarter' };
    case 'last-year':
      from.setFullYear(from.getFullYear() - 1);
      return { from, to, label: 'Last 12 months' };
    case 'last-month':
    default:
      from.setDate(from.getDate() - 30);
      return { from, to, label: 'Last 30 days' };
  }
}

function inRange(d: Date, from: Date, to: Date) {
  return d >= from && d <= to;
}

export async function loadOrgReportData(orgId: string) {
  const [
    organization,
    obligations,
    updates,
    contracts,
    legalDocs,
    users,
    activities,
    evidenceCount,
    integrations,
    auditLogs,
    loginActivity,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.complianceObligation.findMany({ where: { organizationId: orgId }, orderBy: { deadline: 'asc' } }),
    prisma.regulatoryUpdate.findMany({ where: { organizationId: orgId }, orderBy: { publishedAt: 'desc' } }),
    prisma.contract.findMany({ where: { organizationId: orgId }, orderBy: { updatedAt: 'desc' } }),
    prisma.legalDocument.findMany({ where: { organizationId: orgId } }),
    prisma.user.findMany({ where: { organizationId: orgId, status: 'active' }, select: { id: true, fullName: true } }),
    prisma.activityItem.findMany({ where: { organizationId: orgId } }),
    prisma.complianceEvidence.count({ where: { organizationId: orgId } }),
    prisma.integration.findMany({ where: { organizationId: orgId } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, orderBy: { timestamp: 'desc' }, take: 25 }),
    prisma.loginActivity.findMany({
      where: { user: { organizationId: orgId } },
      orderBy: { timestamp: 'desc' },
      take: 25,
    }),
  ]);

  return {
    organization,
    obligations,
    updates,
    contracts,
    legalDocs,
    users,
    activities,
    evidenceCount,
    integrations,
    auditLogs,
    loginActivity,
    compliance: computeAnalyticsCompliance(obligations),
    obligationTrends: computeObligationTrends(obligations),
    regulatory: computeRegulatoryMetrics(updates),
    regulatoryTrends: computeRegulatoryImpactTrends(updates),
    documents: computeDocumentMetrics(contracts, legalDocs),
    team: computeTeamPerformance(users, obligations, activities),
    auditReadiness: computeAuditReadiness(obligations, evidenceCount),
    executive: computeExecutiveSummary(
      computeAnalyticsCompliance(obligations),
      computeRegulatoryMetrics(updates),
      computeDocumentMetrics(contracts, legalDocs)
    ),
  };
}

function filterObligations(
  obligations: Awaited<ReturnType<typeof loadOrgReportData>>['obligations'],
  filters: ReportFilters,
  range: { from: Date; to: Date; label: string }
) {
  return obligations.filter((o) => {
    if (filters.jurisdiction && filters.jurisdiction !== 'all' && o.jurisdiction !== filters.jurisdiction) return false;
    if (filters.department && filters.department !== 'all' && o.department !== filters.department) return false;
    if (filters.status && filters.status !== 'all' && o.status !== filters.status) return false;
    return inRange(o.updatedAt, range.from, range.to) || inRange(o.deadline, range.from, range.to);
  });
}

function filterUpdates(
  updates: Awaited<ReturnType<typeof loadOrgReportData>>['updates'],
  filters: ReportFilters,
  range: { from: Date; to: Date; label: string }
) {
  return updates.filter((u) => {
    if (filters.jurisdiction && filters.jurisdiction !== 'all' && u.jurisdiction !== filters.jurisdiction) return false;
    if (filters.status && filters.status !== 'all' && u.status !== filters.status) return false;
    return inRange(u.publishedAt, range.from, range.to);
  });
}

function buildSection(
  sectionId: string,
  data: Awaited<ReturnType<typeof loadOrgReportData>>,
  filters: ReportFilters,
  range: { from: Date; to: Date; label: string }
): ReportSection | null {
  const obligations = filterObligations(data.obligations, filters, range);
  const updates = filterUpdates(data.updates, filters, range);

  switch (sectionId) {
    case 'compliance-metrics':
      return {
        id: sectionId,
        title: 'Compliance KPIs',
        summary: `Period: ${range.label}`,
        metrics: [
          { label: 'Compliance score', value: `${data.compliance.complianceScore}%` },
          { label: 'Total obligations', value: String(data.compliance.totalObligations) },
          { label: 'Completed', value: String(data.compliance.completedObligations) },
          { label: 'Overdue', value: String(data.compliance.overdueObligations) },
          { label: 'Upcoming (30 days)', value: String(data.compliance.upcomingObligations) },
          { label: 'Completion rate', value: `${data.compliance.completionRate}%` },
        ],
      };
    case 'obligation-trends':
      return {
        id: sectionId,
        title: 'Obligation Trends (6 months)',
        tables: [
          {
            title: 'Monthly trend',
            headers: ['Month', 'Completed', 'Overdue', 'Total', 'Completion %'],
            rows: data.obligationTrends.map((t) => [
              t.month,
              String(t.completed),
              String(t.overdue),
              String(t.total),
              `${t.completionRate}%`,
            ]),
          },
        ],
      };
    case 'obligation-register':
      return {
        id: sectionId,
        title: 'Obligation Register',
        summary: `${obligations.length} obligation(s) in selected period/filters`,
        tables: [
          {
            title: 'Obligations',
            headers: ['Title', 'Regulation', 'Status', 'Department', 'Assigned To', 'Deadline'],
            rows: obligations.slice(0, 100).map((o) => [
              o.title,
              o.regulation,
              o.status,
              o.department ?? '-',
              o.assignedTo,
              o.deadline.toISOString().slice(0, 10),
            ]),
          },
        ],
      };
    case 'regulatory-impact':
      return {
        id: sectionId,
        title: 'Regulatory Impact Analysis',
        metrics: [
          { label: 'Total updates', value: String(data.regulatory.totalUpdates) },
          { label: 'High impact', value: String(data.regulatory.highImpactUpdates) },
          { label: 'Medium impact', value: String(data.regulatory.mediumImpactUpdates) },
          { label: 'Low impact', value: String(data.regulatory.lowImpactUpdates) },
          { label: 'Assessments completed', value: String(data.regulatory.assessmentsCompleted) },
          { label: 'Assessments pending', value: String(data.regulatory.assessmentsPending) },
        ],
        tables: [
          {
            title: 'Impact trend (6 months)',
            headers: ['Month', 'High', 'Medium', 'Low', 'Total'],
            rows: data.regulatoryTrends.map((t) => [
              t.month,
              String(t.highImpact),
              String(t.mediumImpact),
              String(t.lowImpact),
              String(t.totalUpdates),
            ]),
          },
        ],
      };
    case 'regulatory-register':
      return {
        id: sectionId,
        title: 'Regulatory Update Register',
        tables: [
          {
            title: 'Updates',
            headers: ['Title', 'Jurisdiction', 'Category', 'Impact', 'Status', 'Published'],
            rows: updates.slice(0, 100).map((u) => [
              u.title,
              u.jurisdiction ?? '-',
              u.category,
              u.impact,
              u.status,
              u.publishedAt.toISOString().slice(0, 10),
            ]),
          },
        ],
      };
    case 'document-metrics':
      return {
        id: sectionId,
        title: 'Document & Contract Metrics',
        metrics: [
          { label: 'Total documents', value: String(data.documents.totalDocuments) },
          { label: 'Processed', value: String(data.documents.documentsProcessed) },
          { label: 'Avg processing time (hrs)', value: String(data.documents.averageProcessingTime) },
        ],
        tables: [
          {
            title: 'By type',
            headers: ['Type', 'Count'],
            rows: data.documents.documentsByType.map((r) => [r.type, String(r.count)]),
          },
          {
            title: 'By status',
            headers: ['Status', 'Count'],
            rows: data.documents.documentsByStatus.map((r) => [r.status, String(r.count)]),
          },
        ],
      };
    case 'contract-expiry': {
      const now = Date.now();
      const in90 = now + 90 * 86400000;
      const expiring = data.contracts.filter((c) => {
        const exp = c.expiryDate?.getTime();
        return exp && exp >= now && exp <= in90;
      });
      return {
        id: sectionId,
        title: 'Contract Expiry Watchlist (90 days)',
        summary: `${expiring.length} contract(s) expiring within 90 days`,
        tables: [
          {
            title: 'Expiring contracts',
            headers: ['Title', 'Type', 'Status', 'Expiry', 'Owner'],
            rows: expiring.map((c) => [
              c.title,
              c.type,
              c.status,
              c.expiryDate?.toISOString().slice(0, 10) ?? '-',
              c.createdBy,
            ]),
          },
        ],
      };
    }
    case 'team-performance':
      return {
        id: sectionId,
        title: 'Team Performance',
        tables: [
          {
            title: 'By team member',
            headers: ['Member', 'Completed', 'In Progress', 'Compliance Score', 'Docs Reviewed', 'Rating'],
            rows: data.team.map((m) => [
              m.memberName,
              String(m.tasksCompleted),
              String(m.tasksInProgress),
              `${m.complianceScore}%`,
              String(m.documentsReviewed),
              String(m.performanceRating),
            ]),
          },
        ],
      };
    case 'executive-summary':
      return {
        id: sectionId,
        title: 'Executive Summary',
        summary: `Period: ${data.executive.period}`,
        metrics: [
          { label: 'Compliance score', value: `${data.executive.keyMetrics.complianceScore}%` },
          { label: 'Active obligations', value: String(data.executive.keyMetrics.activeObligations) },
          { label: 'Critical alerts', value: String(data.executive.keyMetrics.criticalAlerts) },
          { label: 'Document volume', value: String(data.executive.keyMetrics.documentVolume) },
        ],
        bullets: [
          ...data.executive.highlights.map((h) => `Highlight: ${h}`),
          ...data.executive.concerns.map((c) => `Concern: ${c}`),
          ...data.executive.recommendations.map((r) => `Recommendation: ${r}`),
        ],
      };
    case 'audit-readiness':
      return {
        id: sectionId,
        title: 'Audit Readiness Assessment',
        metrics: [
          { label: 'Overall readiness', value: `${data.auditReadiness.overallReadiness}%` },
          { label: 'Critical issues', value: String(data.auditReadiness.criticalIssues) },
          { label: 'Pending actions', value: String(data.auditReadiness.pendingActions) },
          {
            label: 'Documentation',
            value: `${data.auditReadiness.documentationComplete}/${data.auditReadiness.documentationTotal}`,
          },
        ],
      };
    case 'compliance-gaps':
      return {
        id: sectionId,
        title: 'Compliance Gaps',
        tables: [
          {
            title: 'Open gaps',
            headers: ['Category', 'Description', 'Severity', 'Status', 'Due'],
            rows: data.auditReadiness.complianceGaps.map((g) => [
              g.category,
              g.description,
              g.severity,
              g.status,
              g.dueDate.slice(0, 10),
            ]),
          },
        ],
      };
    case 'integration-health':
      return {
        id: sectionId,
        title: 'Integration Health',
        tables: [
          {
            title: 'Connectors',
            headers: ['Name', 'Type', 'Status', 'Last Sync', 'Records', 'Errors'],
            rows: data.integrations.map((i) => [
              i.name,
              i.type,
              i.status,
              i.lastSyncAt?.toISOString() ?? 'Never',
              String(i.recordsSynced),
              String(i.errorCount),
            ]),
          },
        ],
      };
    case 'security-snapshot':
      return {
        id: sectionId,
        title: 'Security Snapshot',
        tables: [
          {
            title: 'Recent audit events',
            headers: ['Time', 'User', 'Action', 'Resource'],
            rows: data.auditLogs.map((l) => [
              l.timestamp.toISOString().slice(0, 16).replace('T', ' '),
              l.userName ?? '-',
              l.action,
              l.resource,
            ]),
          },
          {
            title: 'Recent login activity',
            headers: ['Time', 'Email', 'Status', 'IP'],
            rows: data.loginActivity.map((l) => [
              l.timestamp.toISOString().slice(0, 16).replace('T', ' '),
              l.email,
              l.status,
              l.ipAddress ?? '-',
            ]),
          },
        ],
      };
    default:
      return null;
  }
}

export async function buildReportDocument(options: {
  orgId: string;
  title: string;
  generatedBy: string;
  generatedByRole?: string;
  sections: string[];
  filters?: ReportFilters;
}): Promise<ReportDocument> {
  const filters = options.filters ?? { dateRange: 'last-month' };
  const range = resolveDateRange(filters);
  const data = await loadOrgReportData(options.orgId);
  const sections = options.sections
    .map((id) => buildSection(id, data, filters, range))
    .filter((s): s is ReportSection => s !== null);

  return {
    title: options.title,
    subtitle: 'Official Management Report - Confidential',
    organizationName: 'Johnson & Associate lawfirm',
    generatedAt: new Date().toISOString(),
    generatedBy: options.generatedBy,
    generatedByRole: options.generatedByRole,
    periodLabel: range.label,
    filters,
    sections,
  };
}

export function reportDocumentToCsv(doc: ReportDocument): string {
  const lines: string[] = [
    `"${doc.title}"`,
    `"Organization","${doc.organizationName}"`,
    `"Generated","${doc.generatedAt}"`,
    `"Period","${doc.periodLabel}"`,
    '',
  ];
  for (const section of doc.sections) {
    lines.push(`"SECTION: ${section.title}"`);
    if (section.summary) lines.push(`"${section.summary}"`);
    if (section.metrics?.length) {
      lines.push('"Metric","Value"');
      for (const m of section.metrics) lines.push(`"${m.label}","${m.value}"`);
    }
    if (section.bullets?.length) {
      for (const b of section.bullets) lines.push(`"${b.replace(/"/g, '""')}"`);
    }
    for (const table of section.tables ?? []) {
      lines.push(`"${table.title}"`);
      lines.push(table.headers.map((h) => `"${h}"`).join(','));
      for (const row of table.rows) {
        lines.push(row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function exportReportDocument(doc: ReportDocument, format: ReportFormat): { content: string; fileSize: number } {
  if (format === 'json') {
    const content = JSON.stringify(doc, null, 2);
    return { content, fileSize: content.length };
  }
  if (format === 'csv' || format === 'excel') {
    const content = reportDocumentToCsv(doc);
    return { content, fileSize: content.length };
  }
  const pdf = buildStructuredReportPdf(doc);
  const content = pdf.toString('base64');
  return { content, fileSize: pdf.length };
}
