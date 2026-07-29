import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeUser } from '../lib/users.js';
import { writeAuditLog } from '../lib/audit.js';
import {
  getDefaultPermissions,
  getRoleLabel,
  type UserPermissions,
} from '../lib/permissions.js';
import { authenticate, requireAdmin, requireModule, type AuthRequest } from '../middleware/auth.js';
import type { UserRole } from '@prisma/client';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/', requireAdmin, async (req: AuthRequest, res) => {
  const org = req.user!.db.organization;
  const users = await prisma.user.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
  });
  res.json({ users: users.map((user) => serializeUser(user, org)) });
});

usersRouter.get('/export', requireAdmin, async (req: AuthRequest, res) => {
  const users = await prisma.user.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { fullName: 'asc' },
  });
  const header = 'fullName,email,phone,role,department,status\n';
  const rows = users
    .map(
      (u) =>
        `${JSON.stringify(u.fullName)},${JSON.stringify(u.email)},${JSON.stringify(u.phone)},${u.role},${JSON.stringify(u.department ?? '')},${u.status}`
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
  res.send(header + rows);
});

usersRouter.get('/org-structure', requireAdmin, async (req: AuthRequest, res) => {
  const orgRow = await prisma.organization.findUnique({ where: { id: req.user!.db.organizationId } });
  const org = orgRow ?? req.user!.db.organization;
  const users = await prisma.user.findMany({
    where: { organizationId: org.id },
    select: { id: true, department: true, role: true, fullName: true },
  });
  const deptMap = new Map<string, { userCount: number; managerName?: string }>();
  for (const user of users) {
    const dept = user.department?.trim() || 'General';
    const entry = deptMap.get(dept) ?? { userCount: 0 };
    entry.userCount += 1;
    if (user.role === 'manager' || user.role === 'admin') {
      entry.managerName = user.fullName;
    }
    deptMap.set(dept, entry);
  }

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const extraUnits = Array.isArray(settings.extraOrgUnits) ? (settings.extraOrgUnits as Array<Record<string, unknown>>) : [];

  const units = [
    {
      id: org.id,
      name: org.name,
      type: 'organization',
      userCount: users.length,
      parentId: null as string | null,
      managerName: users.find((u) => u.role === 'admin')?.fullName,
      createdAt: org.createdAt.toISOString(),
    },
    ...Array.from(deptMap.entries()).map(([name, info]) => ({
      id: `dept-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      type: 'department',
      userCount: info.userCount,
      parentId: org.id,
      managerName: info.managerName,
      createdAt: org.createdAt.toISOString(),
    })),
    ...extraUnits.map((u) => ({
      id: String(u.id),
      name: String(u.name),
      type: String(u.type ?? 'department'),
      userCount: Number(u.userCount ?? 0),
      parentId: (u.parentId as string | null) ?? org.id,
      managerName: u.managerName ? String(u.managerName) : undefined,
      createdAt: String(u.createdAt ?? new Date().toISOString()),
    })),
  ];

  res.json({ units });
});

usersRouter.post('/org-structure', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      name: z.string().min(1),
      type: z.enum(['department', 'business_unit', 'team']).default('department'),
      managerName: z.string().optional(),
    })
    .parse(req.body);

  const org = await prisma.organization.findUnique({ where: { id: req.user!.db.organizationId } });
  if (!org) {
    res.status(404).json({ error: 'Organization not found.' });
    return;
  }

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const extraUnits = Array.isArray(settings.extraOrgUnits)
    ? [...(settings.extraOrgUnits as Array<Record<string, unknown>>)]
    : [];

  const unit = {
    id: `unit-${Date.now()}`,
    name: body.name,
    type: body.type,
    userCount: 0,
    parentId: org.id,
    managerName: body.managerName,
    createdAt: new Date().toISOString(),
  };
  extraUnits.push(unit);

  await prisma.organization.update({
    where: { id: org.id },
    data: { settings: { ...settings, extraOrgUnits: extraUnits } },
  });

  res.status(201).json({ unit });
});

usersRouter.get('/activity', requireAdmin, async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const activities = await prisma.activityItem.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({
    activities: activities.map((a) => ({
      id: a.id,
      userName: a.userName,
      action: a.action,
      description: a.description,
      module: a.module,
      resourceType: a.resourceType,
      timestamp: a.createdAt.toISOString(),
    })),
  });
});

usersRouter.get('/permissions-matrix', requireAdmin, async (req: AuthRequest, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.user!.db.organizationId } });
  const orgId = req.user!.db.organizationId;
  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const overrides = (settings.rolePermissionOverrides ?? {}) as Partial<Record<UserRole, UserPermissions>>;
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { role: true },
  });
  const roles: UserRole[] = ['admin', 'manager', 'compliance_officer', 'legal_practitioner'];
  const matrix = roles.map((role) => {
    const custom = overrides[role];
    const permissions = custom ?? (getDefaultPermissions(role) as UserPermissions);
    return {
      roleId: role,
      roleName: getRoleLabel(role),
      description: custom
        ? `Custom permissions for ${getRoleLabel(role)}`
        : `Default permissions for ${getRoleLabel(role)}`,
      userCount: users.filter((u) => u.role === role).length,
      isCustom: Boolean(custom),
      permissions,
    };
  });
  res.json({ matrix });
});

usersRouter.put('/permissions-matrix/:role', requireAdmin, async (req: AuthRequest, res) => {
  const role = String(req.params.role) as UserRole;
  const allowed: UserRole[] = ['admin', 'manager', 'compliance_officer', 'legal_practitioner'];
  if (!allowed.includes(role)) {
    res.status(400).json({ error: 'Invalid role.' });
    return;
  }

  const body = z
    .object({
      modules: z.record(z.enum(['none', 'view', 'edit', 'full'])),
      actions: z.record(z.boolean()),
    })
    .parse(req.body);

  const permissions: UserPermissions = {
    modules: body.modules as UserPermissions['modules'],
    actions: body.actions as UserPermissions['actions'],
  };

  const orgId = req.user!.db.organizationId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    res.status(404).json({ error: 'Organization not found.' });
    return;
  }

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const overrides = {
    ...((settings.rolePermissionOverrides ?? {}) as Record<string, unknown>),
    [role]: permissions,
  };

  await prisma.organization.update({
    where: { id: orgId },
    data: { settings: { ...settings, rolePermissionOverrides: overrides } },
  });

  await prisma.user.updateMany({
    where: { organizationId: orgId, role },
    data: { permissions },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'role_permissions_updated',
    resource: 'permissions',
    resourceId: role,
    resourceType: 'role',
    actionDetails: `Updated permission matrix for ${getRoleLabel(role)}`,
    req,
  });

  res.json({
    roleId: role,
    roleName: getRoleLabel(role),
    permissions,
    isCustom: true,
  });
});

usersRouter.get('/access-requests', requireAdmin, async (req: AuthRequest, res) => {
  const items = await prisma.accessRequest.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests: items });
});

usersRouter.post('/access-requests', async (req: AuthRequest, res) => {
  const body = z
    .object({
      requestedRole: z.string().optional(),
      requestedModules: z.array(z.string()).optional(),
      justification: z.string().min(1),
    })
    .parse(req.body);

  const item = await prisma.accessRequest.create({
    data: {
      organizationId: req.user!.db.organizationId,
      requesterId: req.user!.db.id,
      requesterName: req.user!.db.fullName,
      requestedRole: body.requestedRole,
      requestedModules: body.requestedModules ?? [],
      justification: body.justification,
    },
  });
  res.status(201).json({ request: item });
});

usersRouter.patch('/access-requests/:id', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      status: z.enum(['approved', 'rejected']),
      reviewComments: z.string().optional(),
    })
    .parse(req.body);

  const item = await prisma.accessRequest.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }

  const updated = await prisma.accessRequest.update({
    where: { id: item.id },
    data: {
      status: body.status,
      reviewComments: body.reviewComments,
      reviewedBy: req.user!.db.fullName,
      reviewedAt: new Date(),
    },
  });

  if (body.status === 'approved' && item.requestedRole) {
    await prisma.user.update({
      where: { id: item.requesterId },
      data: { role: item.requestedRole as never },
    });
  }

  res.json({ request: updated });
});

usersRouter.get('/bulk-imports', requireAdmin, async (req: AuthRequest, res) => {
  const jobs = await prisma.bulkImportJob.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ imports: jobs });
});

usersRouter.post('/bulk-import', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      fileName: z.string(),
      rows: z.array(
        z.object({
          fullName: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          role: z.enum(['legal_practitioner', 'compliance_officer', 'manager', 'admin']),
          department: z.string().optional(),
        })
      ),
    })
    .parse(req.body);

  const errors: Array<{ row: number; field: string; error: string }> = [];
  let successCount = 0;

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    try {
      const existing = await prisma.user.findFirst({
        where: { organizationId: req.user!.db.organizationId, email: row.email },
      });
      if (existing) {
        errors.push({ row: i + 1, field: 'email', error: 'Email already exists' });
        continue;
      }
      await prisma.invitation.create({
        data: {
          organizationId: req.user!.db.organizationId,
          email: row.email,
          fullName: row.fullName,
          phone: row.phone ?? '',
          role: row.role,
          department: row.department,
          invitedById: req.user!.db.id,
          tokenHash: `bulk-${Date.now()}-${i}`,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      successCount++;
    } catch {
      errors.push({ row: i + 1, field: 'general', error: 'Import failed' });
    }
  }

  const job = await prisma.bulkImportJob.create({
    data: {
      organizationId: req.user!.db.organizationId,
      fileName: body.fileName,
      status: errors.length === 0 ? 'completed' : successCount > 0 ? 'completed' : 'failed',
      totalRecords: body.rows.length,
      successCount,
      failureCount: body.rows.length - successCount,
      errors,
      uploadedBy: req.user!.db.fullName,
    },
  });

  res.status(201).json({ job });
});

usersRouter.patch('/:userId', requireAdmin, async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const body = z
    .object({
      fullName: z.string().min(1).optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(['legal_practitioner', 'compliance_officer', 'manager', 'admin']).optional(),
    })
    .parse(req.body);

  const org = req.user!.db.organization;
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: org.id },
  });
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: body,
  });

  await writeAuditLog({
    organizationId: org.id,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'user_updated',
    resource: 'user',
    resourceId: target.id,
    resourceType: 'user',
    actionDetails: `Updated user ${target.email}`,
    req,
  });

  res.json({ user: serializeUser(updated, org) });
});

usersRouter.patch('/:userId/permissions', requireAdmin, async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const body = z
    .object({
      modules: z.record(z.enum(['none', 'view', 'edit', 'full'])).optional(),
      actions: z.record(z.boolean()).optional(),
    })
    .parse(req.body);

  const org = req.user!.db.organization;
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: org.id },
  });
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const base = getDefaultPermissions(target.role);
  const merged = {
    modules: { ...base.modules, ...(body.modules ?? {}) },
    actions: { ...base.actions, ...(body.actions ?? {}) },
  };

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { permissions: merged },
  });

  await writeAuditLog({
    organizationId: org.id,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'permissions_updated',
    resource: 'user',
    resourceId: target.id,
    resourceType: 'user',
    actionDetails: `Updated permissions for ${target.email}`,
    req,
  });

  res.json({ user: serializeUser(updated, org) });
});

usersRouter.patch('/:userId/status', requireAdmin, async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const body = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
  const org = req.user!.db.organization;
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: org.id },
  });
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.id === req.user!.db.id && body.status === 'suspended') {
    res.status(400).json({ error: 'You cannot suspend your own account.' });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { status: body.status },
  });
  if (body.status === 'suspended') {
    await prisma.session.updateMany({
      where: { userId: target.id, isActive: true },
      data: { isActive: false },
    });
  }
  await writeAuditLog({
    organizationId: org.id,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: body.status === 'suspended' ? 'user_suspended' : 'user_reactivated',
    resource: 'user',
    resourceId: target.id,
    resourceType: 'user',
    actionDetails: `${target.fullName} (${target.email}) marked ${body.status}`,
    req,
    severity: body.status === 'suspended' ? 'warning' : 'info',
  });
  res.json({ user: serializeUser(updated, org) });
});
