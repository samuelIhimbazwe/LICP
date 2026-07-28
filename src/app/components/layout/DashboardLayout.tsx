import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageHeader } from './PageHeader';
import { useAuth } from '../../context/AuthContext';
import { ComplianceOfficerDashboard } from '../../pages/ComplianceOfficerDashboard';
import { LegalPractitionerDashboard } from '../../pages/LegalPractitionerDashboard';
import { ManagerDashboard } from '../../pages/ManagerDashboard';
import { AdminDashboard } from '../../pages/AdminDashboard';
import { useLocation } from 'react-router';

interface DashboardLayoutProps {
  component?: React.ReactNode;
}

const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/knowledge-base': { title: 'Knowledge Base', description: 'Legal resources and reference materials' },
  '/compliance-tracking': { title: 'Compliance', description: 'Obligations, deadlines, and status' },
  '/regulatory-updates': { title: 'Regulatory Updates', description: 'Recent changes and impact analysis' },
  '/contracts': { title: 'Contracts', description: 'Agreement management and renewals' },
  '/notifications': { title: 'Notifications', description: 'Alerts and reminders' },
  '/ai-intelligence': { title: 'AI Intelligence', description: 'Research and analysis tools' },
  '/analytics': { title: 'Analytics', description: 'Metrics and reporting' },
  '/user-management': { title: 'Users', description: 'Accounts, roles, and access' },
  '/integrations': { title: 'Integrations', description: 'Connected systems' },
  '/security': { title: 'Security & Audit', description: 'Logs and access controls' },
  '/system-settings': { title: 'Settings', description: 'Platform configuration' },
  '/profile-settings': { title: 'Profile', description: 'Account and security' },
  '/preferences': { title: 'Preferences', description: 'Notifications and display' },
  '/team': { title: 'Team', description: 'Members and workload' },
  '/reports': { title: 'Reports', description: 'Compliance and operational reports' },
  '/search': { title: 'Search', description: 'Find regulations and documents' },
  '/cases': { title: 'Cases', description: 'Active matters' },
  '/research': { title: 'Research', description: 'Legal research tools' },
};

function getDashboardTitle(role: string | undefined) {
  switch (role) {
    case 'compliance_officer': return 'Compliance overview';
    case 'legal_practitioner': return 'Legal workspace';
    case 'manager': return 'Team overview';
    case 'admin': return 'System overview';
    default: return 'Dashboard';
  }
}

export function DashboardLayout({ component }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboardHome = location.pathname === '/dashboard';

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'compliance_officer': return <ComplianceOfficerDashboard />;
      case 'legal_practitioner': return <LegalPractitionerDashboard />;
      case 'manager': return <ManagerDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return null;
    }
  };

  const pageMeta = PAGE_META[location.pathname];
  const pageTitle = isDashboardHome ? getDashboardTitle(user?.role) : pageMeta?.title ?? 'Dashboard';
  const pageDescription = isDashboardHome
    ? undefined
    : pageMeta?.description;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
            <div className="app-page">
              <PageHeader title={pageTitle} description={pageDescription} />
              {component ?? getDashboardComponent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
