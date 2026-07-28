import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { downloadJsonFile, loadFromStorage, saveToStorage } from '../lib/ui-actions';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import {
  Settings,
  Shield,
  Mail,
  Database,
  Globe,
  Lock,
  Bell,
  Zap,
  FileText,
  Cloud,
  AlertCircle,
  CheckCircle2,
  Save,
  RefreshCw,
  Download,
  Upload,
  Server,
  Key,
  Users,
  Activity
} from 'lucide-react';

export function SystemSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generatingKey, setGeneratingKey] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backups, setBackups] = useState<Array<{ id: string; date: string; size: string; payload: unknown }>>([]);
  const defaultSettings = {
    // General Settings
    systemName: 'Legal Intelligence & Compliance Platform',
    systemUrl: 'https://licp.example.com',
    supportEmail: 'support@licp.example.com',
    timezone: 'Africa/Kigali',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',

    // Security Settings
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireMFA: true,
    allowRememberMe: true,
    ipWhitelisting: false,
    auditLogging: true,

    // Email Settings
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'noreply@licp.example.com',
    smtpPass: '',
    smtpEncryption: 'tls',
    emailFromName: 'LICP System',

    // Notification Settings
    enableEmailNotifications: true,
    enablePushNotifications: false,
    enableSMSNotifications: false,
    notifyOnNewUser: true,
    notifyOnSecurityAlert: true,

    // Storage Settings
    maxFileSize: '50',
    allowedFileTypes: '.pdf,.doc,.docx,.xls,.xlsx',
    storagePath: '/var/licp/storage',
    enableAutoBackup: true,
    backupFrequency: 'daily',

    // API Settings
    enableAPIAccess: true,
    apiRateLimit: '1000',
    apiKeyExpiration: '90',
    requireAPIKey: true
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    mode: string;
    source?: string;
    error?: string;
    etherealEnabled?: boolean;
  } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const loadEmailStatus = async (fresh = false) => {
    try {
      const path = fresh ? '/org/email/status?fresh=1' : '/org/email/status';
      const data = await apiRequest<{
        configured: boolean;
        mode: string;
        source?: string;
        error?: string;
        etherealEnabled?: boolean;
      }>(path);
      setEmailStatus(data);
    } catch {
      setEmailStatus(null);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      await apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(settings) });
      saveToStorage('licp-system-settings', settings);
      await loadEmailStatus(true);
      toast.success('SMTP settings saved and applied.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save SMTP settings.');
    }
  };

  useEffect(() => {
    const local = loadFromStorage('licp-system-settings', defaultSettings);
    setSettings(local);
    (async () => {
      try {
        const data = await apiRequest<{ settings: Record<string, unknown> }>('/org/settings');
        setSettings((prev) => ({ ...prev, ...local, ...(data.settings as typeof defaultSettings) }));
      } catch {
        // Keep local/demo defaults when API unavailable
      }
      await loadEmailStatus();
    })();
  }, []);

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    saveToStorage('licp-system-settings', settings);
    try {
      await apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(settings) });
      toast.success('System settings saved successfully');
    } catch {
      toast.success('Settings saved locally (server sync unavailable)');
    }
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
    saveToStorage('licp-system-settings', defaultSettings);
    toast.info('Settings reset to defaults');
  };

  const handleExportSettings = () => {
    downloadJsonFile('licp-system-settings.json', settings);
    toast.success('Settings exported successfully');
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(settings) });
      const testTo = user?.email || settings.smtpUser || settings.supportEmail;
      const result = await apiRequest<{
        success?: boolean;
        message?: string;
        previewUrl?: string;
        emailMode?: string;
        error?: string;
      }>('/org/email/test', { method: 'POST', body: JSON.stringify({ to: testTo }) });
      if (result.emailMode === 'ethereal' && result.previewUrl) {
        toast.success(result.message ?? 'Test email sent via Ethereal (dev).', {
          action: { label: 'Open preview', onClick: () => window.open(result.previewUrl, '_blank') },
        });
      } else if (result.emailMode === 'smtp') {
        toast.success(result.message ?? `Test email sent to ${testTo}. Check your inbox.`);
      } else {
        toast.success(result.message ?? 'Test email sent successfully.');
      }
      await loadEmailStatus(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test email failed. Check SMTP host, user, and app password.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const result = await apiRequest<{ key?: { token?: string; name?: string } }>('/integrations/keys', {
        method: 'POST',
        body: JSON.stringify({ name: `Settings key ${new Date().toISOString().slice(0, 10)}` }),
      });
      const key = result.key?.token;
      if (key) {
        await navigator.clipboard.writeText(key);
        toast.success('API key created and copied to clipboard. Manage keys under Integrations.');
      } else {
        toast.success('API key created. Open Integrations to view it.');
      }
      navigate('/integrations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create API key.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const [org, audit] = await Promise.all([
        apiRequest<{ settings: unknown }>('/org/settings'),
        apiRequest<{ logs?: unknown[] }>('/audit/logs?limit=100').catch(() => ({ logs: [] })),
      ]);
      const payload = {
        generatedAt: new Date().toISOString(),
        organizationSettings: org.settings,
        systemSettings: settings,
        recentAuditLogs: audit.logs ?? [],
      };
      const json = JSON.stringify(payload, null, 2);
      const entry = {
        id: `backup-${Date.now()}`,
        date: new Date().toLocaleString(),
        size: `${(json.length / 1024).toFixed(1)} KB`,
        payload,
      };
      setBackups((prev) => [entry, ...prev].slice(0, 10));
      downloadJsonFile(`licp-backup-${Date.now()}.json`, payload);
      toast.success('Backup created and downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (backup: { date: string; payload: unknown }) => {
    downloadJsonFile(`licp-backup-${backup.date.replace(/[^\d]/g, '-')}.json`, backup.payload);
    toast.success('Backup downloaded.');
  };

  const handleRestoreBackup = async (backup: { payload: unknown }) => {
    try {
      const data = backup.payload as { systemSettings?: typeof settings; organizationSettings?: Record<string, unknown> };
      if (data.systemSettings) {
        setSettings(data.systemSettings);
        await apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(data.systemSettings) });
      } else if (data.organizationSettings) {
        await apiRequest('/org/settings', { method: 'PUT', body: JSON.stringify(data.organizationSettings) });
      }
      toast.success('Settings restored from backup.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const imported = JSON.parse(await file.text()) as typeof settings;
            setSettings({ ...defaultSettings, ...imported });
            saveToStorage('licp-system-settings', { ...defaultSettings, ...imported });
            toast.success('Settings imported successfully');
          } catch {
            toast.error('Invalid settings file.');
          }
          e.target.value = '';
        }}
      />
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-slate-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="storage">
            <Database className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="api">
            <Zap className="mr-2 h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Cloud className="mr-2 h-4 w-4" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Basic system information and localization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="system-name">System Name</Label>
                  <Input
                    id="system-name"
                    value={settings.systemName}
                    onChange={(e) => handleSettingChange('systemName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="system-url">System URL</Label>
                  <Input
                    id="system-url"
                    value={settings.systemUrl}
                    onChange={(e) => handleSettingChange('systemUrl', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Kigali">Africa/Kigali (GMT+2)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="language">Default Language</Label>
                  <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="rw">Kinyarwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange('dateFormat', value)}>
                    <SelectTrigger id="date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security & Authentication</CardTitle>
              <CardDescription>Configure security policies and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                  <Input
                    id="max-login-attempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('maxLoginAttempts', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password-length">Minimum Password Length</Label>
                <Input
                  id="password-length"
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleSettingChange('passwordMinLength', e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Multi-Factor Authentication</Label>
                    <p className="text-sm text-slate-600">Required for all users — cannot be disabled</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Remember Me</Label>
                    <p className="text-sm text-slate-600">Let users stay logged in</p>
                  </div>
                  <Switch
                    checked={settings.allowRememberMe}
                    onCheckedChange={(checked) => handleSettingChange('allowRememberMe', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP Whitelisting</Label>
                    <p className="text-sm text-slate-600">Restrict access by IP address</p>
                  </div>
                  <Switch
                    checked={settings.ipWhitelisting}
                    onCheckedChange={(checked) => handleSettingChange('ipWhitelisting', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-slate-600">Log all system activities</p>
                  </div>
                  <Switch
                    checked={settings.auditLogging}
                    onCheckedChange={(checked) => handleSettingChange('auditLogging', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>
                    SMTP for invitations, email verification, password reset, and notifications.
                    Env vars in <code className="text-xs">.env</code> take priority over these settings.
                  </CardDescription>
                </div>
                {emailStatus && (
                  <Badge variant={emailStatus.configured ? 'default' : 'secondary'}>
                    {emailStatus.configured
                      ? `Ready (${emailStatus.mode}${emailStatus.source ? ` · ${emailStatus.source}` : ''})`
                      : 'Not configured'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={settings.smtpHost}
                    onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    value={settings.smtpPort}
                    onChange={(e) => handleSettingChange('smtpPort', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    value={settings.smtpUser}
                    onChange={(e) => handleSettingChange('smtpUser', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-pass">SMTP Password / App password</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep existing"
                    value={settings.smtpPass}
                    onChange={(e) => handleSettingChange('smtpPass', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="smtp-encryption">Encryption</Label>
                  <Select value={settings.smtpEncryption} onValueChange={(value) => handleSettingChange('smtpEncryption', value)}>
                    <SelectTrigger id="smtp-encryption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="email-from-name">From Name</Label>
                <Input
                  id="email-from-name"
                  value={settings.emailFromName}
                  onChange={(e) => handleSettingChange('emailFromName', e.target.value)}
                />
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleTestEmail} disabled={testingEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  {testingEmail ? 'Sending…' : 'Send test email'}
                </Button>
                <Button variant="outline" onClick={handleSaveSmtp}>
                  Save &amp; apply SMTP
                </Button>
              </div>
              {emailStatus?.error && !emailStatus.configured && (
                <p className="text-sm text-amber-700">{emailStatus.error}</p>
              )}
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Use real email (not demo Ethereal)</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Fill in SMTP host, port, username, and app password below (or set the same values in <code>.env</code>).</li>
                  <li>Set <code>USE_ETHEREAL_EMAIL=false</code> in <code>.env</code> and restart the API (<code>npm run dev:api</code>).</li>
                  <li>Click <strong>Save &amp; apply SMTP</strong>, then <strong>Send test email</strong> — delivers to your signed-in address ({user?.email ?? 'your account email'}).</li>
                </ol>
                <p>Gmail: use an <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">App Password</a> with host <code>smtp.gmail.com</code>, port <code>587</code>, TLS.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-slate-600">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.enableEmailNotifications}
                    onCheckedChange={(checked) => handleSettingChange('enableEmailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-slate-600">Send browser push notifications</p>
                  </div>
                  <Switch
                    checked={settings.enablePushNotifications}
                    onCheckedChange={(checked) => handleSettingChange('enablePushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-slate-600">Send notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.enableSMSNotifications}
                    onCheckedChange={(checked) => handleSettingChange('enableSMSNotifications', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Notification Triggers</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New User Registration</Label>
                      <p className="text-sm text-slate-600">Notify when a new user registers</p>
                    </div>
                    <Switch
                      checked={settings.notifyOnNewUser}
                      onCheckedChange={(checked) => handleSettingChange('notifyOnNewUser', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-slate-600">Notify on security events</p>
                    </div>
                    <Switch
                      checked={settings.notifyOnSecurityAlert}
                      onCheckedChange={(checked) => handleSettingChange('notifyOnSecurityAlert', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Settings */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Configuration</CardTitle>
              <CardDescription>Manage file storage and upload settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
                <Input
                  id="max-file-size"
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="allowed-file-types">Allowed File Types</Label>
                <Input
                  id="allowed-file-types"
                  value={settings.allowedFileTypes}
                  onChange={(e) => handleSettingChange('allowedFileTypes', e.target.value)}
                  placeholder=".pdf,.doc,.docx"
                />
                <p className="text-sm text-slate-600 mt-1">Comma-separated list of file extensions</p>
              </div>

              <div>
                <Label htmlFor="storage-path">Storage Path</Label>
                <Input
                  id="storage-path"
                  value={settings.storagePath}
                  onChange={(e) => handleSettingChange('storagePath', e.target.value)}
                />
              </div>

              <Separator />

              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-medium mb-2">Storage Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Total Storage</p>
                    <p className="text-2xl font-bold">500 GB</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Used</p>
                    <p className="text-2xl font-bold">187 GB</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Available</p>
                    <p className="text-2xl font-bold">313 GB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Manage API access and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable API Access</Label>
                  <p className="text-sm text-slate-600">Allow external applications to access the API</p>
                </div>
                <Switch
                  checked={settings.enableAPIAccess}
                  onCheckedChange={(checked) => handleSettingChange('enableAPIAccess', checked)}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="api-rate-limit">Rate Limit (requests/hour)</Label>
                  <Input
                    id="api-rate-limit"
                    type="number"
                    value={settings.apiRateLimit}
                    onChange={(e) => handleSettingChange('apiRateLimit', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="api-key-expiration">API Key Expiration (days)</Label>
                  <Input
                    id="api-key-expiration"
                    type="number"
                    value={settings.apiKeyExpiration}
                    onChange={(e) => handleSettingChange('apiKeyExpiration', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require API Key</Label>
                  <p className="text-sm text-slate-600">Enforce API key authentication</p>
                </div>
                <Switch
                  checked={settings.requireAPIKey}
                  onCheckedChange={(checked) => handleSettingChange('requireAPIKey', checked)}
                />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerateApiKey} disabled={generatingKey}>
                  <Key className="mr-2 h-4 w-4" />
                  {generatingKey ? 'Generating…' : 'Generate New API Key'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/integrations')}>
                  <FileText className="mr-2 h-4 w-4" />
                  View API Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery</CardTitle>
              <CardDescription>Configure automated backups and recovery options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Automatic Backups</Label>
                  <p className="text-sm text-slate-600">Automatically backup system data</p>
                </div>
                <Switch
                  checked={settings.enableAutoBackup}
                  onCheckedChange={(checked) => handleSettingChange('enableAutoBackup', checked)}
                />
              </div>

              <div>
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select value={settings.backupFrequency} onValueChange={(value) => handleSettingChange('backupFrequency', value)}>
                  <SelectTrigger id="backup-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Recent Backups</h4>
                <div className="space-y-2">
                  {backups.length === 0 && (
                    <p className="text-sm text-slate-600">No backups yet. Create one to export organization settings and recent audit data.</p>
                  )}
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">{backup.date}</p>
                          <p className="text-sm text-slate-600">Size: {backup.size}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(backup)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRestoreBackup(backup)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateBackup} disabled={creatingBackup}>
                  <Cloud className="mr-2 h-4 w-4" />
                  {creatingBackup ? 'Creating…' : 'Create Backup Now'}
                </Button>
                <Button variant="outline" onClick={handleExportSettings}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
