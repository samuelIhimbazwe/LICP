import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import {
  Bell,
  Mail,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Megaphone,
  Settings,
  Filter,
  Send,
  Eye,
  TrendingUp,
  Users,
  Calendar,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationExtras } from '../hooks/useNotificationExtras';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function NotificationCenter() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('medium');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const {
    notifications: apiNotifications,
    unreadCount: apiUnreadCount,
    loading,
    error,
    markRead,
    markAllRead,
  } = useNotifications({ pollMs: 15000 });
  const {
    preferences,
    logs,
    broadcasts,
    escalationRules,
    loading: extrasLoading,
    savePreferences,
    sendBroadcast,
    toggleEscalationRule,
  } = useNotificationExtras();
  const [prefsDraft, setPrefsDraft] = useState(preferences);

  useEffect(() => {
    setPrefsDraft(preferences);
  }, [preferences]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    setShowUnreadOnly(false);
    setSelectedType('all');
    setHighlightedId(id);
    const match = (apiNotifications ?? []).find((n) => n.id === id);
    if (match && !match.isRead) {
      markRead(id).catch(() => undefined);
    }
    requestAnimationFrame(() => {
      document.getElementById(`notification-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [searchParams, apiNotifications]);

  const filteredNotifications = (apiNotifications ?? []).filter((notif) => {
    const matchesType = selectedType === 'all' || notif.type === selectedType;
    const matchesRead = !showUnreadOnly || !notif.isRead;
    return matchesType && matchesRead;
  });

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      regulatory_update: AlertCircle,
      compliance_deadline: Clock,
      document_approval: FileText,
      contract_expiry: Calendar,
      system_announcement: Megaphone,
      task_assignment: CheckCircle2,
      escalation: AlertTriangle,
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-5 w-5" />;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      critical: { label: 'Critical', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      low: { label: 'Low', className: 'bg-brand/10 text-brand hover:bg-brand/10' },
    };
    const badge = badges[priority] || { label: priority, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regulatory_update: 'Regulatory Update',
      compliance_deadline: 'Compliance Deadline',
      document_approval: 'Document Approval',
      contract_expiry: 'Contract Expiry',
      system_announcement: 'System Announcement',
      task_assignment: 'Task Assignment',
      escalation: 'Escalation',
    };
    return labels[type] || type;
  };

  const unreadCount = error ? 0 : apiUnreadCount;
  const criticalCount = (apiNotifications ?? []).filter(
    (n) => n.priority === 'critical' && !n.isRead
  ).length;
  const totalNotifications = (apiNotifications ?? []).length;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load notifications</AlertTitle>
          <AlertDescription>
            {error}. Ensure the API is running with <code className="text-xs">npm run dev:api</code>, then refresh.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Notification Center</h1>
        <p className="text-slate-600 mt-1">Manage alerts, notifications, and communication preferences</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotifications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broadcasts</CardTitle>
            <Megaphone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{broadcasts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast Messages</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="escalation">Escalation Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Notifications</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unread"
                      checked={showUnreadOnly}
                      onCheckedChange={(checked) => setShowUnreadOnly(checked as boolean)}
                    />
                    <label htmlFor="unread" className="text-sm">Unread only</label>
                  </div>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="regulatory_update">Regulatory Updates</SelectItem>
                      <SelectItem value="compliance_deadline">Compliance Deadlines</SelectItem>
                      <SelectItem value="document_approval">Document Approvals</SelectItem>
                      <SelectItem value="contract_expiry">Contract Expiry</SelectItem>
                      <SelectItem value="system_announcement">System Announcements</SelectItem>
                      <SelectItem value="task_assignment">Task Assignments</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead().catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to mark all read'))}
                  >
                    Mark All Read
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && !error && (
                <p className="text-sm text-muted-foreground">Loading notifications…</p>
              )}
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  id={`notification-${notif.id}`}
                  className={`p-4 border rounded-lg ${
                    highlightedId === notif.id
                      ? 'bg-brand/10 border-brand ring-2 ring-brand/30'
                      : !notif.isRead
                        ? 'bg-brand/5 border-brand/20'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notif.priority === 'critical' ? 'bg-red-100 text-red-600' :
                      notif.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      notif.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-brand/10 text-brand'
                    }`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notif.title}</h3>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-brand" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{notif.message}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getPriorityBadge(notif.priority)}
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notif.type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                        <span>{format(new Date(notif.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex gap-2">
                        {!notif.isRead && (
                          <Button size="sm" variant="outline" onClick={() => markRead(notif.id)}>
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">
                    {error ? 'Notifications could not be loaded.' : 'No notifications found'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Messages Tab */}
        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Broadcast Messages</CardTitle>
                  <CardDescription>Send announcements to users</CardDescription>
                </div>
                {isAdmin && (
                <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Megaphone className="mr-2 h-4 w-4" />
                      Create Broadcast
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Broadcast Message</DialogTitle>
                      <DialogDescription>Send an announcement to all active users</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Message Title</Label>
                        <Input
                          placeholder="Enter broadcast title"
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message Content</Label>
                        <Textarea
                          placeholder="Enter your message"
                          rows={4}
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={broadcastPriority} onValueChange={setBroadcastPriority}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
                            toast.error('Title and message are required.');
                            return;
                          }
                          try {
                            await sendBroadcast({
                              title: broadcastTitle,
                              message: broadcastMessage,
                              priority: broadcastPriority,
                              channels: ['in_app', 'email'],
                            });
                            toast.success('Broadcast sent.');
                            setBroadcastTitle('');
                            setBroadcastMessage('');
                            setBroadcastOpen(false);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Broadcast failed.');
                          }
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Broadcast
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {extrasLoading && <p className="text-sm text-muted-foreground">Loading broadcasts…</p>}
              {!extrasLoading && broadcasts.length === 0 && (
                <p className="text-sm text-slate-600">No broadcast messages yet.</p>
              )}
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold">{broadcast.title}</h3>
                        {getPriorityBadge(broadcast.priority)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{broadcast.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Created by {broadcast.createdBy}</span>
                        <span>•</span>
                        <span>{format(new Date(broadcast.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        <span>•</span>
                        <span>Sent to {broadcast.recipientCount} users</span>
                        <span>•</span>
                        <span>{broadcast.readCount} read</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t">
                    <Badge variant="secondary">
                      {broadcast.targetAudience === 'all' ? 'All Users' : broadcast.targetAudience}
                    </Badge>
                    {(broadcast.channels as string[]).map((ch) => (
                      <Badge key={ch} variant="outline" className="text-xs">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!prefsDraft && extrasLoading && (
                <p className="text-sm text-muted-foreground">Loading preferences…</p>
              )}
              {prefsDraft && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Notification Channels</h3>
                    <div className="space-y-3">
                      {(['inApp', 'email', 'sms'] as const).map((key) => (
                        <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {key === 'inApp' ? (
                              <Bell className="h-5 w-5 text-brand" />
                            ) : key === 'email' ? (
                              <Mail className="h-5 w-5 text-green-600" />
                            ) : (
                              <Smartphone className="h-5 w-5 text-purple-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm capitalize">{key === 'inApp' ? 'In-App' : key} Notifications</p>
                            </div>
                          </div>
                          <Switch
                            checked={prefsDraft.channels[key]}
                            onCheckedChange={(checked) =>
                              setPrefsDraft({
                                ...prefsDraft,
                                channels: { ...prefsDraft.channels, [key]: checked },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      try {
                        await savePreferences(prefsDraft);
                        toast.success('Preferences saved.');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Save failed.');
                      }
                    }}
                  >
                    Save Preferences
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalation Rules Tab */}
        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Escalation Rules</CardTitle>
                  <CardDescription>Automated escalation for critical items</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <p className="text-sm text-slate-600">Escalation rules are managed by administrators.</p>
              )}
              {escalationRules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        {isAdmin && (
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => void toggleEscalationRule(rule.id, checked)}
                          />
                        )}
                        <Badge variant={rule.isActive ? 'default' : 'outline'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">Trigger: {rule.triggerCondition}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Escalation delay: {rule.escalationDelay} days</span>
                        <span>•</span>
                        <span>Created by {rule.createdBy}</span>
                        <span>•</span>
                        <span>{format(new Date(rule.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Escalate to:</p>
                    <div className="flex flex-wrap gap-2">
                      {(rule.escalateTo as string[]).map((person, idx) => (
                        <Badge key={idx} variant="secondary">
                          <Users className="mr-1 h-3 w-3" />
                          {person}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {escalationRules.length === 0 && !extrasLoading && (
                <p className="text-sm text-slate-600">No escalation rules configured.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>Delivery logs and notification history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{log.title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {log.channel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.status}
                          </Badge>
                          <span>Sent: {format(new Date(log.sentAt), 'MMM dd, HH:mm')}</span>
                          {log.deliveredAt && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">
                                Delivered: {format(new Date(log.deliveredAt), 'HH:mm')}
                              </span>
                            </>
                          )}
                          {log.readAt && (
                            <>
                              <span>•</span>
                              <span className="text-brand">Read: {format(new Date(log.readAt), 'HH:mm')}</span>
                            </>
                          )}
                          {log.failedAt && (
                            <>
                              <span>•</span>
                              <span className="text-red-600">Failed: {log.failureReason}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {log.status === 'delivered' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {log.status === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && !extrasLoading && (
                  <p className="text-sm text-slate-600">No delivery logs yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
