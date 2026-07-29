import type { UserRole } from '@prisma/client';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

export interface UserPermissions {
  modules: Record<string, PermissionLevel>;
  actions: Record<string, boolean>;
}

/**
 * Role defaults aligned with LICP UI Modules doc:
 * - Admin: platform owner (users, security, integrations, settings)
 * - Manager: oversight + analytics
 * - Compliance Officer: compliance + regulatory
 * - Legal Practitioner: knowledge + contracts
 * Shared: dashboard, notifications, AI
 */
const roleDefaults: Record<UserRole, UserPermissions> = {
  legal_practitioner: {
    modules: {
      dashboard: 'full',
      knowledgeBase: 'full',
      complianceTracking: 'view',
      regulatoryUpdates: 'view',
      contractManagement: 'full',
      notifications: 'full',
      aiIntelligence: 'full',
      analytics: 'none',
      userManagement: 'none',
      integrations: 'none',
      security: 'none',
      systemSettings: 'none',
    },
    actions: {
      createDocuments: true,
      approveDocuments: true,
      deleteDocuments: false,
      assignTasks: true,
      manageUsers: false,
      viewReports: false,
      exportData: true,
      configureSystem: false,
    },
  },
  compliance_officer: {
    modules: {
      dashboard: 'full',
      knowledgeBase: 'view',
      complianceTracking: 'full',
      regulatoryUpdates: 'full',
      contractManagement: 'view',
      notifications: 'full',
      aiIntelligence: 'full',
      analytics: 'view',
      userManagement: 'none',
      integrations: 'none',
      security: 'none',
      systemSettings: 'none',
    },
    actions: {
      createDocuments: true,
      approveDocuments: true,
      deleteDocuments: false,
      assignTasks: true,
      manageUsers: false,
      viewReports: true,
      exportData: true,
      configureSystem: false,
    },
  },
  manager: {
    modules: {
      dashboard: 'full',
      knowledgeBase: 'view',
      complianceTracking: 'view',
      regulatoryUpdates: 'edit',
      contractManagement: 'edit',
      notifications: 'full',
      aiIntelligence: 'full',
      analytics: 'full',
      userManagement: 'none',
      integrations: 'none',
      security: 'view',
      systemSettings: 'none',
    },
    actions: {
      createDocuments: true,
      approveDocuments: true,
      deleteDocuments: true,
      assignTasks: true,
      manageUsers: false,
      viewReports: true,
      exportData: true,
      configureSystem: false,
    },
  },
  admin: {
    modules: {
      dashboard: 'full',
      knowledgeBase: 'full',
      complianceTracking: 'full',
      regulatoryUpdates: 'full',
      contractManagement: 'full',
      notifications: 'full',
      aiIntelligence: 'full',
      analytics: 'full',
      userManagement: 'full',
      integrations: 'full',
      security: 'full',
      systemSettings: 'full',
    },
    actions: {
      createDocuments: true,
      approveDocuments: true,
      deleteDocuments: true,
      assignTasks: true,
      manageUsers: true,
      viewReports: true,
      exportData: true,
      configureSystem: true,
    },
  },
};

export function getDefaultPermissions(role: UserRole): UserPermissions {
  return JSON.parse(JSON.stringify(roleDefaults[role]));
}

/**
 * Effective permissions = role defaults, optionally replaced by org role matrix overrides.
 * Legacy per-user permission blobs are ignored so RBAC stays role-differentiated.
 */
export function mergePermissions(
  role: UserRole,
  _override?: unknown,
  orgSettings?: Record<string, unknown> | null
): UserPermissions {
  const base = getDefaultPermissions(role);
  const overrides = (orgSettings?.rolePermissionOverrides ?? {}) as Partial<
    Record<UserRole, UserPermissions>
  >;
  const custom = overrides[role];
  if (!custom?.modules) return base;
  return {
    modules: { ...base.modules, ...custom.modules },
    actions: { ...base.actions, ...(custom.actions ?? {}) },
  };
}

const routeModuleMap: Array<{ prefix: string; module: string; minLevel?: PermissionLevel }> = [
  { prefix: '/user-management', module: 'userManagement', minLevel: 'full' },
  { prefix: '/system-settings', module: 'systemSettings', minLevel: 'full' },
  { prefix: '/integrations', module: 'integrations', minLevel: 'view' },
  { prefix: '/security', module: 'security', minLevel: 'view' },
  { prefix: '/analytics', module: 'analytics', minLevel: 'view' },
  { prefix: '/knowledge-base', module: 'knowledgeBase', minLevel: 'view' },
  { prefix: '/compliance-tracking', module: 'complianceTracking', minLevel: 'view' },
  { prefix: '/regulatory-updates', module: 'regulatoryUpdates', minLevel: 'view' },
  { prefix: '/contracts', module: 'contractManagement', minLevel: 'view' },
  { prefix: '/ai-intelligence', module: 'aiIntelligence', minLevel: 'view' },
  { prefix: '/notifications', module: 'notifications', minLevel: 'view' },
  { prefix: '/dashboard', module: 'dashboard', minLevel: 'view' },
];

export function canAccessRoute(
  role: UserRole,
  path: string,
  permissions?: UserPermissions
): boolean {
  const perms = permissions ?? getDefaultPermissions(role);
  for (const { prefix, module, minLevel } of routeModuleMap) {
    if (path.startsWith(prefix)) {
      return hasModuleAccess(perms, module, minLevel ?? 'view');
    }
  }
  return true;
}

export function hasModuleAccess(
  permissions: UserPermissions,
  module: string,
  minLevel: PermissionLevel = 'view'
): boolean {
  const level = permissions.modules[module] ?? 'none';
  const order: PermissionLevel[] = ['none', 'view', 'edit', 'full'];
  return order.indexOf(level) >= order.indexOf(minLevel);
}

export function canAccessAnalytics(permissions: UserPermissions): boolean {
  return hasModuleAccess(permissions, 'analytics', 'view') || Boolean(permissions.actions.viewReports);
}

export function canAccessExecutiveAnalytics(permissions: UserPermissions, role: UserRole): boolean {
  if (role === 'admin' || role === 'manager') return true;
  if (role === 'compliance_officer') return hasModuleAccess(permissions, 'analytics', 'view');
  return hasModuleAccess(permissions, 'analytics', 'full');
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  compliance_officer: 'Compliance Officer',
  legal_practitioner: 'Legal Practitioner',
};

export function getRoleLabel(role: UserRole): string {
  return roleLabels[role];
}

/** Path → module key for nav filtering */
export function moduleForPath(path: string): string | null {
  const hit = routeModuleMap.find((r) => path.startsWith(r.prefix));
  return hit?.module ?? null;
}
