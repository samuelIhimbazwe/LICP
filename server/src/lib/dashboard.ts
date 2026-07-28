import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';

function serializeObligation(o: {
  id: string;
  title: string;
  status: string;
  deadline: Date;
  assignedTo: string;
  priority: string;
}) {
  return {
    id: o.id,
    title: o.title,
    status: o.status,
    deadline: o.deadline.toISOString(),
    assignedTo: o.assignedTo,
    priority: o.priority,
  };
}

function serializeRegulatory(r: {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  isRead: boolean;
  publishedAt: Date;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    impact: r.impact,
    isRead: r.isRead,
    date: r.publishedAt.toISOString(),
  };
}

async function getActivityFeed(organizationId: string, limit = 20) {
  const items = await prisma.activityItem.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return items.map((item) => ({
    id: item.id,
    userName: item.userName,
    userRole: item.userRole,
    action: item.action,
    description: item.description,
    module: item.module,
    resourceType: item.resourceType,
    createdAt: item.createdAt.toISOString(),
  }));
}

function buildRiskMatrix(obligations: Array<{ regulation: string; priority: string; status: string }>) {
  const areas = new Map<string, { count: number; high: number }>();
  for (const o of obligations) {
    const area = o.regulation || 'General Compliance';
    const prev = areas.get(area) ?? { count: 0, high: 0 };
    prev.count += 1;
    if (o.priority === 'high' || o.priority === 'critical' || o.status === 'overdue') prev.high += 1;
    areas.set(area, prev);
  }
  return [...areas.entries()].slice(0, 6).map(([area, v]) => ({
    area,
    likelihood: Math.min(5, v.count),
    impact: Math.min(5, v.high + 1),
    score: Math.min(25, v.count * (v.high + 1)),
  }));
}

async function getComplianceSummary(organizationId: string) {
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId },
    orderBy: { deadline: 'asc' },
  });
  const pending = obligations.filter((o) => o.status !== 'compliant');
  const upcomingDeadlines = obligations
    .filter((o) => o.deadline > new Date())
    .slice(0, 6);
  const compliantCount = obligations.filter((o) => o.status === 'compliant').length;
  const total = obligations.length;
  const complianceRate = total > 0 ? Math.round((compliantCount / total) * 100) : 0;
  const regulatoryUpdates = await prisma.regulatoryUpdate.findMany({
    where: { organizationId },
    orderBy: { publishedAt: 'desc' },
    take: 10,
  });
  const unreadAlerts = regulatoryUpdates.filter((r) => !r.isRead);

  return {
    stats: {
      activeComplianceItems: total,
      pendingReviews: pending.length,
      regulatoryAlerts: unreadAlerts.length,
      complianceRate,
    },
    pendingObligations: pending.map(serializeObligation),
    upcomingDeadlines: upcomingDeadlines.map(serializeObligation),
    regulatoryAlerts: regulatoryUpdates.slice(0, 4).map(serializeRegulatory),
    complianceTrend: buildComplianceTrend(obligations),
    riskMatrix: buildRiskMatrix(obligations),
    regulatoryCalendar: upcomingDeadlines.map((o) => ({
      id: o.id,
      title: o.title,
      date: o.deadline.toISOString(),
      category: o.regulation || 'Compliance',
      status: o.status,
    })),
    checklistItems: pending.map((o) => ({
      id: o.id,
      title: o.title,
      category: o.regulation || 'Compliance',
      completed: o.status === 'compliant',
      assignee: o.assignedTo,
    })),
  };
}

function buildComplianceTrend(
  obligations: Array<{ status: string; createdAt: Date }>
) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => {
    const slice = obligations.filter((_, i) => i % 6 === index);
    return {
      month,
      compliant: slice.filter((o) => o.status === 'compliant').length || index + 2,
      warning: slice.filter((o) => o.status === 'warning').length || 1,
      overdue: slice.filter((o) => o.status === 'overdue').length || 0,
    };
  });
}

function buildWeeklyActivity(
  feed: Array<{ createdAt: string; action: string }>
) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((day, index) => {
    const count = feed.filter((item) => new Date(item.createdAt).getDay() === index).length;
    return { day, completed: count, pending: Math.max(0, 3 - count) };
  });
}

export async function getDashboardForRole(organizationId: string, role: UserRole) {
  const activityFeed = await getActivityFeed(organizationId);

  if (role === 'compliance_officer') {
    const compliance = await getComplianceSummary(organizationId);
    return {
      role,
      ...compliance,
      activityFeed,
      quickActions: [
        {
          id: 'compliance-check',
          label: 'Run compliance check',
          href: '/ai-intelligence?tab=compliance',
          apiPath: '/ai/compliance-check',
        },
      ],
    };
  }

  if (role === 'legal_practitioner') {
    const requests = await prisma.documentRequest.findMany({
      where: { organizationId },
      orderBy: { dueDate: 'asc' },
    });
    const contracts = await prisma.contract.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });
    const pending = requests.filter((r) => r.status === 'pending');
    const inProgress = requests.filter((r) => r.status === 'in_progress');
    return {
      role,
      stats: {
        pendingRequests: pending.length,
        activeCases: contracts.length,
        documentRequests: requests.length,
        inProgressRequests: inProgress.length,
      },
      documentRequests: requests.slice(0, 6).map((r) => ({
        id: r.id,
        title: r.title,
        requestedBy: r.requestedBy,
        dueDate: r.dueDate.toISOString(),
        status: r.status,
        priority: 'medium',
      })),
      caseUpdates: contracts.map((c) => ({
        id: c.id,
        caseNumber: c.id.slice(0, 8).toUpperCase(),
        title: c.title,
        status: c.status,
        lastUpdate: c.updatedAt.toISOString(),
        client: c.counterparty ?? '—',
      })),
      upcomingHearings: contracts
        .filter((c) => c.expiryDate && c.expiryDate > new Date())
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          caseNumber: c.id.slice(0, 8).toUpperCase(),
          title: c.title,
          court: c.type,
          date: c.expiryDate!.toISOString(),
          type: 'Deadline',
          status: c.status,
        })),
      tasks: requests.slice(0, 8).map((r) => ({
        id: r.id,
        title: r.title,
        case: r.title.slice(0, 12),
        priority: r.status === 'pending' ? 'high' : 'medium',
        due: r.dueDate.toISOString(),
        completed: r.status === 'completed',
      })),
      activityFeed,
    };
  }

  if (role === 'manager') {
    const compliance = await getComplianceSummary(organizationId);
    const users = await prisma.user.findMany({
      where: { organizationId, status: 'active' },
      select: { id: true, fullName: true, role: true, department: true },
    });
    const obligations = await prisma.complianceObligation.findMany({ where: { organizationId } });
    const deptMap = new Map<string, { total: number; compliant: number }>();
    for (const o of obligations) {
      const dept = o.department || 'General';
      const prev = deptMap.get(dept) ?? { total: 0, compliant: 0 };
      prev.total += 1;
      if (o.status === 'compliant') prev.compliant += 1;
      deptMap.set(dept, prev);
    }
    const overdueItems = compliance.pendingObligations.filter((o) => o.status === 'overdue').length;
    const warningItems = compliance.pendingObligations.filter((o) => o.status === 'warning').length;
    const auditReadinessScore = Math.max(0, 100 - overdueItems * 15 - warningItems * 5);

    return {
      role,
      stats: {
        pendingApprovals: compliance.pendingObligations.filter((o) =>
          ['pending_review', 'warning', 'overdue'].includes(o.status)
        ).length,
        complianceRate: compliance.stats.complianceRate,
        auditReadinessScore,
        activeTeam: users.length,
      },
      pendingApprovals: compliance.pendingObligations
        .filter((o) => o.status !== 'compliant')
        .slice(0, 8)
        .map((o) => ({
          id: o.id,
          type: 'Compliance Review',
          title: o.title,
          requestedBy: o.assignedTo,
          requestedAt: o.deadline,
          priority: o.priority,
          category: 'Compliance',
        })),
      teamMembers: users.map((u) => ({
        name: u.fullName,
        role: u.role.replace(/_/g, ' '),
        avatar: u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2),
        tasks: obligations.filter((ob) => ob.assignedTo === u.fullName).length,
        completed: obligations.filter((ob) => ob.assignedTo === u.fullName && ob.status === 'compliant').length,
        status: 'active',
      })),
      departmentPerformance: [...deptMap.entries()].map(([department, v]) => ({
        department,
        compliance: v.total ? Math.round((v.compliant / v.total) * 100) : 0,
        tasks: v.total,
      })),
      teamActivity: activityFeed.slice(0, 8),
      complianceSummary: compliance.stats,
      pendingObligations: compliance.pendingObligations.slice(0, 5),
      weeklyActivity: buildWeeklyActivity(activityFeed),
      activityFeed,
    };
  }

  const users = await prisma.user.groupBy({
    by: ['role'],
    where: { organizationId },
    _count: { role: true },
  });
  const totalUsers = users.reduce((sum, row) => sum + row._count.role, 0);
  const activeUsers = await prisma.user.count({
    where: { organizationId, status: 'active' },
  });
  const recentUsers = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true },
  });
  const announcements = await prisma.notification.findMany({
    where: { organizationId, type: 'system_announcement' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const [regCount, docCount, contractCount, alertCount] = await Promise.all([
    prisma.regulatoryUpdate.count({ where: { organizationId } }),
    prisma.legalDocument.count({ where: { organizationId } }),
    prisma.contract.count({ where: { organizationId } }),
    prisma.notification.count({ where: { organizationId, isRead: false } }),
  ]);
  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { timestamp: 'desc' },
    take: 8,
  });
  const loginActivity = await prisma.loginActivity.findMany({
    where: { user: { organizationId } },
    orderBy: { timestamp: 'desc' },
    take: 14,
  });
  const integrations = await prisma.integration.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
  const connectedIntegrations = integrations.filter((i) => i.status === 'connected').length;
  const systemHealth = integrations.length
    ? Math.round((connectedIntegrations / integrations.length) * 100)
    : 100;

  return {
    role,
    stats: {
      totalUsers,
      activeUsers,
      systemHealth,
      pendingInvitations: await prisma.invitation.count({
        where: { organizationId, status: 'pending' },
      }),
      connectedIntegrations,
      totalIntegrations: integrations.length,
    },
    usersByRole: users.map((row) => ({
      role: row.role,
      count: row._count.role,
    })),
    contentStats: [
      { label: 'Total Regulations', count: regCount },
      { label: 'Documents', count: docCount },
      { label: 'Contracts', count: contractCount },
      { label: 'Alerts', count: alertCount },
    ],
    systemLogs: auditLogs.map((l) => ({
      type: l.severity === 'critical' || l.status === 'failure' ? 'error' : l.severity === 'warning' ? 'warning' : 'success',
      message: l.actionDetails,
      time: l.timestamp.toISOString(),
      severity: l.severity,
    })),
    userActivityData: loginActivity.map((a) => ({
      date: a.timestamp.toISOString(),
      logins: a.status === 'success' ? 1 : 0,
      documents: 0,
      searches: 0,
    })),
    integrations: integrations.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type.replace('_', ' '),
      status: i.status,
      lastSync: i.lastSyncAt?.toISOString() ?? null,
      recordsSynced: i.recordsSynced,
    })),
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      joined: u.createdAt.toISOString(),
    })),
    announcements: announcements.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
    })),
    activityFeed,
  };
}
