import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { mapObligationStatusToDb, serializeObligation, serializeRegulatoryUpdate } from '../lib/compliance.js';
import { writeAuditLog } from '../lib/audit.js';
import { notifyOrganizationUsers } from '../lib/notifications.js';
import { logRegulatoryHistory } from '../lib/compliance-rules.js';
import { authenticate, requireRoles, requireModule, type AuthRequest } from '../middleware/auth.js';

export const regulatoryRouter = Router();
regulatoryRouter.use(authenticate, requireModule('regulatoryUpdates', 'view'));

const canEdit = requireRoles('compliance_officer', 'manager', 'admin');
const canPublish = requireRoles('admin', 'compliance_officer');

regulatoryRouter.get('/updates', async (req: AuthRequest, res) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const updates = await prisma.regulatoryUpdate.findMany({
    where: {
      organizationId: req.user!.db.organizationId,
      ...(category && category !== 'all' ? { category } : {}),
      ...(status && status !== 'all' ? { status: status as never } : {}),
    },
    orderBy: { publishedAt: 'desc' },
  });

  res.json({ updates: updates.map(serializeRegulatoryUpdate) });
});

regulatoryRouter.get('/updates/summary', async (req: AuthRequest, res) => {
  const updates = await prisma.regulatoryUpdate.findMany({
    where: { organizationId: req.user!.db.organizationId },
    select: { status: true, isRead: true },
  });
  res.json({
    pendingReview: updates.filter((u) => u.status === 'pending_review').length,
    actionRequired: updates.filter((u) => u.status === 'action_required').length,
    reviewed: updates.filter((u) => u.status === 'reviewed').length,
    implemented: updates.filter((u) => u.status === 'implemented').length,
    unread: updates.filter((u) => !u.isRead).length,
    total: updates.length,
  });
});

regulatoryRouter.post('/updates', canPublish, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      impact: z.enum(['critical', 'high', 'medium', 'low', 'minimal']).optional(),
      jurisdiction: z.string().optional(),
      effectiveDate: z.string().optional(),
      source: z.string().optional(),
    })
    .parse(req.body);

  const update = await prisma.regulatoryUpdate.create({
    data: {
      organizationId: req.user!.db.organizationId,
      title: body.title,
      description: body.description,
      category: body.category,
      impact: body.impact ?? 'medium',
      jurisdiction: body.jurisdiction,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      source: body.source,
      status: 'pending_review',
    },
  });

  await logRegulatoryHistory({
    regulatoryUpdateId: update.id,
    organizationId: req.user!.db.organizationId,
    action: 'published',
    details: `Regulatory update published: ${update.title}`,
    performedByName: req.user!.db.fullName,
    performedById: req.user!.db.id,
  });

  await notifyOrganizationUsers({
    organizationId: req.user!.db.organizationId,
    type: 'regulatory_update',
    title: `New regulatory update: ${update.title}`,
    message: update.description.slice(0, 200),
    priority: update.impact === 'critical' || update.impact === 'high' ? 'high' : 'medium',
    linkUrl: '/regulatory-updates',
    roles: ['compliance_officer', 'manager', 'admin'],
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'regulatory_update_published',
    resource: 'regulatory',
    resourceId: update.id,
    resourceType: 'regulatory_update',
    actionDetails: `Published regulatory update: ${update.title}`,
    req,
  });

  res.status(201).json({ update: serializeRegulatoryUpdate(update) });
});

regulatoryRouter.get('/updates/:id/history', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const update = await prisma.regulatoryUpdate.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!update) {
    res.status(404).json({ error: 'Regulatory update not found.' });
    return;
  }
  const historyClient = (
    prisma as unknown as {
      regulatoryUpdateHistory?: {
        findMany: (args: object) => Promise<
          Array<{
            id: string;
            action: string;
            details: string;
            performedByName: string;
            createdAt: Date;
            changes: unknown;
          }>
        >;
      };
    }
  ).regulatoryUpdateHistory;

  if (!historyClient) {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: req.user!.db.organizationId, resourceId: id, resource: 'regulatory' },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json({
      history: logs.map((h) => ({
        id: h.id,
        action: h.action,
        details: h.actionDetails,
        performedBy: h.userName ?? 'System',
        timestamp: h.timestamp.toISOString(),
        changes: h.changes,
      })),
    });
    return;
  }

  const history = await historyClient.findMany({
    where: { regulatoryUpdateId: id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    history: history.map((h) => ({
      id: h.id,
      action: h.action,
      details: h.details,
      performedBy: h.performedByName,
      timestamp: h.createdAt.toISOString(),
      changes: h.changes,
    })),
  });
});

regulatoryRouter.patch('/updates/:id', canEdit, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const body = z
    .object({
      status: z
        .enum(['pending_review', 'reviewed', 'action_required', 'implemented', 'not_applicable'])
        .optional(),
      isRead: z.boolean().optional(),
      knowledgeDocumentId: z.string().optional(),
    })
    .parse(req.body);

  const existing = await prisma.regulatoryUpdate.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Regulatory update not found.' });
    return;
  }

  const updated = await prisma.regulatoryUpdate.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.isRead !== undefined ? { isRead: body.isRead } : {}),
      ...(body.knowledgeDocumentId !== undefined
        ? { knowledgeDocumentId: body.knowledgeDocumentId }
        : {}),
      ...(body.status === 'reviewed' || body.status === 'implemented'
        ? {
            reviewedAt: new Date(),
            reviewedByName: req.user!.db.fullName,
          }
        : {}),
    },
  });

  await logRegulatoryHistory({
    regulatoryUpdateId: updated.id,
    organizationId: req.user!.db.organizationId,
    action: body.status ? 'status_changed' : body.knowledgeDocumentId ? 'kb_linked' : 'updated',
    details: `Regulatory update ${updated.title} updated`,
    performedByName: req.user!.db.fullName,
    performedById: req.user!.db.id,
    changes: body,
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'regulatory_update_reviewed',
    resource: 'regulatory',
    resourceId: updated.id,
    resourceType: 'regulatory_update',
    actionDetails: `Regulatory update status: ${updated.status}`,
    changes: body,
    req,
  });

  res.json({ update: serializeRegulatoryUpdate(updated) });
});

regulatoryRouter.post('/updates/sync', canPublish, async (req: AuthRequest, res) => {
  const connector = await prisma.integration.findFirst({
    where: {
      organizationId: req.user!.db.organizationId,
      type: 'regulatory',
      status: 'connected',
    },
  });
  if (!connector) {
    res.status(400).json({ error: 'No connected regulatory integration.' });
    return;
  }

  const update = await prisma.regulatoryUpdate.create({
    data: {
      organizationId: req.user!.db.organizationId,
      title: `Synced: ${connector.name} feed`,
      description: `Automated regulatory sync from ${connector.name} at ${new Date().toISOString()}`,
      category: 'notice',
      impact: 'medium',
      jurisdiction: 'Rwanda',
      source: connector.name,
      status: 'pending_review',
    },
  });

  await logRegulatoryHistory({
    regulatoryUpdateId: update.id,
    organizationId: req.user!.db.organizationId,
    action: 'synced',
    details: `Auto-synced from ${connector.name}`,
    performedByName: req.user!.db.fullName,
    performedById: req.user!.db.id,
  });

  res.status(201).json({ update: serializeRegulatoryUpdate(update), source: connector.name });
});

regulatoryRouter.post('/updates/:id/create-obligation', canEdit, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const body = z
    .object({
      title: z.string().optional(),
      deadline: z.string().optional(),
      assignedTo: z.string().optional(),
      department: z.string().optional(),
    })
    .parse(req.body);

  const update = await prisma.regulatoryUpdate.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!update) {
    res.status(404).json({ error: 'Regulatory update not found.' });
    return;
  }

  const obligation = await prisma.complianceObligation.create({
    data: {
      organizationId: req.user!.db.organizationId,
      title: body.title ?? `Compliance action: ${update.title}`,
      description: update.description,
      regulation: update.title,
      jurisdiction: update.jurisdiction,
      department: body.department ?? 'Legal',
      requirementLevel: 'mandatory',
      deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 30 * 86400000),
      assignedTo: body.assignedTo ?? req.user!.db.fullName,
      status: mapObligationStatusToDb('not_assessed'),
      regulatoryUpdateId: update.id,
    },
  });

  await prisma.regulatoryUpdate.update({
    where: { id: update.id },
    data: { status: 'action_required' },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'obligation_from_regulation',
    resource: 'compliance',
    resourceId: obligation.id,
    resourceType: 'obligation',
    actionDetails: `Obligation created from regulatory update: ${update.title}`,
    req,
  });

  res.status(201).json({ obligation: serializeObligation(obligation) });
});
