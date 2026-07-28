import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { MFAVerificationPage } from './pages/MFAVerificationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { SetupMFAPage } from './pages/SetupMFAPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LegalKnowledgeBase } from './pages/LegalKnowledgeBase';
import { ComplianceTracking } from './pages/ComplianceTracking';
import { RegulatoryUpdates } from './pages/RegulatoryUpdates';
import { ContractManagement } from './pages/ContractManagement';
import { NotificationCenter } from './pages/NotificationCenter';
import { AILegalIntelligence } from './pages/AILegalIntelligence';
import { AnalyticsReporting } from './pages/AnalyticsReporting';
import { UserManagement } from './pages/UserManagement';
import { IntegrationModule } from './pages/IntegrationModule';
import { SecurityAudit } from './pages/SecurityAudit';
import { SystemSettings } from './pages/SystemSettings';
import { ProfileSettings } from './pages/ProfileSettings';
import { UserPreferences } from './pages/UserPreferences';
import { TeamManagement } from './pages/TeamManagement';
import { Reports } from './pages/Reports';
import { Cases } from './pages/Cases';
import { Research } from './pages/Research';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { EmailVerificationPendingPage } from './pages/EmailVerificationPendingPage';
import { RoleGuard } from './components/auth/RoleGuard';
import { ThemeProvider } from './providers/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { useSessionTimeout } from './hooks/useSessionTimeout';

function EmailVerificationRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsMFA } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  if (!user && !needsMFA) {
    return <Navigate to="/login" replace />;
  }

  if (needsMFA) {
    return <Navigate to="/verify-mfa" replace />;
  }

  if (user?.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, needsMFA, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  if (!isAuthenticated && !needsMFA) {
    return <Navigate to="/login" replace />;
  }

  if (needsMFA) {
    return <Navigate to="/verify-mfa" replace />;
  }

  if (user && user.emailVerified === false) {
    return <Navigate to="/verify-email-pending" replace />;
  }

  return <RoleGuard>{children}</RoleGuard>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  useSessionTimeout();

  return (
    <div className="size-full">
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-mfa"
          element={<MFAVerificationPage />}
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
        <Route path="/set-password/:token" element={<SetPasswordPage />} />
        <Route path="/setup-mfa/:token" element={<SetupMFAPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route
          path="/verify-email-pending"
          element={
            <EmailVerificationRoute>
              <EmailVerificationPendingPage />
            </EmailVerificationRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        />
        <Route
          path="/knowledge-base"
          element={
            <PrivateRoute>
              <DashboardLayout component={<LegalKnowledgeBase />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance-tracking"
          element={
            <PrivateRoute>
              <DashboardLayout component={<ComplianceTracking />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/regulatory-updates"
          element={
            <PrivateRoute>
              <DashboardLayout component={<RegulatoryUpdates />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <PrivateRoute>
              <DashboardLayout component={<ContractManagement />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <DashboardLayout component={<NotificationCenter />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-intelligence"
          element={
            <PrivateRoute>
              <DashboardLayout component={<AILegalIntelligence />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <DashboardLayout component={<AnalyticsReporting />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <PrivateRoute>
              <DashboardLayout component={<UserManagement />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <PrivateRoute>
              <DashboardLayout component={<IntegrationModule />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/security"
          element={
            <PrivateRoute>
              <DashboardLayout component={<SecurityAudit />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/system-settings"
          element={
            <PrivateRoute>
              <DashboardLayout component={<SystemSettings />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile-settings"
          element={
            <PrivateRoute>
              <DashboardLayout component={<ProfileSettings />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <PrivateRoute>
              <DashboardLayout component={<UserPreferences />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/team"
          element={
            <PrivateRoute>
              <DashboardLayout component={<TeamManagement />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <DashboardLayout component={<Reports />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/search"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/cases"
          element={
            <PrivateRoute>
              <DashboardLayout component={<Cases />} />
            </PrivateRoute>
          }
        />
        <Route
          path="/research"
          element={
            <PrivateRoute>
              <DashboardLayout component={<Research />} />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}