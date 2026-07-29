import type { UserRole } from '../types';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

export interface UserPermissions {
  modules: Record<string, PermissionLevel>;
  actions: Record<string, boolean>;
}

const order: PermissionLevel[] = ['none', 'view', 'edit', 'full'];

/** Mirrors server role defaults for nav/guards when permissions not yet on user object */
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
    actions: {},
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
    actions: {},
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
    actions: {},
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
    actions: {},
  },
};

const pathModule: Array<{ prefix: string; module: string }> = [
  { prefix: '/user-management', module: 'userManagement' },
  { prefix: '/system-settings', module: 'systemSettings' },
  { prefix: '/integrations', module: 'integrations' },
  { prefix: '/security', module: 'security' },
  { prefix: '/analytics', module: 'analytics' },
  { prefix: '/knowledge-base', module: 'knowledgeBase' },
  { prefix: '/compliance-tracking', module: 'complianceTracking' },
  { prefix: '/regulatory-updates', module: 'regulatoryUpdates' },
  { prefix: '/contracts', module: 'contractManagement' },
  { prefix: '/ai-intelligence', module: 'aiIntelligence' },
  { prefix: '/notifications', module: 'notifications' },
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/reports', module: 'analytics' },
];

export function getDefaultPermissions(role: UserRole): UserPermissions {
  return JSON.parse(JSON.stringify(roleDefaults[role]));
}

export function hasModuleAccess(
  permissions: UserPermissions | undefined,
  module: string,
  minLevel: PermissionLevel = 'view'
): boolean {
  const level = permissions?.modules?.[module] ?? 'none';
  return order.indexOf(level) >= order.indexOf(minLevel);
}

export function canAccessPath(
  role: UserRole | undefined,
  path: string,
  permissions?: UserPermissions
): boolean {
  if (!role) return false;
  const perms = permissions ?? getDefaultPermissions(role);
  const hit = pathModule.find((p) => path.startsWith(p.prefix));
  if (!hit) return true;
  return hasModuleAccess(perms, hit.module, 'view');
}
