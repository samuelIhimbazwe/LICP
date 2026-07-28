// Contract & Document Management Types
export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'executed' | 'expired' | 'archived';
export type TemplateType = 'nda' | 'service_agreement' | 'employment' | 'purchase_order' | 'mou' | 'custom';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type SharePermission = 'view' | 'edit' | 'comment' | 'admin';

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: Date;
  documentCount: number;
}

export interface ContractDocument {
  id: string;
  title: string;
  folderId?: string;
  type: TemplateType;
  status: DocumentStatus;
  counterparty?: string;
  contractValue?: number;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
  expiryDate?: Date;
  autoRenew?: boolean;
  currentVersion: number;
  createdBy: string;
  createdAt: Date;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  tags: string[];
  fileUrl: string;
  fileSize: number;
  checkedOutBy?: string;
  checkedOutAt?: Date;
  requiresApproval: boolean;
  signatureRequired: boolean;
  signedAt?: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedAt: Date;
  changes: string;
  fileUrl: string;
  fileSize: number;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  fileUrl: string;
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  tags: string[];
}

export interface ApprovalWorkflow {
  id: string;
  documentId: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: ApprovalStep[];
  currentStepIndex: number;
  status: ApprovalStatus;
  completedAt?: Date;
  comments?: string;
}

export interface ApprovalStep {
  id: string;
  approverName: string;
  approverEmail: string;
  order: number;
  status: ApprovalStatus;
  respondedAt?: Date;
  comments?: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWith: string;
  sharedBy: string;
  sharedAt: Date;
  permission: SharePermission;
  expiresAt?: Date;
  isExternal: boolean;
  accessCount: number;
  lastAccessedAt?: Date;
}

export interface ExpiryAlert {
  id: string;
  documentId: string;
  documentTitle: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  notifiedUsers: string[];
  notifiedAt: Date;
  status: 'pending' | 'acknowledged' | 'renewed' | 'expired';
}

// Notification & Alert Types
export type NotificationType =
  | 'regulatory_update'
  | 'compliance_deadline'
  | 'document_approval'
  | 'contract_expiry'
  | 'system_announcement'
  | 'task_assignment'
  | 'escalation';

export type NotificationChannel = 'in_app' | 'email' | 'sms';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: Date;
  isRead: boolean;
  recipientId: string;
  senderId?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  sentViaEmail?: boolean;
  sentViaSMS?: boolean;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: Date;
  targetAudience: 'all' | 'role' | 'department' | 'custom';
  targetRoles?: string[];
  targetDepartments?: string[];
  targetUsers?: string[];
  priority: NotificationPriority;
  expiresAt?: Date;
  channels: NotificationChannel[];
  sentCount: number;
  readCount: number;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  preferences: {
    regulatoryUpdates: NotificationChannel[];
    complianceDeadlines: NotificationChannel[];
    documentApprovals: NotificationChannel[];
    contractExpiry: NotificationChannel[];
    systemAnnouncements: NotificationChannel[];
    taskAssignments: NotificationChannel[];
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  emailDigest?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string;
  };
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerType: 'compliance_overdue' | 'approval_pending' | 'contract_expiry';
  triggerCondition: string;
  escalateTo: string[];
  escalationDelay: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}
