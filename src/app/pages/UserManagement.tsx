import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import {
  Users,
  UserPlus,
  Shield,
  Activity,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Settings,
  Building,
  FileText,
  AlertCircle,
  Monitor,
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { InviteUserDialog } from '../components/user/InviteUserDialog';
import { apiRequest, downloadCsv, API_BASE } from '../lib/api';
import { parseBulkUserCsv, downloadBulkUserTemplate } from '../lib/ui-actions';
import { toast } from 'sonner';
import { clearSearchParams } from '../lib/citation-routes';

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  lastLogin?: string;
  permissions: {
    modules: Record<string, string>;
    actions: Record<string, boolean>;
  };
}

interface ApiSession {
  id: string;
  userId: string;
  userName: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  loginTime: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
}

interface BulkImportJob {
  id: string;
  fileName: string;
  status: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  errors?: Array<{ row: number; field: string; error: string }>;
}

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', role: 'legal_practitioner' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selectedImport, setSelectedImport] = useState<BulkImportJob | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const headerBulkFileRef = useRef<HTMLInputElement>(null);
  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    userName: string;
    action: string;
    timestamp: string;
    targetName: string;
    targetType: string;
    ipAddress?: string;
  }>>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [orgUnits, setOrgUnits] = useState<Array<{
    id: string;
    name: string;
    type: string;
    userCount: number;
    parentId: string | null;
    managerName?: string;
    createdAt: string;
  }>>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<Array<{
    roleId: string;
    roleName: string;
    description: string;
    userCount: number;
    isCustom: boolean;
    permissions: ApiUser['permissions'];
  }>>([]);
  const [platformActivities, setPlatformActivities] = useState<Array<{
    id: string;
    userName: string;
    action: string;
    description: string;
    module: string;
    resourceType?: string;
    timestamp: string;
  }>>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [accessRequests, setAccessRequests] = useState<
    Array<{
      id: string;
      requesterName: string;
      status: string;
      requestedRole?: string;
      requestedModules?: string[];
      justification: string;
      createdAt: string;
      reviewedBy?: string;
      reviewedAt?: string;
      reviewComments?: string;
    }>
  >([]);
  const [bulkImports, setBulkImports] = useState<BulkImportJob[]>([]);
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(true);
  const [loadingBulkImports, setLoadingBulkImports] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await apiRequest<{ users: ApiUser[] }>('/users');
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await apiRequest<{ sessions: ApiSession[] }>('/auth/sessions');
      setSessions(data.sessions);
    } catch {
      toast.error('Failed to load active sessions.');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await apiRequest<{ logs: Array<Record<string, string>> }>('/audit/logs?limit=50');
      setAuditLogs(
        (data.logs ?? []).map((log) => ({
          id: log.id,
          userName: log.userName ?? 'System',
          action: log.action ?? 'unknown',
          timestamp: log.timestamp,
          targetName: log.resource ?? log.resourceId ?? '—',
          targetType: log.resourceType ?? 'resource',
          ipAddress: log.ipAddress,
        }))
      );
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  const loadLoginActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const data = await apiRequest<{ activities: Array<Record<string, string>> }>(
        '/users/activity?limit=50'
      );
      setPlatformActivities(
        (data.activities ?? []).map((a) => ({
          id: a.id,
          userName: a.userName ?? 'Unknown',
          action: a.action ?? 'action',
          description: a.description ?? '',
          timestamp: a.timestamp,
          module: a.module ?? 'system',
          resourceType: a.resourceType,
        }))
      );
    } catch {
      setPlatformActivities([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const loadOrgStructure = useCallback(async () => {
    setLoadingOrg(true);
    try {
      const data = await apiRequest<{ units: typeof orgUnits }>('/users/org-structure');
      setOrgUnits(data.units ?? []);
    } catch {
      setOrgUnits([]);
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  const loadPermissionMatrix = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const data = await apiRequest<{ matrix: typeof permissionMatrix }>('/users/permissions-matrix');
      setPermissionMatrix(data.matrix ?? []);
    } catch {
      setPermissionMatrix([]);
    } finally {
      setLoadingMatrix(false);
    }
  }, []);

  const loadAccessRequests = useCallback(async () => {
    setLoadingAccessRequests(true);
    try {
      const data = await apiRequest<{ requests: typeof accessRequests }>('/users/access-requests');
      setAccessRequests(
        (data.requests ?? []).map((r) => ({
          ...r,
          requestedModules: Array.isArray(r.requestedModules) ? r.requestedModules : [],
        }))
      );
    } catch {
      setAccessRequests([]);
    } finally {
      setLoadingAccessRequests(false);
    }
  }, []);

  const loadBulkImports = useCallback(async () => {
    setLoadingBulkImports(true);
    try {
      const data = await apiRequest<{ imports: typeof bulkImports }>('/users/bulk-imports');
      setBulkImports(data.imports ?? []);
    } catch {
      setBulkImports([]);
    } finally {
      setLoadingBulkImports(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadSessions();
    loadAuditLogs();
    loadLoginActivity();
    loadOrgStructure();
    loadPermissionMatrix();
    loadAccessRequests();
    loadBulkImports();
  }, [loadUsers, loadSessions, loadAuditLogs, loadLoginActivity, loadOrgStructure, loadPermissionMatrix, loadAccessRequests, loadBulkImports]);

  const handleExportAudit = () => {
    window.open(`${API_BASE}/audit/logs/export`, '_blank');
  };

  const handleExportUsers = async () => {
    try {
      await downloadCsv('/users/export', 'users-export.csv');
      toast.success('Users exported.');
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSessionId(sessionId);
    try {
      await apiRequest(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
      toast.success('Session terminated.');
      await loadSessions();
    } catch {
      toast.error('Failed to terminate session.');
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const handleUserStatusChange = async (userId: string, status: 'active' | 'suspended') => {
    try {
      await apiRequest(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'suspended' ? 'User suspended.' : 'User reactivated.');
      await loadUsers();
    } catch {
      toast.error('Failed to update user status.');
    }
  };

  const handleAccessRequestReview = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/users/access-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewComments: status === 'approved' ? 'Approved by admin' : 'Rejected by admin' }),
      });
      toast.success(status === 'approved' ? 'Access request approved.' : 'Access request rejected.');
      await loadAccessRequests();
    } catch {
      toast.error('Failed to update access request.');
    }
  };

  const handleBulkImportFile = async (file: File) => {
    setBulkImporting(true);
    try {
      const text = await file.text();
      const rows = parseBulkUserCsv(text);
      if (rows.length === 0) {
        toast.error('No valid rows found in CSV.');
        return;
      }
      await apiRequest('/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, rows }),
      });
      toast.success(`Imported ${rows.length} user(s).`);
      await loadBulkImports();
      await loadUsers();
    } catch {
      toast.error('Bulk import failed.');
    } finally {
      setBulkImporting(false);
    }
  };

  const openEditUser = (user: ApiUser) => {
    setEditingUser(user);
    setEditForm({ fullName: user.fullName, phone: user.phone || '', role: user.role });
    setEditDialogOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await apiRequest(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      toast.success('User updated.');
      setEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch {
      toast.error('Failed to update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && users.some((u) => u.id === userId)) {
      setSelectedUser(userId);
    }
  }, [searchParams, users]);

  const clearUserParam = () => {
    clearSearchParams(searchParams, setSearchParams, ['user']);
    setSelectedUser(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'deactivated': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-brand/10 text-brand border-brand/20';
      case 'legal_practitioner': return 'bg-green-100 text-green-800 border-green-200';
      case 'compliance_officer': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissionLevel = (level: string) => {
    switch (level) {
      case 'full': return <Badge className="bg-green-100 text-green-800">Full</Badge>;
      case 'edit': return <Badge className="bg-brand/10 text-brand">Edit</Badge>;
      case 'view': return <Badge className="bg-yellow-100 text-yellow-800">View</Badge>;
      case 'none': return <Badge className="bg-gray-100 text-gray-800">None</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User & Access Management</h1>
          <p className="text-slate-600 mt-1">Manage users, roles, permissions, and access control</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={headerBulkFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleBulkImportFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" onClick={() => headerBulkFileRef.current?.click()} disabled={bulkImporting}>
            <Upload className="mr-2 h-4 w-4" />
            Import Users
          </Button>
          <Button onClick={() => setInviteUserDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
          <InviteUserDialog
            open={inviteUserDialogOpen}
            onOpenChange={setInviteUserDialogOpen}
            onInvited={loadUsers}
          />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="access-requests">Access Requests</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStatusFilter((s) => (s === 'all' ? 'active' : s === 'active' ? 'suspended' : 'all'))}
                    title={`Filter: ${statusFilter}`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingUsers && (
                  <p className="text-sm text-slate-600">Loading users…</p>
                )}
                {!loadingUsers && filteredUsers.length === 0 && (
                  <p className="text-sm text-slate-600">No users found.</p>
                )}
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-brand" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{user.fullName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                            <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                            {user.mfaEnabled && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <Shield className="mr-1 h-3 w-3" />
                                MFA
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-slate-600 space-y-1">
                            <div>{user.email}</div>
                            {user.phone && <div>{user.phone}</div>}
                            {user.lastLogin && (
                              <div>Last login: {format(new Date(user.lastLogin), 'PPp')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog
                          open={selectedUser === user.id}
                          onOpenChange={(open) => {
                            if (!open) clearUserParam();
                            else setSelectedUser(user.id);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{user.fullName}</DialogTitle>
                              <DialogDescription>User details and permissions</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Email</Label>
                                  <div className="mt-1 text-sm">{user.email}</div>
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <div className="mt-1 text-sm">{user.phone}</div>
                                </div>
                                <div>
                                  <Label>Role</Label>
                                  <div className="mt-1">
                                    <Badge className={getRoleColor(user.role)}>
                                      {user.role.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="mt-1">
                                    <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label>Organization</Label>
                                  <div className="mt-1 text-sm">{user.organization}</div>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <Label className="text-base mb-3 block">Module Permissions</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {Object.entries(user.permissions.modules).map(([module, level]) => (
                                    <div key={module} className="flex items-center justify-between border rounded p-2">
                                      <span className="text-sm capitalize">{module.replace(/([A-Z])/g, ' $1').trim()}</span>
                                      {getPermissionLevel(level)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        {user.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserStatusChange(user.id, 'suspended')}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserStatusChange(user.id, 'active')}
                          >
                            <Unlock className="mr-2 h-4 w-4" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Structure</CardTitle>
                  <CardDescription>Hierarchical view of business units and departments</CardDescription>
                </div>
                <Button>
                  <Building className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingOrg ? (
                  <p className="text-sm text-slate-500">Loading organization…</p>
                ) : (
                orgUnits.map((org) => (
                  <div
                    key={org.id}
                    className={`border rounded-lg p-4 ${org.parentId ? 'ml-8' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-brand" />
                          <h3 className="font-semibold">{org.name}</h3>
                          <Badge variant="outline">{org.type.replace('_', ' ')}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-slate-600 flex items-center gap-4">
                          <span>{org.userCount} users</span>
                          {org.managerName && <span>Manager: {org.managerName}</span>}
                          <span>Created: {format(new Date(org.createdAt), 'PP')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permission Matrix</CardTitle>
                  <CardDescription>Role-based access control configuration</CardDescription>
                </div>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Matrix
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loadingMatrix ? (
                  <p className="text-sm text-slate-500">Loading permission matrix…</p>
                ) : (
                permissionMatrix.map((matrix) => (
                  <div key={matrix.roleId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{matrix.roleName}</h3>
                        <p className="text-sm text-slate-600 mt-1">{matrix.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{matrix.userCount} users</Badge>
                          {matrix.isCustom && <Badge className="bg-purple-100 text-purple-800">Custom</Badge>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Edit Permissions</Button>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base mb-2 block">Module Access</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(matrix.permissions.modules).map(([module, level]) => (
                            <div key={module} className="flex items-center justify-between border rounded p-2">
                              <span className="text-sm capitalize">{module.replace(/([A-Z])/g, ' $1').trim()}</span>
                              {getPermissionLevel(level)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-base mb-2 block">Action Permissions</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(matrix.permissions.actions).map(([action, allowed]) => (
                            <div key={action} className="flex items-center justify-between border rounded p-2">
                              <span className="text-sm capitalize">{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                              {allowed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Requests Tab */}
        <TabsContent value="access-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Requests</CardTitle>
              <CardDescription>User requests for additional permissions or role changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{request.requesterName}</h3>
                        <div className="mt-1">
                          {request.status === 'pending' && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending Review
                            </Badge>
                          )}
                          {request.status === 'approved' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Approved
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => handleAccessRequestReview(request.id, 'approved')}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleAccessRequestReview(request.id, 'rejected')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-600">Requested:</span>
                        <div className="mt-1">
                          {request.requestedRole && (
                            <Badge className={getRoleColor(request.requestedRole)}>
                              Role: {request.requestedRole.replace('_', ' ')}
                            </Badge>
                          )}
                          {request.requestedModules && request.requestedModules.map((module) => (
                            <Badge key={module} variant="outline" className="ml-1">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Justification:</span>
                        <p className="mt-1">{request.justification}</p>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <span>Requested: {format(new Date(request.createdAt), 'PPp')}</span>
                        {request.reviewedBy && (
                          <>
                            <span>Reviewed by: {request.reviewedBy}</span>
                            {request.reviewedAt && (
                              <span>{format(new Date(request.reviewedAt), 'PPp')}</span>
                            )}
                          </>
                        )}
                      </div>
                      {request.reviewComments && (
                        <div>
                          <span className="text-slate-600">Review Comments:</span>
                          <p className="mt-1">{request.reviewComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!loadingAccessRequests && accessRequests.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No access requests.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Monitoring</CardTitle>
              <CardDescription>Real-time tracking of user actions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingActivity ? (
                  <p className="text-sm text-slate-500">Loading activity…</p>
                ) : platformActivities.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent activity.</p>
                ) : (
                platformActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border rounded-lg p-3">
                    <Activity className="h-5 w-5 text-brand mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{activity.userName}</span>
                          <span className="text-slate-600 ml-2">{activity.action}</span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {format(new Date(activity.timestamp), 'PPp')}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium">{activity.module}</span>
                        {activity.resourceType && (
                          <span className="ml-2">• {activity.resourceType}</span>
                        )}
                        {activity.description && (
                          <span className="ml-2">• {activity.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingSessions && (
                  <p className="text-sm text-slate-600">Loading sessions…</p>
                )}
                {!loadingSessions && sessions.length === 0 && (
                  <p className="text-sm text-slate-600">No active sessions.</p>
                )}
                {sessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Monitor className="h-5 w-5 text-brand mt-1" />
                        <div>
                          <h3 className="font-semibold">{session.userName}</h3>
                          <div className="mt-1">
                            <Badge className={session.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {session.isActive ? 'Active' : 'Expired'}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-slate-600 space-y-1">
                            <div>IP Address: {session.ipAddress ?? '—'}</div>
                            <div>Login: {format(new Date(session.loginTime), 'PPp')}</div>
                            <div>Last Activity: {format(new Date(session.lastActivity), 'PPp')}</div>
                            <div>Expires: {format(new Date(session.expiresAt), 'PPp')}</div>
                            {session.userAgent && (
                              <div className="text-xs text-slate-500">{session.userAgent}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      {session.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          disabled={terminatingSessionId === session.id}
                          onClick={() => handleTerminateSession(session.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {terminatingSessionId === session.id ? 'Terminating…' : 'Terminate'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Audit Trail</CardTitle>
                  <CardDescription>Complete history of user management actions</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportAudit}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingAudit ? (
                  <p className="text-sm text-slate-500">Loading audit logs…</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No audit entries.</p>
                ) : (
                auditLogs.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand" />
                        <div>
                          <span className="font-semibold">{entry.userName}</span>
                          <Badge variant="outline" className="ml-2">
                            {entry.action.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">
                        {format(new Date(entry.timestamp), 'PPp')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>
                        Target: <span className="font-medium">{entry.targetName}</span>
                        <Badge variant="outline" className="ml-2">{entry.targetType}</Badge>
                      </div>
                      {entry.ipAddress && <div>IP Address: {entry.ipAddress}</div>}
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bulk User Operations</CardTitle>
                  <CardDescription>Import, export, and manage users in bulk</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportUsers}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Users
                  </Button>
                  <Button onClick={() => bulkFileRef.current?.click()} disabled={bulkImporting}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Users
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="bulk-file">Upload CSV File</Label>
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleBulkImportFile(file);
                    e.target.value = '';
                  }}
                />
                <Button variant="outline" className="mt-2" onClick={() => bulkFileRef.current?.click()} disabled={bulkImporting}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV File
                </Button>
                <p className="text-sm text-slate-600 mt-2">
                  Upload a CSV file with user information.{' '}
                  <button type="button" className="text-brand underline" onClick={downloadBulkUserTemplate}>
                    Download template
                  </button>
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Import History</h3>
                <div className="space-y-3">
                  {bulkImports.map((importJob) => (
                    <div key={importJob.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{importJob.fileName}</h4>
                          <div className="mt-1">
                            <Badge className={
                              importJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                              importJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {importJob.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedImport(importJob)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-slate-600">Total Records:</span>
                          <div className="font-semibold">{importJob.totalRecords}</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Successful:</span>
                          <div className="font-semibold text-green-600">{importJob.successCount}</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Failed:</span>
                          <div className="font-semibold text-red-600">{importJob.failureCount}</div>
                        </div>
                        <div>
                          <span className="text-slate-600">Uploaded:</span>
                          <div className="font-semibold">{format(new Date(importJob.createdAt), 'PP')}</div>
                        </div>
                      </div>
                      {importJob.errors && importJob.errors.length > 0 && (
                        <div className="mt-3 bg-red-50 rounded p-3">
                          <div className="font-medium text-sm text-red-800 mb-2">Errors:</div>
                          {importJob.errors.map((error, idx) => (
                            <div key={idx} className="text-xs text-red-700">
                              Row {error.row}: {error.field} - {error.error}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {!loadingBulkImports && bulkImports.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No bulk import history yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update profile details for {editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legal_practitioner">Legal Practitioner</SelectItem>
                  <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditUser} disabled={savingEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImport} onOpenChange={(open) => !open && setSelectedImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>{selectedImport?.fileName}</DialogDescription>
          </DialogHeader>
          {selectedImport && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-600">Status:</span> {selectedImport.status}</div>
                <div><span className="text-slate-600">Total:</span> {selectedImport.totalRecords}</div>
                <div><span className="text-slate-600">Successful:</span> {selectedImport.successCount}</div>
                <div><span className="text-slate-600">Failed:</span> {selectedImport.failureCount}</div>
              </div>
              {selectedImport.errors && selectedImport.errors.length > 0 && (
                <div className="bg-red-50 rounded p-3 max-h-48 overflow-y-auto">
                  {selectedImport.errors.map((error, idx) => (
                    <div key={idx} className="text-xs text-red-700">
                      Row {error.row}: {error.field} — {error.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
