import { Router } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeContract, serializeFolder } from '../lib/contracts.js';
import { writeAuditLog } from '../lib/audit.js';
import { runContractExpiryAlerts } from '../lib/contract-expiry.js';
import { authenticate, requireRoles, requireModule, type AuthRequest } from '../middleware/auth.js';

export const contractsRouter = Router();
contractsRouter.use(authenticate, requireModule('contractManagement', 'view'));

const canEdit = requireRoles('legal_practitioner', 'compliance_officer', 'manager', 'admin');

contractsRouter.get('/summary', authenticate, async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const contracts = await prisma.contract.findMany({
    where: { organizationId: orgId },
    select: { status: true, expiryDate: true },
  });
  const now = Date.now();
  const in90Days = now + 90 * 86400000;
  res.json({
    total: contracts.length,
    executed: contracts.filter((c) => c.status === 'executed').length,
    pendingApproval: contracts.filter((c) => c.status === 'pending_approval').length,
    expiringSoon: contracts.filter(
      (c) => c.expiryDate && c.expiryDate.getTime() <= in90Days && c.expiryDate.getTime() >= now
    ).length,
  });
});

contractsRouter.get('/folders', authenticate, async (req: AuthRequest, res) => {
  const folders = await prisma.contractFolder.findMany({
    where: { organizationId: req.user!.db.organizationId },
    include: { _count: { select: { contracts: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ folders: folders.map(serializeFolder) });
});

contractsRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  const folderId = req.query.folder ? String(req.query.folder) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const search = req.query.search ? String(req.query.search).toLowerCase() : undefined;

  const contracts = await prisma.contract.findMany({
    where: {
      organizationId: req.user!.db.organizationId,
      ...(folderId && folderId !== 'all' ? { folderId } : {}),
      ...(status && status !== 'all' ? { status: status as never } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  const filtered = search
    ? contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(search) ||
          c.content.toLowerCase().includes(search) ||
          (c.counterparty?.toLowerCase().includes(search) ?? false) ||
          (Array.isArray(c.tags) && (c.tags as string[]).some((t) => t.toLowerCase().includes(search)))
      )
    : contracts;

  res.json({ contracts: filtered.map(serializeContract) });
});

contractsRouter.post('/', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      folderId: z.string().optional(),
      type: z.string().optional(),
      counterparty: z.string().optional(),
      status: z
        .enum(['draft', 'pending_approval', 'approved', 'executed', 'expired', 'archived'])
        .optional(),
      expiryDate: z.string().optional(),
      contractValue: z.number().optional(),
      fileUrl: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .parse(req.body);

  const contract = await prisma.contract.create({
    data: {
      organizationId: req.user!.db.organizationId,
      folderId: body.folderId,
      title: body.title,
      type: body.type ?? 'custom',
      counterparty: body.counterparty,
      contractValue: body.contractValue,
      status: body.status ?? 'draft',
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      fileUrl: body.fileUrl ?? '',
      content: body.content ?? '',
      tags: body.tags ?? [],
      createdBy: req.user!.db.fullName,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'contract_created',
    resource: 'contracts',
    resourceId: contract.id,
    resourceType: 'contract',
    actionDetails: `Created contract: ${contract.title}`,
    req,
  });

  res.status(201).json({ contract: serializeContract(contract) });
});

contractsRouter.post('/folders', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ name: z.string().min(1), parentId: z.string().optional() }).parse(req.body);
  const folder = await prisma.contractFolder.create({
    data: {
      organizationId: req.user!.db.organizationId,
      name: body.name,
      parentId: body.parentId,
      createdBy: req.user!.db.fullName,
    },
  });
  res.status(201).json({ folder: serializeFolder({ ...folder, _count: { contracts: 0 } }) });
});

contractsRouter.get('/expiring', authenticate, async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const now = new Date();
  const in90 = new Date(Date.now() + 90 * 86400000);
  const contracts = await prisma.contract.findMany({
    where: {
      organizationId: orgId,
      expiryDate: { gte: now, lte: in90 },
      status: { notIn: ['expired', 'archived'] },
    },
    orderBy: { expiryDate: 'asc' },
  });
  res.json({
    alerts: contracts.map((c) => ({
      id: c.id,
      title: c.title,
      expiryDate: c.expiryDate?.toISOString(),
      daysUntilExpiry: c.expiryDate
        ? Math.ceil((c.expiryDate.getTime() - now.getTime()) / 86400000)
        : null,
      autoRenew: c.autoRenew,
    })),
  });
});

contractsRouter.get('/approvals', authenticate, async (req: AuthRequest, res) => {
  const approvals = await prisma.contractApproval.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ approvals });
});

contractsRouter.get('/templates', authenticate, async (req: AuthRequest, res) => {
  const templates = await prisma.contractTemplate.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { name: 'asc' },
  });
  res.json({ templates });
});

contractsRouter.post('/templates', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      name: z.string().min(1),
      type: z.string().min(1),
      description: z.string().optional(),
      body: z.string().optional(),
    })
    .parse(req.body);
  const template = await prisma.contractTemplate.create({
    data: {
      organizationId: req.user!.db.organizationId,
      name: body.name,
      type: body.type,
      description: body.description ?? '',
      body: body.body ?? '',
    },
  });
  res.status(201).json({ template });
});

contractsRouter.post('/from-template/:templateId', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().optional(),
      counterparty: z.string().optional(),
      folderId: z.string().optional(),
    })
    .parse(req.body);
  const template = await prisma.contractTemplate.findFirst({
    where: { id: String(req.params.templateId), organizationId: req.user!.db.organizationId },
  });
  if (!template) {
    res.status(404).json({ error: 'Template not found.' });
    return;
  }
  const contract = await prisma.contract.create({
    data: {
      organizationId: req.user!.db.organizationId,
      folderId: body.folderId,
      title: body.title ?? `${template.name} — ${body.counterparty ?? 'Draft'}`,
      type: template.type,
      counterparty: body.counterparty,
      status: 'draft',
      content: template.body,
      createdBy: req.user!.db.fullName,
    },
  });
  await prisma.contractTemplate.update({
    where: { id: template.id },
    data: { usageCount: template.usageCount + 1 },
  });
  res.status(201).json({ contract: serializeContract(contract) });
});

contractsRouter.post('/expiry-alerts/run', authenticate, canEdit, async (req: AuthRequest, res) => {
  const result = await runContractExpiryAlerts(req.user!.db.organizationId);
  res.json(result);
});

contractsRouter.get('/shares', authenticate, async (req: AuthRequest, res) => {
  const shares = await prisma.contractShare.findMany({
    where: {
      organizationId: req.user!.db.organizationId,
      targetUserId: req.user!.db.id,
      isExternal: false,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ shares });
});

contractsRouter.patch('/:id', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().optional(),
      folderId: z.string().nullable().optional(),
      counterparty: z.string().optional(),
      contractValue: z.number().optional(),
      status: z
        .enum(['draft', 'pending_approval', 'approved', 'executed', 'expired', 'archived'])
        .optional(),
      expiryDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      autoRenew: z.boolean().optional(),
      content: z.string().optional(),
    })
    .parse(req.body);

  const existing = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }
  if (existing.status === 'approved' && existing.checkedOutBy !== req.user!.db.fullName) {
    res.status(403).json({ error: 'Approved contract requires checkout before edit.' });
    return;
  }

  const contract = await prisma.contract.update({
    where: { id: existing.id },
    data: {
      ...body,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      folderId: body.folderId === null ? null : body.folderId,
    },
  });
  res.json({ contract: serializeContract(contract) });
});

contractsRouter.post('/:id/checkout', authenticate, canEdit, async (req: AuthRequest, res) => {
  const contract = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }
  if (contract.checkedOutBy && contract.checkedOutBy !== req.user!.db.fullName) {
    res.status(409).json({ error: `Checked out by ${contract.checkedOutBy}.` });
    return;
  }
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { checkedOutBy: req.user!.db.fullName, checkedOutAt: new Date() },
  });
  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'contract_checkout',
    resource: 'contracts',
    resourceId: contract.id,
    resourceType: 'contract',
    actionDetails: `Checked out contract: ${contract.title}`,
    req,
  });
  res.json({ contract: serializeContract(updated) });
});

contractsRouter.post('/:id/shares', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z
    .object({
      targetUserId: z.string().optional(),
      permission: z.enum(['view', 'edit']).default('view'),
      external: z.boolean().optional(),
      expiresInDays: z.number().optional(),
    })
    .parse(req.body);

  const contract = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }

  const token = randomBytes(24).toString('hex');
  const share = await prisma.contractShare.create({
    data: {
      organizationId: req.user!.db.organizationId,
      contractId: contract.id,
      token,
      createdById: req.user!.db.id,
      createdByName: req.user!.db.fullName,
      targetUserId: body.external ? null : body.targetUserId,
      permission: body.permission,
      isExternal: body.external ?? false,
      expiresAt: body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86400000) : null,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'contract_shared',
    resource: 'contracts',
    resourceId: contract.id,
    resourceType: 'contract',
    actionDetails: `Shared contract: ${contract.title}`,
    req,
  });

  res.status(201).json({
    share: {
      id: share.id,
      token: share.token,
      permission: share.permission,
      isExternal: share.isExternal,
      expiresAt: share.expiresAt?.toISOString(),
      publicUrl: share.isExternal ? `/api/v1/public/share/contracts/${share.token}` : undefined,
    },
  });
});

contractsRouter.patch('/shares/:id', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ permission: z.enum(['view', 'edit']) }).parse(req.body);
  const share = await prisma.contractShare.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!share) {
    res.status(404).json({ error: 'Share not found.' });
    return;
  }
  const updated = await prisma.contractShare.update({
    where: { id: share.id },
    data: { permission: body.permission },
  });
  res.json({ share: updated });
});

contractsRouter.delete('/shares/:id', authenticate, canEdit, async (req: AuthRequest, res) => {
  await prisma.contractShare.deleteMany({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  res.json({ ok: true });
});

contractsRouter.post('/:id/sign', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ signerEmail: z.string().email().optional() }).parse(req.body ?? {});
  const contract = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'executed', signedAt: new Date() },
  });
  res.json({
    contract: serializeContract(updated),
    eSign: { provider: 'stub', signerEmail: body.signerEmail, status: 'completed' },
  });
});

contractsRouter.post('/:id/submit-approval', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ approverName: z.string() }).parse(req.body);
  const contract = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }
  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'pending_approval' },
  });
  const approval = await prisma.contractApproval.create({
    data: {
      organizationId: req.user!.db.organizationId,
      contractId: contract.id,
      submittedBy: req.user!.db.fullName,
      approverName: body.approverName,
      status: 'pending',
    },
  });
  res.status(201).json({ approval });
});

contractsRouter.patch('/approvals/:id', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ status: z.enum(['approved', 'rejected']), comment: z.string().optional() }).parse(req.body);
  const approval = await prisma.contractApproval.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!approval) {
    res.status(404).json({ error: 'Approval not found.' });
    return;
  }
  const updated = await prisma.contractApproval.update({
    where: { id: approval.id },
    data: { status: body.status, comment: body.comment, decidedAt: new Date() },
  });
  await prisma.contract.update({
    where: { id: approval.contractId },
    data: { status: body.status === 'approved' ? 'approved' : 'draft' },
  });
  res.json({ approval: updated });
});

contractsRouter.post('/:id/checkin', authenticate, canEdit, async (req: AuthRequest, res) => {
  const body = z.object({ fileUrl: z.string().optional(), changeNotes: z.string().optional() }).parse(req.body);
  const contract = await prisma.contract.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!contract) {
    res.status(404).json({ error: 'Contract not found.' });
    return;
  }
  if (contract.checkedOutBy && contract.checkedOutBy !== req.user!.db.fullName) {
    res.status(409).json({ error: `Checked out by ${contract.checkedOutBy}.` });
    return;
  }
  const nextVersion = contract.currentVersion + 1;
  await prisma.contractVersion.create({
    data: {
      contractId: contract.id,
      version: contract.currentVersion,
      fileUrl: contract.fileUrl,
      changeNotes: body.changeNotes,
      createdBy: req.user!.db.fullName,
    },
  });
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      currentVersion: nextVersion,
      fileUrl: body.fileUrl ?? contract.fileUrl,
      checkedOutBy: null,
      checkedOutAt: null,
    },
  });
  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'contract_checkin',
    resource: 'contracts',
    resourceId: contract.id,
    resourceType: 'contract',
    actionDetails: `Checked in contract v${nextVersion}: ${contract.title}`,
    req,
  });
  res.json({ contract: serializeContract(updated) });
});

contractsRouter.get('/:id/versions', authenticate, async (req: AuthRequest, res) => {
  const versions = await prisma.contractVersion.findMany({
    where: { contractId: String(req.params.id) },
    orderBy: { version: 'desc' },
  });
  res.json({ versions });
});
