// Integration Module Types

export type IntegrationType = 'regulatory_api' | 'e_signature' | 'dms' | 'erp' | 'hris' | 'custom';
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'configuring' | 'testing';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  description: string;
  configuredAt?: Date;
  lastSyncedAt?: Date;
  nextSyncAt?: Date;
  syncFrequency: SyncFrequency;
  recordsSynced?: number;
  errorCount?: number;
  isActive: boolean;
}

export interface RegulatoryAPIConnection {
  id: string;
  name: string;
  apiEndpoint: string;
  status: ConnectionStatus;
  dataSource: string;
  jurisdiction: string;
  updateFrequency: SyncFrequency;
  lastUpdate?: Date;
  recordsRetrieved: number;
  apiKey?: string;
  authenticationType: 'api_key' | 'oauth' | 'basic' | 'none';
  isActive: boolean;
}

export interface ESignatureIntegration {
  id: string;
  provider: string;
  status: ConnectionStatus;
  accountId?: string;
  apiKey?: string;
  documentsSignedCount: number;
  lastUsed?: Date;
  features: {
    multipleSigners: boolean;
    templates: boolean;
    bulkSend: boolean;
    mobileSupport: boolean;
  };
  isActive: boolean;
}

export interface DMSIntegration {
  id: string;
  provider: string;
  type: 'sharepoint' | 'google_drive' | 'dropbox' | 'box' | 'onedrive' | 'custom';
  status: ConnectionStatus;
  rootFolder?: string;
  syncedFolders: string[];
  filesSynced: number;
  lastSync?: Date;
  storageUsed: number;
  storageLimit: number;
  isActive: boolean;
}

export interface ERPHRISIntegration {
  id: string;
  systemName: string;
  type: 'erp' | 'hris';
  provider: string;
  status: ConnectionStatus;
  endpoint: string;
  usersSynced: number;
  departmentsSynced: number;
  lastSync?: Date;
  syncFrequency: SyncFrequency;
  mappedFields: FieldMapping[];
  isActive: boolean;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformationType?: 'none' | 'uppercase' | 'lowercase' | 'date_format' | 'custom';
  isRequired: boolean;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  integrationId: string;
  integrationName: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  permissions: string[];
  isActive: boolean;
  rotationSchedule?: 'never' | 'monthly' | 'quarterly' | 'annually';
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;
  timestamp: Date;
  action: 'sync' | 'connect' | 'disconnect' | 'error' | 'test' | 'configure';
  status: 'success' | 'failure' | 'warning';
  recordsProcessed?: number;
  duration?: number;
  message: string;
  errorDetails?: string;
}

export interface SyncSchedule {
  id: string;
  integrationId: string;
  integrationName: string;
  frequency: SyncFrequency;
  specificTime?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  autoRetry: boolean;
  maxRetries: number;
}

export interface IntegrationHealth {
  integrationId: string;
  integrationName: string;
  overallHealth: 'healthy' | 'degraded' | 'down';
  uptime: number;
  avgResponseTime: number;
  errorRate: number;
  lastChecked: Date;
  metrics: {
    successRate: number;
    totalRequests: number;
    failedRequests: number;
    avgLatency: number;
  };
}

export interface TestConnection {
  integrationId: string;
  testType: 'connectivity' | 'authentication' | 'data_retrieval' | 'full';
  status: 'pending' | 'running' | 'passed' | 'failed';
  testedAt?: Date;
  duration?: number;
  results?: {
    connectivity: boolean;
    authentication: boolean;
    dataRetrieval: boolean;
    message: string;
  };
}
