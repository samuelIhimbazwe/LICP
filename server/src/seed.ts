import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from './lib/crypto.js';
import { generateBackupCodes } from './lib/mfa.js';
import { getDefaultPermissions } from './lib/permissions.js';

const prisma = new PrismaClient();

const DEMO_MFA_SECRET = 'JBSWY3DPEHPK3PXP';

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const demoUsers: Array<{
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}> = [
  {
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@legalfirm.com',
    phone: '+1 (555) 123-4567',
    role: 'compliance_officer',
  },
  {
    fullName: 'Michael Chen',
    email: 'michael.chen@legalfirm.com',
    phone: '+1 (555) 234-5678',
    role: 'legal_practitioner',
  },
  {
    fullName: 'Emily Rodriguez',
    email: 'emily.rodriguez@legalfirm.com',
    phone: '+1 (555) 345-6789',
    role: 'manager',
  },
  {
    fullName: 'David Park',
    email: 'david.park@legalfirm.com',
    phone: '+1 (555) 456-7890',
    role: 'admin',
  },
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'johnson-associates' },
    update: {},
    create: {
      name: 'Johnson & Associates',
      slug: 'johnson-associates',
      sessionTimeoutMinutes: 30,
      maxLoginAttempts: 5,
      lockoutMinutes: 5,
      mfaRequired: true,
    },
  });

  const passwordHash = await hashPassword('demo123');

  for (const demo of demoUsers) {
    const user = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: demo.email.toLowerCase(),
        },
      },
      update: {
        passwordHash,
        mfaSecret: DEMO_MFA_SECRET,
        mfaEnabled: true,
        emailVerifiedAt: new Date(),
        status: 'active',
      },
      create: {
        organizationId: org.id,
        email: demo.email.toLowerCase(),
        fullName: demo.fullName,
        phone: demo.phone,
        role: demo.role,
        passwordHash,
        mfaSecret: DEMO_MFA_SECRET,
        mfaEnabled: true,
        emailVerifiedAt: new Date(),
        status: 'active',
        permissions: getDefaultPermissions(demo.role) as object,
      },
    });

    const existingCodes = await prisma.mfaBackupCode.count({ where: { userId: user.id } });
    if (existingCodes === 0) {
      const { hashed } = generateBackupCodes(4);
      await prisma.mfaBackupCode.createMany({
        data: hashed.map((codeHash) => ({ userId: user.id, codeHash })),
      });
    }
  }

  const userRecords = await prisma.user.findMany({ where: { organizationId: org.id } });
  const byEmail = Object.fromEntries(userRecords.map((u) => [u.email, u]));
  const sarah = byEmail['sarah.johnson@legalfirm.com'];
  const michael = byEmail['michael.chen@legalfirm.com'];

  await prisma.complianceEvidence.deleteMany({ where: { organizationId: org.id } });
  await prisma.complianceObligation.deleteMany({ where: { organizationId: org.id } });
  await prisma.complianceObligation.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'GDPR Annual Data Audit',
        description: 'Conduct annual GDPR compliance audit and document findings.',
        regulation: 'GDPR Article 30',
        jurisdiction: 'International',
        department: 'Legal',
        requirementLevel: 'mandatory',
        status: 'warning',
        deadline: daysFromNow(5),
        assignedTo: 'Sarah Johnson',
        priority: 'high',
      },
      {
        organizationId: org.id,
        title: 'Q2 Financial Compliance Report',
        description: 'Submit quarterly financial compliance report to regulator.',
        regulation: 'Financial Sector Stability Law',
        jurisdiction: 'Rwanda',
        department: 'Finance',
        requirementLevel: 'mandatory',
        status: 'pending',
        deadline: daysFromNow(12),
        assignedTo: 'Finance Team',
        priority: 'high',
      },
      {
        organizationId: org.id,
        title: 'Employee Safety Training',
        description: 'Provide mandatory occupational health and safety training.',
        regulation: 'Rwanda Labour Law No. 66/2018',
        jurisdiction: 'Rwanda',
        department: 'HR',
        requirementLevel: 'mandatory',
        status: 'pending',
        deadline: daysFromNow(18),
        assignedTo: 'Emily Rodriguez',
        priority: 'medium',
      },
      {
        organizationId: org.id,
        title: 'SOC 2 Audit Preparation',
        description: 'Complete SOC 2 control documentation and evidence collection.',
        regulation: 'SOC 2 Type II',
        jurisdiction: 'International',
        department: 'IT Security',
        requirementLevel: 'mandatory',
        status: 'overdue',
        deadline: daysFromNow(-2),
        assignedTo: 'Sarah Johnson',
        priority: 'high',
      },
      {
        organizationId: org.id,
        title: 'Anti-Bribery Policy Review',
        description: 'Annual review and board approval of anti-bribery policy.',
        regulation: 'Anti-Bribery Act',
        jurisdiction: 'Rwanda',
        department: 'Legal',
        requirementLevel: 'recommended',
        status: 'compliant',
        deadline: daysFromNow(32),
        assignedTo: 'Sarah Johnson',
        priority: 'low',
      },
      {
        organizationId: org.id,
        title: 'Vendor Risk Assessment Q2',
        description: 'Assess third-party vendor compliance risks for Q2.',
        regulation: 'Vendor Management Policy',
        jurisdiction: 'Rwanda',
        department: 'Finance',
        requirementLevel: 'mandatory',
        status: 'warning',
        deadline: daysFromNow(8),
        assignedTo: 'Mark Davis',
        priority: 'medium',
      },
    ],
  });

  const obligations = await prisma.complianceObligation.findMany({ where: { organizationId: org.id } });
  const gdprObligation = obligations.find((o) => o.title.includes('GDPR'));
  const antiBribery = obligations.find((o) => o.title.includes('Anti-Bribery'));
  await prisma.complianceEvidence.deleteMany({ where: { organizationId: org.id } });
  if (gdprObligation) {
    await prisma.complianceEvidence.create({
      data: {
        organizationId: org.id,
        obligationId: gdprObligation.id,
        fileName: '2025-annual-audit-report.pdf',
        fileUrl: '/evidence/audit-2025.pdf',
        uploadedBy: 'Sarah Johnson',
        notes: 'Annual audit report for fiscal year 2025',
      },
    });
  }
  if (antiBribery) {
    await prisma.complianceEvidence.create({
      data: {
        organizationId: org.id,
        obligationId: antiBribery.id,
        fileName: 'anti-bribery-board-approval.pdf',
        fileUrl: '/evidence/anti-bribery-approval.pdf',
        uploadedBy: 'Sarah Johnson',
        notes: 'Board approval minutes for anti-bribery policy review',
      },
    });
  }

  await prisma.regulatoryUpdate.deleteMany({ where: { organizationId: org.id } });
  await prisma.regulatoryUpdate.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'Rwanda Data Protection Amendment',
        description: 'Updated consent requirements for cross-border transfers.',
        category: 'amendment',
        impact: 'high',
        jurisdiction: 'Rwanda',
        status: 'pending_review',
        source: 'Official Gazette No. 18/2026',
        effectiveDate: daysFromNow(90),
        isRead: false,
      },
      {
        organizationId: org.id,
        title: 'Finance Sector AML Directive',
        description: 'New reporting thresholds for suspicious transactions.',
        category: 'new_law',
        impact: 'medium',
        jurisdiction: 'Rwanda',
        status: 'reviewed',
        source: 'National Bank of Rwanda Circular 04/2026',
        reviewedByName: 'Sarah Johnson',
        reviewedAt: daysFromNow(-3),
        isRead: true,
      },
      {
        organizationId: org.id,
        title: 'Employment Standards Update',
        description: 'Revised remote work compliance guidelines.',
        category: 'guidance',
        impact: 'low',
        jurisdiction: 'Rwanda',
        status: 'action_required',
        source: 'Ministry of Labour Notice 12/2026',
        effectiveDate: daysFromNow(60),
        isRead: false,
      },
      {
        organizationId: org.id,
        title: 'EAC Cross-Border Data Transfers Regulation',
        description: 'New framework for personal data transfers within EAC states.',
        category: 'new_law',
        impact: 'critical',
        jurisdiction: 'EAC',
        status: 'pending_review',
        source: 'EAC Council Decision 127/2026',
        effectiveDate: daysFromNow(120),
        isRead: false,
      },
    ],
  });

  await prisma.documentRequest.deleteMany({ where: { organizationId: org.id } });
  await prisma.documentRequest.createMany({
    data: [
      { organizationId: org.id, title: 'Vendor Service Agreement Review', requestedBy: 'Sarah Johnson', assignedToId: michael?.id, dueDate: daysFromNow(3), status: 'pending' },
      { organizationId: org.id, title: 'Client Contract Amendment', requestedBy: 'Emily Rodriguez', assignedToId: michael?.id, dueDate: daysFromNow(7), status: 'in_progress' },
      { organizationId: org.id, title: 'NDA Template Update', requestedBy: 'David Park', assignedToId: michael?.id, dueDate: daysFromNow(14), status: 'pending' },
    ],
  });

  await prisma.contract.deleteMany({ where: { organizationId: org.id } });
  await prisma.contractShare.deleteMany({ where: { organizationId: org.id } });
  await prisma.contractTemplate.deleteMany({ where: { organizationId: org.id } });
  await prisma.documentAnnotation.deleteMany({ where: { organizationId: org.id } });
  await prisma.contractFolder.deleteMany({ where: { organizationId: org.id } });
  await prisma.legalDocument.deleteMany({ where: { organizationId: org.id } });

  await prisma.legalDocument.createMany({
    data: [
      { organizationId: org.id, title: 'Rwanda Labour Law No. 66/2018', type: 'law', jurisdiction: 'Rwanda', industry: 'Labor', datePublished: new Date('2018-08-30'), lastAmended: new Date('2023-06-15'), version: '2.0', summary: 'Law regulating labour in Rwanda.', content: 'This law establishes the legal framework for employment relationships in Rwanda...', citations: ['Constitution of Rwanda'], tags: ['employment', 'labour rights'], fileUrl: '/documents/rwanda-labour-law.pdf', status: 'active' },
      { organizationId: org.id, title: 'GDPR - General Data Protection Regulation', type: 'regulation', jurisdiction: 'International', industry: 'Technology', datePublished: new Date('2016-04-27'), version: '1.2', summary: 'EU regulation on data protection and privacy.', content: 'The General Data Protection Regulation establishes requirements...', citations: ['EU Directive 95/46/EC'], tags: ['data protection', 'privacy'], fileUrl: '/documents/gdpr.pdf', status: 'active' },
      { organizationId: org.id, title: 'East African Community Customs Management Act', type: 'law', jurisdiction: 'EAC', industry: 'General', datePublished: new Date('2004-12-01'), version: '3.0', summary: 'Act governing customs operations within EAC.', content: 'This Act provides for the management of Customs...', citations: ['EAC Treaty'], tags: ['customs', 'trade'], fileUrl: '/documents/eac-customs.pdf', status: 'active' },
      { organizationId: org.id, title: 'Financial Sector Stability Law No. 22/2020', type: 'law', jurisdiction: 'Rwanda', industry: 'Finance', datePublished: new Date('2020-11-20'), version: '1.0', summary: 'Framework for financial sector stability in Rwanda.', content: 'This law establishes measures to ensure stability...', citations: ['Banking Law'], tags: ['finance', 'banking'], fileUrl: '/documents/financial-stability.pdf', status: 'active' },
      { organizationId: org.id, title: 'Employment Contract Template - Fixed Term', type: 'template', jurisdiction: 'Rwanda', industry: 'Labor', datePublished: new Date('2024-01-15'), version: '1.0', summary: 'Standard fixed-term employment contract template.', content: 'EMPLOYMENT CONTRACT...', citations: ['Rwanda Labour Law No. 66/2018'], tags: ['template', 'employment'], fileUrl: '/templates/fixed-term-contract.docx', status: 'active' },
      { organizationId: org.id, title: 'National Bank of Rwanda AML/CFT Guidance', type: 'guidance', jurisdiction: 'Rwanda', industry: 'Finance', datePublished: new Date('2023-09-01'), version: '1.0', summary: 'AML/CFT compliance guidance for financial institutions.', content: 'This guidance document provides practical recommendations...', citations: ['FATF Recommendations'], tags: ['AML', 'CFT'], fileUrl: '/documents/aml-cft-guidance.pdf', status: 'active' },
      { organizationId: org.id, title: 'Rwanda Data Protection Law', type: 'law', jurisdiction: 'Rwanda', industry: 'Technology', datePublished: new Date('2021-10-15'), version: '1.0', summary: 'National data protection framework including LICP-TEST-PHRASE-7742 compliance markers.', content: 'Personal data must be processed lawfully... LICP-TEST-PHRASE-7742 ...', citations: [], tags: ['data protection', 'Rwanda'], fileUrl: '/documents/rwanda-data-protection.pdf', status: 'active' },
      { organizationId: org.id, title: 'Sample Case Law - Contract Dispute 2024', type: 'case_law', jurisdiction: 'Rwanda', industry: 'General', datePublished: new Date('2024-06-01'), version: '1.0', summary: 'Landmark contract dispute ruling.', content: 'The court held that...', citations: [], tags: ['case law', 'contracts'], fileUrl: '/documents/case-2024.pdf', status: 'active' },
    ],
  });

  const labourLaw = await prisma.legalDocument.findFirst({
    where: { organizationId: org.id, title: 'Rwanda Labour Law No. 66/2018' },
  });
  if (labourLaw) {
    await prisma.legalDocument.updateMany({
      where: { organizationId: org.id, title: 'Employment Contract Template - Fixed Term' },
      data: { citations: [labourLaw.id] },
    });
  }

  const folderEmployment = await prisma.contractFolder.create({
    data: { organizationId: org.id, name: 'Employment Contracts', createdBy: 'David Park' },
  });
  const folderVendor = await prisma.contractFolder.create({
    data: { organizationId: org.id, name: 'Vendor Agreements', createdBy: 'Sarah Johnson' },
  });
  const folderNda = await prisma.contractFolder.create({
    data: { organizationId: org.id, name: 'NDAs', createdBy: 'Michael Chen' },
  });
  const folderService = await prisma.contractFolder.create({
    data: { organizationId: org.id, name: 'Service Agreements', createdBy: 'Emily Rodriguez' },
  });

  await prisma.contractTemplate.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Standard NDA',
        type: 'nda',
        description: 'Mutual non-disclosure agreement template',
        body: 'NON-DISCLOSURE AGREEMENT\n\nThe parties agree to keep confidential information private...',
      },
      {
        organizationId: org.id,
        name: 'Master Service Agreement',
        type: 'service_agreement',
        description: 'Standard MSA for vendor engagements',
        body: 'MASTER SERVICE AGREEMENT\n\nThis agreement governs professional services...',
      },
      {
        organizationId: org.id,
        name: 'Employment Contract',
        type: 'employment',
        description: 'Fixed-term employment contract',
        body: 'EMPLOYMENT CONTRACT\n\nEmployer and employee agree to the following terms...',
      },
    ],
  });

  await prisma.contract.createMany({
    data: [
      { organizationId: org.id, folderId: folderService.id, title: 'Master Services Agreement - TechCorp Solutions', type: 'service_agreement', status: 'executed', counterparty: 'TechCorp Solutions Ltd', contractValue: 500000, startDate: new Date('2026-01-01'), endDate: new Date('2027-12-31'), expiryDate: new Date('2027-12-31'), autoRenew: true, currentVersion: 2, createdBy: 'Sarah Johnson', fileUrl: '/contracts/msa-techcorp-v2.pdf', fileSize: 2450000, tags: ['technology', 'consulting'], signedAt: new Date('2025-12-20') },
      { organizationId: org.id, folderId: folderNda.id, title: 'Non-Disclosure Agreement - DataAnalytics Inc', type: 'nda', status: 'executed', counterparty: 'DataAnalytics Inc', startDate: new Date('2026-03-01'), endDate: new Date('2028-03-01'), expiryDate: new Date('2028-03-01'), createdBy: 'Michael Chen', fileUrl: '/contracts/nda-dataanalytics.pdf', fileSize: 850000, tags: ['confidentiality'], signedAt: new Date('2026-02-28') },
      { organizationId: org.id, folderId: folderEmployment.id, title: 'Employment Contract - Jennifer Williams', type: 'employment', status: 'executed', counterparty: 'Jennifer Williams', startDate: new Date('2026-06-01'), createdBy: 'Emily Rodriguez', fileUrl: '/contracts/emp-jwilliams.pdf', fileSize: 420000, tags: ['hr', 'full-time'], signedAt: new Date('2026-05-28') },
      { organizationId: org.id, folderId: folderVendor.id, title: 'Cloud Hosting Agreement - CloudServe', type: 'service_agreement', status: 'pending_approval', counterparty: 'CloudServe Africa', contractValue: 120000, expiryDate: daysFromNow(25), createdBy: 'Sarah Johnson', fileUrl: '/contracts/cloud-hosting-draft.pdf', fileSize: 1100000, content: 'Hosting services agreement with CONTRACT-CLAUSE-XYZ-991 renewal terms.', tags: ['vendor', 'cloud'] },
      { organizationId: org.id, folderId: folderNda.id, title: 'Mutual NDA - StartupXYZ', type: 'nda', status: 'draft', counterparty: 'StartupXYZ Ltd', createdBy: 'Michael Chen', fileUrl: '/contracts/nda-startupxyz-draft.pdf', fileSize: 320000, tags: ['nda', 'draft'] },
      { organizationId: org.id, title: 'Office Lease Agreement', type: 'custom', status: 'approved', counterparty: 'Kigali Properties Ltd', contractValue: 96000, expiryDate: daysFromNow(75), createdBy: 'David Park', fileUrl: '/contracts/office-lease.pdf', fileSize: 1800000, tags: ['facilities', 'lease'] },
    ],
  });

  await prisma.activityItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.activityItem.createMany({
    data: [
      { organizationId: org.id, userId: sarah?.id, userName: 'Sarah Johnson', userRole: 'compliance_officer', action: 'reviewed', description: 'Reviewed GDPR audit checklist', module: 'compliance', resourceType: 'obligation' },
      { organizationId: org.id, userId: michael?.id, userName: 'Michael Chen', userRole: 'legal_practitioner', action: 'uploaded', description: 'Uploaded vendor agreement draft', module: 'contracts', resourceType: 'document' },
      { organizationId: org.id, userId: byEmail['emily.rodriguez@legalfirm.com']?.id, userName: 'Emily Rodriguez', userRole: 'manager', action: 'approved', description: 'Approved compliance exception request', module: 'compliance', resourceType: 'approval' },
    ],
  });

  await prisma.notification.deleteMany({ where: { organizationId: org.id } });
  for (const user of userRecords) {
    await prisma.notification.createMany({
      data: [
        {
          organizationId: org.id,
          userId: user.id,
          type: 'regulatory_update',
          title: 'New Rwanda data protection amendment',
          message: 'Review the updated consent requirements for cross-border transfers.',
          priority: 'high',
          linkUrl: '/regulatory-updates',
        },
        {
          organizationId: org.id,
          userId: user.id,
          type: 'compliance_deadline',
          title: 'SOC 2 audit preparation overdue',
          message: 'SOC 2 Audit Preparation is past its deadline.',
          priority: 'critical',
          linkUrl: '/compliance-tracking',
        },
        {
          organizationId: org.id,
          userId: user.id,
          type: 'system_announcement',
          title: 'Platform maintenance scheduled',
          message: 'Brief maintenance window this Sunday 02:00–04:00 UTC.',
          priority: 'low',
        },
      ],
    });
  }

  await prisma.escalationRule.deleteMany({ where: { organizationId: org.id } });
  await prisma.escalationRule.create({
    data: {
      organizationId: org.id,
      name: 'Critical overdue compliance escalation',
      triggerCondition: 'High-priority obligation overdue by 3+ days',
      escalationDelayDays: 3,
      escalateToRoles: ['manager', 'admin'],
      createdByName: 'David Park',
      isActive: true,
    },
  });

  await prisma.broadcast.deleteMany({ where: { organizationId: org.id } });
  const adminUser = byEmail['david.park@legalfirm.com'];
  if (adminUser) {
    await prisma.broadcast.create({
      data: {
        organizationId: org.id,
        title: 'Platform maintenance scheduled',
        message: 'Brief maintenance window this Sunday 02:00–04:00 UTC.',
        priority: 'low',
        targetAudience: 'all',
        channels: ['in_app', 'email'],
        recipientCount: userRecords.length,
        readCount: 2,
        createdById: adminUser.id,
        createdByName: adminUser.fullName,
      },
    });
  }

  for (const user of userRecords) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        channels: { inApp: true, email: true, sms: false },
        typePreferences: {
          regulatoryUpdates: ['in_app', 'email'],
          complianceDeadlines: ['in_app', 'email', 'sms'],
          documentApprovals: ['in_app', 'email'],
          contractExpiry: ['in_app', 'email'],
          systemAnnouncements: ['in_app', 'email'],
          taskAssignments: ['in_app', 'email'],
          escalations: ['in_app', 'email', 'sms'],
        },
        subscriptions: { jurisdictions: ['Rwanda'], categories: ['Finance', 'Data Protection'] },
      },
      update: {},
    });
  }

  console.log('Seed complete.');
  console.log('Organization:', org.name);
  console.log('Demo password: demo123');
  console.log('Demo MFA secret (Google Authenticator):', DEMO_MFA_SECRET);
  console.log('Demo users:', demoUsers.map((u) => u.email).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
