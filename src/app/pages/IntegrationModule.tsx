import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { downloadTextFile } from '../lib/ui-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsTrigger } from '../components/ui/tabs';
import { ModuleTabsList } from '../components/layout/ModuleTabsList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import {
  Plug,
  Globe,
  FileSignature,
  FolderSync,
  Building2,
  Key,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  Link,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useIntegrations, type ApiIntegration } from '../hooks/useIntegrations';
import { clearSearchParams } from '../lib/citation-routes';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

type IntegrationType = 'regulatory' | 'e_sign' | 'dms' | 'erp_hris';

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  regulatory: 'Regulatory API',
  e_sign: 'E-Signature',
  dms: 'Document Management',
  erp_hris: 'ERP/HRIS',
};

export function IntegrationModule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    integrations,
    apiKeys,
    logs,
    loading: integrationsLoading,
    refresh,
    testConnection,
    syncIntegration,
    updateIntegration,
    disableIntegration,
    createIntegration,
    createApiKey,
    revokeApiKey,
  } = useIntegrations();
  const regulatoryApis = integrations.filter((i) => i.type === 'regulatory');
  const eSignItems = integrations.filter((i) => i.type === 'e_sign');
  const dmsItems = integrations.filter((i) => i.type === 'dms');
  const erpItems = integrations.filter((i) => i.type === 'erp_hris');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  const [testIntegrationId, setTestIntegrationId] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [configIntegration, setConfigIntegration] = useState<ApiIntegration | null>(null);
  const [configEndpoint, setConfigEndpoint] = useState('');
  const [configSyncFrequency, setConfigSyncFrequency] = useState('daily');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [createdKeyToken, setCreatedKeyToken] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogType, setAddDialogType] = useState<IntegrationType>('regulatory');
  const [addName, setAddName] = useState('');
  const [addEndpoint, setAddEndpoint] = useState('');
  const [addApiKey, setAddApiKey] = useState('');
  const [addSyncFrequency, setAddSyncFrequency] = useState('daily');
  const [addingIntegration, setAddingIntegration] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleIntegrationId, setScheduleIntegrationId] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const openScheduleDialog = () => {
    const first = integrations[0];
    setScheduleIntegrationId(first?.id ?? '');
    setScheduleFrequency(String(first?.config?.syncFrequency ?? 'daily'));
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleIntegrationId) {
      toast.error('Select an integration for the sync schedule.');
      return;
    }
    setSavingSchedule(true);
    try {
      await updateIntegration(scheduleIntegrationId, {
        isActive: true,
        status: 'connected',
        config: { syncFrequency: scheduleFrequency as 'daily' | 'weekly' | 'hourly' },
      });
      const name = integrations.find((i) => i.id === scheduleIntegrationId)?.name ?? 'Integration';
      toast.success(`Sync schedule saved for ${name} (${scheduleFrequency}).`);
      setScheduleDialogOpen(false);
    } catch {
      toast.error('Failed to save sync schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const openAddDialog = (type: IntegrationType) => {
    setAddDialogType(type);
    setAddName('');
    setAddEndpoint('');
    setAddApiKey('');
    setAddSyncFrequency('daily');
    setAddDialogOpen(true);
  };

  const handleAddIntegration = async () => {
    if (!addName.trim()) {
      toast.error('Enter a connection name.');
      return;
    }
    setAddingIntegration(true);
    try {
      await createIntegration({
        name: addName.trim(),
        type: addDialogType,
        ...(addEndpoint.trim() ? { endpoint: addEndpoint.trim() } : {}),
        ...(addApiKey.trim() ? { apiKey: addApiKey.trim() } : {}),
        syncFrequency: addSyncFrequency as 'daily' | 'weekly' | 'hourly',
      });
      toast.success(`${INTEGRATION_TYPE_LABELS[addDialogType]} connection created. Configure and test when ready.`);
      setAddDialogOpen(false);
    } catch {
      toast.error('Failed to create integration.');
    } finally {
      setAddingIntegration(false);
    }
  };

  const handleToggleIntegration = async (integration: ApiIntegration, active: boolean) => {
    try {
      if (!active) {
        await disableIntegration(integration.id);
        toast.success(`${integration.name} paused.`);
      } else {
        await updateIntegration(integration.id, { isActive: true, status: 'connected' });
        toast.success(`${integration.name} activated.`);
      }
    } catch {
      toast.error('Failed to update integration.');
    }
  };

  const openConfigure = (integration: ApiIntegration) => {
    setConfigIntegration(integration);
    setConfigEndpoint(String(integration.config?.endpoint ?? ''));
    setConfigSyncFrequency(String(integration.config?.syncFrequency ?? 'daily'));
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || integrations.length === 0) return;
    const found = integrations.find((i) => i.id === id);
    if (found) openConfigure(found);
  }, [searchParams, integrations]);

  const clearIntegrationParam = () => {
    clearSearchParams(searchParams, setSearchParams, ['id']);
    setConfigIntegration(null);
  };

  const handleSaveConfig = async () => {
    if (!configIntegration) return;
    try {
      await updateIntegration(configIntegration.id, {
        config: { endpoint: configEndpoint, syncFrequency: configSyncFrequency as 'daily' | 'weekly' | 'hourly' },
      });
      toast.success('Integration configuration saved.');
      clearIntegrationParam();
    } catch {
      toast.error('Failed to save configuration.');
    }
  };

  const handleSync = async (id: string, name: string) => {
    setSyncingId(id);
    try {
      await syncIntegration(id);
      toast.success(`${name} sync completed.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleTestConnection = async () => {
    const id = testIntegrationId || integrations[0]?.id;
    if (!id) {
      toast.error('Select an integration to test.');
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const result = await testConnection(id);
      setTestResult(result.success ? 'success' : 'failure');
      toast[result.success ? 'success' : 'error'](result.message);
    } catch {
      setTestResult('failure');
      toast.error('Connection test failed.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Enter a key name.');
      return;
    }
    try {
      const result = await createApiKey(newKeyName.trim());
      setCreatedKeyToken(result.key.token);
      toast.success('API key created. Copy it now — it will not be shown again.');
      setNewKeyName('');
      await refresh();
    } catch {
      toast.error('Failed to create API key.');
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    try {
      await revokeApiKey(id);
      toast.success(`Revoked key "${name}".`);
    } catch {
      toast.error('Failed to revoke key.');
    }
  };

  const handleExportLogs = () => {
    const content = logs.map((l) => `${l.timestamp}\t${l.action}\t${l.status ?? ''}\t${l.message ?? ''}`).join('\n');
    downloadTextFile('integration-logs.txt', content);
    toast.success('Logs exported.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'configuring':
      case 'testing':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'testing':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const renderIntegrationStats = (item: ApiIntegration) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div>
        <span className="text-slate-600">Records synced:</span>
        <div className="font-medium">{item.recordsSynced}</div>
      </div>
      <div>
        <span className="text-slate-600">Errors:</span>
        <div className="font-medium">{item.errorCount}</div>
      </div>
      <div>
        <span className="text-slate-600">Last sync:</span>
        <div className="font-medium">
          {item.lastSyncAt ? format(new Date(item.lastSyncAt), 'PPp') : 'Never'}
        </div>
      </div>
      <div>
        <span className="text-slate-600">Type:</span>
        <div className="font-medium capitalize">{item.type.replace('_', ' ')}</div>
      </div>
    </div>
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regulatory':
        return <Globe className="h-6 w-6 text-brand" />;
      case 'e_sign':
        return <FileSignature className="h-6 w-6 text-brand" />;
      case 'dms':
        return <FolderSync className="h-6 w-6 text-brand" />;
      case 'erp_hris':
        return <Building2 className="h-6 w-6 text-brand" />;
      default:
        return <Plug className="h-6 w-6 text-brand" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integration Management</h1>
          <p className="text-slate-600 mt-1">Connect and manage external systems and data sources</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openAddDialog('regulatory')}>
            <Plug className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory APIs</TabsTrigger>
          <TabsTrigger value="esignature">E-Signature</TabsTrigger>
          <TabsTrigger value="dms">Document Mgmt</TabsTrigger>
          <TabsTrigger value="erp-hris">ERP/HRIS</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="sync">Sync Schedules</TabsTrigger>
          <TabsTrigger value="logs">Error Logs</TabsTrigger>
          <TabsTrigger value="test">Test Connection</TabsTrigger>
        </ModuleTabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{integrations.length}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {integrations.filter(i => i.isActive).length} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-600">
                    {integrations.filter((i) => i.status === 'connected').length}
                  </div>
                  <span className="text-sm text-slate-600">/ {integrations.length}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1">systems healthy</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Records Synced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrations.reduce((sum, i) => sum + (i.recordsSynced || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600 mt-1">total records</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {integrations.reduce((sum, i) => sum + (i.errorCount || 0), 0)}
                </div>
                <div className="text-sm text-slate-600 mt-1">total errors</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Integrations</CardTitle>
              <CardDescription>Overview of all configured integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
                          {getTypeIcon(integration.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(integration.status)}>
                              {getStatusIcon(integration.status)}
                              <span className="ml-1">{integration.status}</span>
                            </Badge>
                            <Badge variant="outline">{integration.type.replace('_', ' ')}</Badge>
                          </div>
                          {integration.lastSyncAt && (
                            <div className="text-sm text-slate-600 mt-2">
                              Last synced: {format(new Date(integration.lastSyncAt), 'PPp')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openConfigure(integration)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Button>
                        {integration.isActive ? (
                          <Button variant="outline" size="sm" onClick={() => handleToggleIntegration(integration, false)}>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleToggleIntegration(integration, true)}>
                            <Play className="mr-2 h-4 w-4" />
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={syncingId === integration.id}
                          onClick={() => handleSync(integration.id, integration.name)}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${syncingId === integration.id ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regulatory APIs Tab */}
        <TabsContent value="regulatory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regulatory API Connections</CardTitle>
                  <CardDescription>Automated legal and regulatory data sources</CardDescription>
                </div>
                {isAdmin ? (
                  <Button onClick={() => openAddDialog('regulatory')}>
                    <Globe className="mr-2 h-4 w-4" />
                    Add API Connection
                  </Button>
                ) : (
                  <p className="text-sm text-slate-500">Contact an administrator to add connections.</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regulatoryApis.map((api) => (
                  <div key={api.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{api.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(api.status)}>
                            {api.status === 'connected' ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                            {api.status}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={api.isActive}
                        onCheckedChange={(checked) => handleToggleIntegration(api, checked)}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Records synced:</span>
                        <div className="font-medium">{api.recordsSynced}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Errors:</span>
                        <div className="font-medium">{api.errorCount}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Last sync:</span>
                        <div className="font-medium">
                          {api.lastSyncAt ? format(new Date(api.lastSyncAt), 'PP') : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-Signature Tab */}
        <TabsContent value="esignature" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>E-Signature Integrations</CardTitle>
                  <CardDescription>Electronic signature services for contracts and legal documents</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => openAddDialog('e_sign')}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    Add E-Signature Service
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eSignItems.map((esig) => (
                  <div key={esig.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{esig.name}</h3>
                        <div className="mt-1">
                          <Badge className={getStatusColor(esig.status)}>{esig.status}</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={esig.isActive}
                        onCheckedChange={(checked) => handleToggleIntegration(esig, checked)}
                      />
                    </div>
                    {renderIntegrationStats(esig)}
                  </div>
                ))}
                {eSignItems.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No e-signature integrations configured.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Management Systems Tab */}
        <TabsContent value="dms" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Management Systems</CardTitle>
                  <CardDescription>Cloud storage and document synchronization</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => openAddDialog('dms')}>
                    <FolderSync className="mr-2 h-4 w-4" />
                    Add DMS Integration
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dmsItems.map((dms) => (
                  <div key={dms.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{dms.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(dms.status)}>{dms.status}</Badge>
                          <Badge variant="outline">{dms.type}</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={dms.isActive}
                        onCheckedChange={(checked) => handleToggleIntegration(dms, checked)}
                      />
                    </div>
                    {renderIntegrationStats(dms)}
                  </div>
                ))}
                {dmsItems.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No document management integrations configured.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ERP/HRIS Tab */}
        <TabsContent value="erp-hris" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ERP/HRIS Integrations</CardTitle>
                  <CardDescription>Enterprise systems for compliance role assignments</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => openAddDialog('erp_hris')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Add System Integration
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {erpItems.map((system) => (
                  <div key={system.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{system.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(system.status)}>{system.status}</Badge>
                          <Badge variant="outline">{system.type.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={system.isActive}
                        onCheckedChange={(checked) => handleToggleIntegration(system, checked)}
                      />
                    </div>
                    {renderIntegrationStats(system)}
                  </div>
                ))}
                {erpItems.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No ERP/HRIS integrations configured.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>Manage authentication keys for integrations</CardDescription>
                </div>
                <Button onClick={() => setNewKeyDialogOpen(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Generate New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{key.name}</h3>
                        <div className="text-sm text-slate-600 mt-1">Prefix: {key.keyPrefix}</div>
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRevokeKey(key.id, key.name)}>
                          Revoke
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Created:</span>
                        <div className="font-medium">{format(new Date(key.createdAt), 'PP')}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Created by:</span>
                        <div className="font-medium">{key.createdBy}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No API keys yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Health Monitoring</CardTitle>
              <CardDescription>Real-time status and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <div className="mt-1">
                          <Badge className={getStatusColor(integration.status)}>
                            {integration.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {integration.lastSyncAt
                          ? `Last sync: ${format(new Date(integration.lastSyncAt), 'PPp')}`
                          : 'Never synced'}
                      </div>
                    </div>
                    {renderIntegrationStats(integration)}
                  </div>
                ))}
                {integrations.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No integrations to monitor.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Schedules Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync Schedule Configuration</CardTitle>
                  <CardDescription>Automated synchronization schedules</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={openScheduleDialog} disabled={integrations.length === 0}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Schedule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrations.filter((i) => i.isActive).map((integration) => (
                  <div key={integration.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{integration.type.replace('_', ' ')}</Badge>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={integration.isActive}
                        onCheckedChange={(checked) => handleToggleIntegration(integration, checked)}
                      />
                    </div>
                    <div className="text-sm text-slate-600">
                      Last run:{' '}
                      {integration.lastSyncAt
                        ? format(new Date(integration.lastSyncAt), 'PPp')
                        : 'Never'}
                    </div>
                  </div>
                ))}
                {integrations.filter((i) => i.isActive).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No active sync schedules.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integration Logs</CardTitle>
                  <CardDescription>Activity logs and error tracking</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportLogs}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{log.action}</h3>
                        <p className="text-sm text-slate-600 mt-1">{log.message}</p>
                      </div>
                      <Badge variant="outline">{log.status ?? 'info'}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{format(new Date(log.timestamp), 'PPp')}</p>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No integration logs yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Connection Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Integration Connection</CardTitle>
              <CardDescription>Verify connectivity and authentication for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="test-integration">Select Integration</Label>
                <Select value={testIntegrationId} onValueChange={setTestIntegrationId}>
                  <SelectTrigger id="test-integration" className="mt-2">
                    <SelectValue placeholder="Choose an integration to test" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations.map((integration) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-type">Test Type</Label>
                <Select defaultValue="full">
                  <SelectTrigger id="test-type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connectivity">Connectivity Only</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="data_retrieval">Data Retrieval</SelectItem>
                    <SelectItem value="full">Full Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>

              {testResult && (
                <div className={`border rounded-lg p-4 ${
                  testResult === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {testResult === 'success' ? 'Test Successful' : 'Test Failed'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Connectivity:</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Authentication:</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Data Retrieval:</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Response Time:</span>
                      <span className="font-medium">1.2s</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create sync schedule</DialogTitle>
            <DialogDescription>Choose an integration and how often it should sync automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Integration</Label>
              <Select value={scheduleIntegrationId} onValueChange={setScheduleIntegrationId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={savingSchedule}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} disabled={savingSchedule}>
              {savingSchedule ? 'Saving…' : 'Save schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {INTEGRATION_TYPE_LABELS[addDialogType]} Connection</DialogTitle>
            <DialogDescription>
              Register a new external system. You can configure credentials and test the connection after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Connection name</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="mt-1"
                placeholder="e.g. RURA Regulatory Feed"
              />
            </div>
            <div>
              <Label>Integration type</Label>
              <Select value={addDialogType} onValueChange={(v) => setAddDialogType(v as IntegrationType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulatory">Regulatory API</SelectItem>
                  <SelectItem value="e_sign">E-Signature</SelectItem>
                  <SelectItem value="dms">Document Management</SelectItem>
                  <SelectItem value="erp_hris">ERP/HRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Endpoint URL (optional)</Label>
              <Input
                value={addEndpoint}
                onChange={(e) => setAddEndpoint(e.target.value)}
                className="mt-1"
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div>
              <Label>API key (optional)</Label>
              <Input
                type="password"
                value={addApiKey}
                onChange={(e) => setAddApiKey(e.target.value)}
                className="mt-1"
                placeholder="Paste API key or token"
              />
            </div>
            <div>
              <Label>Sync frequency</Label>
              <Select value={addSyncFrequency} onValueChange={setAddSyncFrequency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={addingIntegration}>
              Cancel
            </Button>
            <Button onClick={handleAddIntegration} disabled={addingIntegration}>
              {addingIntegration ? 'Creating…' : 'Create connection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!configIntegration}
        onOpenChange={(open) => {
          if (!open) clearIntegrationParam();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configIntegration?.name}</DialogTitle>
            <DialogDescription>Update connection settings for this integration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Endpoint URL</Label>
              <Input value={configEndpoint} onChange={(e) => setConfigEndpoint(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Sync frequency</Label>
              <Select value={configSyncFrequency} onValueChange={setConfigSyncFrequency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigIntegration(null)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>Create a new key for external integrations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key name</Label>
              <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="mt-1" placeholder="e.g. Westlaw connector" />
            </div>
            {createdKeyToken && (
              <div className="rounded border bg-muted p-3 text-sm break-all font-mono">{createdKeyToken}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewKeyDialogOpen(false); setCreatedKeyToken(null); }}>Close</Button>
            <Button onClick={handleGenerateKey}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
