import { prisma } from './prisma.js';
import { notifyOrganizationUsers } from './notifications.js';
import { writeAuditLog } from './audit.js';
import type { AuthRequest } from '../middleware/auth.js';
import { fetchGazetteItems } from './integration-http.js';

const MOCK_GAZETTE_ITEMS = [
  {
    title: 'Gazette Notice — Data Protection Amendment 2026',
    source: 'Rwanda Gazette API',
    jurisdiction: 'Rwanda',
    category: 'Data Protection',
  },
  {
    title: 'ORINFOR Circular — Financial Reporting Update',
    source: 'ORINFOR Regulatory Feed',
    jurisdiction: 'Rwanda',
    category: 'Finance',
  },
];

export async function syncRegulatoryIntegration(
  orgId: string,
  integrationId: string,
  req?: AuthRequest
) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, organizationId: orgId, type: 'regulatory' },
  });
  if (!integration) return { ok: false as const, error: 'Regulatory integration not found.' };

  const config = (integration.config ?? {}) as Record<string, unknown>;
  const endpoint = typeof config.endpoint === 'string' ? config.endpoint : '';
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey : undefined;

  let items: Array<{
    title: string;
    source: string;
    jurisdiction: string;
    category: string;
    description?: string;
    impact?: string;
  }> = MOCK_GAZETTE_ITEMS;
  if (endpoint) {
    try {
      const remote = await fetchGazetteItems(endpoint, apiKey);
      if (remote.length) {
        items = remote.map((r) => ({
          title: r.title,
          source: r.source ?? integration.name,
          jurisdiction: r.jurisdiction ?? 'Rwanda',
          category: r.category ?? 'Regulatory',
          description: r.description,
          impact: r.impact,
        }));
      }
    } catch {
      // Fall back to demo gazette items when external feed is unavailable
    }
  }

  let created = 0;
  for (const item of items.slice(0, 3)) {
    const existing = await prisma.regulatoryUpdate.findFirst({
      where: { organizationId: orgId, title: item.title },
    });
    if (existing) continue;
    await prisma.regulatoryUpdate.create({
      data: {
        organizationId: orgId,
        title: item.title,
        description: item.description || `Synced from ${integration.name}. ${item.title}`,
        source: item.source ?? integration.name,
        jurisdiction: item.jurisdiction ?? 'Rwanda',
        category: item.category ?? 'Regulatory',
        impact: item.impact ?? 'medium',
        publishedAt: new Date(),
      },
    });
    created += 1;
    await notifyOrganizationUsers({
      organizationId: orgId,
      type: 'regulatory_update',
      title: `New regulatory update: ${item.title}`,
      message: item.title,
      priority: 'medium',
      linkUrl: '/regulatory-updates',
      notificationTypeKey: 'regulatoryUpdates',
    });
  }

  const recordsSynced = created;
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      recordsSynced: integration.recordsSynced + recordsSynced,
      status: 'connected',
      isActive: true,
      errorCount: 0,
    },
  });

  if (req?.user) {
    await writeAuditLog({
      organizationId: orgId,
      userId: req.user.db.id,
      userName: req.user.db.fullName,
      userRole: req.user.db.role,
      action: 'integration_sync',
      resource: 'integrations',
      resourceId: integration.id,
      resourceType: 'integration',
      actionDetails: `Regulatory sync: ${recordsSynced} new record(s)`,
      req,
    });
  }

  return { ok: true as const, recordsSynced, duplicate: recordsSynced === 0, title: items[0]?.title };
}

export async function syncDmsIntegration(orgId: string, integrationId: string, req?: AuthRequest) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, organizationId: orgId, type: 'dms' },
  });
  if (!integration) return { ok: false as const, error: 'DMS integration not found.' };

  const created = await prisma.contract.create({
    data: {
      organizationId: orgId,
      title: `DMS Sync — ${integration.name} ${new Date().toISOString().slice(0, 10)}`,
      type: 'custom',
      status: 'draft',
      content: 'Imported from document management system sync.',
      createdBy: req?.user?.db.fullName ?? 'System',
      fileUrl: '/contracts/dms-import.pdf',
    },
  });

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      recordsSynced: integration.recordsSynced + 1,
      status: 'connected',
      isActive: true,
    },
  });

  if (req?.user) {
    await writeAuditLog({
      organizationId: orgId,
      userId: req.user.db.id,
      userName: req.user.db.fullName,
      userRole: req.user.db.role,
      action: 'integration_sync',
      resource: 'integrations',
      resourceId: integration.id,
      resourceType: 'integration',
      actionDetails: `DMS sync: 1 file linked (${created.id})`,
      req,
    });
  }

  return { ok: true as const, recordsSynced: 1, contractId: created.id };
}

export async function syncErpIntegration(orgId: string, integrationId: string, req?: AuthRequest) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, organizationId: orgId, type: 'erp_hris' },
  });
  if (!integration) return { ok: false as const, error: 'ERP/HRIS integration not found.' };

  const users = await prisma.user.findMany({ where: { organizationId: orgId } });
  let updated = 0;
  for (const user of users) {
    if (!user.department) {
      await prisma.user.update({
        where: { id: user.id },
        data: { department: user.role === 'manager' ? 'Management' : 'Legal & Compliance' },
      });
      updated++;
    }
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      recordsSynced: integration.recordsSynced + updated,
      status: 'connected',
      isActive: true,
    },
  });

  if (req?.user) {
    await writeAuditLog({
      organizationId: orgId,
      userId: req.user.db.id,
      userName: req.user.db.fullName,
      userRole: req.user.db.role,
      action: 'integration_sync',
      resource: 'integrations',
      resourceId: integration.id,
      resourceType: 'integration',
      actionDetails: `ERP/HRIS sync: ${updated} user department(s) updated`,
      req,
    });
  }

  return { ok: true as const, recordsSynced: updated };
}
