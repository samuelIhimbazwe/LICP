// Security & Audit Module Types

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'configure';
export type EncryptionStatus = 'encrypted' | 'unencrypted' | 'partial';
export type AnomalyType = 'unusual_login' | 'mass_deletion' | 'permission_escalation' | 'data_exfiltration' | 'suspicious_activity';
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';
export type RetentionPeriod = '30_days' | '90_days' | '1_year' | '3_years' | '7_years' | 'indefinite';

export interface SecurityPermission {
  id: string;
  roleId: string;
  roleName: string;
  resource: string;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
  isInherited: boolean;
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface EncryptionConfig {
  id: string;
  dataType: string;
  encryptionMethod: 'AES-256' | 'RSA-2048' | 'AES-128' | 'custom';
  status: EncryptionStatus;
  keyRotationSchedule: 'monthly' | 'quarterly' | 'annually' | 'never';
  lastRotated?: Date;
  nextRotation?: Date;
  encryptedFields: string[];
  isActive: boolean;
}

export interface MFAConfiguration {
  userId: string;
  userName: string;
  mfaEnabled: boolean;
  mfaMethod: 'totp' | 'sms' | 'email' | 'hardware_token';
  backupCodesGenerated: boolean;
  lastUsed?: Date;
  enrolledAt?: Date;
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  addedAt: Date;
  lastUsed: Date;
  ipAddress: string;
  isActive: boolean;
}

export interface LoginActivity {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  ipAddress: string;
  location?: string;
  device: string;
  browser: string;
  status: 'success' | 'failed' | 'blocked' | 'mfa_required';
  failureReason?: string;
  mfaVerified?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceType: 'document' | 'user' | 'compliance' | 'contract' | 'regulation' | 'system';
  actionDetails: string;
  ipAddress: string;
  userAgent?: string;
  changes?: AuditChange[];
  status: 'success' | 'failure';
  severity: 'info' | 'warning' | 'critical';
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'created' | 'updated' | 'deleted';
}

export interface DocumentAccessLog {
  id: string;
  documentId: string;
  documentName: string;
  userId: string;
  userName: string;
  action: 'view' | 'download' | 'edit' | 'delete' | 'share' | 'print';
  timestamp: Date;
  ipAddress: string;
  duration?: number;
  accessGrantedBy?: string;
}

export interface ComplianceActionAudit {
  id: string;
  obligationId: string;
  obligationTitle: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'completed' | 'assigned' | 'reviewed' | 'approved';
  timestamp: Date;
  previousStatus?: string;
  newStatus?: string;
  comments?: string;
  evidenceAttached?: string[];
}

export interface RegulatoryUpdateReviewLog {
  id: string;
  updateId: string;
  updateTitle: string;
  reviewedBy: string;
  reviewedAt: Date;
  reviewDuration: number;
  impactAssessed: boolean;
  actionsTaken: string[];
  notifiedUsers: string[];
  comments?: string;
}

export interface AnomalyDetection {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: Date;
  userId?: string;
  userName?: string;
  description: string;
  indicators: string[];
  affectedResources: string[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface DataRetentionPolicy {
  id: string;
  dataType: string;
  category: 'legal_documents' | 'compliance_records' | 'contracts' | 'audit_logs' | 'user_data';
  retentionPeriod: RetentionPeriod;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  legalRequirement?: string;
  lastReviewed: Date;
  isActive: boolean;
}

export interface SecurityIncident {
  id: string;
  title: string;
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'phishing' | 'other';
  severity: AnomalySeverity;
  detectedAt: Date;
  reportedBy: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  affectedUsers: string[];
  affectedSystems: string[];
  description: string;
  mitigationSteps: string[];
  resolvedAt?: Date;
}

export interface AccessControl {
  id: string;
  resourceType: string;
  resourceId: string;
  allowedRoles: string[];
  allowedUsers?: string[];
  deniedUsers?: string[];
  ipWhitelist?: string[];
  timeRestrictions?: {
    allowedDays: number[];
    allowedHours: { start: string; end: string };
  };
  isActive: boolean;
}

export interface SecurityMetrics {
  totalLogins: number;
  failedLogins: number;
  mfaAdoptionRate: number;
  activeUsers: number;
  suspendedUsers: number;
  openAnomalies: number;
  criticalAnomalies: number;
  encryptedDataPercentage: number;
  auditLogEntries: number;
  securityIncidents: number;
}
