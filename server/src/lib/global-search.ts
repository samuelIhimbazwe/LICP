import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';
import { hasModuleAccess, type UserPermissions } from './permissions.js';
import { mapObligationStatusToUi } from './compliance.js';

export type GlobalSearchResultType =
  | 'obligation'
  | 'regulatory'
  | 'document'
  | 'contract'
  | 'user'
  | 'integration'
  | 'notification'
  | 'navigation';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
}

function matches(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const term = query.toLowerCase().trim();
  if (!term) return false;
  if (lower.includes(term)) return true;
  return term
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .some((t) => lower.includes(t));
}

const NAV_SHORTCUTS: { title: string; subtitle: string; href: string; keywords: string[] }[] = [
  { title: 'Dashboard', subtitle: 'Overview', href: '/dashboard', keywords: ['dashboard', 'home', 'overview'] },
  { title: 'Knowledge Base', subtitle: 'Legal documents', href: '/knowledge-base', keywords: ['knowledge', 'documents', 'legal'] },
  { title: 'Compliance Tracking', subtitle: 'Obligations', href: '/compliance-tracking', keywords: ['compliance', 'obligation', 'tracking'] },
  { title: 'Regulatory Updates', subtitle: 'Regulations', href: '/regulatory-updates', keywords: ['regulatory', 'regulation', 'updates'] },
  { title: 'Contracts', subtitle: 'Agreement management', href: '/contracts', keywords: ['contract', 'agreement'] },
  { title: 'Notifications', subtitle: 'Alerts', href: '/notifications', keywords: ['notification', 'alert'] },
  { title: 'AI Intelligence', subtitle: 'Research assistant', href: '/ai-intelligence', keywords: ['ai', 'intelligence', 'research'] },
  { title: 'Analytics', subtitle: 'Reports and metrics', href: '/analytics', keywords: ['analytics', 'report', 'metrics'] },
  { title: 'Integrations', subtitle: 'Connected systems', href: '/integrations', keywords: ['integration', 'connector', 'sync'] },
  { title: 'Security & Audit', subtitle: 'Logs', href: '/security', keywords: ['security', 'audit', 'log'] },
  { title: 'User Management', subtitle: 'Accounts and roles', href: '/user-management', keywords: ['user', 'admin', 'accounts'] },
  { title: 'System Settings', subtitle: 'Configuration', href: '/system-settings', keywords: ['settings', 'system', 'config'] },
];

export async function runGlobalSearch(
  organizationId: string,
  query: string,
  permissions: UserPermissions,
  role: UserRole
): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: GlobalSearchResult[] = [];
  const limitPerType = 5;

  for (const nav of NAV_SHORTCUTS) {
    if (nav.keywords.some((kw) => matches(kw, q)) || matches(nav.title, q)) {
      if (nav.href === '/user-management' && role !== 'admin') continue;
      if (nav.href === '/system-settings' && role !== 'admin') continue;
      if (nav.href === '/analytics' && !hasModuleAccess(permissions, 'analytics', 'view')) continue;
      if (nav.href === '/integrations' && !hasModuleAccess(permissions, 'integrations', 'view')) continue;
      if (nav.href === '/security' && !hasModuleAccess(permissions, 'security', 'view')) continue;
      results.push({
        id: `nav-${nav.href}`,
        type: 'navigation',
        title: nav.title,
        subtitle: nav.subtitle,
        href: nav.href,
      });
    }
  }

  if (hasModuleAccess(permissions, 'complianceTracking', 'view')) {
    const obligations = await prisma.complianceObligation.findMany({
      where: { organizationId },
      orderBy: { deadline: 'asc' },
      take: 80,
    });
    for (const o of obligations) {
      if (!matches(`${o.title} ${o.description} ${o.regulation} ${o.department ?? ''}`, q)) continue;
      results.push({
        id: o.id,
        type: 'obligation',
        title: o.title,
        subtitle: `${mapObligationStatusToUi(o.status)} · ${o.regulation || 'Obligation'}`,
        href: '/compliance-tracking',
      });
      if (results.filter((r) => r.type === 'obligation').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'regulatoryUpdates', 'view')) {
    const updates = await prisma.regulatoryUpdate.findMany({
      where: { organizationId },
      orderBy: { publishedAt: 'desc' },
      take: 80,
    });
    for (const u of updates) {
      if (!matches(`${u.title} ${u.description} ${u.category} ${u.jurisdiction ?? ''}`, q)) continue;
      results.push({
        id: u.id,
        type: 'regulatory',
        title: u.title,
        subtitle: `${u.category} · ${u.impact} impact`,
        href: '/regulatory-updates',
      });
      if (results.filter((r) => r.type === 'regulatory').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'knowledgeBase', 'view')) {
    const docs = await prisma.legalDocument.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    });
    for (const d of docs) {
      if (!matches(`${d.title} ${d.summary} ${d.content} ${d.jurisdiction ?? ''}`, q)) continue;
      results.push({
        id: d.id,
        type: 'document',
        title: d.title,
        subtitle: d.type.replace(/_/g, ' '),
        href: '/knowledge-base',
      });
      if (results.filter((r) => r.type === 'document').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'contractManagement', 'view')) {
    const contracts = await prisma.contract.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    });
    for (const c of contracts) {
      if (!matches(`${c.title} ${c.content} ${c.counterparty ?? ''} ${c.type}`, q)) continue;
      results.push({
        id: c.id,
        type: 'contract',
        title: c.title,
        subtitle: c.counterparty ?? c.status.replace(/_/g, ' '),
        href: '/contracts',
      });
      if (results.filter((r) => r.type === 'contract').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'userManagement', 'view')) {
    const users = await prisma.user.findMany({
      where: { organizationId },
      take: 50,
    });
    for (const u of users) {
      if (!matches(`${u.fullName} ${u.email} ${u.department ?? ''} ${u.role}`, q)) continue;
      results.push({
        id: u.id,
        type: 'user',
        title: u.fullName,
        subtitle: u.email,
        href: '/user-management',
      });
      if (results.filter((r) => r.type === 'user').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'integrations', 'view')) {
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      take: 30,
    });
    for (const i of integrations) {
      if (!matches(`${i.name} ${i.type} ${i.status}`, q)) continue;
      results.push({
        id: i.id,
        type: 'integration',
        title: i.name,
        subtitle: `${i.type} · ${i.status}`,
        href: '/integrations',
      });
      if (results.filter((r) => r.type === 'integration').length >= limitPerType) break;
    }
  }

  if (hasModuleAccess(permissions, 'notifications', 'view')) {
    const notifications = await prisma.notification.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    for (const n of notifications) {
      if (!matches(`${n.title} ${n.message} ${n.type}`, q)) continue;
      results.push({
        id: n.id,
        type: 'notification',
        title: n.title,
        subtitle: n.type,
        href: n.linkUrl ?? '/notifications',
      });
      if (results.filter((r) => r.type === 'notification').length >= limitPerType) break;
    }
  }

  return results.slice(0, 25);
}
