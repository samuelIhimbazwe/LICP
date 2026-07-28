import type { ObligationStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { writeAuditLog } from './audit.js';
import { deliverNotification } from './notifications.js';
import { mapObligationStatusToDb, mapObligationStatusToUi } from './compliance.js';

export async function applyAutoStatusForOrg(organizationId: string): Promise<number> {
  const now = new Date();
  const overdueCandidates = await prisma.complianceObligation.findMany({
    where: {
      organizationId,
      deadline: { lt: now },
      status: { in: ['pending', 'warning'] },
    },
  });

  for (const obligation of overdueCandidates) {
    await prisma.complianceObligation.update({
      where: { id: obligation.id },
      data: { status: 'overdue' },
    });
    await writeAuditLog({
      organizationId,
      action: 'obligation_auto_status',
      resource: 'compliance',
      resourceId: obligation.id,
      resourceType: 'obligation',
      actionDetails: `Auto-marked overdue: ${obligation.title}`,
      changes: { previousStatus: obligation.status, newStatus: 'overdue' },
    });
  }

  return overdueCandidates.length;
}

export async function assertEvidenceForCompliant(
  obligationId: string,
  nextStatus: ObligationStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (nextStatus !== 'compliant') return { ok: true };
  const count = await prisma.complianceEvidence.count({ where: { obligationId } });
  if (count === 0) {
    return {
      ok: false,
      message: 'At least one evidence document is required before marking compliant.',
    };
  }
  return { ok: true };
}

export async function notifyAssigneesForObligation(input: {
  organizationId: string;
  title: string;
  assignedTo: string;
  obligationId: string;
  deadline: Date;
}) {
  const names = input.assignedTo
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const users = await prisma.user.findMany({
    where: {
      organizationId: input.organizationId,
      status: 'active',
      OR: names.flatMap((name) => [
        { fullName: { contains: name } },
        { email: { contains: name.toLowerCase() } },
      ]),
    },
    select: { id: true, email: true, fullName: true },
  });

  for (const user of users) {
    await deliverNotification({
      organizationId: input.organizationId,
      userId: user.id,
      userEmail: user.email,
      type: 'task_assignment',
      title: `Compliance obligation assigned: ${input.title}`,
      message: `You were assigned "${input.title}" due ${input.deadline.toISOString().slice(0, 10)}.`,
      priority: 'medium',
      linkUrl: '/compliance-tracking',
    });
  }
}

export function auditStatusChange(input: {
  organizationId: string;
  userId: string;
  userName: string;
  userRole: string;
  obligationId: string;
  title: string;
  previousStatus: ObligationStatus;
  newStatus: ObligationStatus;
  req?: import('express').Request;
}) {
  return writeAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    userName: input.userName,
    userRole: input.userRole,
    action: 'obligation_status_changed',
    resource: 'compliance',
    resourceId: input.obligationId,
    resourceType: 'obligation',
    actionDetails: `Status changed for ${input.title}: ${mapObligationStatusToUi(input.previousStatus)} → ${mapObligationStatusToUi(input.newStatus)}`,
    changes: {
      previousStatus: mapObligationStatusToUi(input.previousStatus),
      newStatus: mapObligationStatusToUi(input.newStatus),
    },
    req: input.req,
  });
}

export async function logRegulatoryHistory(input: {
  regulatoryUpdateId: string;
  organizationId: string;
  action: string;
  details: string;
  performedByName: string;
  performedById?: string;
  changes?: unknown;
}) {
  const historyClient = (
    prisma as unknown as {
      regulatoryUpdateHistory?: {
        create: (args: object) => Promise<unknown>;
      };
    }
  ).regulatoryUpdateHistory;

  if (!historyClient) {
    await writeAuditLog({
      organizationId: input.organizationId,
      userId: input.performedById,
      userName: input.performedByName,
      action: `regulatory_${input.action}`,
      resource: 'regulatory',
      resourceId: input.regulatoryUpdateId,
      resourceType: 'regulatory_update',
      actionDetails: input.details,
      changes: input.changes,
    });
    return;
  }

  await historyClient.create({
    data: {
      regulatoryUpdateId: input.regulatoryUpdateId,
      organizationId: input.organizationId,
      action: input.action,
      details: input.details,
      performedByName: input.performedByName,
      performedById: input.performedById,
      changes: input.changes as object | undefined,
    },
  });
}

export { mapObligationStatusToDb };
