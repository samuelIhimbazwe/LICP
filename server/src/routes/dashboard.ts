import { Router } from 'express';
import type { UserRole } from '@prisma/client';
import { getDashboardForRole } from '../lib/dashboard.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles, requireModule, type AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requireModule('dashboard', 'view'));

const roleRoutes: Array<{ path: string; role: UserRole }> = [
  { path: '/compliance-officer', role: 'compliance_officer' },
  { path: '/legal-practitioner', role: 'legal_practitioner' },
  { path: '/manager', role: 'manager' },
  { path: '/admin', role: 'admin' },
];

for (const { path, role } of roleRoutes) {
  dashboardRouter.get(path, requireRoles(role), async (req: AuthRequest, res) => {
    const data = await getDashboardForRole(req.user!.db.organizationId, role);
    res.json(data);
  });
}

dashboardRouter.get('/live', async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 60_000);
  const [unreadRegulatory, overdueCount, unreadNotifications] = await Promise.all([
    prisma.regulatoryUpdate.count({
      where: { organizationId: orgId, isRead: false, publishedAt: { gte: since } },
    }),
    prisma.complianceObligation.count({
      where: { organizationId: orgId, status: 'overdue', updatedAt: { gte: since } },
    }),
    prisma.notification.count({
      where: { userId: req.user!.db.id, isRead: false, createdAt: { gte: since } },
    }),
  ]);
  res.json({
    updatedAt: new Date().toISOString(),
    changes: { unreadRegulatory, overdueCount, unreadNotifications },
  });
});

dashboardRouter.get('/', async (req: AuthRequest, res) => {
  const data = await getDashboardForRole(req.user!.db.organizationId, req.user!.db.role);
  res.json(data);
});
