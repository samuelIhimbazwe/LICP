import {
  AIQuery,
  AIResponse,
  SourceCitation,
  RiskAssessment,
  RiskFactor,
  ComplianceIssue,
  ClauseAnalysis,
  ClauseIssue,
  DocumentComparison,
  DocumentDifference,
  AIFeedback,
  LegalConcept,
  AIInsight
} from '../types/ai';

// Sample AI Queries and Responses
export const sampleQueries: AIQuery[] = [
  {
    id: 'query-001',
    type: 'legal_research',
    query: 'What are the requirements for data protection in Rwanda?',
    userId: '1',
    timestamp: new Date('2026-06-06 10:30:00'),
  },
  {
    id: 'query-002',
    type: 'risk_assessment',
    query: 'Is this non-compete clause compliant with Rwandan labor law?',
    userId: '2',
    timestamp: new Date('2026-06-05 14:20:00'),
  },
  {
    id: 'query-003',
    type: 'compliance_check',
    query: 'What are the filing requirements for a company operating in the EAC region?',
    userId: '1',
    timestamp: new Date('2026-06-04 09:15:00'),
  },
];

export const sampleResponses: AIResponse[] = [
  {
    id: 'resp-001',
    queryId: 'query-001',
    summary: 'Rwanda\'s data protection requirements are governed by Law No. 058/2021 on the Protection of Personal Data and Privacy. Organizations must obtain consent for data processing, implement security measures, appoint a Data Protection Officer for large-scale processing, and register with the Rwanda Utilities Regulatory Authority (RURA).',
    detailedAnalysis: `**Key Requirements:**

1. **Legal Basis for Processing**: Organizations must have a lawful basis for processing personal data, including consent, contractual necessity, legal obligation, vital interests, public interest, or legitimate interests.

2. **Data Protection Officer (DPO)**: Organizations that process personal data on a large scale must appoint a DPO to oversee compliance.

3. **Registration with RURA**: Data controllers and processors must register with the Rwanda Utilities Regulatory Authority within 30 days of commencing data processing activities.

4. **Security Measures**: Organizations must implement appropriate technical and organizational measures to protect personal data, including:
   - Encryption of data in transit and at rest
   - Access controls and authentication
   - Regular security audits
   - Incident response procedures

5. **Data Subject Rights**: Organizations must facilitate the exercise of data subject rights, including:
   - Right to access
   - Right to rectification
   - Right to erasure
   - Right to data portability
   - Right to object to processing

6. **Cross-Border Data Transfers**: Transfers of personal data outside Rwanda require adequate safeguards, such as:
   - Adequacy decisions
   - Standard contractual clauses
   - Binding corporate rules
   - Explicit consent

7. **Data Breach Notification**: Organizations must notify RURA and affected individuals within 72 hours of becoming aware of a personal data breach.

8. **Privacy Impact Assessments**: Organizations must conduct privacy impact assessments for high-risk processing activities.

**Penalties for Non-Compliance:**
- Administrative fines up to RWF 100 million
- Criminal penalties including imprisonment for serious violations`,
    confidence: 'very_high',
    confidenceScore: 95,
    sources: [
      {
        id: 'src-001',
        title: 'Law No. 058/2021 on the Protection of Personal Data and Privacy',
        type: 'law',
        jurisdiction: 'Rwanda',
        date: new Date('2021-10-15'),
        url: '/legal-docs/rwanda-data-protection-law.pdf',
        excerpt: 'Article 5: Personal data shall be processed lawfully, fairly and in a transparent manner...',
        relevanceScore: 98,
      },
      {
        id: 'src-002',
        title: 'RURA Guidelines on Data Protection Compliance',
        type: 'guidance',
        jurisdiction: 'Rwanda',
        date: new Date('2022-03-01'),
        url: '/legal-docs/rura-dp-guidelines.pdf',
        excerpt: 'Data controllers must register with RURA within thirty (30) days of commencing data processing activities...',
        relevanceScore: 92,
      },
      {
        id: 'src-003',
        title: 'Rwanda Data Protection Regulations 2022',
        type: 'regulation',
        jurisdiction: 'Rwanda',
        date: new Date('2022-06-01'),
        excerpt: 'Organizations processing personal data on a large scale shall appoint a Data Protection Officer...',
        relevanceScore: 88,
      },
    ],
    recommendations: [
      'Conduct a data mapping exercise to identify all personal data processing activities',
      'Register with RURA as a data controller',
      'Appoint a qualified Data Protection Officer',
      'Implement a comprehensive data protection policy',
      'Provide data protection training to all staff',
      'Establish procedures for handling data subject requests',
      'Implement data breach notification procedures',
    ],
    relatedRegulations: [
      'Law No. 058/2021 on the Protection of Personal Data and Privacy',
      'GDPR (for EU data transfers)',
      'EAC Data Protection Framework',
    ],
    generatedAt: new Date('2026-06-06 10:30:15'),
    processingTime: 2.3,
  },
];

export const sampleRiskAssessment: RiskAssessment = {
  id: 'risk-001',
  queryId: 'query-002',
  action: 'Enforcing a 2-year non-compete clause for a software developer position',
  overallRisk: 'high',
  riskScore: 72,
  riskFactors: [
    {
      id: 'rf-001',
      category: 'Legal Compliance',
      description: 'Non-compete clauses in Rwanda must be reasonable in scope, duration, and geographic area',
      severity: 'high',
      likelihood: 'high',
      impact: 'high',
      mitigation: 'Limit the non-compete period to 6 months and restrict to specific competitors only',
    },
    {
      id: 'rf-002',
      category: 'Enforceability',
      description: 'Courts in Rwanda may consider a 2-year period excessive for a technology role',
      severity: 'medium',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Provide adequate compensation during the non-compete period',
    },
    {
      id: 'rf-003',
      category: 'Employee Rights',
      description: 'Overly restrictive non-compete clauses may violate the employee\'s right to work',
      severity: 'high',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Ensure the clause is narrowly tailored to protect legitimate business interests',
    },
  ],
  complianceIssues: [
    {
      id: 'ci-001',
      regulation: 'Rwanda Labour Law No. 66/2018',
      requirement: 'Article 29 - Non-compete agreements must be reasonable',
      status: 'non_compliant',
      explanation: 'A 2-year non-compete period for a software developer position may be considered unreasonable',
      recommendation: 'Reduce the non-compete period to 6-12 months',
    },
    {
      id: 'ci-002',
      regulation: 'Constitution of Rwanda - Right to Work',
      requirement: 'Article 32 - Every person has the right to work',
      status: 'unclear',
      explanation: 'Overly broad non-compete clauses may infringe on constitutional rights',
      recommendation: 'Limit the geographic scope to Rwanda only and specify competing companies',
    },
  ],
  recommendations: [
    'Reduce the non-compete period from 2 years to 6-12 months',
    'Limit the geographic scope to Rwanda or specific regions',
    'Specify the types of competing businesses clearly',
    'Provide compensation during the non-compete period',
    'Include a mutual termination clause with advance notice',
    'Consider using a non-solicitation clause instead for clients and employees',
  ],
  confidence: 'high',
  confidenceScore: 88,
  assessedAt: new Date('2026-06-05 14:20:10'),
};

export const sampleClauseAnalysis: ClauseAnalysis = {
  id: 'clause-001',
  clauseText: 'The Company may terminate this agreement at any time, for any reason, with or without notice, at its sole discretion.',
  clauseType: 'Termination Clause',
  riskLevel: 'high',
  riskScore: 78,
  issues: [
    {
      id: 'issue-001',
      type: 'unfavorable_terms',
      severity: 'high',
      description: 'One-sided termination rights favor the company exclusively',
      location: 'Section 8.1',
      recommendation: 'Add reciprocal termination rights for the other party with reasonable notice period',
    },
    {
      id: 'issue-002',
      type: 'ambiguity',
      severity: 'medium',
      description: '"At any time, for any reason" is excessively broad and may be unenforceable',
      location: 'Section 8.1',
      recommendation: 'Specify grounds for termination and include a cure period for breaches',
    },
    {
      id: 'issue-003',
      type: 'legal_risk',
      severity: 'high',
      description: 'Termination "without notice" may violate labor law requirements in many jurisdictions',
      location: 'Section 8.1',
      recommendation: 'Include minimum notice period as required by applicable law (e.g., 30 days)',
    },
  ],
  suggestions: [
    'Add mutual termination rights with equal notice periods',
    'Include specific grounds for immediate termination (e.g., material breach, insolvency)',
    'Require written notice for any termination',
    'Add a cure period (e.g., 30 days) for remediable breaches',
    'Specify post-termination obligations and transition periods',
  ],
  alternativeLanguage: 'Either party may terminate this agreement:\n\n(a) For cause, immediately upon written notice, if the other party commits a material breach and fails to cure such breach within thirty (30) days of receiving written notice thereof;\n\n(b) For convenience, upon ninety (90) days prior written notice to the other party; or\n\n(c) Immediately upon written notice if the other party becomes insolvent, files for bankruptcy, or ceases business operations.\n\nUpon termination, both parties shall complete all pending obligations and transition services as reasonably requested.',
  confidence: 'very_high',
  confidenceScore: 94,
  analyzedAt: new Date('2026-06-06 11:15:00'),
};

export const sampleDocumentComparison: DocumentComparison = {
  id: 'comp-001',
  document1Id: 'doc-v1',
  document2Id: 'doc-v2',
  document1Name: 'Service Agreement v1.0',
  document2Name: 'Service Agreement v2.0',
  differences: [
    {
      id: 'diff-001',
      type: 'modified',
      section: 'Section 3.1 - Payment Terms',
      originalText: 'Payment is due within 30 days of invoice date.',
      newText: 'Payment is due within 45 days of invoice date.',
      context: 'Payment terms have been extended',
      significance: 'major',
    },
    {
      id: 'diff-002',
      type: 'added',
      section: 'Section 5.4 - Data Protection',
      newText: 'The Service Provider shall comply with all applicable data protection laws, including GDPR and Rwanda Law No. 058/2021.',
      context: 'New data protection compliance clause added',
      significance: 'major',
    },
    {
      id: 'diff-003',
      type: 'removed',
      section: 'Section 7.2 - Non-Compete',
      originalText: 'The Service Provider agrees not to provide similar services to competitors for a period of 2 years.',
      context: 'Non-compete clause has been removed entirely',
      significance: 'major',
    },
    {
      id: 'diff-004',
      type: 'modified',
      section: 'Section 9.1 - Liability Cap',
      originalText: 'Liability is capped at the total fees paid in the preceding 12 months.',
      newText: 'Liability is capped at the total fees paid in the preceding 6 months.',
      context: 'Liability cap has been reduced',
      significance: 'major',
    },
  ],
  similarityScore: 87,
  addedContent: 3,
  removedContent: 1,
  modifiedContent: 8,
  comparedAt: new Date('2026-06-06 15:30:00'),
};

export const sampleFeedback: AIFeedback[] = [
  {
    id: 'fb-001',
    queryId: 'query-001',
    responseId: 'resp-001',
    userId: '1',
    feedbackType: 'helpful',
    comment: 'Very comprehensive answer with clear sources',
    submittedAt: new Date('2026-06-06 10:45:00'),
  },
];

export const legalConcepts: LegalConcept[] = [
  {
    id: 'concept-001',
    concept: 'Data Controller',
    definition: 'A natural or legal person who determines the purposes and means of processing personal data',
    relatedTerms: ['Data Processor', 'Data Subject', 'Data Protection Officer'],
    jurisdictions: ['Rwanda', 'EU', 'EAC'],
    keyRegulations: ['Rwanda Law No. 058/2021', 'GDPR'],
  },
  {
    id: 'concept-002',
    concept: 'Material Breach',
    definition: 'A breach of contract significant enough to justify termination or substantial damages',
    relatedTerms: ['Minor Breach', 'Anticipatory Breach', 'Fundamental Breach'],
    jurisdictions: ['Rwanda', 'International'],
    keyRegulations: ['Contract Law', 'Civil Code'],
  },
];

export const aiInsights: AIInsight[] = [
  {
    id: 'insight-001',
    title: 'Increased Focus on Data Localization in EAC Region',
    category: 'trend',
    description: 'Recent regulatory developments show a trend toward data localization requirements across EAC member states. Organizations should review their data storage and transfer practices.',
    relevance: 85,
    sources: ['EAC Data Protection Framework 2024', 'Rwanda RURA Guidelines'],
    generatedAt: new Date('2026-06-01'),
  },
  {
    id: 'insight-002',
    title: 'Non-Compete Clauses Under Scrutiny',
    category: 'alert',
    description: 'Recent court decisions in Rwanda have invalidated overly broad non-compete clauses. Review existing employment contracts for compliance.',
    relevance: 92,
    sources: ['Rwanda Supreme Court Decision 2026-SC-042', 'Labour Law Commentary'],
    generatedAt: new Date('2026-05-28'),
  },
  {
    id: 'insight-003',
    title: 'New Cybersecurity Reporting Requirements',
    category: 'risk',
    description: 'Organizations in critical infrastructure sectors will be required to report cybersecurity incidents within 24 hours starting July 2026.',
    relevance: 78,
    sources: ['Cybersecurity Bill 2026', 'RISA Directive'],
    generatedAt: new Date('2026-06-03'),
  },
];

// Common queries for quick access
export const commonQueries = [
  'List our open compliance obligations',
  'How many contracts do we have and what are their statuses?',
  'What regulatory updates are pending review?',
  'Show active integrations and their sync status',
  'Which users are in the Legal Practitioner role?',
  'What are the data protection requirements in our knowledge base?',
];

// Sample chat history
export const sampleChatHistory = [
  {
    id: 'chat-001',
    role: 'user' as const,
    content: 'What are the requirements for data protection in Rwanda?',
    timestamp: new Date('2026-06-06 10:30:00'),
  },
  {
    id: 'chat-002',
    role: 'assistant' as const,
    content: sampleResponses[0].summary,
    timestamp: new Date('2026-06-06 10:30:15'),
    sources: sampleResponses[0].sources,
  },
];
