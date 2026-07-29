export type UserRole = 'legal_practitioner' | 'compliance_officer' | 'manager' | 'admin';

export interface UserPermissions {
  modules: Record<string, 'none' | 'view' | 'edit' | 'full'>;
  actions: Record<string, boolean>;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: UserRole;
  profileImage?: string;
  mfaEnabled: boolean;
  mfaRequiredByOrg?: boolean;
  emailVerified?: boolean;
  sessionTimeoutMinutes?: number;
  lastLogin?: Date;
  permissions?: UserPermissions;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'compliant' | 'warning' | 'overdue';
  deadline: Date;
  assignedTo: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RegulatoryAlert {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  impact: 'high' | 'medium' | 'low';
  isRead: boolean;
}

export interface DocumentRequest {
  id: string;
  title: string;
  requestedBy: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface CaseUpdate {
  id: string;
  caseNumber: string;
  title: string;
  updateType: string;
  date: Date;
  description: string;
}

export interface TeamActivity {
  id: string;
  memberName: string;
  action: string;
  timestamp: Date;
  module: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}
