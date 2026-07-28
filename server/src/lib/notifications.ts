import type { NotificationPriority, NotificationType, UserRole } from '@prisma/client';
import { prisma } from './prisma.js';
import { sendEmail } from './audit.js';

export type DeliveryChannel = 'in_app' | 'email' | 'sms';

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export interface NotificationPreferencePayload {
  channels: NotificationChannels;
  typePreferences: Record<string, DeliveryChannel[]>;
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  emailDigest?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
  };
  subscriptions?: {
    jurisdictions: string[];
    categories: string[];
  };
}

export const defaultNotificationPreferences = (): NotificationPreferencePayload => ({
  channels: { inApp: true, email: true, sms: false },
  typePreferences: {
    regulatoryUpdates: ['in_app', 'email'],
    complianceDeadlines: ['in_app', 'email', 'sms'],
    documentApprovals: ['in_app', 'email'],
    contractExpiry: ['in_app', 'email'],
    systemAnnouncements: ['in_app', 'email'],
    taskAssignments: ['in_app', 'email'],
    escalations: ['in_app', 'email', 'sms'],
  },
  quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
  emailDigest: { enabled: false, frequency: 'daily', time: '08:00' },
  subscriptions: { jurisdictions: ['Rwanda'], categories: [] },
});

const typeKeyMap: Record<NotificationType, keyof NotificationPreferencePayload['typePreferences']> =
  {
    regulatory_update: 'regulatoryUpdates',
    compliance_deadline: 'complianceDeadlines',
    document_approval: 'documentApprovals',
    contract_expiry: 'contractExpiry',
    system_announcement: 'systemAnnouncements',
    task_assignment: 'taskAssignments',
    escalation: 'escalations',
  };

function isQuietHours(quietHours?: NotificationPreferencePayload['quietHours']): boolean {
  if (!quietHours?.enabled) return false;
  const now = new Date();
  const [startH, startM] = quietHours.startTime.split(':').map(Number);
  const [endH, endM] = quietHours.endTime.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (start <= end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export async function getOrCreatePreferences(userId: string): Promise<NotificationPreferencePayload> {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) {
    return {
      channels: existing.channels as unknown as NotificationChannels,
      typePreferences: existing.typePreferences as unknown as Record<string, DeliveryChannel[]>,
      quietHours: existing.quietHours as unknown as NotificationPreferencePayload['quietHours'],
      emailDigest: existing.emailDigest as unknown as NotificationPreferencePayload['emailDigest'],
      subscriptions: existing.subscriptions as unknown as NotificationPreferencePayload['subscriptions'],
    };
  }
  const defaults = defaultNotificationPreferences();
  await prisma.notificationPreference.create({
    data: {
      userId,
      channels: defaults.channels as object,
      typePreferences: defaults.typePreferences as object,
      quietHours: defaults.quietHours as object,
      emailDigest: defaults.emailDigest as object,
      subscriptions: defaults.subscriptions as object,
    },
  });
  return defaults;
}

export async function savePreferences(userId: string, prefs: NotificationPreferencePayload) {
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      channels: prefs.channels as object,
      typePreferences: prefs.typePreferences as object,
      quietHours: prefs.quietHours ? (prefs.quietHours as object) : undefined,
      emailDigest: prefs.emailDigest ? (prefs.emailDigest as object) : undefined,
      subscriptions: prefs.subscriptions ? (prefs.subscriptions as object) : undefined,
    },
    update: {
      channels: prefs.channels as object,
      typePreferences: prefs.typePreferences as object,
      quietHours: prefs.quietHours ? (prefs.quietHours as object) : undefined,
      emailDigest: prefs.emailDigest ? (prefs.emailDigest as object) : undefined,
      subscriptions: prefs.subscriptions ? (prefs.subscriptions as object) : undefined,
    },
  });
}

async function logDelivery(input: {
  organizationId: string;
  userId: string;
  notificationId?: string;
  channel: DeliveryChannel;
  status: 'sent' | 'delivered' | 'failed' | 'skipped';
  title: string;
  message: string;
  failureReason?: string;
}) {
  const now = new Date();
  await prisma.notificationDeliveryLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      notificationId: input.notificationId,
      channel: input.channel,
      status: input.status,
      title: input.title,
      message: input.message,
      failureReason: input.failureReason,
      deliveredAt: input.status === 'delivered' ? now : undefined,
      failedAt: input.status === 'failed' ? now : undefined,
    },
  });
}

function channelsForType(
  prefs: NotificationPreferencePayload,
  type: NotificationType,
  override?: DeliveryChannel[]
): DeliveryChannel[] {
  if (override?.length) return override;
  const key = typeKeyMap[type];
  const typeChannels = prefs.typePreferences[key] ?? ['in_app'];
  return typeChannels.filter((ch) => {
    if (ch === 'in_app') return prefs.channels.inApp;
    if (ch === 'email') return prefs.channels.email;
    if (ch === 'sms') return prefs.channels.sms;
    return false;
  });
}

export async function deliverNotification(input: {
  organizationId: string;
  userId: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  linkUrl?: string;
  channels?: DeliveryChannel[];
}) {
  const prefs = await getOrCreatePreferences(input.userId);
  const quiet = isQuietHours(prefs.quietHours);
  const selected = channelsForType(prefs, input.type, input.channels);

  let notificationId: string | undefined;

  if (selected.includes('in_app') && prefs.channels.inApp) {
    const notification = await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? 'medium',
        linkUrl: input.linkUrl,
      },
    });
    notificationId = notification.id;
    await logDelivery({
      organizationId: input.organizationId,
      userId: input.userId,
      notificationId,
      channel: 'in_app',
      status: 'delivered',
      title: input.title,
      message: input.message,
    });
  } else {
    await logDelivery({
      organizationId: input.organizationId,
      userId: input.userId,
      channel: 'in_app',
      status: 'skipped',
      title: input.title,
      message: input.message,
      failureReason: 'In-app disabled by preferences',
    });
  }

  if (selected.includes('email') && prefs.channels.email && !quiet) {
    try {
      const result = await sendEmail(
        input.userEmail,
        `[LICP] ${input.title}`,
        `<p>${input.message}</p>${input.linkUrl ? `<p><a href="${input.linkUrl}">View in LICP</a></p>` : ''}`,
        { organizationId: input.organizationId }
      );
      await logDelivery({
        organizationId: input.organizationId,
        userId: input.userId,
        notificationId,
        channel: 'email',
        status: result.delivered ? 'delivered' : 'failed',
        title: input.title,
        message: input.message,
        failureReason: result.delivered ? undefined : result.error,
      });
    } catch (err) {
      await logDelivery({
        organizationId: input.organizationId,
        userId: input.userId,
        notificationId,
        channel: 'email',
        status: 'failed',
        title: input.title,
        message: input.message,
        failureReason: err instanceof Error ? err.message : 'Email delivery failed',
      });
    }
  } else if (selected.includes('email')) {
    await logDelivery({
      organizationId: input.organizationId,
      userId: input.userId,
      notificationId,
      channel: 'email',
      status: quiet ? 'skipped' : 'skipped',
      title: input.title,
      message: input.message,
      failureReason: quiet ? 'Quiet hours' : 'Email disabled by preferences',
    });
  }

  if (selected.includes('sms') && prefs.channels.sms && !quiet) {
    console.log(`[SMS] To user ${input.userId}: ${input.title}`);
    await logDelivery({
      organizationId: input.organizationId,
      userId: input.userId,
      notificationId,
      channel: 'sms',
      status: 'delivered',
      title: input.title,
      message: input.message,
    });
  }

  return notificationId;
}

export async function notifyOrganizationUsers(input: {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  linkUrl?: string;
  roles?: UserRole[];
  channels?: DeliveryChannel[];
}) {
  const users = await prisma.user.findMany({
    where: {
      organizationId: input.organizationId,
      status: 'active',
      ...(input.roles?.length ? { role: { in: input.roles } } : {}),
    },
    select: { id: true, email: true },
  });

  for (const user of users) {
    await deliverNotification({
      organizationId: input.organizationId,
      userId: user.id,
      userEmail: user.email,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      linkUrl: input.linkUrl,
      channels: input.channels,
    });
  }
  return users.length;
}

export async function runEscalationCheck(organizationId: string) {
  const rules = await prisma.escalationRule.findMany({
    where: { organizationId, isActive: true },
  });
  if (rules.length === 0) return 0;

  const overdueCritical = await prisma.complianceObligation.findMany({
    where: {
      organizationId,
      status: 'overdue',
      priority: 'high',
    },
  });

  let escalations = 0;
  for (const obligation of overdueCritical) {
    const daysOverdue = Math.floor(
      (Date.now() - obligation.deadline.getTime()) / (24 * 60 * 60 * 1000)
    );
    for (const rule of rules) {
      if (daysOverdue < rule.escalationDelayDays) continue;
      const roles = rule.escalateToRoles as UserRole[];
      const count = await notifyOrganizationUsers({
        organizationId,
        roles,
        type: 'escalation',
        title: `Escalation: ${obligation.title}`,
        message: `${obligation.title} is ${daysOverdue} days overdue. Rule: ${rule.name}`,
        priority: 'critical',
        linkUrl: '/compliance-tracking',
        channels: ['in_app', 'email'],
      });
      escalations += count;
    }
  }
  return escalations;
}

export function serializeDeliveryLog(log: {
  id: string;
  channel: string;
  status: string;
  title: string;
  message: string;
  failureReason: string | null;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
}) {
  return {
    id: log.id,
    channel: log.channel,
    status: log.status,
    title: log.title,
    message: log.message,
    failureReason: log.failureReason,
    sentAt: log.sentAt.toISOString(),
    deliveredAt: log.deliveredAt?.toISOString(),
    readAt: log.readAt?.toISOString(),
    failedAt: log.failedAt?.toISOString(),
  };
}
