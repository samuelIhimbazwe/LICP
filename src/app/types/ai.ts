// AI Legal Intelligence Types

export type QueryType = 'legal_research' | 'risk_assessment' | 'clause_analysis' | 'document_comparison' | 'compliance_check';
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';
export type FeedbackType = 'helpful' | 'not_helpful';

export interface AIQuery {
  id: string;
  type: QueryType;
  query: string;
  userId: string;
  timestamp: Date;
  response?: AIResponse;
}

export interface AIResponse {
  id: string;
  queryId: string;
  summary: string;
  detailedAnalysis: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  sources: SourceCitation[];
  recommendations?: string[];
  relatedRegulations?: string[];
  generatedAt: Date;
  processingTime: number;
}

export interface SourceCitation {
  id: string;
  title: string;
  type: 'law' | 'regulation' | 'case_law' | 'guidance' | 'article';
  jurisdiction: string;
  date?: Date;
  url?: string;
  excerpt: string;
  relevanceScore: number;
}

export interface RiskAssessment {
  id: string;
  queryId: string;
  action: string;
  overallRisk: RiskLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  complianceIssues: ComplianceIssue[];
  recommendations: string[];
  confidence: ConfidenceLevel;
  confidenceScore: number;
  assessedAt: Date;
}

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  severity: RiskLevel;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation?: string;
}

export interface ComplianceIssue {
  id: string;
  regulation: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'unclear';
  explanation: string;
  recommendation?: string;
}

export interface ClauseAnalysis {
  id: string;
  clauseText: string;
  clauseType: string;
  riskLevel: RiskLevel;
  riskScore: number;
  issues: ClauseIssue[];
  suggestions: string[];
  alternativeLanguage?: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  analyzedAt: Date;
}

export interface ClauseIssue {
  id: string;
  type: 'ambiguity' | 'unfavorable_terms' | 'legal_risk' | 'missing_protection' | 'non_compliance';
  severity: RiskLevel;
  description: string;
  location: string;
  recommendation: string;
}

export interface DocumentComparison {
  id: string;
  document1Id: string;
  document2Id: string;
  document1Name: string;
  document2Name: string;
  differences: DocumentDifference[];
  similarityScore: number;
  addedContent: number;
  removedContent: number;
  modifiedContent: number;
  comparedAt: Date;
}

export interface DocumentDifference {
  id: string;
  type: 'added' | 'removed' | 'modified';
  section: string;
  originalText?: string;
  newText?: string;
  context: string;
  significance: 'major' | 'minor';
}

export interface AIFeedback {
  id: string;
  queryId: string;
  responseId: string;
  userId: string;
  feedbackType: FeedbackType;
  comment?: string;
  submittedAt: Date;
}

export interface LegalConcept {
  id: string;
  concept: string;
  definition: string;
  relatedTerms: string[];
  jurisdictions: string[];
  keyRegulations: string[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  analysisScore: number;
  commonIssues: string[];
  bestPractices: string[];
}

export interface AIInsight {
  id: string;
  title: string;
  category: 'trend' | 'risk' | 'opportunity' | 'alert';
  description: string;
  relevance: number;
  sources: string[];
  generatedAt: Date;
}

export interface QueryHistory {
  id: string;
  userId: string;
  queries: AIQuery[];
  totalQueries: number;
  savedQueries: string[];
}
