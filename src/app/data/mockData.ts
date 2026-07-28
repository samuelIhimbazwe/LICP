import { ComplianceItem, RegulatoryAlert, DocumentRequest, CaseUpdate, TeamActivity, Notification } from '../types';

export const complianceItems: ComplianceItem[] = [
  {
    id: '1',
    title: 'GDPR Data Protection Assessment',
    status: 'compliant',
    deadline: new Date('2026-07-15'),
    assignedTo: 'Sarah Johnson',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Annual Financial Audit Documentation',
    status: 'warning',
    deadline: new Date('2026-06-20'),
    assignedTo: 'Michael Chen',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Employee Training Compliance Review',
    status: 'overdue',
    deadline: new Date('2026-06-01'),
    assignedTo: 'Emily Rodriguez',
    priority: 'medium',
  },
  {
    id: '4',
    title: 'Information Security Policy Update',
    status: 'compliant',
    deadline: new Date('2026-08-01'),
    assignedTo: 'David Park',
    priority: 'medium',
  },
  {
    id: '5',
    title: 'Vendor Contract Compliance Check',
    status: 'warning',
    deadline: new Date('2026-06-25'),
    assignedTo: 'Sarah Johnson',
    priority: 'high',
  },
];

export const regulatoryAlerts: RegulatoryAlert[] = [
  {
    id: '1',
    title: 'New EU AI Act Requirements Announced',
    description: 'The European Union has published new guidelines for AI system compliance affecting all organizations operating in the EU.',
    date: new Date('2026-06-05'),
    category: 'Technology & Data',
    impact: 'high',
    isRead: false,
  },
  {
    id: '2',
    title: 'Updated HIPAA Privacy Rules Effective July 2026',
    description: 'Health Insurance Portability and Accountability Act updates require enhanced data protection measures.',
    date: new Date('2026-06-03'),
    category: 'Healthcare',
    impact: 'high',
    isRead: false,
  },
  {
    id: '3',
    title: 'SEC Filing Deadline Extension Notice',
    description: 'The Securities and Exchange Commission has extended filing deadlines for Q2 2026 reports.',
    date: new Date('2026-06-01'),
    category: 'Financial',
    impact: 'medium',
    isRead: true,
  },
  {
    id: '4',
    title: 'Labor Law Amendment - Remote Work Policies',
    description: 'New amendments to labor regulations affecting remote work arrangements and employee rights.',
    date: new Date('2026-05-28'),
    category: 'Employment',
    impact: 'medium',
    isRead: true,
  },
];

export const documentRequests: DocumentRequest[] = [
  {
    id: '1',
    title: 'Contract Review - Vendor Agreement',
    requestedBy: 'Operations Department',
    dueDate: new Date('2026-06-10'),
    status: 'pending',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Employment Agreement Template Update',
    requestedBy: 'HR Department',
    dueDate: new Date('2026-06-15'),
    status: 'in_progress',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'NDA for New Partnership',
    requestedBy: 'Business Development',
    dueDate: new Date('2026-06-08'),
    status: 'pending',
    priority: 'high',
  },
  {
    id: '4',
    title: 'Privacy Policy Review',
    requestedBy: 'Compliance Team',
    dueDate: new Date('2026-06-20'),
    status: 'completed',
    priority: 'medium',
  },
];

export const caseUpdates: CaseUpdate[] = [
  {
    id: '1',
    caseNumber: 'CASE-2026-0145',
    title: 'Employment Dispute - Martinez v. Company',
    updateType: 'Court Filing',
    date: new Date('2026-06-05'),
    description: 'Motion for summary judgment filed by defense counsel.',
  },
  {
    id: '2',
    caseNumber: 'CASE-2026-0132',
    title: 'Contract Breach - Vendor Litigation',
    updateType: 'Settlement Negotiation',
    date: new Date('2026-06-04'),
    description: 'Mediation session scheduled for June 18, 2026.',
  },
  {
    id: '3',
    caseNumber: 'CASE-2026-0098',
    title: 'IP Protection - Trademark Infringement',
    updateType: 'Discovery',
    date: new Date('2026-06-02'),
    description: 'Document production deadline extended to June 30.',
  },
];

export const teamActivities: TeamActivity[] = [
  {
    id: '1',
    memberName: 'Sarah Johnson',
    action: 'Completed GDPR compliance review',
    timestamp: new Date('2026-06-06 10:30'),
    module: 'Compliance',
  },
  {
    id: '2',
    memberName: 'Michael Chen',
    action: 'Updated vendor contract template',
    timestamp: new Date('2026-06-06 09:15'),
    module: 'Documents',
  },
  {
    id: '3',
    memberName: 'Emily Rodriguez',
    action: 'Approved training compliance report',
    timestamp: new Date('2026-06-05 16:45'),
    module: 'Compliance',
  },
  {
    id: '4',
    memberName: 'David Park',
    action: 'Added new regulatory alert',
    timestamp: new Date('2026-06-05 14:20'),
    module: 'Regulatory',
  },
  {
    id: '5',
    memberName: 'Sarah Johnson',
    action: 'Reviewed EU AI Act requirements',
    timestamp: new Date('2026-06-05 11:00'),
    module: 'Research',
  },
];

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'New Regulatory Alert',
    message: 'EU AI Act requirements have been updated',
    timestamp: new Date('2026-06-05 14:30'),
    isRead: false,
    type: 'warning',
  },
  {
    id: '2',
    title: 'Compliance Deadline Approaching',
    message: 'Vendor Contract Compliance Check due in 5 days',
    timestamp: new Date('2026-06-06 08:00'),
    isRead: false,
    type: 'info',
  },
  {
    id: '3',
    title: 'Document Request Completed',
    message: 'Privacy Policy Review has been completed',
    timestamp: new Date('2026-06-05 16:00'),
    isRead: true,
    type: 'success',
  },
  {
    id: '4',
    title: 'Overdue Compliance Item',
    message: 'Employee Training Compliance Review is overdue',
    timestamp: new Date('2026-06-04 09:00'),
    isRead: false,
    type: 'error',
  },
];

export const complianceTrendData = [
  { month: 'Jan', compliant: 45, warning: 8, overdue: 2 },
  { month: 'Feb', compliant: 52, warning: 6, overdue: 1 },
  { month: 'Mar', compliant: 48, warning: 10, overdue: 3 },
  { month: 'Apr', compliant: 55, warning: 7, overdue: 2 },
  { month: 'May', compliant: 58, warning: 5, overdue: 1 },
  { month: 'Jun', compliant: 62, warning: 4, overdue: 1 },
];

export const regulatoryImpactData = [
  { name: 'High Impact', value: 35, color: '#ef4444' },
  { name: 'Medium Impact', value: 45, color: '#f59e0b' },
  { name: 'Low Impact', value: 20, color: '#22c55e' },
];

export const userActivityData = [
  { date: '2026-06-01', logins: 145, documents: 89, searches: 234 },
  { date: '2026-06-02', logins: 158, documents: 95, searches: 267 },
  { date: '2026-06-03', logins: 162, documents: 102, searches: 289 },
  { date: '2026-06-04', logins: 151, documents: 87, searches: 245 },
  { date: '2026-06-05', logins: 169, documents: 110, searches: 301 },
  { date: '2026-06-06', logins: 175, documents: 118, searches: 315 },
];
