import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { StatGrid } from '../components/dashboard/StatCard';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { StatusBadge, PriorityBadge } from '../lib/statusBadges';
import { useDashboard } from '../hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import {
  FileText, Briefcase, Search, BookOpen, Clock, CheckCircle2, AlertCircle,
  Calendar, Timer, TrendingUp, Scale, Gavel, Filter, Plus, Star,
  ChevronRight, DollarSign, BarChart3
} from 'lucide-react';
import { documentRequests, caseUpdates } from '../data/mockData';
import { format, differenceInDays, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const billingHours = [
  { day: 'Mon', billable: 6.5, nonBillable: 1.5 },
  { day: 'Tue', billable: 7.0, nonBillable: 2.0 },
  { day: 'Wed', billable: 5.5, nonBillable: 1.0 },
  { day: 'Thu', billable: 8.0, nonBillable: 1.5 },
  { day: 'Fri', billable: 6.0, nonBillable: 2.5 },
];

const upcomingHearings = [
  { id: 'H1', caseNumber: 'CASE-2026-0142', title: 'Henderson v. Morrison Corp.', court: 'Federal District Court', date: addDays(new Date(), 3), type: 'Motion Hearing', status: 'confirmed' },
  { id: 'H2', caseNumber: 'CASE-2026-0098', title: 'State v. Whitmore', court: 'Superior Court', date: addDays(new Date(), 7), type: 'Trial', status: 'confirmed' },
  { id: 'H3', caseNumber: 'CASE-2026-0155', title: 'Patel Industries LLC', court: 'Arbitration', date: addDays(new Date(), 12), type: 'Mediation', status: 'pending' },
  { id: 'H4', caseNumber: 'CASE-2026-0063', title: 'Davis Estate Matter', court: 'Probate Court', date: addDays(new Date(), 18), type: 'Status Conference', status: 'confirmed' },
];

const taskList = [
  { id: 'T1', title: 'Draft motion to dismiss', case: 'CASE-2026-0142', priority: 'high', due: addDays(new Date(), 2), completed: false },
  { id: 'T2', title: 'Review discovery documents', case: 'CASE-2026-0098', priority: 'high', due: addDays(new Date(), 1), completed: false },
  { id: 'T3', title: 'Client briefing preparation', case: 'CASE-2026-0155', priority: 'medium', due: addDays(new Date(), 5), completed: true },
  { id: 'T4', title: 'File amended complaint', case: 'CASE-2026-0063', priority: 'medium', due: addDays(new Date(), 8), completed: false },
  { id: 'T5', title: 'Research precedents for appeal', case: 'CASE-2026-0078', priority: 'low', due: addDays(new Date(), 14), completed: false },
];

const totalBillable = billingHours.reduce((a, d) => a + d.billable, 0);
const billableTarget = 40;

export function LegalPractitionerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [tasks, setTasks] = useState(taskList);
  const { data, loading } = useDashboard();

  type ApiRequest = {
    id: string;
    title: string;
    requestedBy: string;
    dueDate: string;
    status: string;
  };

  const apiRequests = (data?.documentRequests as ApiRequest[] | undefined) ?? [];
  const pendingRequests = apiRequests.filter((req) => req.status === 'pending');
  const inProgressRequests = apiRequests.filter((req) => req.status === 'in_progress');
  const statsData = data?.stats as {
    pendingRequests?: number;
    activeCases?: number;
    documentRequests?: number;
  } | undefined;

  const recentCases = caseUpdates.slice(0, 5);

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  }).filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.case.toLowerCase().includes(searchQuery.toLowerCase()));

  const stats = [
    { label: 'Pending requests', value: statsData?.pendingRequests ?? pendingRequests.length, hint: 'Awaiting review', icon: Clock },
    { label: 'Active cases', value: statsData?.activeCases ?? caseUpdates.length, hint: 'Recent updates', icon: Briefcase },
    { label: 'Billable hours', value: `${totalBillable.toFixed(1)}h`, hint: `${(billableTarget - totalBillable).toFixed(1)}h to weekly target`, icon: Timer },
    { label: 'Upcoming hearings', value: upcomingHearings.length, hint: `Next in ${differenceInDays(upcomingHearings[0].date, new Date())} days`, icon: Gavel },
  ];

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}
      <StatGrid stats={stats} />

      <QuickActionsBar
        actions={[
          { label: 'Search documents', icon: Search, primary: true, onClick: () => navigate('/knowledge-base') },
          { label: 'Legal research', icon: BookOpen, onClick: () => navigate('/ai-intelligence') },
          { label: 'Manage cases', icon: Briefcase, onClick: () => navigate('/contracts') },
          { label: 'New time entry', icon: Plus, onClick: () => setActiveTab('billing') },
          { label: 'File documents', icon: Scale, onClick: () => navigate('/contracts') },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hearings">Hearings & Deadlines</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="billing">Billing & Time</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Document Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Document Requests</CardTitle>
                <CardDescription>Pending and in-progress document reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(apiRequests.length ? apiRequests : documentRequests).map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{request.title}</h4>
                          <p className="text-sm text-slate-600">Requested by: {request.requestedBy}</p>
                        </div>
                        {'priority' in request && request.priority ? (
                          <PriorityBadge priority={request.priority as 'high' | 'medium' | 'low'} />
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="mr-1 h-3 w-3" />
                          Due: {format(new Date(request.dueDate), 'MMM dd, yyyy')}
                        </div>
                        <StatusBadge status={request.status as 'pending' | 'in_progress' | 'completed'} />
                      </div>
                      {request.status === 'pending' && (
                        <Button size="sm" className="w-full mt-3" onClick={() => navigate('/contracts')}>
                          Start Review
                        </Button>
                      )}
                      {request.status === 'in_progress' && (
                        <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => navigate('/knowledge-base')}>
                          Continue Review
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Case Updates */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Case Updates</CardTitle>
                <CardDescription>Latest activity on active cases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentCases.map((caseUpdate, index) => (
                    <div key={caseUpdate.id}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono text-xs">{caseUpdate.caseNumber}</Badge>
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">{caseUpdate.updateType}</Badge>
                            </div>
                            <h4 className="font-semibold text-sm">{caseUpdate.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{caseUpdate.description}</p>
                            <p className="text-xs text-slate-500 mt-2">{format(caseUpdate.date, 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full">View Case Details</Button>
                      </div>
                      {index < recentCases.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legal Research Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Research Tools</CardTitle>
              <CardDescription>Quick access to research databases and resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg hover:border-brand cursor-pointer transition-colors group">
                  <BookOpen className="h-8 w-8 text-brand mb-2" />
                  <h4 className="font-semibold mb-1">Case Law Database</h4>
                  <p className="text-sm text-slate-600">Search federal and state case law</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-brand group-hover:gap-2 transition-all">
                    <span>Open</span><ChevronRight className="h-3 w-3" />
                  </div>
                </div>
                <div className="p-4 border rounded-lg hover:border-green-500 cursor-pointer transition-colors group">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-1">Statutes & Regulations</h4>
                  <p className="text-sm text-slate-600">Browse current legal codes</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-green-600 group-hover:gap-2 transition-all">
                    <span>Open</span><ChevronRight className="h-3 w-3" />
                  </div>
                </div>
                <div className="p-4 border rounded-lg hover:border-purple-500 cursor-pointer transition-colors group">
                  <Scale className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-semibold mb-1">Legal Precedents</h4>
                  <p className="text-sm text-slate-600">Find similar cases and rulings</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-purple-600 group-hover:gap-2 transition-all">
                    <span>Open</span><ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hearings & Deadlines Tab */}
        <TabsContent value="hearings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Court Hearings</CardTitle>
                  <CardDescription>Scheduled hearings, trials, and court appearances</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Hearing</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingHearings.map((hearing) => {
                  const daysUntil = differenceInDays(hearing.date, new Date());
                  const isUrgent = daysUntil <= 5;
                  return (
                    <div key={hearing.id} className={`p-4 border rounded-lg ${isUrgent ? 'border-orange-300 bg-orange-50' : 'bg-white'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className="font-mono text-xs">{hearing.caseNumber}</Badge>
                            <Badge className={`text-xs ${hearing.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}`}>
                              {hearing.status}
                            </Badge>
                            {isUrgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                          </div>
                          <h4 className="font-semibold">{hearing.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{hearing.type} • {hearing.court}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-semibold text-sm">{format(hearing.date, 'MMM dd, yyyy')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">View Details</Button>
                        <Button size="sm" variant="outline" className="flex-1">Prepare Notes</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Statutory deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Deadlines</CardTitle>
              <CardDescription>Filing deadlines and statutory time limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: 'Motion to Dismiss filing', case: 'CASE-2026-0142', deadline: addDays(new Date(), 2), type: 'Filing' },
                  { title: 'Discovery response due', case: 'CASE-2026-0098', deadline: addDays(new Date(), 4), type: 'Discovery' },
                  { title: 'Amended complaint deadline', case: 'CASE-2026-0063', deadline: addDays(new Date(), 9), type: 'Filing' },
                  { title: 'Expert witness designation', case: 'CASE-2026-0155', deadline: addDays(new Date(), 21), type: 'Designation' },
                ].map((dl, i) => {
                  const days = differenceInDays(dl.deadline, new Date());
                  return (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${days <= 3 ? 'bg-red-500' : days <= 7 ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="font-medium text-sm">{dl.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs font-mono">{dl.case}</Badge>
                            <Badge variant="secondary" className="text-xs">{dl.type}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold">{format(dl.deadline, 'MMM dd')}</p>
                        <p className={`text-xs ${days <= 3 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{days}d left</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Task Management</CardTitle>
                  <CardDescription>Manage and track your legal work tasks</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Task</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'pending', 'completed'] as const).map(f => (
                    <Button
                      key={f}
                      size="sm"
                      variant={taskFilter === f ? 'default' : 'outline'}
                      onClick={() => setTaskFilter(f)}
                      className="capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const days = differenceInDays(task.due, new Date());
                  return (
                    <div key={task.id} className={`p-4 border rounded-lg transition-colors ${task.completed ? 'bg-slate-50 opacity-70' : 'bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300 hover:border-brand'}`}
                        >
                          {task.completed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium text-sm ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                            <PriorityBadge priority={task.priority} />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-xs font-mono">{task.case}</Badge>
                            <span className={`text-xs ${days <= 2 && !task.completed ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                              Due {format(task.due, 'MMM dd')} ({days}d)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="mx-auto h-12 w-12 mb-2 text-green-400" />
                    <p>No tasks found</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between text-sm text-slate-500">
                <span>{tasks.filter(t => !t.completed).length} pending tasks</span>
                <span>{tasks.filter(t => t.completed).length} completed</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Time Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Timer className="h-4 w-4 text-brand" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBillable.toFixed(1)}h</div>
                <p className="text-xs text-slate-600 mt-1">of {billableTarget}h target</p>
                <Progress value={(totalBillable / billableTarget) * 100} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$18,450</div>
                <p className="text-xs text-slate-600 mt-1">Billable value</p>
                <p className="text-xs text-green-600 mt-1">+8.3% vs last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">82%</div>
                <p className="text-xs text-slate-600 mt-1">Billable vs total hours</p>
                <Progress value={82} className="mt-2 [&>div]:bg-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Billing Hours</CardTitle>
              <CardDescription>Billable vs non-billable time breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={billingHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="billable" fill="#3b82f6" name="Billable Hours" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nonBillable" fill="#e2e8f0" name="Non-Billable" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Time Entries</CardTitle>
                  <CardDescription>Today's logged time</CardDescription>
                </div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Log Time</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { case: 'CASE-2026-0142', activity: 'Legal research - case precedents', hours: 2.5, billable: true },
                  { case: 'CASE-2026-0098', activity: 'Client meeting and consultation', hours: 1.0, billable: true },
                  { case: 'CASE-2026-0155', activity: 'Document drafting - motion', hours: 3.0, billable: true },
                  { case: 'Internal', activity: 'Team meeting', hours: 1.0, billable: false },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${entry.billable ? 'bg-brand/50' : 'bg-slate-300'}`} />
                      <div>
                        <p className="font-medium text-sm">{entry.activity}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs font-mono">{entry.case}</Badge>
                          <Badge variant={entry.billable ? 'secondary' : 'outline'} className="text-xs">
                            {entry.billable ? 'Billable' : 'Non-billable'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">{entry.hours}h</span>
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
