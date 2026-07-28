import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  computeAnalyticsCompliance,
  computeAuditReadiness,
  computeDocumentMetrics,
  computeExecutiveSummary,
  computeObligationTrends,
  computeRegulatoryImpactTrends,
  computeRegulatoryMetrics,
  computeTeamPerformance,
} from '../lib/analytics.js';
import { computeComplianceSummary } from '../lib/compliance.js';
import {
  authenticate,
  requireAnalyticsAccess,
  requireExecutiveAnalytics,
  type AuthRequest,
} from '../middleware/auth.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate, requireAnalyticsAccess);

async function loadOrgData(orgId: string) {
  const [obligations, updates, contracts, legalDocs, users, activities, evidenceCount] =
    await Promise.all([
      prisma.complianceObligation.findMany({ where: { organizationId: orgId } }),
      prisma.regulatoryUpdate.findMany({ where: { organizationId: orgId } }),
      prisma.contract.findMany({ where: { organizationId: orgId } }),
      prisma.legalDocument.findMany({ where: { organizationId: orgId } }),
      prisma.user.findMany({
        where: { organizationId: orgId, status: 'active' },
        select: { id: true, fullName: true },
      }),
      prisma.activityItem.findMany({ where: { organizationId: orgId } }),
      prisma.complianceEvidence.count({ where: { organizationId: orgId } }),
    ]);
  return { obligations, updates, contracts, legalDocs, users, activities, evidenceCount };
}

analyticsRouter.get('/compliance', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { obligations } = await loadOrgData(orgId);
  const metrics = computeAnalyticsCompliance(obligations);
  const trends = computeObligationTrends(obligations);
  res.json({ metrics, trends });
});

analyticsRouter.get('/compliance/export', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId: orgId },
    orderBy: { title: 'asc' },
  });
  const summary = computeComplianceSummary(obligations);
  const header = 'title,status,deadline,department,regulation\n';
  const rows = obligations
    .map(
      (o) =>
        `${JSON.stringify(o.title)},${o.status},${o.deadline.toISOString()},${JSON.stringify(o.department ?? '')},${JSON.stringify(o.regulation)}`
    )
    .join('\n');
  const summaryRow = `\n# summary,total,${summary.total},compliant,${summary.compliant},overdue,${summary.nonCompliant}`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=compliance-analytics.csv');
  res.send(header + rows + summaryRow);
});

analyticsRouter.get('/regulatory/trends', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { updates } = await loadOrgData(orgId);
  res.json({
    metrics: computeRegulatoryMetrics(updates),
    trends: computeRegulatoryImpactTrends(updates),
  });
});

analyticsRouter.get('/documents', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { contracts, legalDocs } = await loadOrgData(orgId);
  res.json({ metrics: computeDocumentMetrics(contracts, legalDocs) });
});

analyticsRouter.get('/team', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { users, obligations, activities } = await loadOrgData(orgId);
  res.json({ team: computeTeamPerformance(users, obligations, activities) });
});

analyticsRouter.get('/team/export', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { users, obligations, activities } = await loadOrgData(orgId);
  const team = computeTeamPerformance(users, obligations, activities);
  const header = 'member,tasksCompleted,tasksInProgress,complianceScore,documentsReviewed\n';
  const rows = team
    .map(
      (m) =>
        `${JSON.stringify(m.memberName)},${m.tasksCompleted},${m.tasksInProgress},${m.complianceScore},${m.documentsReviewed}`
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=team-performance.csv');
  res.send(header + rows);
});

analyticsRouter.get('/executive-summary', requireExecutiveAnalytics, async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const data = await loadOrgData(orgId);
  const compliance = computeAnalyticsCompliance(data.obligations);
  const regulatory = computeRegulatoryMetrics(data.updates);
  const documents = computeDocumentMetrics(data.contracts, data.legalDocs);
  res.json({ summary: computeExecutiveSummary(compliance, regulatory, documents) });
});

analyticsRouter.get('/audit-readiness', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const { obligations, evidenceCount } = await loadOrgData(orgId);
  res.json({ readiness: computeAuditReadiness(obligations, evidenceCount) });
});

analyticsRouter.get('/overview', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const data = await loadOrgData(orgId);
  const compliance = computeAnalyticsCompliance(data.obligations);
  const regulatory = computeRegulatoryMetrics(data.updates);
  const documents = computeDocumentMetrics(data.contracts, data.legalDocs);
  const trends = computeObligationTrends(data.obligations);
  const impactTrends = computeRegulatoryImpactTrends(data.updates);
  const canExecutive = req.user!.db.role !== 'legal_practitioner';
  res.json({
    compliance,
    regulatory,
    documents,
    obligationTrends: trends,
    regulatoryImpactTrends: impactTrends,
    executiveSummary: canExecutive
      ? computeExecutiveSummary(compliance, regulatory, documents)
      : null,
    auditReadiness: computeAuditReadiness(data.obligations, data.evidenceCount),
    team: computeTeamPerformance(data.users, data.obligations, data.activities),
  });
});
