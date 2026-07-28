import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  computeComplianceSummary,
  computeHeatMap,
  mapObligationStatusToDb,
  mapObligationStatusToUi,
  serializeObligation,
} from '../lib/compliance.js';
import { writeAuditLog } from '../lib/audit.js';
import {
  applyAutoStatusForOrg,
  assertEvidenceForCompliant,
  auditStatusChange,
  notifyAssigneesForObligation,
} from '../lib/compliance-rules.js';
import { authenticate, requireRoles, requireModule, type AuthRequest } from '../middleware/auth.js';

export const complianceRouter = Router();
complianceRouter.use(authenticate, requireModule('complianceTracking', 'view'));

const canEdit = requireRoles('compliance_officer', 'manager', 'admin');

async function listObligations(organizationId: string, status?: string) {
  await applyAutoStatusForOrg(organizationId);
  const rows = await prisma.complianceObligation.findMany({
    where: {
      organizationId,
      ...(status && status !== 'all' ? { status: mapObligationStatusToDb(status) } : {}),
    },
    orderBy: [{ deadline: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { evidence: true } } },
  });
  return rows.map((o) => serializeObligation(o, { evidenceCount: o._count.evidence }));
}

complianceRouter.get('/summary', async (req: AuthRequest, res) => {
  await applyAutoStatusForOrg(req.user!.db.organizationId);
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId: req.user!.db.organizationId },
    select: { status: true },
  });
  res.json(computeComplianceSummary(obligations));
});

complianceRouter.get('/obligations', async (req: AuthRequest, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  res.json({ obligations: await listObligations(req.user!.db.organizationId, status) });
});

complianceRouter.get('/calendar', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  await applyAutoStatusForOrg(orgId);
  const from = req.query.from ? new Date(String(req.query.from)) : new Date();
  const to = req.query.to
    ? new Date(String(req.query.to))
    : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

  const rows = await prisma.complianceObligation.findMany({
    where: { organizationId: orgId, deadline: { gte: from, lte: to } },
    orderBy: { deadline: 'asc' },
    include: { _count: { select: { evidence: true } } },
  });

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    events: rows.map((o) => ({
      id: o.id,
      title: o.title,
      regulation: o.regulation,
      department: o.department,
      deadline: o.deadline.toISOString(),
      status: mapObligationStatusToUi(o.status),
      evidenceCount: o._count.evidence,
    })),
  });
});

complianceRouter.post('/status-rules/run', canEdit, async (req: AuthRequest, res) => {
  const updated = await applyAutoStatusForOrg(req.user!.db.organizationId);
  res.json({ success: true, obligationsUpdated: updated });
});

complianceRouter.post('/obligations', canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      regulation: z.string().optional(),
      jurisdiction: z.string().optional(),
      department: z.string().optional(),
      requirementLevel: z.enum(['mandatory', 'recommended', 'optional']).optional(),
      deadline: z.string(),
      assignedTo: z.union([z.string(), z.array(z.string())]),
      status: z.string().optional(),
      priority: z.string().optional(),
      regulatoryUpdateId: z.string().optional(),
    })
    .parse(req.body);

  const assignedTo = Array.isArray(body.assignedTo)
    ? body.assignedTo.join(', ')
    : body.assignedTo;

  const obligation = await prisma.complianceObligation.create({
    data: {
      organizationId: req.user!.db.organizationId,
      title: body.title,
      description: body.description ?? '',
      regulation: body.regulation ?? '',
      jurisdiction: body.jurisdiction,
      department: body.department,
      requirementLevel: body.requirementLevel ?? 'mandatory',
      deadline: new Date(body.deadline),
      assignedTo,
      priority: body.priority ?? 'medium',
      status: mapObligationStatusToDb(body.status ?? 'not_assessed'),
      regulatoryUpdateId: body.regulatoryUpdateId,
    },
  });

  await notifyAssigneesForObligation({
    organizationId: req.user!.db.organizationId,
    title: obligation.title,
    assignedTo,
    obligationId: obligation.id,
    deadline: obligation.deadline,
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'obligation_created',
    resource: 'compliance',
    resourceId: obligation.id,
    resourceType: 'obligation',
    actionDetails: `Created obligation: ${obligation.title}`,
    req,
  });

  res.status(201).json({
    obligation: serializeObligation(obligation, { evidenceCount: 0 }),
  });
});

complianceRouter.patch('/obligations/:id', canEdit, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      deadline: z.string().optional(),
      assignedTo: z.union([z.string(), z.array(z.string())]).optional(),
      department: z.string().optional(),
      priority: z.string().optional(),
    })
    .parse(req.body);

  const existing = await prisma.complianceObligation.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Obligation not found.' });
    return;
  }

  if (body.status) {
    const nextStatus = mapObligationStatusToDb(body.status);
    const evidenceCheck = await assertEvidenceForCompliant(existing.id, nextStatus);
    if (!evidenceCheck.ok) {
      res.status(400).json({ error: evidenceCheck.message, code: 'EVIDENCE_REQUIRED' });
      return;
    }
  }

  const updated = await prisma.complianceObligation.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status ? { status: mapObligationStatusToDb(body.status) } : {}),
      ...(body.deadline ? { deadline: new Date(body.deadline) } : {}),
      ...(body.assignedTo
        ? {
            assignedTo: Array.isArray(body.assignedTo)
              ? body.assignedTo.join(', ')
              : body.assignedTo,
          }
        : {}),
      ...(body.department !== undefined ? { department: body.department } : {}),
      ...(body.priority ? { priority: body.priority } : {}),
    },
  });

  if (body.status && updated.status !== existing.status) {
    await auditStatusChange({
      organizationId: req.user!.db.organizationId,
      userId: req.user!.db.id,
      userName: req.user!.db.fullName,
      userRole: req.user!.db.role,
      obligationId: updated.id,
      title: updated.title,
      previousStatus: existing.status,
      newStatus: updated.status,
      req,
    });
  }

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'obligation_updated',
    resource: 'compliance',
    resourceId: updated.id,
    resourceType: 'obligation',
    actionDetails: `Updated obligation: ${updated.title}`,
    changes: body,
    req,
  });

  const evidenceCount = await prisma.complianceEvidence.count({ where: { obligationId: id } });
  res.json({ obligation: serializeObligation(updated, { evidenceCount }) });
});

complianceRouter.get('/obligations/:id/evidence', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const obligation = await prisma.complianceObligation.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!obligation) {
    res.status(404).json({ error: 'Obligation not found.' });
    return;
  }
  const evidence = await prisma.complianceEvidence.findMany({
    where: { obligationId: id },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json({
    evidence: evidence.map((e) => ({
      id: e.id,
      obligationId: e.obligationId,
      fileName: e.fileName,
      fileUrl: e.fileUrl,
      uploadedBy: e.uploadedBy,
      notes: e.notes,
      uploadedAt: e.uploadedAt.toISOString(),
    })),
  });
});

complianceRouter.post('/obligations/:id/evidence', canEdit, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const body = z
    .object({
      fileName: z.string().min(1),
      fileUrl: z.string().optional(),
      notes: z.string().optional(),
    })
    .parse(req.body);

  const obligation = await prisma.complianceObligation.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!obligation) {
    res.status(404).json({ error: 'Obligation not found.' });
    return;
  }

  const evidence = await prisma.complianceEvidence.create({
    data: {
      organizationId: req.user!.db.organizationId,
      obligationId: id,
      fileName: body.fileName,
      fileUrl: body.fileUrl ?? '',
      uploadedBy: req.user!.db.fullName,
      notes: body.notes,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'evidence_uploaded',
    resource: 'compliance',
    resourceId: evidence.id,
    resourceType: 'evidence',
    actionDetails: `Evidence uploaded for ${obligation.title}: ${evidence.fileName}`,
    req,
  });

  res.status(201).json({
    evidence: {
      id: evidence.id,
      obligationId: evidence.obligationId,
      fileName: evidence.fileName,
      fileUrl: evidence.fileUrl,
      uploadedBy: evidence.uploadedBy,
      notes: evidence.notes,
      uploadedAt: evidence.uploadedAt.toISOString(),
    },
  });
});

complianceRouter.get('/evidence', async (req: AuthRequest, res) => {
  const evidence = await prisma.complianceEvidence.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json({
    evidence: evidence.map((e) => ({
      id: e.id,
      obligationId: e.obligationId,
      fileName: e.fileName,
      fileUrl: e.fileUrl,
      uploadedBy: e.uploadedBy,
      notes: e.notes,
      description: e.notes,
      uploadedAt: e.uploadedAt.toISOString(),
    })),
  });
});

complianceRouter.get('/evidence/:id/download', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const evidence = await prisma.complianceEvidence.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!evidence) {
    res.status(404).json({ error: 'Evidence not found.' });
    return;
  }

  if (evidence.fileUrl) {
    const match = evidence.fileUrl.match(/[?&]path=([^&]+)/);
    if (match) {
      const rel = decodeURIComponent(match[1]);
      const orgId = req.user!.db.organizationId;
      if (rel.startsWith(`${orgId}/`)) {
        const absPath = path.join(process.cwd(), 'uploads', rel);
        if (fs.existsSync(absPath)) {
          await writeAuditLog({
            organizationId: orgId,
            userId: req.user!.db.id,
            userName: req.user!.db.fullName,
            userRole: req.user!.db.role,
            action: 'evidence_downloaded',
            resource: 'compliance',
            resourceId: evidence.id,
            resourceType: 'evidence',
            actionDetails: `Downloaded evidence: ${evidence.fileName}`,
            req,
          });
          res.download(absPath, evidence.fileName);
          return;
        }
      }
    }
  }

  const body = [
    `LICP Compliance Evidence`,
    `========================`,
    `File: ${evidence.fileName}`,
    `Uploaded by: ${evidence.uploadedBy}`,
    `Uploaded at: ${evidence.uploadedAt.toISOString()}`,
    `Obligation ID: ${evidence.obligationId}`,
    ``,
    `Notes:`,
    evidence.notes ?? '(none)',
    ``,
    evidence.fileUrl ? `Stored file URL: ${evidence.fileUrl}` : 'No binary file attached; this package is the audit record.',
  ].join('\n');

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'evidence_downloaded',
    resource: 'compliance',
    resourceId: evidence.id,
    resourceType: 'evidence',
    actionDetails: `Downloaded evidence package: ${evidence.fileName}`,
    req,
  });

  const safeName = evidence.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'evidence';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
  res.send(body);
});

complianceRouter.get('/audit-trail', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: req.user!.db.organizationId,
      resource: { in: ['compliance', 'regulatory'] },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  res.json({
    actions: logs.map((l) => {
      const changes = l.changes as { previousStatus?: string; newStatus?: string } | null;
      return {
        id: l.id,
        obligationId: l.resourceType === 'obligation' ? l.resourceId : undefined,
        action: l.actionDetails,
        performedBy: l.userName ?? 'System',
        timestamp: l.timestamp.toISOString(),
        previousStatus: changes?.previousStatus,
        newStatus: changes?.newStatus,
        notes: l.changes ? JSON.stringify(l.changes) : undefined,
      };
    }),
  });
});

complianceRouter.get('/heat-map', async (req: AuthRequest, res) => {
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId: req.user!.db.organizationId },
    select: { department: true, regulation: true, status: true },
  });
  res.json({ heatMap: computeHeatMap(obligations) });
});

complianceRouter.get('/obligations/export', canEdit, async (req: AuthRequest, res) => {
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { deadline: 'asc' },
  });
  const header = 'title,regulation,status,deadline,assignedTo,department\n';
  const rows = obligations
    .map(
      (o) =>
        `${JSON.stringify(o.title)},${JSON.stringify(o.regulation)},${o.status},${o.deadline.toISOString()},${JSON.stringify(o.assignedTo)},${JSON.stringify(o.department ?? '')}`
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=compliance-obligations.csv');
  res.send(header + rows);
});
