import React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { StatGrid } from '../components/dashboard/StatCard';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { PriorityBadge, CHART } from '../lib/statusBadges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Users, CheckCircle2, TrendingUp, AlertCircle, FileCheck, Activity,
  BarChart3, Shield, Clock, ThumbsUp, ThumbsDown, Eye, Plus,
  ArrowRight, UserCheck, AlertTriangle, Calendar
} from 'lucide-react';
import { teamActivities } from '../data/mockData';
import { useDashboard } from '../hooks/useDashboard';
import { useContracts } from '../hooks/useContracts';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, addDays } from 'date-fns';

const teamMembers = [
  { name: 'Sarah Johnson', role: 'Compliance Officer', avatar: 'SJ', tasks: 8, completed: 6, status: 'active' },
  { name: 'Michael Chen', role: 'Legal Practitioner', avatar: 'MC', tasks: 12, completed: 9, status: 'active' },
  { name: 'Emily Rodriguez', role: 'Legal Practitioner', avatar: 'ER', tasks: 10, completed: 7, status: 'active' },
  { name: 'David Park', role: 'Compliance Analyst', avatar: 'DP', tasks: 6, completed: 6, status: 'active' },
  { name: 'Lisa Thompson', role: 'Paralegal', avatar: 'LT', tasks: 9, completed: 5, status: 'away' },
];

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { data, loading } = useDashboard();
  const { approvals: contractApprovals, decideApproval } = useContracts();
  const pendingContractApprovals = contractApprovals.filter((a) => a.status === 'pending');

  const statsData = data?.stats as {
    pendingApprovals?: number;
    complianceRate?: number;
    auditReadinessScore?: number;
    activeTeam?: number;
  } | undefined;

  const pendingObligations = (data?.pendingObligations as Array<{ id: string; title: string; status: string }> | undefined) ?? [];
  const overdueItems = pendingObligations.filter((item) => item.status === 'overdue').length;
  const warningItems = pendingObligations.filter((item) => item.status === 'warning').length;
  const complianceRate = statsData?.complianceRate ?? 0;
  const auditReadinessScore = statsData?.auditReadinessScore ?? Math.max(0, 100 - overdueItems * 15 - warningItems * 5);

  const departmentPerformance = [
    { department: 'Legal', compliance: 95, tasks: 45 },
    { department: 'HR', compliance: 88, tasks: 32 },
    { department: 'Finance', compliance: 92, tasks: 28 },
    { department: 'Operations', compliance: 85, tasks: 38 },
    { department: 'IT', compliance: 90, tasks: 41 },
  ];

  const complianceDistribution = [
    { name: 'Compliant', value: Math.max(0, 100 - warningItems - overdueItems), color: CHART.secondary },
    { name: 'Warning', value: warningItems, color: CHART.warning },
    { name: 'Overdue', value: overdueItems, color: CHART.danger },
  ];

  const weeklyActivity = [
    { day: 'Mon', completed: 12, pending: 8 },
    { day: 'Tue', completed: 15, pending: 6 },
    { day: 'Wed', completed: 10, pending: 10 },
    { day: 'Thu', completed: 18, pending: 5 },
    { day: 'Fri', completed: 14, pending: 7 },
    { day: 'Sat', completed: 5, pending: 3 },
    { day: 'Sun', completed: 3, pending: 2 },
  ];

  const stats = [
    { label: 'Pending approvals', value: statsData?.pendingApprovals ?? pendingContractApprovals.length, hint: `${pendingContractApprovals.length} contract approvals`, icon: Clock },
    { label: 'Compliance status', value: `${complianceRate}%`, hint: 'Organisation score', icon: CheckCircle2 },
    { label: 'Audit readiness', value: `${auditReadinessScore}%`, hint: `${overdueItems} items need attention`, icon: Shield },
    { label: 'Active team', value: statsData?.activeTeam ?? teamMembers.filter(m => m.status === 'active').length, hint: `of ${teamMembers.length} members`, icon: Users },
  ];

  const handleApproval = async (id: string, action: 'approve' | 'reject') => {
    try {
      await decideApproval(id, action === 'approve' ? 'approved' : 'rejected');
      toast.success(action === 'approve' ? 'Approved.' : 'Rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    }
  };

  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}
      <StatGrid stats={stats} />

      <QuickActionsBar
        actions={[
          { label: 'View analytics', icon: BarChart3, primary: true, onClick: () => navigate('/analytics') },
          { label: 'Manage team', icon: Users, onClick: () => navigate('/team') },
          { label: 'Review reports', icon: FileCheck, onClick: () => navigate('/reports') },
          { label: 'Assign task', icon: Plus, onClick: () => navigate('/team') },
        ]}
      />

      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals">
            Pending Approvals
            {pendingContractApprovals.length > 0 && (
              <Badge variant="outline" className="ml-2 text-[11px]">{pendingContractApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team">Team Workload</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {pendingContractApprovals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-3 text-green-500" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-slate-500 mt-1">No pending contract approvals at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingContractApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="text-xs">Contract</Badge>
                          <Badge variant="outline" className="text-xs">{approval.status}</Badge>
                        </div>
                        <h4 className="font-semibold">Approval for contract {approval.contractId.slice(0, 8)}…</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {approval.submittedBy}
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(approval.createdAt), 'PPp')}
                          </div>
                          <span>•</span>
                          <span>Approver: {approval.approverName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="text-slate-600" onClick={() => navigate('/contracts')}>
                          <Eye className="h-4 w-4 mr-1" />Review
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproval(approval.id, 'approve')}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleApproval(approval.id, 'reject')}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team Workload Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Workload Distribution</CardTitle>
                  <CardDescription>Current task assignments and completion rates</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/user-management')}>
                  <Plus className="mr-2 h-4 w-4" />Assign Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => {
                  const completionRate = Math.round((member.completed / member.tasks) * 100);
                  return (
                    <div key={member.name} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-brand/10 text-brand font-semibold">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{member.name}</p>
                          <div className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{member.role}</p>
                        <div className="flex items-center gap-3">
                          <Progress value={completionRate} className="flex-1 h-1.5" />
                          <span className="text-xs font-medium text-slate-600 shrink-0">{member.completed}/{member.tasks} tasks</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {completionRate}%
                        </p>
                        <p className="text-xs text-slate-500">completion</p>
                      </div>
                      <Button size="sm" variant="ghost"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Team Activity</CardTitle>
              <CardDescription>Latest actions by team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamActivities.map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand/10 text-brand text-xs">
                          {activity.memberName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{activity.memberName}</p>
                          <Badge variant="outline" className="text-xs shrink-0">{activity.module}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{activity.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{format(activity.timestamp, 'MMM dd, h:mm a')}</p>
                      </div>
                    </div>
                    {index < teamActivities.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Compliance rates and task completion by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="compliance" fill="#3b82f6" name="Compliance %" />
                  <Bar dataKey="tasks" fill="#10b981" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity Trend</CardTitle>
              <CardDescription>Task completion vs pending items over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status Overview</CardTitle>
                <CardDescription>Current compliance distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={complianceDistribution} cx="50%" cy="50%" labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                        {complianceDistribution.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {complianceDistribution.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value} items</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Announcements</CardTitle>
                <CardDescription>Important updates and notices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-brand bg-brand/5 rounded">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-foreground">Platform Maintenance Scheduled</h4>
                        <p className="text-sm text-brand mt-1">System maintenance is scheduled for June 15, 2026 from 2:00 AM to 4:00 AM EST.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900">New Compliance Module Available</h4>
                        <p className="text-sm text-green-800 mt-1">The enhanced compliance tracking module is now available with automated deadline reminders.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-orange-900">Q2 Audit Preparation Reminder</h4>
                        <p className="text-sm text-orange-800 mt-1">Q2 compliance audit begins July 1. Ensure all documentation is current and accessible.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
