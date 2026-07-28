// Legal Knowledge Base Types
export type DocumentType = 'law' | 'regulation' | 'case_law' | 'template' | 'guidance';
export type Jurisdiction = 'Rwanda' | 'EAC' | 'International' | 'Kenya' | 'Uganda' | 'Tanzania';
export type Industry = 'Finance' | 'Labor' | 'Healthcare' | 'Technology' | 'Manufacturing' | 'General';

export interface LegalDocument {
  id: string;
  title: string;
  type: DocumentType;
  jurisdiction: Jurisdiction;
  industry: Industry;
  datePublished: Date;
  lastAmended?: Date;
  version: string;
  summary: string;
  content: string;
  citations: string[];
  fileUrl?: string;
  status: 'active' | 'archived' | 'repealed';
  tags: string[];
}

export interface UserAnnotation {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  highlightedText: string;
  position: number;
  createdAt: Date;
}

export interface Bookmark {
  id: string;
  documentId: string;
  userId: string;
  notes?: string;
  createdAt: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: {
    type?: DocumentType[];
    jurisdiction?: Jurisdiction[];
    industry?: Industry[];
  };
  createdAt: Date;
}

// Compliance Tracking Types
export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_assessed';

export interface ComplianceObligation {
  id: string;
  title: string;
  description: string;
  regulation: string;
  jurisdiction: Jurisdiction;
  industry: Industry;
  requirementLevel: 'mandatory' | 'recommended' | 'optional';
  deadline?: Date;
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually' | 'ongoing';
  assignedTo: string[];
  assignedTeam?: string;
  status: ComplianceStatus;
  evidenceRequired: string[];
  lastAssessment?: Date;
  nextReview?: Date;
}

export interface ComplianceEvidence {
  id: string;
  obligationId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  description: string;
  validUntil?: Date;
}

export interface ComplianceAction {
  id: string;
  obligationId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  previousStatus?: ComplianceStatus;
  newStatus?: ComplianceStatus;
  notes?: string;
}

export interface ComplianceHeatMapData {
  department: string;
  regulation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceRate: number;
}

// Regulatory Update Types
export type UpdateCategory = 'new_law' | 'amendment' | 'repeal' | 'guidance' | 'notice';
export type UpdateStatus = 'pending_review' | 'reviewed' | 'action_required' | 'implemented' | 'not_applicable';
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export interface RegulatoryUpdate {
  id: string;
  title: string;
  category: UpdateCategory;
  jurisdiction: Jurisdiction;
  industry: Industry[];
  datePublished: Date;
  effectiveDate?: Date;
  source: string;
  summary: string;
  fullText: string;
  status: UpdateStatus;
  impactLevel?: ImpactLevel;
  impactAssessment?: string;
  affectedRegulations: string[];
  assignedTo?: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  actionItems?: string[];
  relatedDocumentId?: string;
}

export interface UpdateSubscription {
  id: string;
  userId: string;
  jurisdictions: Jurisdiction[];
  industries: Industry[];
  categories: UpdateCategory[];
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface ImpactAssessment {
  id: string;
  updateId: string;
  assessedBy: string;
  assessedAt: Date;
  impactLevel: ImpactLevel;
  affectedDepartments: string[];
  requiredActions: string[];
  estimatedCost?: number;
  estimatedEffort?: string;
  deadline?: Date;
  notes: string;
}
