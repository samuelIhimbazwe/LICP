import type { ObligationStatus, RegulatoryUpdateStatus } from '@prisma/client';

export type UiComplianceStatus =
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'not_assessed';

const toUiStatus: Record<ObligationStatus, UiComplianceStatus> = {
  compliant: 'compliant',
  warning: 'partially_compliant',
  overdue: 'non_compliant',
  pending: 'not_assessed',
};

const toDbStatus: Record<UiComplianceStatus, ObligationStatus> = {
  compliant: 'compliant',
  partially_compliant: 'warning',
  non_compliant: 'overdue',
  not_assessed: 'pending',
};

export function mapObligationStatusToUi(status: ObligationStatus): UiComplianceStatus {
  return toUiStatus[status];
}

export function mapObligationStatusToDb(status: string): ObligationStatus {
  if (status in toDbStatus) return toDbStatus[status as UiComplianceStatus];
  if (status === 'compliant' || status === 'warning' || status === 'overdue' || status === 'pending') {
    return status;
  }
  return 'pending';
}

export function serializeObligation(
  o: {
    id: string;
    title: string;
    description: string;
    regulation: string;
    jurisdiction: string | null;
    department: string | null;
    requirementLevel: string;
    status: ObligationStatus;
    deadline: Date;
    assignedTo: string;
    priority: string;
    regulatoryUpdateId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  meta?: { evidenceCount?: number }
) {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    regulation: o.regulation,
    jurisdiction: o.jurisdiction,
    department: o.department,
    requirementLevel: o.requirementLevel,
    status: mapObligationStatusToUi(o.status),
    deadline: o.deadline.toISOString(),
    assignedTo: o.assignedTo.split(',').map((s) => s.trim()).filter(Boolean),
    assignedTeam: o.department,
    priority: o.priority,
    regulatoryUpdateId: o.regulatoryUpdateId,
    evidenceCount: meta?.evidenceCount ?? 0,
    evidenceRequired: meta?.evidenceCount === 0 ? ['Upload compliance evidence before marking compliant'] : [],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function serializeRegulatoryUpdate(u: {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  jurisdiction: string | null;
  status: RegulatoryUpdateStatus;
  effectiveDate: Date | null;
  source: string | null;
  isRead: boolean;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  publishedAt: Date;
  createdAt: Date;
  knowledgeDocumentId?: string | null;
}) {
  return {
    id: u.id,
    title: u.title,
    summary: u.description,
    description: u.description,
    category: u.category,
    impactLevel: u.impact,
    jurisdiction: u.jurisdiction,
    status: u.status,
    source: u.source,
    isRead: u.isRead,
    datePublished: u.publishedAt.toISOString(),
    effectiveDate: u.effectiveDate?.toISOString(),
    reviewedBy: u.reviewedByName,
    reviewedAt: u.reviewedAt?.toISOString(),
    knowledgeDocumentId: u.knowledgeDocumentId ?? undefined,
  };
}

export function computeComplianceSummary(
  obligations: Array<{ status: ObligationStatus }>
) {
  const total = obligations.length;
  const compliant = obligations.filter((o) => o.status === 'compliant').length;
  const partial = obligations.filter((o) => o.status === 'warning').length;
  const nonCompliant = obligations.filter((o) => o.status === 'overdue').length;
  const notAssessed = obligations.filter((o) => o.status === 'pending').length;
  const overallRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return { total, compliant, partial, nonCompliant, notAssessed, overallRate };
}

export function computeHeatMap(
  obligations: Array<{
    department: string | null;
    regulation: string;
    status: ObligationStatus;
  }>
) {
  const groups = new Map<string, { department: string; regulation: string; total: number; compliant: number }>();

  for (const o of obligations) {
    const department = o.department ?? 'General';
    const regulation = o.regulation || 'Unspecified';
    const key = `${department}::${regulation}`;
    const entry = groups.get(key) ?? { department, regulation, total: 0, compliant: 0 };
    entry.total += 1;
    if (o.status === 'compliant') entry.compliant += 1;
    groups.set(key, entry);
  }

  return Array.from(groups.values()).map((g) => {
    const complianceRate = g.total > 0 ? Math.round((g.compliant / g.total) * 100) : 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (complianceRate < 50) riskLevel = 'critical';
    else if (complianceRate < 70) riskLevel = 'high';
    else if (complianceRate < 90) riskLevel = 'medium';
    return {
      department: g.department,
      regulation: g.regulation,
      complianceRate,
      riskLevel,
      total: g.total,
    };
  });
}
