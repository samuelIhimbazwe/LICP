import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/utils';
import { useNavigate, useLocation } from 'react-router';
import { BrandMark } from './BrandMark';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  AlertCircle,
  FolderOpen,
  Bell,
  Brain,
  PieChart,
  UserCog,
  Plug,
  Shield,
  Settings,
  Library,
  ClipboardCheck,
  Briefcase,
  BookOpen,
  Users,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface NavSection {
  items: NavItem[];
}

interface SidebarProps {
  className?: string;
}

function buildSections(role: string | undefined): NavSection[] {
  const core: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: Library, path: '/knowledge-base' },
    { id: 'compliance-tracking', label: 'Compliance', icon: ClipboardCheck, path: '/compliance-tracking' },
    { id: 'regulatory-updates', label: 'Regulatory Updates', icon: AlertCircle, path: '/regulatory-updates' },
    { id: 'contracts', label: 'Contracts', icon: FolderOpen, path: '/contracts' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    { id: 'ai-intelligence', label: 'AI Intelligence', icon: Brain, path: '/ai-intelligence' },
    { id: 'analytics', label: 'Analytics', icon: PieChart, path: '/analytics' },
    { id: 'integrations', label: 'Integrations', icon: Plug, path: '/integrations' },
    { id: 'security', label: 'Security & Audit', icon: Shield, path: '/security' },
  ];

  const roleItems: NavItem[] = [];
  switch (role) {
    case 'compliance_officer':
      roleItems.push({ id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' });
      break;
    case 'legal_practitioner':
      roleItems.push(
        { id: 'cases', label: 'Cases', icon: Briefcase, path: '/cases' },
        { id: 'research', label: 'Research', icon: BookOpen, path: '/research' }
      );
      break;
    case 'manager':
      roleItems.push({ id: 'team', label: 'Team', icon: Users, path: '/team' });
      break;
    case 'admin':
      roleItems.push(
        { id: 'user-management', label: 'Users', icon: UserCog, path: '/user-management' },
        { id: 'system-settings', label: 'Settings', icon: Settings, path: '/system-settings' }
      );
      break;
  }

  const sections: NavSection[] = [{ items: core }];
  if (roleItems.length) sections.push({ items: roleItems });
  return sections;
}

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sections = buildSections(user?.role);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex',
        className
      )}
    >
      <div className="flex h-12 items-center border-b border-sidebar-border px-4 text-sidebar-foreground">
        <BrandMark size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={cn(sectionIndex > 0 && 'mt-4 border-t border-sidebar-border pt-4')}>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-[13px] transition-colors',
                        active
                          ? 'nav-item-active'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-current')} strokeWidth={active ? 2 : 1.5} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
