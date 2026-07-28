// User & Access Management Types

export type UserRole = 'legal_practitioner' | 'compliance_officer' | 'manager' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending' | 'deactivated';
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';
export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  organization: string;
  businessUnit?: string;
  department?: string;
  status: AccountStatus;
  createdAt: Date;
  lastLogin?: Date;
  mfaEnabled: boolean;
  profileImage?: string;
  manager?: string;
  permissions: UserPermissions;
}

export interface UserPermissions {
  modules: {
    dashboard: PermissionLevel;
    knowledgeBase: PermissionLevel;
    complianceTracking: PermissionLevel;
    regulatoryUpdates: PermissionLevel;
    contractManagement: PermissionLevel;
    notifications: PermissionLevel;
    aiIntelligence: PermissionLevel;
    analytics: PermissionLevel;
    userManagement: PermissionLevel;
  };
  actions: {
    createDocuments: boolean;
    approveDocuments: boolean;
    deleteDocuments: boolean;
    assignTasks: boolean;
    manageUsers: boolean;
    viewReports: boolean;
    exportData: boolean;
    configureSystem: boolean;
  };
}

export interface OrganizationStructure {
  id: string;
  name: string;
  type: 'organization' | 'business_unit' | 'department' | 'team';
  parentId?: string;
  managerId?: string;
  userCount: number;
  createdAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface AccessRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestedRole?: UserRole;
  requestedPermissions?: Partial<UserPermissions>;
  requestedModules?: string[];
  justification: string;
  status: AccessRequestStatus;
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
}

export interface PermissionMatrix {
  roleId: string;
  roleName: string;
  permissions: UserPermissions;
  description: string;
  userCount: number;
  isCustom: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  location?: string;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'permission_change' | 'status_change';
  targetType: 'user' | 'role' | 'permission' | 'organization';
  targetId: string;
  targetName: string;
  changes?: AuditChange[];
  ipAddress: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface BulkUserImport {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: Date;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  status: 'processing' | 'completed' | 'failed';
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  description: string;
  isDefault: boolean;
}
