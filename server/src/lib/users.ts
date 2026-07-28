import type { User, Organization } from '@prisma/client';
import { mergePermissions, type UserPermissions } from '../lib/permissions.js';

export function serializeUser(
  user: User,
  organization?: Pick<Organization, 'name' | 'mfaRequired' | 'sessionTimeoutMinutes'>
) {
  const permissions = mergePermissions(user.role, user.permissions);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    organization: organization?.name ?? user.organizationId,
    organizationId: user.organizationId,
    role: user.role,
    profileImage: user.profileImage ?? undefined,
    mfaEnabled: user.mfaEnabled,
    mfaRequiredByOrg: organization?.mfaRequired ?? true,
    emailVerified: Boolean(user.emailVerifiedAt),
    sessionTimeoutMinutes: organization?.sessionTimeoutMinutes ?? 30,
    status: user.status,
    lastLogin: user.lastLoginAt?.toISOString(),
    permissions,
  };
}

export type SafeUser = ReturnType<typeof serializeUser>;

export function passwordMeetsPolicy(password: string): { ok: boolean; message?: string } {
  if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { ok: false, message: 'Password must include an uppercase letter.' };
  if (!/[a-z]/.test(password)) return { ok: false, message: 'Password must include a lowercase letter.' };
  if (!/[0-9]/.test(password)) return { ok: false, message: 'Password must include a number.' };
  return { ok: true };
}

export { type UserPermissions };
