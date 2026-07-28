import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { writeAuditLog } from '../lib/audit.js';
import { authenticate, requireAdmin, requireModule, type AuthRequest } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  getOrCreatePreferences,
  notifyOrganizationUsers,
  runEscalationCheck,
  savePreferences,
  serializeDeliveryLog,
  type NotificationPreferencePayload,
} from '../lib/notifications.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate, requireModule('notifications', 'view'));

notificationsRouter.get('/unread-count', async (req: AuthRequest, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.db.id, isRead: false },
  });
  res.json({ count });
});

notificationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const type = req.query.type ? String(req.query.type) : undefined;
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.db.id,
        ...(type && type !== 'all' ? { type: type as never } : {}),
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        isRead: n.isRead,
        linkUrl: n.linkUrl,
        timestamp: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('GET /notifications failed:', err);
    res.status(500).json({
      error: 'Failed to load notifications.',
      details: config.nodeEnv === 'development' && err instanceof Error ? err.message : undefined,
    });
  }
});

notificationsRouter.get('/stream', async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const userId = req.user!.db.id;
  let lastCount = -1;

  const push = async () => {
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    if (count !== lastCount) {
      lastCount = count;
      res.write(`data: ${JSON.stringify({ unreadCount: count, at: new Date().toISOString() })}\n\n`);
    } else {
      res.write(`: ping ${Date.now()}\n\n`);
    }
  };

  await push();
  const timer = setInterval(() => {
    void push().catch(() => clearInterval(timer));
  }, 5000);

  req.on('close', () => clearInterval(timer));
});

notificationsRouter.get('/preferences', async (req: AuthRequest, res) => {
  const prefs = await getOrCreatePreferences(req.user!.db.id);
  res.json({ preferences: prefs });
});

notificationsRouter.put('/preferences', async (req: AuthRequest, res) => {
  const existing = await getOrCreatePreferences(req.user!.db.id);
  const incoming = req.body as Partial<NotificationPreferencePayload>;
  const merged: NotificationPreferencePayload = {
    ...existing,
    ...incoming,
    channels: { ...existing.channels, ...incoming.channels },
    typePreferences: { ...existing.typePreferences, ...incoming.typePreferences },
    quietHours: incoming.quietHours ?? existing.quietHours,
    emailDigest: incoming.emailDigest ?? existing.emailDigest,
    subscriptions: incoming.subscriptions ?? existing.subscriptions,
  };

  const body = z
    .object({
      channels: z.object({
        inApp: z.boolean(),
        email: z.boolean(),
        sms: z.boolean(),
      }),
      typePreferences: z.record(z.array(z.enum(['in_app', 'email', 'sms']))),
      quietHours: z
        .object({
          enabled: z.boolean(),
          startTime: z.string(),
          endTime: z.string(),
        })
        .optional()
        .nullable()
        .transform((v) => v ?? undefined),
      emailDigest: z
        .object({
          enabled: z.boolean(),
          frequency: z.enum(['daily', 'weekly']),
          time: z.string(),
        })
        .optional()
        .nullable()
        .transform((v) => v ?? undefined),
      subscriptions: z
        .object({
          jurisdictions: z.array(z.string()),
          categories: z.array(z.string()),
        })
        .optional(),
    })
    .parse(merged) as NotificationPreferencePayload;

  await savePreferences(req.user!.db.id, body);
  res.json({ success: true, preferences: body });
});

notificationsRouter.get('/logs', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const logs = await prisma.notificationDeliveryLog.findMany({
    where: { userId: req.user!.db.id },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
  res.json({ logs: logs.map(serializeDeliveryLog) });
});

notificationsRouter.get('/broadcasts', requireAdmin, async (req: AuthRequest, res) => {
  const broadcasts = await prisma.broadcast.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      priority: b.priority,
      targetAudience: b.targetAudience,
      channels: b.channels,
      recipientCount: b.recipientCount,
      readCount: b.readCount,
      createdBy: b.createdByName,
      createdAt: b.createdAt.toISOString(),
      expiresAt: b.expiresAt?.toISOString(),
    })),
  });
});

notificationsRouter.get('/escalation-rules', requireAdmin, async (req: AuthRequest, res) => {
  const rules = await prisma.escalationRule.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      triggerCondition: r.triggerCondition,
      escalationDelay: r.escalationDelayDays,
      escalateTo: r.escalateToRoles,
      isActive: r.isActive,
      createdBy: r.createdByName,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

notificationsRouter.post('/escalation-rules', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      name: z.string().min(1),
      triggerCondition: z.string().min(1),
      escalationDelayDays: z.number().int().min(1).max(30).default(3),
      escalateToRoles: z.array(z.enum(['manager', 'admin', 'compliance_officer'])).min(1),
    })
    .parse(req.body);

  const admin = req.user!.db;
  const rule = await prisma.escalationRule.create({
    data: {
      organizationId: admin.organizationId,
      name: body.name,
      triggerCondition: body.triggerCondition,
      escalationDelayDays: body.escalationDelayDays,
      escalateToRoles: body.escalateToRoles,
      createdByName: admin.fullName,
    },
  });

  res.status(201).json({
    rule: {
      id: rule.id,
      name: rule.name,
      triggerCondition: rule.triggerCondition,
      escalationDelay: rule.escalationDelayDays,
      escalateTo: rule.escalateToRoles,
      isActive: rule.isActive,
      createdBy: rule.createdByName,
      createdAt: rule.createdAt.toISOString(),
    },
  });
});

notificationsRouter.patch('/escalation-rules/:id', requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const body = z.object({ isActive: z.boolean() }).parse(req.body);
  const rule = await prisma.escalationRule.findFirst({
    where: { id, organizationId: req.user!.db.organizationId },
  });
  if (!rule) {
    res.status(404).json({ error: 'Rule not found.' });
    return;
  }
  const updated = await prisma.escalationRule.update({
    where: { id },
    data: { isActive: body.isActive },
  });
  res.json({ rule: { id: updated.id, isActive: updated.isActive } });
});

notificationsRouter.post('/escalation/run', requireAdmin, async (req: AuthRequest, res) => {
  const count = await runEscalationCheck(req.user!.db.organizationId);
  res.json({ success: true, escalationsSent: count });
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user!.db.id },
  });
  if (!notification) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  await prisma.notificationDeliveryLog.updateMany({
    where: { notificationId: id, channel: 'in_app', readAt: null },
    data: { readAt: new Date() },
  });

  res.json({
    notification: {
      id: updated.id,
      isRead: updated.isRead,
    },
  });
});

notificationsRouter.post('/mark-all-read', async (req: AuthRequest, res) => {
  const userId = req.user!.db.id;
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  await prisma.notificationDeliveryLog.updateMany({
    where: { userId, channel: 'in_app', readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
});

notificationsRouter.post('/broadcast', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      message: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      linkUrl: z.string().optional(),
      targetAudience: z.enum(['all', 'role', 'department']).default('all'),
      channels: z.array(z.enum(['in_app', 'email', 'sms'])).default(['in_app']),
      expiresAt: z.string().optional(),
    })
    .parse(req.body);

  const admin = req.user!.db;
  const orgId = admin.organizationId;

  const recipientCount = await notifyOrganizationUsers({
    organizationId: orgId,
    type: 'system_announcement',
    title: body.title,
    message: body.message,
    priority: body.priority ?? 'medium',
    linkUrl: body.linkUrl,
    channels: body.channels,
  });

  const broadcast = await prisma.broadcast.create({
    data: {
      organizationId: orgId,
      title: body.title,
      message: body.message,
      priority: body.priority ?? 'medium',
      targetAudience: body.targetAudience,
      channels: body.channels as object,
      recipientCount,
      createdById: admin.id,
      createdByName: admin.fullName,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: admin.id,
    userName: admin.fullName,
    userRole: admin.role,
    action: 'announcement_broadcast',
    resource: 'notifications',
    resourceType: 'system',
    actionDetails: `Broadcast: ${body.title}`,
    req,
  });

  res.json({ success: true, recipientCount, broadcastId: broadcast.id });
});
