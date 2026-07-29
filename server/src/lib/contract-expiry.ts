import { prisma } from './prisma.js';
import { notifyOrganizationUsers } from './notifications.js';

export async function runContractExpiryAlerts(organizationId: string) {
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86400000);
  const expiring = await prisma.contract.findMany({
    where: {
      organizationId,
      expiryDate: { gte: now, lte: in30 },
      status: { notIn: ['expired', 'archived'] },
    },
  });

  let notified = 0;
  for (const contract of expiring) {
    const days = contract.expiryDate
      ? Math.ceil((contract.expiryDate.getTime() - now.getTime()) / 86400000)
      : null;
    const count = await notifyOrganizationUsers({
      organizationId,
      type: 'contract_expiry',
      title: `Contract expiring: ${contract.title}`,
      message: `Contract "${contract.title}" expires in ${days ?? '?'} days.`,
      priority: days !== null && days <= 7 ? 'high' : 'medium',
      linkUrl: `/contracts?highlight=${contract.id}`,
    });
    notified += count;
  }

  return { contractsChecked: expiring.length, notificationsSent: notified };
}
