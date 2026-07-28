import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

const ADMIN_ONLY_PREFIXES = ['/user-management', '/system-settings'];

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (isAdminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    compliance_officer: 'Compliance Officer',
    legal_practitioner: 'Legal Practitioner',
    manager: 'Manager',
    admin: 'Administrator',
  };
  return labels[role];
}
