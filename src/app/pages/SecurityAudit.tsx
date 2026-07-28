import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsTrigger } from '../components/ui/tabs';
import { ModuleTabsList } from '../components/layout/ModuleTabsList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Activity,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Monitor,
  Smartphone,
  Clock,
  MapPin,
  AlertCircle,
  Settings,
  Database,
  Calendar,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  securityPermissions,
  encryptionConfigs,
  mfaConfigurations,
  documentAccessLogs,
  complianceActionAudits,
  regulatoryReviewLogs,
  anomalyDetections,
  dataRetentionPolicies,
  securityIncidents,
  accessControls,
  securityMetrics,
} from '../data/securityData';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { apiRequest, API_BASE } from '../lib/api';
import { toast } from 'sonner';

interface ApiLoginActivity {
  id: string;
  userName: string;
  timestamp: string;
  ipAddress?: string;
  device: string;
  browser: string;
  status: string;
  failureReason?: string;
  mfaVerified: boolean;
}

interface ApiAuditLog {
  id: string;
  userName?: string;
  userRole?: string;
  action: string;
  actionDetails: string;
  timestamp: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  status: string;
  severity: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
}

export function SecurityAudit() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('permissions');
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [loginActivities, setLoginActivities] = useState<ApiLoginActivity[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [loadingLogin, setLoadingLogin] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [exportingAudit, setExportingAudit] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<Partial<typeof securityMetrics> | null>(null);
  const [loginSearch, setLoginSearch] = useState('');
  const [auditSeverity, setAuditSeverity] = useState('all');
  const metrics = { ...securityMetrics, ...(liveMetrics ?? {}) };

  const filteredLoginActivities = loginActivities.filter((activity) => {
    const q = loginSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      activity.userName.toLowerCase().includes(q) ||
      (activity.ipAddress ?? '').toLowerCase().includes(q) ||
      activity.device.toLowerCase().includes(q) ||
      activity.browser.toLowerCase().includes(q) ||
      activity.status.toLowerCase().includes(q)
    );
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditSeverity === 'all') return true;
    const sev = log.severity.toLowerCase();
    if (auditSeverity === 'warning') return sev === 'warning' || sev === 'medium' || sev === 'high';
    if (auditSeverity === 'info') return sev === 'info' || sev === 'low';
    return sev === auditSeverity;
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab &&
      [
        'permissions',
        'encryption',
        'mfa',
        'login',
        'audit',
        'documents',
        'compliance',
        'regulatory',
        'anomalies',
        'retention',
        'incidents',
        'access-control',
      ].includes(tab)
    ) {
      setActiveTab(tab);
    }
    const logId = searchParams.get('log');
    if (logId) {
      setSelectedLog(logId);
      setActiveTab('audit');
      requestAnimationFrame(() => {
        document.getElementById(`audit-log-${logId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchParams, auditLogs]);

  const handleExportLoginActivity = () => {
    const rows = [
      'userName,timestamp,ipAddress,device,browser,status,failureReason,mfaVerified',
      ...filteredLoginActivities.map((a) =>
        [
          JSON.stringify(a.userName),
          a.timestamp,
          JSON.stringify(a.ipAddress ?? ''),
          JSON.stringify(a.device),
          JSON.stringify(a.browser),
          a.status,
          JSON.stringify(a.failureReason ?? ''),
          String(a.mfaVerified),
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'login-activity.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Login activity exported.');
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{ metrics: Partial<typeof securityMetrics> }>('/audit/metrics');
        setLiveMetrics(data.metrics);
      } catch {
        // Keep demo securityMetrics
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ activities: ApiLoginActivity[] }>('/audit/login-activity');
        if (!cancelled) setLoginActivities(data.activities);
      } catch {
        if (!cancelled) toast.error('Failed to load login activity.');
      } finally {
        if (!cancelled) setLoadingLogin(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ logs: ApiAuditLog[] }>('/audit/logs');
        if (!cancelled) setAuditLogs(data.logs);
      } catch {
        if (!cancelled) toast.error('Failed to load audit logs.');
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleExportAuditLogs = async () => {
    setExportingAudit(true);
    try {
      const response = await fetch(`${API_BASE}/audit/logs/export`, { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-log.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export audit logs.');
    } finally {
      setExportingAudit(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'info': return 'bg-brand/10 text-brand border-brand/20';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'encrypted':
      case 'resolved':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
      case 'unencrypted':
      case 'open':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'blocked':
      case 'investigating':
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security & Audit</h1>
          <p className="text-slate-600 mt-1">Comprehensive security monitoring and audit trail management</p>
        </div>
        <Button onClick={handleExportAuditLogs} disabled={exportingAudit}>
          <Download className="mr-2 h-4 w-4" />
          Export Security Report
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">MFA Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.mfaAdoptionRate}%</div>
            <Progress value={metrics.mfaAdoptionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
            <div className="text-sm text-slate-600 mt-1">{metrics.suspendedUsers} suspended</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Open Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.openAnomalies}</div>
            <div className="text-sm text-red-600 mt-1">{metrics.criticalAnomalies} critical</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Data Encryption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.encryptedDataPercentage}%</div>
            <Progress value={metrics.encryptedDataPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.auditLogEntries.toLocaleString()}</div>
            <div className="text-sm text-slate-600 mt-1">total entries</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="mfa">2FA Settings</TabsTrigger>
          <TabsTrigger value="login">Login Activity</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="documents">Document Access</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Actions</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory Reviews</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
        </ModuleTabsList>

        {/* Role-Based Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Permission Matrix</CardTitle>
              <CardDescription>Granular access control for all system resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityPermissions.map((permission) => (
                  <div key={permission.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{permission.roleName}</h3>
                        <div className="text-sm text-slate-600 mt-1">Resource: {permission.resource}</div>
                        {permission.isInherited && (
                          <Badge variant="outline" className="mt-2">Inherited</Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Allowed Actions:</div>
                      <div className="flex flex-wrap gap-2">
                        {permission.actions.map((action, idx) => (
                          <Badge key={idx} variant="outline" className="bg-green-50 text-green-700">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {permission.conditions && permission.conditions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">Conditions:</div>
                        <div className="text-sm text-slate-600 bg-slate-50 rounded p-2">
                          {permission.conditions.length} condition(s) applied
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Encryption Status Tab */}
        <TabsContent value="encryption" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Encryption Configuration</CardTitle>
              <CardDescription>Encryption status for sensitive data categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {encryptionConfigs.map((config) => (
                  <div key={config.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{config.dataType}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(config.status)}>
                            {config.status === 'encrypted' && <Lock className="mr-1 h-3 w-3" />}
                            {config.status === 'unencrypted' && <Unlock className="mr-1 h-3 w-3" />}
                            {config.status}
                          </Badge>
                          <Badge variant="outline">{config.encryptionMethod}</Badge>
                          <Badge variant="outline">{config.keyRotationSchedule} rotation</Badge>
                        </div>
                      </div>
                      <Switch checked={config.isActive} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      {config.lastRotated && (
                        <div>
                          <span className="text-slate-600">Last Rotated:</span>
                          <div className="font-medium">{format(config.lastRotated, 'PP')}</div>
                        </div>
                      )}
                      {config.nextRotation && (
                        <div>
                          <span className="text-slate-600">Next Rotation:</span>
                          <div className="font-medium">{format(config.nextRotation, 'PP')}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Encrypted Fields:</span>
                        <div className="font-medium">{config.encryptedFields.length}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div>
                      <div className="text-sm font-medium mb-2">Encrypted Fields:</div>
                      <div className="flex flex-wrap gap-1">
                        {config.encryptedFields.map((field, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{field}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Two-Factor Authentication Settings Tab */}
        <TabsContent value="mfa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication Configuration</CardTitle>
              <CardDescription>MFA settings and enrollment status for all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mfaConfigurations.map((mfa) => (
                  <div key={mfa.userId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{mfa.userName}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={mfa.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {mfa.mfaEnabled ? (
                              <>
                                <Shield className="mr-1 h-3 w-3" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Disabled
                              </>
                            )}
                          </Badge>
                          {mfa.mfaEnabled && (
                            <Badge variant="outline">{mfa.mfaMethod.replace('_', ' ').toUpperCase()}</Badge>
                          )}
                        </div>
                      </div>
                      {!mfa.mfaEnabled && (
                        <Button size="sm">
                          <Shield className="mr-2 h-4 w-4" />
                          Enable MFA
                        </Button>
                      )}
                    </div>

                    {mfa.mfaEnabled && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-slate-600">Enrolled:</span>
                            <div className="font-medium">
                              {mfa.enrolledAt ? format(mfa.enrolledAt, 'PP') : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-600">Last Used:</span>
                            <div className="font-medium">
                              {mfa.lastUsed ? format(mfa.lastUsed, 'PPp') : 'Never'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-600">Backup Codes:</span>
                            <div className="font-medium">
                              {mfa.backupCodesGenerated ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 inline" />
                              )}
                            </div>
                          </div>
                        </div>

                        {mfa.trustedDevices.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Trusted Devices ({mfa.trustedDevices.length}):</div>
                            <div className="space-y-2">
                              {mfa.trustedDevices.map((device) => (
                                <div key={device.id} className="flex items-center justify-between bg-slate-50 rounded p-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    {device.deviceType === 'desktop' && <Monitor className="h-4 w-4 text-slate-600" />}
                                    {device.deviceType === 'mobile' && <Smartphone className="h-4 w-4 text-slate-600" />}
                                    <span className="font-medium">{device.deviceName}</span>
                                    <span className="text-slate-600">• {device.browser}</span>
                                  </div>
                                  <Button variant="ghost" size="sm">Remove</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Activity Monitoring Tab */}
        <TabsContent value="login" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Login Activity Monitoring</CardTitle>
                  <CardDescription>Real-time tracking of authentication attempts</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search..."
                    className="w-64"
                    value={loginSearch}
                    onChange={(e) => setLoginSearch(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleExportLoginActivity}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingLogin && (
                  <p className="text-sm text-slate-600">Loading login activity…</p>
                )}
                {!loadingLogin && filteredLoginActivities.length === 0 && (
                  <p className="text-sm text-slate-600">No login activity recorded yet.</p>
                )}
                {filteredLoginActivities.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {activity.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        {activity.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                        {activity.status === 'blocked' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        <div>
                          <span className="font-semibold">{activity.userName}</span>
                          <Badge variant="outline" className={`ml-2 ${getStatusColor(activity.status)}`}>
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(new Date(activity.timestamp), 'PPp')}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {activity.device}
                      </div>
                      <div>{activity.browser}</div>
                      <div>{activity.ipAddress ?? '—'}</div>
                    </div>

                    {activity.failureReason && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
                        Failure reason: {activity.failureReason}
                      </div>
                    )}

                    {activity.mfaVerified && (
                      <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                        <Shield className="h-3 w-3" />
                        MFA verified
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comprehensive Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comprehensive Audit Log</CardTitle>
                  <CardDescription>Complete tracking of all system activities</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={auditSeverity} onValueChange={setAuditSeverity}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" disabled={exportingAudit} onClick={handleExportAuditLogs}>
                    <Download className="mr-2 h-4 w-4" />
                    {exportingAudit ? 'Exporting…' : 'Export'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingAudit && (
                  <p className="text-sm text-slate-600">Loading audit logs…</p>
                )}
                {!loadingAudit && auditLogs.length === 0 && (
                  <p className="text-sm text-slate-600">No audit logs recorded yet.</p>
                )}
                {filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    id={`audit-log-${log.id}`}
                    className={`border rounded-lg p-3 ${
                      selectedLog === log.id ? 'border-brand bg-brand/5 ring-2 ring-brand/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{log.userName ?? 'System'}</span>
                          {log.userRole && <Badge variant="outline">{log.userRole}</Badge>}
                          <Badge className={getSeverityColor(log.severity)}>{log.severity}</Badge>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">{log.action}</span> - {log.actionDetails}
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(new Date(log.timestamp), 'PPp')}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>Resource: {log.resourceType}</span>
                      {log.resourceId && <span>ID: {log.resourceId}</span>}
                      <span>IP: {log.ipAddress ?? '—'}</span>
                      <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                    </div>

                    {Array.isArray(log.changes) && log.changes.length > 0 && (
                      <div className="mt-2 bg-slate-50 rounded p-2">
                        <div className="text-sm font-medium mb-1">Changes:</div>
                        {log.changes.map((change, idx) => (
                          <div key={idx} className="text-xs">
                            {change.field}: <span className="text-red-600">{String(change.oldValue)}</span> → <span className="text-green-600">{String(change.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Access Logs Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Access and Modification Logs</CardTitle>
              <CardDescription>Track all document interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentAccessLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-brand" />
                          <span className="font-semibold">{log.documentName}</span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">{log.userName}</span> performed <Badge variant="outline" className="mx-1">{log.action}</Badge>
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(log.timestamp, 'PPp')}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>IP: {log.ipAddress}</span>
                      {log.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Duration: {Math.floor(log.duration / 60)}m {log.duration % 60}s
                        </span>
                      )}
                      {log.accessGrantedBy && (
                        <span>Granted by: {log.accessGrantedBy}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Action Audit Trail Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Action Audit Trail</CardTitle>
              <CardDescription>Track all compliance obligation activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceActionAudits.map((audit) => (
                  <div key={audit.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{audit.obligationTitle}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{audit.action}</Badge>
                          {audit.previousStatus && audit.newStatus && (
                            <>
                              <span className="text-sm text-slate-600">
                                {audit.previousStatus} → {audit.newStatus}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(audit.timestamp, 'PPp')}</span>
                    </div>

                    <div className="text-sm text-slate-600 mb-2">
                      Action by: <span className="font-medium">{audit.userName}</span>
                    </div>

                    {audit.comments && (
                      <div className="bg-slate-50 rounded p-2 text-sm">
                        <span className="font-medium">Comments:</span> {audit.comments}
                      </div>
                    )}

                    {audit.evidenceAttached && audit.evidenceAttached.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium mb-1">Evidence Attached:</div>
                        <div className="flex flex-wrap gap-1">
                          {audit.evidenceAttached.map((file, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{file}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regulatory Update Review Logs Tab */}
        <TabsContent value="regulatory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Update Review Logs</CardTitle>
              <CardDescription>Documentation of regulatory update reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regulatoryReviewLogs.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{review.updateTitle}</h3>
                        <div className="text-sm text-slate-600 mt-1">
                          Reviewed by: <span className="font-medium">{review.reviewedBy}</span>
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(review.reviewedAt, 'PPp')}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-600">Review Duration:</span>
                        <div className="font-medium">{review.reviewDuration} minutes</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Impact Assessed:</span>
                        <div className="font-medium">
                          {review.impactAssessed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 inline" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Users Notified:</span>
                        <div className="font-medium">{review.notifiedUsers.length}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Actions Taken:</div>
                      <div className="flex flex-wrap gap-1">
                        {review.actionsTaken.map((action, idx) => (
                          <Badge key={idx} variant="outline">{action}</Badge>
                        ))}
                      </div>
                    </div>

                    {review.comments && (
                      <div className="bg-slate-50 rounded p-2 text-sm">
                        <span className="font-medium">Comments:</span> {review.comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomaly Detection Alerts Tab */}
        <TabsContent value="anomalies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection & Alerts</CardTitle>
              <CardDescription>Real-time security threat identification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalyDetections.map((anomaly) => (
                  <div key={anomaly.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{anomaly.type.replace(/_/g, ' ').toUpperCase()}</h3>
                          <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity}</Badge>
                          <Badge className={getStatusColor(anomaly.status)}>{anomaly.status}</Badge>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">{anomaly.description}</div>
                        {anomaly.userName && (
                          <div className="text-sm text-slate-600 mt-1">
                            User: <span className="font-medium">{anomaly.userName}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-slate-600">{format(anomaly.detectedAt, 'PPp')}</span>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Indicators:</div>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        {anomaly.indicators.map((indicator, idx) => (
                          <li key={idx}>{indicator}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Affected Resources:</div>
                      <div className="flex flex-wrap gap-1">
                        {anomaly.affectedResources.map((resource, idx) => (
                          <Badge key={idx} variant="outline">{resource}</Badge>
                        ))}
                      </div>
                    </div>

                    {anomaly.assignedTo && (
                      <div className="text-sm text-slate-600">
                        Assigned to: <span className="font-medium">{anomaly.assignedTo}</span>
                      </div>
                    )}

                    {anomaly.resolutionNotes && (
                      <div className="mt-3 bg-green-50 rounded p-2 text-sm">
                        <span className="font-medium">Resolution:</span> {anomaly.resolutionNotes}
                        {anomaly.resolvedAt && (
                          <div className="text-xs text-slate-600 mt-1">
                            Resolved: {format(anomaly.resolvedAt, 'PPp')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention Policy Tab */}
        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Retention Policy Configuration</CardTitle>
                  <CardDescription>Manage data lifecycle and compliance requirements</CardDescription>
                </div>
                <Button>
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataRetentionPolicies.map((policy) => (
                  <div key={policy.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{policy.dataType}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{policy.category}</Badge>
                          <Badge variant="outline">{policy.retentionPeriod.replace('_', ' ')}</Badge>
                          <Badge className={policy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <Switch checked={policy.isActive} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-600">Auto Delete:</span>
                        <div className="font-medium">
                          {policy.autoDelete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 inline" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Archive Before Delete:</span>
                        <div className="font-medium">
                          {policy.archiveBeforeDelete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 inline" />
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Last Reviewed:</span>
                        <div className="font-medium">{format(policy.lastReviewed, 'PP')}</div>
                      </div>
                    </div>

                    {policy.legalRequirement && (
                      <div className="bg-brand/5 rounded p-2 text-sm">
                        <span className="font-medium">Legal Requirement:</span> {policy.legalRequirement}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Incidents Tab */}
        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Incidents</CardTitle>
                  <CardDescription>Track and manage security incidents</CardDescription>
                </div>
                <Button>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Report Incident
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{incident.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{incident.type.replace(/_/g, ' ')}</Badge>
                          <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                          <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                        </div>
                      </div>
                      <span className="text-sm text-slate-600">{format(incident.detectedAt, 'PPp')}</span>
                    </div>

                    <div className="text-sm text-slate-600 mb-3">{incident.description}</div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-600">Reported By:</span>
                        <div className="font-medium">{incident.reportedBy}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Affected Users:</span>
                        <div className="font-medium">{incident.affectedUsers.length}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Affected Systems:</span>
                        <div className="font-medium">{incident.affectedSystems.length}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Mitigation Steps:</div>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        {incident.mitigationSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {incident.resolvedAt && (
                      <div className="bg-green-50 rounded p-2 text-sm">
                        <span className="font-medium">Resolved:</span> {format(incident.resolvedAt, 'PPp')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access-control" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Access Control Rules</CardTitle>
                  <CardDescription>Fine-grained access restrictions and policies</CardDescription>
                </div>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessControls.map((control) => (
                  <div key={control.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{control.resourceType}</h3>
                        <div className="text-sm text-slate-600 mt-1">
                          Resource ID: {control.resourceId}
                        </div>
                        <div className="mt-2">
                          <Badge className={control.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {control.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <Switch checked={control.isActive} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Allowed Roles:</div>
                        <div className="flex flex-wrap gap-1">
                          {control.allowedRoles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="bg-green-50">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {control.allowedUsers && control.allowedUsers.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">Allowed Users:</div>
                          <div className="text-sm text-slate-600">
                            {control.allowedUsers.length} specific user(s)
                          </div>
                        </div>
                      )}

                      {control.ipWhitelist && control.ipWhitelist.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">IP Whitelist:</div>
                          <div className="flex flex-wrap gap-1">
                            {control.ipWhitelist.map((ip, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{ip}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {control.timeRestrictions && (
                        <div>
                          <div className="text-sm font-medium mb-1">Time Restrictions:</div>
                          <div className="text-sm text-slate-600 bg-slate-50 rounded p-2">
                            Days: {control.timeRestrictions.allowedDays.join(', ')} •
                            Hours: {control.timeRestrictions.allowedHours.start} - {control.timeRestrictions.allowedHours.end}
                          </div>
                        </div>
                      )}
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
