import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { canAccessPath } from '../../lib/access';
import type { UserRole } from '../../types';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <>{children}</>;

  if (!canAccessPath(user.role, location.pathname, user.permissions)) {
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
