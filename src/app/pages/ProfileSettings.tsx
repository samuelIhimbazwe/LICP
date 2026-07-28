import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { useAuth, ApiError } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Key,
  Bell,
  Lock,
  Upload,
  Camera,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

function deviceLabel(userAgent?: string) {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg') ? 'Edge' : ua.includes('chrome') ? 'Chrome' : ua.includes('firefox') ? 'Firefox' : ua.includes('safari') ? 'Safari' : 'Browser';
  const os = ua.includes('windows') ? 'Windows' : ua.includes('mac') ? 'macOS' : ua.includes('android') ? 'Android' : ua.includes('iphone') || ua.includes('ipad') ? 'iOS' : 'Device';
  return `${browser} on ${os}`;
}

export function ProfileSettings() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{ id: string; ipAddress?: string; userAgent?: string; lastActivity: string; current?: boolean }>
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: 'Senior Legal Counsel',
    department: 'Legal Department',
    organization: '',
    bio: 'Experienced legal professional specializing in corporate law and compliance.',
  });

  useEffect(() => {
    if (!user) return;
    setProfileData((prev) => ({
      ...prev,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      organization: user.organization,
      department: user.department || prev.department,
    }));
    setMfaEnabled(user.mfaEnabled);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSessions(true);
      try {
        const data = await apiRequest<{
          sessions?: Array<{ id: string; ipAddress?: string; userAgent?: string; lastActivity: string }>;
        }>('/auth/me/sessions');
        if (!cancelled) {
          const list = data.sessions ?? [];
          setSessions(list.map((s, i) => ({ ...s, current: i === 0 })));
        }
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{
          preferences?: {
            channels?: { email?: boolean; inApp?: boolean; sms?: boolean };
            typePreferences?: Record<string, string[]>;
          };
        }>('/notifications/preferences');
        if (cancelled || !data.preferences) return;
        const prefs = data.preferences;
        setNotificationSettings({
          emailNotifications: prefs.channels?.email ?? true,
          pushNotifications: prefs.channels?.inApp ?? true,
          smsNotifications: prefs.channels?.sms ?? false,
          complianceAlerts: (prefs.typePreferences?.complianceDeadlines ?? []).length > 0,
          caseUpdates: (prefs.typePreferences?.taskAssignments ?? []).length > 0,
          systemUpdates: (prefs.typePreferences?.systemAnnouncements ?? []).length > 0,
        });
      } catch {
        // Keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    complianceAlerts: true,
    caseUpdates: true,
    systemUpdates: false
  });

  const revokeSession = async (id: string) => {
    try {
      await apiRequest(`/auth/me/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session signed out.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign out session.');
    }
  };

  const revokeOtherSessions = async () => {
    try {
      await apiRequest('/auth/me/sessions', { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.current));
      toast.success('Other sessions signed out.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke sessions.');
    }
  };

  const regenerateRecoveryCodes = async () => {
    setLoadingRecovery(true);
    try {
      const data = await apiRequest<{ backupCodes: string[] }>('/auth/mfa/backup-codes/regenerate', {
        method: 'POST',
        body: '{}',
      });
      setRecoveryCodes(data.backupCodes);
      toast.success('New recovery codes generated. Download and store them securely.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not regenerate recovery codes.');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const downloadRecoveryCodes = () => {
    if (recoveryCodes.length === 0) {
      toast.error('Generate recovery codes first.');
      return;
    }
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'licp-mfa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Recovery codes downloaded.');
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const current = await apiRequest<{ preferences: Record<string, unknown> }>('/notifications/preferences');
      const existing = current.preferences as {
        channels: { inApp: boolean; email: boolean; sms: boolean };
        typePreferences: Record<string, string[]>;
        quietHours?: unknown;
        emailDigest?: unknown;
        subscriptions?: unknown;
      };
      await apiRequest('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          ...existing,
          channels: {
            inApp: notificationSettings.pushNotifications,
            email: notificationSettings.emailNotifications,
            sms: notificationSettings.smsNotifications,
          },
          typePreferences: {
            ...existing.typePreferences,
            complianceDeadlines: notificationSettings.complianceAlerts
              ? ['in_app', 'email']
              : [],
            taskAssignments: notificationSettings.caseUpdates ? ['in_app', 'email'] : [],
            systemAnnouncements: notificationSettings.systemUpdates ? ['in_app', 'email'] : [],
          },
        }),
      });
      toast.success('Notification preferences saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        fullName: profileData.fullName.trim(),
        phone: profileData.phone.trim(),
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'An error occurred. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'An error occurred. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnableMFA = () => {
    navigate('/setup-mfa');
  };

  const handleDisableMFA = () => {
    if (user?.mfaRequiredByOrg) {
      toast.error('MFA is required by your organization and cannot be disabled.');
      setMfaEnabled(true);
      return;
    }
    toast.error('Disabling MFA is not permitted.');
    setMfaEnabled(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'compliance_officer': return 'Compliance Officer';
      case 'legal_practitioner': return 'Legal Practitioner';
      case 'manager': return 'Manager';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-slate-600 mt-1">Manage your personal information and account settings</p>
        </div>
        <Button onClick={handleProfileUpdate} disabled={savingProfile}>
          <Save className="mr-2 h-4 w-4" />
          {savingProfile ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Key className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-brand text-brand-foreground text-2xl">
                    {user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                    <Button variant="outline" size="sm">
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    value={profileData.jobTitle}
                    onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={profileData.organization}
                    onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full border rounded-lg p-3 text-sm"
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Role</p>
                    <Badge className="mt-1">{user ? getRoleLabel(user.role) : ''}</Badge>
                  </div>
                  <div>
                    <p className="text-slate-600">Account Created</p>
                    <p className="mt-1 font-medium">{format(new Date('2024-01-15'), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Last Login</p>
                    <p className="mt-1 font-medium">{format(new Date(), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">User ID</p>
                    <p className="mt-1 font-mono text-xs">{user?.id || 'USR-001'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button onClick={handlePasswordChange} disabled={changingPassword}>
                <Lock className="mr-2 h-4 w-4" />
                {changingPassword ? 'Changing…' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {mfaEnabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-slate-400" />
                  )}
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-slate-600">
                      {mfaEnabled ? 'Currently enabled' : 'Not configured'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={(checked) => {
                    setMfaEnabled(checked);
                    checked ? handleEnableMFA() : handleDisableMFA();
                  }}
                />
              </div>

              {mfaEnabled && (
                <div className="border rounded-lg p-4 bg-slate-50">
                  <h4 className="font-medium mb-2">Recovery Codes</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Generate and download one-time recovery codes. Previous codes are invalidated when you regenerate.
                  </p>
                  {recoveryCodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {recoveryCodes.map((code) => (
                        <code key={code} className="bg-white border rounded p-2 text-xs font-mono">
                          {code}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mb-3">No codes shown yet. Generate a new set to view and download them.</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={regenerateRecoveryCodes} disabled={loadingRecovery}>
                      {loadingRecovery ? 'Generating…' : 'Generate Recovery Codes'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadRecoveryCodes} disabled={recoveryCodes.length === 0}>
                      <Upload className="mr-2 h-4 w-4" />
                      Download Recovery Codes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage devices where you're currently logged in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingSessions && <p className="text-sm text-slate-600">Loading sessions…</p>}
                {!loadingSessions && sessions.length === 0 && (
                  <p className="text-sm text-slate-600">No active sessions found.</p>
                )}
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium">{deviceLabel(session.userAgent)}</p>
                        <p className="text-sm text-slate-600">
                          {session.ipAddress ?? 'Unknown IP'} • Last active{' '}
                          {format(new Date(session.lastActivity), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.current && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Current</Badge>
                      )}
                      {!session.current && (
                        <Button variant="outline" size="sm" onClick={() => revokeSession(session.id)}>
                          Sign Out
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={revokeOtherSessions} disabled={sessions.length <= 1}>
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Notification Channels</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-slate-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-slate-600">Receive browser push notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-slate-600">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Notification Types</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compliance Alerts</Label>
                      <p className="text-sm text-slate-600">Critical compliance deadlines and alerts</p>
                    </div>
                    <Switch
                      checked={notificationSettings.complianceAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, complianceAlerts: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Case Updates</Label>
                      <p className="text-sm text-slate-600">Updates on your assigned cases</p>
                    </div>
                    <Switch
                      checked={notificationSettings.caseUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, caseUpdates: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Updates</Label>
                      <p className="text-sm text-slate-600">Platform updates and maintenance notices</p>
                    </div>
                    <Switch
                      checked={notificationSettings.systemUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, systemUpdates: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                <Save className="mr-2 h-4 w-4" />
                {savingNotifications ? 'Saving…' : 'Save Notification Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and login history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'Logged in', details: 'Chrome on Windows', time: '2 minutes ago' },
                  { action: 'Updated profile', details: 'Changed phone number', time: '3 hours ago' },
                  { action: 'Created contract', details: 'Employment Agreement - Tech Corp', time: '5 hours ago' },
                  { action: 'Logged in', details: 'Safari on iPhone', time: '1 day ago' },
                  { action: 'Changed password', details: 'Security update', time: '3 days ago' }
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 border rounded-lg p-3">
                    <div className="h-2 w-2 rounded-full bg-brand mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.action}</p>
                        <span className="text-sm text-slate-500">{activity.time}</span>
                      </div>
                      <p className="text-sm text-slate-600">{activity.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
