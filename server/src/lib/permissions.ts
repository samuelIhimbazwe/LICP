import type { UserRole } from '@prisma/client';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

export interface UserPermissions {
  modules: Record<string, PermissionLevel>;
  actions: Record<string, boolean>;
}

const baseModules = {
  dashboard: 'full' as PermissionLevel,
  knowledgeBase: 'full' as PermissionLevel,
  complianceTracking: 'full' as PermissionLevel,
  regulatoryUpdates: 'full' as PermissionLevel,
  contractManagement: 'full' as PermissionLevel,
  notifications: 'full' as PermissionLevel,
  aiIntelligence: 'full' as PermissionLevel,
  analytics: 'view' as PermissionLevel,
  userManagement: 'none' as PermissionLevel,
  integrations: 'view' as PermissionLevel,
  security: 'view' as PermissionLevel,
  systemSettings: 'none' as PermissionLevel,
};

const roleDefaults: Record<UserRole, UserPermissions> = {
  compliance_officer: {
    modules: {
      ...baseModules,
      analytics: 'view',
      userManagement: 'none',
      integrations: 'view',
      security: 'view',
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
  legal_practitioner: {
    modules: {
      ...baseModules,
      complianceTracking: 'edit',
      regulatoryUpdates: 'edit',
      analytics: 'view',
      userManagement: 'none',
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
      ...baseModules,
      analytics: 'full',
      userManagement: 'view',
      integrations: 'view',
      security: 'view',
      systemSettings: 'none',
    },
    actions: {
      createDocuments: true,
      approveDocuments: true,
      deleteDocuments: true,
      assignTasks: true,
      manageUsers: true,
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

export function mergePermissions(role: UserRole, override?: unknown): UserPermissions {
  const base = getDefaultPermissions(role);
  if (!override || typeof override !== 'object') return base;
  return { ...base, ...(override as Partial<UserPermissions>) };
}

const routeRoleMap: Record<string, UserRole[] | 'admin'> = {
  '/user-management': 'admin',
  '/system-settings': 'admin',
  '/integrations': ['admin', 'compliance_officer', 'manager', 'legal_practitioner'],
  '/security': ['admin', 'manager', 'compliance_officer'],
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  for (const [prefix, allowed] of Object.entries(routeRoleMap)) {
    if (path.startsWith(prefix)) {
      if (allowed === 'admin') return role === 'admin';
      return allowed.includes(role);
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
