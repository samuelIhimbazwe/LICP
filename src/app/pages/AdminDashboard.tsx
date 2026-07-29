import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { StatGrid } from '../components/dashboard/StatCard';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { StatusBadge, CHART, chartTooltipStyle } from '../lib/statusBadges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
  Users, Activity, Database, Settings, TrendingUp, AlertCircle,
  CheckCircle2, FileText, Server, Plus, RefreshCw, Download,
  Plug, Shield, HardDrive, Cpu, Wifi, Clock, UserPlus, Trash2,
  Eye, Edit
} from 'lucide-react';
import { userActivityData } from '../data/mockData';
import { useDashboard } from '../hooks/useDashboard';
import { downloadCsv, apiRequest } from '../lib/api';
import { downloadJsonFile } from '../lib/ui-actions';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useIntegrations } from '../hooks/useIntegrations';
import { formatDistanceToNow } from 'date-fns';

const serverMetrics = [
  { time: '00:00', cpu: 32, memory: 65, requests: 120 },
  { time: '04:00', cpu: 28, memory: 62, requests: 85 },
  { time: '08:00', cpu: 65, memory: 74, requests: 340 },
  { time: '12:00', cpu: 78, memory: 80, requests: 520 },
  { time: '16:00', cpu: 72, memory: 77, requests: 480 },
  { time: '20:00', cpu: 58, memory: 71, requests: 310 },
  { time: 'Now', cpu: 45, memory: 68, requests: 220 },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
  const [savingControls, setSavingControls] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ type: string; message: string; time: string; severity: string }>>([]);
  const { data, loading, refresh } = useDashboard();
  const { integrations: apiIntegrations, syncIntegration, testConnection, refresh: refreshIntegrations } = useIntegrations();

  const integrations = (apiIntegrations.length > 0 ? apiIntegrations : []).map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    status: i.status === 'active' ? 'connected' : i.status === 'error' ? 'disconnected' : i.status === 'paused' ? 'warning' : 'disconnected',
    lastSync: i.lastSyncAt ? formatDistanceToNow(new Date(i.lastSyncAt), { addSuffix: true }) : 'Never',
    requests: 0,
    icon: '🔌',
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await apiRequest<{ settings: { maintenanceMode?: boolean; debugLogging?: boolean } }>('/org/settings');
        if (!cancelled) {
          setMaintenanceMode(Boolean(settings.settings.maintenanceMode));
          setDebugLogging(Boolean(settings.settings.debugLogging));
        }
      } catch {
        // keep defaults
      }
      try {
        const logs = await apiRequest<{ logs: Array<{ action: string; actionDetails: string; timestamp: string; severity: string; status: string }> }>('/audit/logs');
        if (!cancelled) {
          setAuditLogs(
            (logs.logs ?? []).slice(0, 12).map((l) => ({
              type: l.status === 'failed' ? 'error' : l.severity === 'warning' ? 'warning' : l.severity === 'critical' ? 'error' : 'info',
              message: l.actionDetails || l.action,
              time: new Date(l.timestamp).toLocaleString(),
              severity: l.severity,
            }))
          );
        }
      } catch {
        // keep empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSystemControls = async (next: { maintenanceMode?: boolean; debugLogging?: boolean }) => {
    setSavingControls(true);
    try {
      const current = await apiRequest<{ settings: Record<string, unknown> }>('/org/settings');
      await apiRequest('/org/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...current.settings,
          maintenanceMode: next.maintenanceMode ?? maintenanceMode,
          debugLogging: next.debugLogging ?? debugLogging,
        }),
      });
      toast.success('System controls saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save system controls.');
    } finally {
      setSavingControls(false);
    }
  };

  const statsData = data?.stats as {
    totalUsers?: number;
    activeUsers?: number;
    systemHealth?: number;
    pendingInvitations?: number;
  } | undefined;

  const apiRecentUsers = (data?.recentUsers as Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joined: string;
  }> | undefined) ?? [];

  const handleBackupExport = async (label: string) => {
    try {
      if (label === 'Audit Log Archive' || label === 'Full Backup') {
        await downloadCsv('/audit/logs/export', 'audit-log.csv');
        toast.success(`${label} downloaded.`);
        return;
      }
      const payload = {
        generatedAt: new Date().toISOString(),
        label,
        stats: statsData,
        integrations,
        recentUsers: apiRecentUsers,
      };
      downloadJsonFile(`licp-${label.toLowerCase().replace(/\s+/g, '-')}.json`, payload);
      toast.success(`${label} exported.`);
    } catch {
      toast.error(`Failed to export ${label}.`);
    }
  };

  const totalUsers = statsData?.totalUsers ?? 156;
  const activeUsers = statsData?.activeUsers ?? 142;
  const systemHealth = statsData?.systemHealth ?? 98.5;

  const usersByRole = [
    { role: 'Legal Practitioners', count: 45, color: CHART.primary },
    { role: 'Compliance Officers', count: 38, color: CHART.secondary },
    { role: 'Managers', count: 52, color: CHART.tertiary },
    { role: 'Admins', count: 21, color: CHART.muted },
  ];

  const systemMetrics = [
    { metric: 'API Response Time', value: '145ms', status: 'good', progress: 85 },
    { metric: 'Database Performance', value: '99.2%', status: 'good', progress: 99 },
    { metric: 'Storage Usage', value: '67%', status: 'warning', progress: 67 },
    { metric: 'Cache Hit Rate', value: '94%', status: 'good', progress: 94 },
  ];

  const contentStats = [
    { label: 'Total Regulations', count: 2847 },
    { label: 'Documents', count: 15234 },
    { label: 'Cases', count: 892 },
    { label: 'Alerts', count: 156 },
  ];

  const getIntegrationBadge = (status: string) => <StatusBadge status={status} />;

  const getLogBadge = (severity: string) => (
    <StatusBadge status={severity.toLowerCase()} label={severity} />
  );

  const stats = [
    { label: 'Total users', value: totalUsers, hint: '+12.5% from last month', icon: Users },
    { label: 'Active users', value: activeUsers, hint: `${Math.round((activeUsers / totalUsers) * 100)}% of total`, icon: Activity },
    { label: 'System health', value: `${systemHealth}%`, hint: 'All systems operational', icon: Server },
    { label: 'Integrations', value: `${integrations.filter(i => i.status === 'connected').length}/${integrations.length}`, hint: `${integrations.filter(i => i.status !== 'connected').length} need attention`, icon: Plug },
  ];

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}
      <StatGrid stats={stats} />

      <QuickActionsBar
        actions={[
          { label: 'Add user', icon: UserPlus, primary: true, onClick: () => navigate('/user-management') },
          { label: 'System settings', icon: Settings, onClick: () => navigate('/system-settings') },
          { label: 'View logs', icon: FileText, onClick: () => navigate('/security') },
          { label: 'Refresh data', icon: RefreshCw, onClick: () => { refresh(); toast.success('Dashboard refreshed.'); } },
        ]}
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="integrations">
            Integrations
            {integrations.some(i => i.status !== 'connected') && (
              <Badge variant="outline" className="ml-2 text-[11px]">
                {integrations.filter(i => i.status !== 'connected').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Platform Settings</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Role</CardTitle>
                <CardDescription>Breakdown of users across different roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usersByRole.map((item) => (
                    <div key={item.role}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{item.role}</span>
                        <span className="text-sm font-bold">{item.count}</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`absolute left-0 top-0 h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${(item.count / totalUsers) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-sm text-slate-600">Total: {totalUsers} users</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recently Added Users</CardTitle>
                    <CardDescription>Latest user account creations</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => navigate('/user-management')}>
                    <UserPlus className="mr-2 h-4 w-4" />Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apiRecentUsers.length === 0 && (
                    <p className="text-sm text-slate-500">No recent users found.</p>
                  )}
                  {apiRecentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-brand/10 text-brand text-xs font-semibold">
                            {user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-slate-600">{user.email}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{user.role} • Joined {user.joined}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => navigate('/user-management')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Activity Trends</CardTitle>
              <CardDescription>Daily user engagement metrics over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userActivityData}>
                  <defs>
                    <linearGradient id="activityLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="activityDocuments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.secondary} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART.secondary} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="activitySearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.tertiary} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={CHART.tertiary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    {...chartTooltipStyle()}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="logins" stroke={CHART.primary} fill="url(#activityLogins)" strokeWidth={2} name="Logins" />
                  <Area type="monotone" dataKey="documents" stroke={CHART.secondary} fill="url(#activityDocuments)" strokeWidth={2} name="Documents" />
                  <Area type="monotone" dataKey="searches" stroke={CHART.tertiary} fill="url(#activitySearches)" strokeWidth={2} name="Searches" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'CPU Usage', value: '45%', icon: Cpu, color: 'text-brand', progress: 45, status: 'good' },
              { label: 'Memory', value: '68%', icon: HardDrive, color: 'text-purple-600', progress: 68, status: 'good' },
              { label: 'Network I/O', value: '220 req/s', icon: Wifi, color: 'text-green-600', progress: 44, status: 'good' },
              { label: 'Uptime', value: '99.9%', icon: Clock, color: 'text-orange-600', progress: 99, status: 'good' },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 mb-3">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <Progress value={metric.progress} className="mt-2 h-1.5" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Server Performance (24h)</CardTitle>
                  <CardDescription>CPU, memory, and request throughput over time</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => { refresh(); toast.success('Metrics refreshed.'); }}>
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={serverMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="CPU %" />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Memory %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Performance Metrics</CardTitle>
                <CardDescription>Real-time system health indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemMetrics.map((metric) => (
                    <div key={metric.metric}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{metric.value}</span>
                          {metric.status === 'good'
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <AlertCircle className="h-4 w-4 text-yellow-600" />}
                        </div>
                      </div>
                      <Progress value={metric.progress}
                        className={metric.status === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Statistics</CardTitle>
                <CardDescription>Platform content overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {contentStats.map((stat) => (
                    <div key={stat.label} className="p-4 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-brand">{stat.count.toLocaleString()}</div>
                      <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/knowledge-base')}>
                  <FileText className="mr-2 h-4 w-4" />Manage Content
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Event Log</CardTitle>
                  <CardDescription>Latest system activity and alerts</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await downloadCsv('/audit/logs/export', 'system-event-log.csv');
                      toast.success('Event log exported.');
                    } catch {
                      toast.error('Failed to export event log.');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.length === 0 && (
                  <p className="text-sm text-slate-500">No recent system events.</p>
                )}
                {auditLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${getLogColor(log.type)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-slate-500">{log.time}</p>
                    </div>
                    {getLogBadge(log.severity)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integration Status</CardTitle>
                  <CardDescription>Connected third-party services and APIs</CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate('/integrations')}>
                  <Plus className="mr-2 h-4 w-4" />Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No integrations configured yet.</p>
                )}
                {integrations.map((integration) => (
                  <div key={integration.id} className={`p-4 border rounded-lg ${integration.status === 'disconnected' ? 'border-red-200 bg-red-50' : integration.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{integration.name}</h4>
                            {getIntegrationBadge(integration.status)}
                          </div>
                          <p className="text-xs text-slate-500">{integration.type}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                            <span>Last sync: {integration.lastSync}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {integration.status !== 'connected' && (
                          <Button
                            size="sm"
                            className="bg-brand hover:bg-brand/90"
                            onClick={async () => {
                              try {
                                const test = await testConnection(integration.id);
                                if (!test.success) {
                                  toast.error(test.message || 'Connection test failed.');
                                  await refreshIntegrations();
                                  return;
                                }
                                await syncIntegration(integration.id);
                                await refreshIntegrations();
                                toast.success(`${integration.name} reconnected.`);
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : 'Reconnect failed.');
                              }
                            }}
                          >
                            Reconnect
                          </Button>
                        )}
                        {integration.status === 'connected' && (
                          <Button size="sm" variant="outline" onClick={() => navigate('/integrations')}>
                            Configure
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate('/integrations')}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Controls</CardTitle>
                <CardDescription>Platform-wide configuration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Maintenance Mode</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Disable platform access for all non-admin users</p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    disabled={savingControls}
                    onCheckedChange={async (checked) => {
                      setMaintenanceMode(checked);
                      await persistSystemControls({ maintenanceMode: checked });
                    }}
                  />
                </div>
                {maintenanceMode && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Maintenance mode is active. Only admins can access the platform.
                  </div>
                )}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Debug Logging</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Enable verbose logging for troubleshooting</p>
                  </div>
                  <Switch
                    checked={debugLogging}
                    disabled={savingControls}
                    onCheckedChange={async (checked) => {
                      setDebugLogging(checked);
                      await persistSystemControls({ debugLogging: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">MFA Required for All Users</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Force multi-factor authentication globally</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Automated Compliance Alerts</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Send automatic email alerts for overdue items</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Session Timeout (30 min)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Auto-logout inactive sessions after 30 minutes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup & Recovery</CardTitle>
                <CardDescription>System backup status and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Last Backup Successful</span>
                  </div>
                  <p className="text-sm text-green-800">June 6, 2026 at 2:00 AM</p>
                  <p className="text-xs text-green-700 mt-1">Next scheduled: June 7, 2026 at 2:00 AM</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Database Backup', lastRun: '6 hours ago', frequency: 'Daily', status: 'success' },
                    { label: 'File Storage Backup', lastRun: '6 hours ago', frequency: 'Daily', status: 'success' },
                    { label: 'Configuration Backup', lastRun: '2 days ago', frequency: 'Weekly', status: 'success' },
                    { label: 'Audit Log Archive', lastRun: '1 day ago', frequency: 'Daily', status: 'success' },
                  ].map((backup) => (
                    <div key={backup.label} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{backup.label}</p>
                        <p className="text-xs text-slate-500">Last: {backup.lastRun} • {backup.frequency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleBackupExport(backup.label)}
                        >
                          Run Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleBackupExport('Full Backup')}
                >
                  <Download className="mr-2 h-4 w-4" />Download Full Backup
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Authentication and access control configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Password Policy', value: '12 char min, MFA required', icon: Shield, status: 'Enforced' },
                  { label: 'IP Allowlist', value: '15 trusted IP ranges', icon: Wifi, status: 'Active' },
                  { label: 'Session Security', value: '30 min idle timeout', icon: Clock, status: 'Enabled' },
                ].map((setting) => (
                  <div key={setting.label} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <setting.icon className="h-5 w-5 text-brand" />
                      <h4 className="font-semibold text-sm">{setting.label}</h4>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{setting.value}</p>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">{setting.status}</Badge>
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
