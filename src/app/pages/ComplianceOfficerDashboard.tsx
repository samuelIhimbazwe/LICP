import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { downloadCsv } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatGrid } from '../components/dashboard/StatCard';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { StatusBadge, PriorityBadge, CHART, chartTooltipStyle } from '../lib/statusBadges';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, FileText, Search,
  Upload, PlayCircle, Calendar, Shield, BarChart3, Filter, Plus,
  RefreshCw, Download, Eye, AlertCircle
} from 'lucide-react';
import { complianceTrendData } from '../data/mockData';
import { useDashboard } from '../hooks/useDashboard';
import { useCompliance } from '../hooks/useCompliance';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { format, addDays } from 'date-fns';

const riskMatrixData = [
  { area: 'Data Privacy', likelihood: 4, impact: 5, score: 20 },
  { area: 'Employment Law', likelihood: 3, impact: 3, score: 9 },
  { area: 'Financial Regs', likelihood: 2, impact: 5, score: 10 },
  { area: 'Environmental', likelihood: 2, impact: 3, score: 6 },
  { area: 'Anti-Bribery', likelihood: 1, impact: 4, score: 4 },
  { area: 'Cybersecurity', likelihood: 4, impact: 4, score: 16 },
];

const radarData = [
  { subject: 'Data Privacy', score: 78 },
  { subject: 'Employment', score: 92 },
  { subject: 'Financial', score: 85 },
  { subject: 'Environmental', score: 95 },
  { subject: 'Anti-Bribery', score: 98 },
  { subject: 'Cybersecurity', score: 72 },
];

const regulatoryCalendar = [
  { title: 'GDPR Annual Data Audit', date: addDays(new Date(), 5), category: 'Data Privacy', status: 'upcoming' },
  { title: 'Q2 Financial Compliance Report', date: addDays(new Date(), 12), category: 'Financial', status: 'upcoming' },
  { title: 'Employment Law Training', date: addDays(new Date(), 18), category: 'HR', status: 'scheduled' },
  { title: 'SOC 2 Audit Preparation', date: addDays(new Date(), 25), category: 'Cybersecurity', status: 'in_progress' },
  { title: 'Anti-Bribery Policy Review', date: addDays(new Date(), 32), category: 'Governance', status: 'upcoming' },
  { title: 'Environmental Impact Assessment', date: addDays(new Date(), 45), category: 'Environmental', status: 'upcoming' },
];

export function ComplianceOfficerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { data, loading, refresh } = useDashboard();
  const { obligations, calendarEvents, updateObligation, exportReport } = useCompliance();

  const checklistItems = obligations.map((o) => ({
    id: o.id,
    title: o.title,
    category: o.regulation || o.department || 'Compliance',
    completed: o.status === 'compliant',
    assignee: Array.isArray(o.assignedTo) ? o.assignedTo.join(', ') : (o.assignedTo as unknown as string) || 'Unassigned',
  }));

  const liveCalendar =
    calendarEvents.length > 0
      ? calendarEvents.slice(0, 8).map((e) => ({
          title: e.title,
          date: new Date(e.deadline),
          category: e.regulation || e.department || 'Compliance',
          status: e.status === 'compliant' ? 'completed' : 'upcoming',
        }))
      : regulatoryCalendar;

  type Obligation = {
    id: string;
    title: string;
    status: string;
    deadline: string;
    assignedTo: string;
    priority: string;
  };

  type RegulatoryAlert = {
    id: string;
    title: string;
    description: string;
    category: string;
    impact: string;
    isRead: boolean;
    date: string;
  };

  const statsData = data?.stats as {
    activeComplianceItems?: number;
    pendingReviews?: number;
    regulatoryAlerts?: number;
    complianceRate?: number;
  } | undefined;

  const pendingItems = (data?.pendingObligations as Obligation[] | undefined) ?? [];
  const upcomingDeadlines = (data?.upcomingDeadlines as Obligation[] | undefined) ?? [];
  const regulatoryAlerts = (data?.regulatoryAlerts as RegulatoryAlert[] | undefined) ?? [];
  const trendData = (data?.complianceTrend as typeof complianceTrendData | undefined) ?? complianceTrendData;

  const unreadAlerts = regulatoryAlerts.filter((alert) => !alert.isRead);
  const compliantCount = statsData?.activeComplianceItems
    ? statsData.activeComplianceItems - pendingItems.length
    : 0;
  const totalCompliance = statsData?.activeComplianceItems ?? pendingItems.length;
  const complianceRate = statsData?.complianceRate ?? 0;

  const stats = [
    { label: 'Active compliance items', value: totalCompliance, hint: `${compliantCount} compliant · ${pendingItems.length} need attention`, icon: FileText },
    { label: 'Regulatory alerts', value: unreadAlerts.length, hint: 'Unread alerts', icon: AlertTriangle },
    { label: 'Pending reviews', value: statsData?.pendingReviews ?? pendingItems.length, hint: 'Items requiring action', icon: Clock },
    { label: 'Compliance rate', value: `${complianceRate}%`, hint: 'Organisation-wide score', icon: TrendingUp },
  ];

  const getRiskColor = (score: number) => {
    if (score >= 15) return 'border-red-200 bg-red-50 text-red-900';
    if (score >= 9) return 'border-amber-200 bg-amber-50 text-amber-900';
    if (score >= 4) return 'border-border bg-muted text-foreground';
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 15) return 'Critical';
    if (score >= 9) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {loading && (
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      )}
      <StatGrid stats={stats} />

      <QuickActionsBar
        actions={[
          { label: 'New compliance item', icon: Plus, primary: true, onClick: () => navigate('/compliance-tracking') },
          { label: 'Run assessment', icon: PlayCircle, onClick: () => setActiveTab('risk') },
          { label: 'Upload document', icon: Upload, onClick: () => navigate('/knowledge-base') },
          { label: 'Search regulations', icon: Search, onClick: () => navigate('/regulatory-updates') },
          {
            label: 'Export report',
            icon: Download,
            onClick: async () => {
              try {
                await exportReport();
                toast.success('Compliance obligations exported.');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Export failed.');
              }
            },
          },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="calendar">Regulatory Calendar</TabsTrigger>
          <TabsTrigger value="checklist">Compliance Checklist</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Obligations</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-3 border rounded-lg">
                      <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${item.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <p className="font-medium">{item.title}</p>
                          <PriorityBadge priority={item.priority as 'high' | 'medium' | 'low'} />
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="mr-1 h-3 w-3" />
                          Due: {format(new Date(item.deadline), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">Assigned to: {item.assignedTo}</span>
                          <StatusBadge status={item.status as 'compliant' | 'warning' | 'overdue'} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingItems.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="mx-auto h-12 w-12 mb-2 text-green-500" />
                      <p>All obligations are up to date!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Next 5 compliance deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{format(new Date(item.deadline), 'EEEE, MMM dd, yyyy')}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      {index < upcomingDeadlines.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regulatory Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regulatory Alerts</CardTitle>
                  <CardDescription>Recent regulatory changes and updates</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => refresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regulatoryAlerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{alert.title}</h4>
                          {!alert.isRead && <Badge className="bg-brand/10 text-brand hover:bg-brand/10">New</Badge>}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{format(new Date(alert.date), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>{alert.category}</span>
                          <span>•</span>
                          <Badge variant={alert.impact === 'high' ? 'destructive' : alert.impact === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                            {alert.impact} impact
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 shrink-0"
                        onClick={() => navigate('/regulatory-updates')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>6-month compliance status overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="compliant" fill="#22c55e" name="Compliant" />
                  <Bar dataKey="warning" fill="#f59e0b" name="Warning" />
                  <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 mb-2">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Critical Risks</p>
                    <p className="text-2xl font-bold text-red-700">{riskMatrixData.filter(r => r.score >= 15).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-xs text-orange-600 font-medium">High Risks</p>
                    <p className="text-2xl font-bold text-orange-700">{riskMatrixData.filter(r => r.score >= 9 && r.score < 15).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-xs text-green-600 font-medium">Low/Medium Risks</p>
                    <p className="text-2xl font-bold text-green-700">{riskMatrixData.filter(r => r.score < 9).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Heat Matrix</CardTitle>
                <CardDescription>Risk areas scored by likelihood × impact (1–5 scale)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskMatrixData.sort((a, b) => b.score - a.score).map((risk) => (
                    <div key={risk.area} className={`p-4 border rounded-lg ${getRiskColor(risk.score)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{risk.area}</h4>
                        <Badge className={`text-xs ${getRiskColor(risk.score)}`}>
                          {getRiskLabel(risk.score)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-white/60 rounded">
                          <p className="font-bold text-lg">{risk.likelihood}/5</p>
                          <p className="text-slate-500">Likelihood</p>
                        </div>
                        <div className="text-center p-2 bg-white/60 rounded">
                          <p className="font-bold text-lg">{risk.impact}/5</p>
                          <p className="text-slate-500">Impact</p>
                        </div>
                        <div className="text-center p-2 bg-white/60 rounded">
                          <p className="font-bold text-lg">{risk.score}</p>
                          <p className="text-slate-500">Risk Score</p>
                        </div>
                      </div>
                      <Progress value={(risk.score / 25) * 100} className="mt-3 h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Health Radar</CardTitle>
                <CardDescription>Overall compliance health by regulatory area</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Compliance" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {radarData.map(d => (
                    <div key={d.subject} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">{d.subject}</span>
                      <span className={`font-semibold ${d.score >= 90 ? 'text-green-600' : d.score >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{d.score}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regulatory Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regulatory Calendar</CardTitle>
                  <CardDescription>Upcoming compliance events and regulatory deadlines</CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate('/compliance-tracking')}>
                  <Plus className="mr-2 h-4 w-4" />Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveCalendar.map((event, i) => {
                  const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={i} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="text-center min-w-[48px]">
                        <p className="text-xs text-slate-500 font-medium">{format(event.date, 'MMM')}</p>
                        <p className="text-xl font-bold leading-tight">{format(event.date, 'dd')}</p>
                        <p className="text-xs text-slate-500">{format(event.date, 'EEE')}</p>
                      </div>
                      <Separator orientation="vertical" className="h-auto" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          <Badge variant="outline" className="text-xs">{event.category}</Badge>
                          {event.status === 'in_progress' && (
                            <Badge className="bg-brand/10 text-brand hover:bg-brand/10 text-xs">In Progress</Badge>
                          )}
                        </div>
                        <p className={`text-xs font-medium ${daysUntil <= 7 ? 'text-red-600' : daysUntil <= 14 ? 'text-orange-600' : 'text-slate-500'}`}>
                          {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate('/compliance-tracking')}>
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Checklist</CardTitle>
                  <CardDescription>
                    {checklistItems.filter(i => i.completed).length} of {checklistItems.length} tasks completed
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(checklistItems.filter(i => i.completed).length / checklistItems.length) * 100} className="w-24" />
                  <span className="text-sm font-medium">
                    {Math.round((checklistItems.filter(i => i.completed).length / checklistItems.length) * 100)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div key={item.id} className={`p-4 border rounded-lg flex items-start gap-3 ${item.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${item.completed ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                      {item.completed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${item.completed ? 'line-through text-slate-400' : ''}`}>{item.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <span className="text-xs text-slate-500">Assigned to: {item.assignee}</span>
                      </div>
                    </div>
                    {!item.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateObligation(item.id, { status: 'compliant' });
                            toast.success(`"${item.title}" marked compliant.`);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Could not update obligation. Evidence may be required.');
                          }
                        }}
                      >
                        Mark Done
                      </Button>
                    )}
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
