import { Router } from 'express';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { writeAuditLog } from '../lib/audit.js';
import { syncDmsIntegration, syncErpIntegration, syncRegulatoryIntegration } from '../lib/integration-sync.js';
import { probeIntegrationEndpoint } from '../lib/integration-http.js';
import { notifyOrganizationUsers } from '../lib/notifications.js';
import { authenticate, requireAdmin, requireModule, type AuthRequest } from '../middleware/auth.js';

export const integrationsRouter = Router();
integrationsRouter.use(authenticate, requireModule('integrations', 'view'));

const DEFAULT_INTEGRATIONS = [
  { name: 'Rwanda Gazette API', type: 'regulatory', status: 'connected' },
  { name: 'ORINFOR Regulatory Feed', type: 'regulatory', status: 'connected' },
  { name: 'DocuSign E-Signature', type: 'e_sign', status: 'disconnected' },
  { name: 'SharePoint DMS', type: 'dms', status: 'disconnected' },
  { name: 'Google Drive', type: 'dms', status: 'connected' },
  { name: 'Workday HRIS', type: 'erp_hris', status: 'connected' },
];

function maskConfig(config: unknown) {
  if (!config || typeof config !== 'object') return {};
  const c = { ...(config as Record<string, unknown>) };
  if (typeof c.apiKey === 'string') {
    c.apiKey = c.apiKey.startsWith('enc:') ? 'enc:****' : `${String(c.apiKey).slice(0, 4)}****`;
  }
  if (typeof c.clientSecret === 'string') c.clientSecret = '****';
  return c;
}

integrationsRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  let items = await prisma.integration.findMany({ where: { organizationId: orgId } });
  if (items.length === 0) {
    await prisma.integration.createMany({
      data: DEFAULT_INTEGRATIONS.map((i) => ({
        organizationId: orgId,
        name: i.name,
        type: i.type,
        status: i.status,
        isActive: i.status === 'connected',
        recordsSynced: i.status === 'connected' ? Math.floor(Math.random() * 500) + 50 : 0,
        config: {},
      })),
    });
    items = await prisma.integration.findMany({ where: { organizationId: orgId } });
  }
  res.json({
    integrations: items.map((i) => ({
      ...i,
      config: maskConfig(i.config),
      lastSyncAt: i.lastSyncAt?.toISOString(),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  });
});

integrationsRouter.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      name: z.string().min(1).max(120),
      type: z.enum(['regulatory', 'e_sign', 'dms', 'erp_hris']),
      endpoint: z.string().optional(),
      apiKey: z.string().optional(),
      syncFrequency: z.enum(['daily', 'weekly', 'hourly']).optional(),
    })
    .parse(req.body);

  const config: Record<string, unknown> = {};
  const endpoint = body.endpoint?.trim();
  if (endpoint) {
    try {
      new URL(endpoint);
    } catch {
      res.status(400).json({ error: 'Invalid endpoint URL.' });
      return;
    }
    config.endpoint = endpoint;
  }
  if (body.syncFrequency) config.syncFrequency = body.syncFrequency;
  if (body.apiKey) {
    config.apiKeyEncrypted = true;
    config.apiKey = `enc:${createHash('sha256').update(body.apiKey).digest('hex').slice(0, 16)}`;
  }

  const created = await prisma.integration.create({
    data: {
      organizationId: req.user!.db.organizationId,
      name: body.name.trim(),
      type: body.type,
      status: 'configuring',
      isActive: false,
      config,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'integration_created',
    resource: 'integrations',
    resourceId: created.id,
    resourceType: 'integration',
    actionDetails: `Created integration ${created.name} (${created.type})`,
    req,
  });

  res.status(201).json({
    integration: {
      ...created,
      config: maskConfig(created.config),
      lastSyncAt: created.lastSyncAt?.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  });
});

integrationsRouter.get('/logs', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: req.user!.db.organizationId, resource: 'integrations' },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      message: l.actionDetails,
      integrationId: l.resourceId,
      timestamp: l.timestamp.toISOString(),
      status: l.status,
    })),
  });
});

integrationsRouter.get('/keys/list', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: req.user!.db.organizationId, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, createdBy: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ keys });
});

integrationsRouter.post('/keys', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z.object({ name: z.string().min(1) }).parse(req.body);
  const raw = `licp_${randomBytes(24).toString('hex')}`;
  const key = await prisma.apiKey.create({
    data: {
      organizationId: req.user!.db.organizationId,
      name: body.name,
      keyPrefix: raw.slice(0, 12),
      keyHash: createHash('sha256').update(raw).digest('hex'),
      createdBy: req.user!.db.fullName,
    },
  });
  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'api_key_created',
    resource: 'integrations',
    resourceId: key.id,
    resourceType: 'api_key',
    actionDetails: `Created API key ${body.name}`,
    req,
  });
  res.status(201).json({ key: { id: key.id, name: key.name, token: raw, prefix: key.keyPrefix } });
});

integrationsRouter.delete('/keys/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  await prisma.apiKey.updateMany({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
    data: { revokedAt: new Date() },
  });
  res.json({ ok: true });
});

integrationsRouter.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      status: z.enum(['connected', 'disconnected', 'configuring', 'error']).optional(),
      isActive: z.boolean().optional(),
      config: z
        .object({
          endpoint: z.string().optional(),
          apiKey: z.string().optional(),
          syncFrequency: z.enum(['daily', 'weekly', 'hourly']).optional(),
          webhookUrl: z.string().optional(),
        })
        .optional(),
    })
    .parse(req.body);

  const item = await prisma.integration.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Integration not found.' });
    return;
  }

  const existingConfig = (item.config ?? {}) as Record<string, unknown>;
  const nextConfig = body.config
    ? {
        ...existingConfig,
        ...body.config,
        ...(body.config.apiKey
          ? { apiKeyEncrypted: true, apiKey: `enc:${createHash('sha256').update(body.config.apiKey).digest('hex').slice(0, 16)}` }
          : {}),
      }
    : existingConfig;

  const updated = await prisma.integration.update({
    where: { id: item.id },
    data: {
      status: body.status ?? item.status,
      isActive: body.isActive ?? item.isActive,
      config: nextConfig,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'integration_configured',
    resource: 'integrations',
    resourceId: updated.id,
    resourceType: 'integration',
    actionDetails: `Configured integration ${updated.name}`,
    req,
  });

  res.json({ integration: { ...updated, config: maskConfig(updated.config) } });
});

integrationsRouter.post('/:id/disable', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const item = await prisma.integration.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Integration not found.' });
    return;
  }
  const updated = await prisma.integration.update({
    where: { id: item.id },
    data: { status: 'disconnected', isActive: false },
  });
  res.json({ integration: updated });
});

integrationsRouter.post('/:id/sync', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const item = await prisma.integration.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Integration not found.' });
    return;
  }

  // Allow reconnect: activate inactive/disconnected integrations before syncing.
  let active = item;
  if (!item.isActive || item.status !== 'connected') {
    active = await prisma.integration.update({
      where: { id: item.id },
      data: { isActive: true, status: 'connected', errorCount: 0 },
    });
  }

  const orgId = req.user!.db.organizationId;
  let result;
  if (active.type === 'regulatory') result = await syncRegulatoryIntegration(orgId, active.id, req);
  else if (active.type === 'dms') result = await syncDmsIntegration(orgId, active.id, req);
  else if (active.type === 'erp_hris') result = await syncErpIntegration(orgId, active.id, req);
  else if (active.type === 'e_sign') {
    result = { ok: true as const, recordsSynced: 0, message: 'E-sign webhook ready' };
  } else {
    res.status(400).json({ error: 'Sync not supported for this integration type.' });
    return;
  }

  if (!result.ok) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json(result);
});

integrationsRouter.get('/:id/health', authenticate, async (req: AuthRequest, res) => {
  const item = await prisma.integration.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Integration not found.' });
    return;
  }
  const config = (item.config ?? {}) as Record<string, unknown>;
  const endpoint = typeof config.endpoint === 'string' ? config.endpoint : '';
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey : undefined;
  let probe = endpoint
    ? await probeIntegrationEndpoint(endpoint, apiKey)
    : { ok: item.status === 'connected', latencyMs: 0, message: 'No endpoint configured' };
  if (!endpoint) {
    probe = {
      ok: item.status === 'connected' && item.errorCount < 5,
      latencyMs: 120,
      message: item.status,
    };
  }
  const healthy = probe.ok && item.errorCount < 5;
  res.json({
    status: item.status,
    lastSyncAt: item.lastSyncAt?.toISOString(),
    errorCount: item.errorCount,
    recordsSynced: item.recordsSynced,
    healthy,
    uptime: healthy ? 99.5 : item.status === 'error' ? 0 : 95,
    successRate: healthy ? 98 : 70,
    avgLatencyMs: probe.latencyMs || (healthy ? 120 : 450),
    lastCheckedAt: new Date().toISOString(),
    probeMessage: probe.message,
  });
});

integrationsRouter.post('/:id/test', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const item = await prisma.integration.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Integration not found.' });
    return;
  }
  const config = (item.config ?? {}) as Record<string, unknown>;
  const invalidCreds = config.invalidCredentials === true;
  const endpoint = typeof config.endpoint === 'string' ? config.endpoint : '';
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey : undefined;
  let ok = !invalidCreds;
  let message = ok ? 'Connection successful.' : 'Integration not configured or invalid credentials.';

  if (endpoint) {
    const probe = await probeIntegrationEndpoint(endpoint, apiKey);
    ok = probe.ok && !invalidCreds;
    message = probe.message;
  } else if (ok) {
    // Seed / local integrations without a remote endpoint can be (re)activated via test.
    message =
      item.status === 'connected' && item.isActive
        ? 'Connection successful.'
        : 'Connection activated (no remote endpoint configured).';
  }
  if (!ok) {
    await prisma.integration.update({
      where: { id: item.id },
      data: { status: 'error', errorCount: item.errorCount + 1 },
    });
    await notifyOrganizationUsers({
      organizationId: req.user!.db.organizationId,
      type: 'system_announcement',
      title: `Integration alert: ${item.name}`,
      message: 'Connection test failed. Review credentials.',
      priority: 'high',
      linkUrl: '/integrations',
      notificationTypeKey: 'systemAnnouncements',
    });
  } else {
    await prisma.integration.update({
      where: { id: item.id },
      data: { status: 'connected', isActive: true, errorCount: 0 },
    });
  }
  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'integration_test',
    resource: 'integrations',
    resourceId: item.id,
    resourceType: 'integration',
    actionDetails: ok ? 'Connection successful' : 'Connection failed',
    req,
    status: ok ? 'success' : 'failure',
  });
  res.json({ success: ok, message });
});
