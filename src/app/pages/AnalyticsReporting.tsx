import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
import { Checkbox } from '../components/ui/checkbox';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  FileText,
  Download,
  Calendar,
  Settings,
  Users,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Activity,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useReports, type ReportPreview } from '../hooks/useReports';
import { downloadCsv } from '../lib/api';
import { toast } from 'sonner';
import { KpiGrid } from '../components/dashboard/KpiCard';
import { CHART, chartColors, chartTooltipStyle } from '../lib/statusBadges';
import { PageHeader } from '../components/layout/PageHeader';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export function AnalyticsReporting() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [reportName, setReportName] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState('last-month');
  const [jurisdiction, setJurisdiction] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleReportId, setScheduleReportId] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleRecipients, setScheduleRecipients] = useState('');

  const {
    loading,
    error,
    complianceMetrics,
    regulatoryMetrics,
    documentMetrics,
    teamPerformance,
    obligationTrends,
    regulatoryImpactTrends,
    auditReadinessMetrics,
    executiveSummary,
    headlineKpis,
    riskKris,
    exceptions,
    statusMix,
    generatedAt,
  } = useAnalytics();

  const {
    customReports,
    generatedReports,
    templates,
    sections: sectionCatalog,
    scheduledReports,
    saveReport,
    previewReport,
    generateReport,
    generateFromTemplate,
    generateAndDownload,
    scheduleReport,
    runScheduledReport,
    downloadGenerated,
  } = useReports();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    const reportId = searchParams.get('report');
    if (!reportId) return;
    setActiveTab('scheduled');
    setHighlightedReportId(reportId);
    requestAnimationFrame(() => {
      document.getElementById(`report-${reportId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [searchParams, generatedReports, customReports]);

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  const toggleSection = (id: string) => {
    setSelectedSections((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedSections(tmpl.sections);
      if (!reportName.trim()) setReportName(tmpl.name);
    }
  };

  const reportFilters = {
    dateRange: dateRange as 'last-week' | 'last-month' | 'last-quarter' | 'last-year',
    jurisdiction: jurisdiction !== 'all' ? jurisdiction : undefined,
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reporting</h1>
        <p className="text-slate-600 mt-4">Loading analytics…</p>
      </div>
    );
  }

  if (error || !complianceMetrics || !regulatoryMetrics || !documentMetrics || !auditReadinessMetrics) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reporting</h1>
        <p className="text-red-600 mt-4">{error ?? 'Analytics data unavailable.'}</p>
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleExportCompliance = async () => {
    try {
      await downloadCsv('/analytics/compliance/export', 'compliance-analytics.csv');
      toast.success('Compliance report exported.');
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleExportTeam = async () => {
    try {
      await downloadCsv('/analytics/team/export', 'team-performance.csv');
      toast.success('Team report exported.');
    } catch {
      toast.error('Export failed.');
    }
  };

  return (
    <div className="app-page p-6">
      <PageHeader
        title="Analytics & Reporting"
        description="Legal operations KPIs, trends, and custom reporting"
        actions={
          <div className="flex items-center gap-3">
            {generatedAt && (
              <p className="text-[12px] text-muted-foreground">
                Updated {format(new Date(generatedAt), 'MMM d, HH:mm')}
              </p>
            )}
            <Button onClick={handleExportCompliance}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <ModuleTabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="catalog">Report Catalog</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="audit">Audit Readiness</TabsTrigger>
        </ModuleTabsList>

        {/* Overview Tab — KPI strip + KRIs + charts + exceptions */}
        <TabsContent value="overview" className="space-y-6">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Performance KPIs
            </p>
            <KpiGrid kpis={headlineKpis} />
          </div>

          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Risk indicators (KRIs)
            </p>
            <KpiGrid kpis={riskKris} className="xl:grid-cols-4" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Compliance Score Trend</CardTitle>
                <CardDescription>Completion rate over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={obligationTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip {...chartTooltipStyle()} />
                    <Area
                      type="monotone"
                      dataKey="completionRate"
                      name="Completion %"
                      stroke={CHART.primary}
                      fill={CHART.secondary}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Obligation Status Mix</CardTitle>
                <CardDescription>Current portfolio by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statusMix} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip {...chartTooltipStyle()} />
                    <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                      {statusMix.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === 'Overdue'
                              ? CHART.danger
                              : entry.name === 'Compliant'
                                ? CHART.primary
                                : entry.name === 'Upcoming'
                                  ? CHART.secondary
                                  : CHART.tertiary
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Regulatory Impact Trend</CardTitle>
              <CardDescription>High / medium / low impact updates by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={regulatoryImpactTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...chartTooltipStyle()} />
                  <Legend />
                  <Bar dataKey="highImpact" stackId="a" fill={CHART.danger} name="High" />
                  <Bar dataKey="mediumImpact" stackId="a" fill={CHART.secondary} name="Medium" />
                  <Bar dataKey="lowImpact" stackId="a" fill={CHART.tertiary} name="Low" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Exceptions requiring attention</CardTitle>
              <CardDescription>Overdue obligations, high-impact updates, and contracts nearing expiry</CardDescription>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No open exceptions.</p>
              ) : (
                <div className="divide-y divide-border">
                  {exceptions.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => navigate(row.href)}
                      className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          row.severity === 'critical'
                            ? 'bg-red-500'
                            : row.severity === 'high'
                              ? 'bg-amber-500'
                              : 'bg-muted-foreground/50'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{row.title}</p>
                        <p className="text-[12px] text-muted-foreground">{row.detail}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                        {row.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Analytics Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{complianceMetrics.totalObligations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{complianceMetrics.completionRate}%</div>
                <Progress value={complianceMetrics.completionRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{complianceMetrics.averageCompletionTime} days</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Obligation Completion Trends</CardTitle>
              <CardDescription>Monthly breakdown of completed vs overdue obligations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={obligationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke={CHART.primary} fill={CHART.primary} fillOpacity={0.35} name="Completed" />
                  <Area type="monotone" dataKey="overdue" stackId="1" stroke={CHART.danger} fill={CHART.danger} fillOpacity={0.45} name="Overdue" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Obligation Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Completed</span>
                  </div>
                  <span className="font-semibold">{complianceMetrics.completedObligations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>Upcoming</span>
                  </div>
                  <span className="font-semibold">{complianceMetrics.upcomingObligations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Overdue</span>
                  </div>
                  <span className="font-semibold">{complianceMetrics.overdueObligations}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regulatory Trends Tab */}
        <TabsContent value="regulatory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regulatoryMetrics.totalUpdates}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">High Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{regulatoryMetrics.highImpactUpdates}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Assessments Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{regulatoryMetrics.assessmentsCompleted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regulatoryMetrics.averageResponseTime}h</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regulatory Update Impact Analysis</CardTitle>
              <CardDescription>Impact levels of regulatory updates over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regulatoryImpactTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="highImpact" fill={CHART.danger} name="High Impact" />
                  <Bar dataKey="mediumImpact" fill={CHART.secondary} name="Medium Impact" />
                  <Bar dataKey="lowImpact" fill={CHART.tertiary} name="Low Impact" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Metrics Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Documents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...documentMetrics.documentsByType].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="type" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip {...chartTooltipStyle()} />
                    <Bar dataKey="count" name="Count" fill={CHART.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Documents by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...documentMetrics.documentsByStatus].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip {...chartTooltipStyle()} />
                    <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                      {documentMetrics.documentsByStatus.map((entry, index) => (
                        <Cell key={entry.status} fill={chartColors()[index % chartColors().length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Document Processing Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentMetrics.documentsByType.map((doc) => (
                  <div key={doc.type}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{doc.type}</span>
                      <span className="text-slate-600">{doc.count} documents</span>
                    </div>
                    <Progress value={(doc.count / documentMetrics.totalDocuments) * 100} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExportTeam}>
              <Download className="mr-2 h-4 w-4" />
              Export Team CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Overview</CardTitle>
              <CardDescription>Individual team member metrics and productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {teamPerformance.map((member) => (
                  <div key={member.teamMemberId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{member.memberName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">Rating: {member.performanceRating}/5.0</Badge>
                          <Badge variant="outline">Compliance: {member.complianceScore}%</Badge>
                        </div>
                      </div>
                      <Activity className="h-6 w-6 text-brand" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-slate-600">Tasks Completed</div>
                        <div className="text-xl font-bold">{member.tasksCompleted}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">In Progress</div>
                        <div className="text-xl font-bold">{member.tasksInProgress}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Avg Task Time</div>
                        <div className="text-xl font-bold">{member.averageTaskTime}h</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Docs Reviewed</div>
                        <div className="text-xl font-bold">{member.documentsReviewed}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Catalog — industry-style templates */}
        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Catalog</CardTitle>
              <CardDescription>
                Pre-built report packs inspired by OneTrust, Legal Tracker, and enterprise GRC platforms — one-click generate or customize in the builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{template.audience}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s.replace(/-/g, ' ')}</Badge>
                      ))}
                      {template.sections.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{template.sections.length - 4} more</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{template.scheduleHint}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const fmt = template.recommendedFormats[0] ?? 'pdf';
                            const result = await generateFromTemplate(template.id, fmt, reportFilters);
                            await generateAndDownload(result.generated, template.name);
                            toast.success(`${template.name} downloaded.`);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Could not generate report.');
                          }
                        }}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Download {template.recommendedFormats[0]?.toUpperCase() ?? 'PDF'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          applyTemplate(template.id);
                          toast.message('Template loaded in Report Builder.');
                        }}
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Report Sections</CardTitle>
              <CardDescription>Modular sections you can combine in the Report Builder (Legal Tracker Report Builder style)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sectionCatalog.map((section) => (
                  <div key={section.id} className="border rounded-md p-3">
                    <div className="font-medium text-sm">{section.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{section.description}</div>
                    <Badge variant="outline" className="mt-2 text-xs">{section.category}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <Card className="border-brand/30 bg-gradient-to-br from-card to-secondary/40">
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand" />
                    Professional PDF Report Builder
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-2xl">
                    Generate an LICP PDF with logo, system name, organization, and selected module sections
                    - or the full system pack.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit border-brand/40 text-brand">
                  Official · Confidential
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="report-name">Report Title</Label>
                  <Input
                    id="report-name"
                    placeholder="e.g. Q2 Compliance & Legal Operations Pack"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="template">Start from Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Choose a template or build from scratch" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Label>Report Sections</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const all = sectionCatalog.map((s) => s.id);
                          setSelectedSections(all);
                          setSelectedTemplate('full-legal-operations');
                          if (!reportName.trim()) setReportName('Full System Report - LICP');
                          toast.message('All modules selected for full system report.');
                        }}
                      >
                        Full System Report
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSections(sectionCatalog.map((s) => s.id))}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSections([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {selectedSections.length} of {sectionCatalog.length} sections selected
                  </p>
                  <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border p-4">
                    {Array.from(new Set(sectionCatalog.map((s) => s.category))).map((category) => (
                      <div key={category}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </p>
                        <div className="space-y-3">
                          {sectionCatalog
                            .filter((s) => s.category === category)
                            .map((section) => (
                              <div key={section.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={section.id}
                                  checked={selectedSections.includes(section.id)}
                                  onCheckedChange={() => toggleSection(section.id)}
                                />
                                <label htmlFor={section.id} className="cursor-pointer text-sm leading-snug">
                                  <span className="font-medium">{section.title}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {section.description}
                                  </span>
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">Professional PDF (recommended)</SelectItem>
                        <SelectItem value="excel">Excel (CSV)</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date-range">Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger id="date-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">Last 7 Days</SelectItem>
                        <SelectItem value="last-month">Last 30 Days</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="jurisdiction">Jurisdiction Filter</Label>
                    <Select value={jurisdiction} onValueChange={setJurisdiction}>
                      <SelectTrigger id="jurisdiction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All jurisdictions</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                        <SelectItem value="EAC">EAC</SelectItem>
                        <SelectItem value="International">International</SelectItem>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!reportName.trim()) {
                          toast.error('Report title is required for preview.');
                          return;
                        }
                        const secs = selectedSections.length ? selectedSections : ['compliance-metrics'];
                        setPreviewLoading(true);
                        setPreviewData(null);
                        try {
                          const preview = await previewReport({
                            title: reportName,
                            sections: secs,
                            filters: reportFilters,
                            templateId: selectedTemplate || undefined,
                          });
                          setPreviewData(preview);
                        } catch {
                          toast.error('Preview failed.');
                        } finally {
                          setPreviewLoading(false);
                        }
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Preview Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Report Preview</DialogTitle>
                      <DialogDescription>
                        Live data preview - the downloaded PDF starts with title, logo, and report meta.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {previewLoading && <p className="text-sm text-muted-foreground">Building preview…</p>}
                      {!previewLoading && !previewData && (
                        <div className="rounded-lg border bg-slate-50 py-8 text-center">
                          <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
                          <p className="text-slate-600">Click Preview to render report sections from live data</p>
                        </div>
                      )}
                      {previewData && (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            {previewData.organizationName} · {previewData.periodLabel} ·{' '}
                            {format(new Date(previewData.generatedAt), 'PPp')}
                          </div>
                          {previewData.sections.map((section) => (
                            <div key={section.id} className="rounded-lg border p-4">
                              <h4 className="font-semibold">{section.title}</h4>
                              {section.summary && (
                                <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
                              )}
                              {section.metrics && (
                                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                                  {section.metrics.map((m) => (
                                    <div key={m.label} className="rounded border p-2 text-sm">
                                      <div className="text-muted-foreground">{m.label}</div>
                                      <div className="font-medium">{m.value}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {section.tables?.map((table) => (
                                <div key={table.title} className="mt-3 overflow-x-auto">
                                  <div className="mb-1 text-sm font-medium">{table.title}</div>
                                  <table className="w-full border text-xs">
                                    <thead>
                                      <tr>
                                        {table.headers.map((h) => (
                                          <th key={h} className="border p-1 text-left">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {table.rows.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                          {row.map((cell, j) => (
                                            <td key={j} className="border p-1">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {table.rows.length > 5 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      + {table.rows.length - 5} more rows in full export
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={async () => {
                    if (!reportName.trim()) {
                      toast.error('Report title is required.');
                      return;
                    }
                    if (!selectedSections.length) {
                      toast.error('Select at least one section, or click Full System Report.');
                      return;
                    }
                    try {
                      const saved = await saveReport({
                        name: reportName,
                        sections: selectedSections,
                        templateId: selectedTemplate || undefined,
                        filters: reportFilters,
                      });
                      const formatToUse = exportFormat || 'pdf';
                      const generated = await generateReport(saved.id, formatToUse);
                      await generateAndDownload(generated, reportName);
                      toast.success(
                        formatToUse === 'pdf'
                          ? 'Professional PDF downloaded.'
                          : 'Report downloaded.'
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not generate report.');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportFormat === 'pdf' ? 'Generate Professional PDF' : 'Generate Report'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    const all = sectionCatalog.map((s) => s.id);
                    const title = reportName.trim() || 'Full System Report - LICP';
                    setSelectedSections(all);
                    setSelectedTemplate('full-legal-operations');
                    setExportFormat('pdf');
                    setReportName(title);
                    try {
                      const saved = await saveReport({
                        name: title,
                        sections: all,
                        templateId: 'full-legal-operations',
                        filters: reportFilters,
                      });
                      const generated = await generateReport(saved.id, 'pdf');
                      await generateAndDownload(generated, title);
                      toast.success('Full system PDF downloaded.');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Could not generate full report.');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Full System PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!reportName.trim()) {
                      toast.error('Report title is required.');
                      return;
                    }
                    try {
                      const secs = selectedSections.length ? selectedSections : ['compliance-metrics'];
                      await saveReport({
                        name: reportName,
                        sections: secs,
                        templateId: selectedTemplate || undefined,
                        filters: reportFilters,
                      });
                      toast.success('Report template saved.');
                    } catch {
                      toast.error('Could not save report.');
                    }
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Save as Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Reports</CardTitle>
                  <CardDescription>Automated report generation and distribution</CardDescription>
                </div>
                <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setScheduleOpen(true)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Create Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Report Distribution</DialogTitle>
                      <DialogDescription>Automated generation and email notification (Legal Tracker Report Scheduler style)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Saved report</Label>
                        <Select value={scheduleReportId} onValueChange={setScheduleReportId}>
                          <SelectTrigger><SelectValue placeholder="Select a saved report" /></SelectTrigger>
                          <SelectContent>
                            {customReports.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Recipients (comma-separated emails)</Label>
                        <Input
                          value={scheduleRecipients}
                          onChange={(e) => setScheduleRecipients(e.target.value)}
                          placeholder="co@company.com, manager@company.com"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!scheduleReportId) {
                            toast.error('Select a report.');
                            return;
                          }
                          const recipients = scheduleRecipients.split(',').map((e) => e.trim()).filter(Boolean);
                          if (!recipients.length) {
                            toast.error('Add at least one recipient.');
                            return;
                          }
                          try {
                            await scheduleReport({
                              reportId: scheduleReportId,
                              frequency: scheduleFrequency as 'daily' | 'weekly' | 'monthly' | 'quarterly',
                              format: exportFormat,
                              recipients,
                            });
                            toast.success('Schedule created.');
                            setScheduleOpen(false);
                          } catch {
                            toast.error('Could not create schedule.');
                          }
                        }}
                      >
                        Save Schedule
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{report.reportName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{report.frequency}</Badge>
                          <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                          <Badge className={report.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {report.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setScheduleReportId(''); setScheduleOpen(true); }}>
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const generated = await runScheduledReport(report.id);
                            await generateAndDownload(generated, report.reportName);
                            toast.success('Scheduled report downloaded.');
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Run failed.');
                          }
                        }}
                      >
                        Run now
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Next Run:</span>
                        <div className="font-medium">{format(new Date(report.nextRunDate), 'PPp')}</div>
                      </div>
                      <div>
                        <span className="text-slate-600">Last Run:</span>
                        <div className="font-medium">
                          {report.lastRunDate ? format(new Date(report.lastRunDate), 'PPp') : 'Never'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600">Recipients:</span>
                        <div className="font-medium">{report.recipients.length} users</div>
                      </div>
                    </div>
                  </div>
                ))}
                {scheduledReports.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No scheduled reports configured.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Reports Archive</CardTitle>
              <CardDescription>Previously generated reports available for download</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatedReports.map((report) => (
                  <div
                    key={report.id}
                    id={`report-${report.id}`}
                    className={`flex items-center justify-between border rounded-lg p-3 ${
                      highlightedReportId === report.id ? 'border-brand bg-brand/5 ring-2 ring-brand/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-brand" />
                      <div>
                        <div className="font-medium">{report.reportName}</div>
                        <div className="text-sm text-slate-600">
                          Generated {format(new Date(report.createdAt), 'PPp')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const ext = report.format === 'pdf' ? 'pdf' : report.format === 'json' ? 'json' : 'csv';
                            await downloadGenerated(report.id, `${report.reportName}.${ext}`);
                          } catch {
                            toast.error('Download failed.');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-6">
          {!executiveSummary ? (
            <Card className="shadow-none">
              <CardContent className="py-8 text-center text-muted-foreground">
                Executive summary is available to managers and administrators.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Executive summary</h2>
                  <p className="text-sm text-muted-foreground">Period: {executiveSummary.period}</p>
                </div>
                <Button variant="outline" onClick={handleExportCompliance}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              <KpiGrid
                kpis={headlineKpis.filter((k) =>
                  ['compliance-score', 'overdue', 'high-impact', 'audit-readiness'].includes(k.id)
                )}
                className="xl:grid-cols-4"
              />

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Compliance trajectory</CardTitle>
                  <CardDescription>Strategic view of completion rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={obligationTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip {...chartTooltipStyle()} />
                      <Area
                        type="monotone"
                        dataKey="completionRate"
                        name="Completion %"
                        stroke={CHART.primary}
                        fill={CHART.secondary}
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {executiveSummary.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {executiveSummary.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Exceptions board</CardTitle>
                  <CardDescription>Items that need GC / leadership attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {exceptions.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">No critical exceptions this period.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {exceptions.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => navigate(row.href)}
                          className="flex w-full items-start gap-3 py-3 text-left hover:bg-muted/40"
                        >
                          <AlertCircle
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              row.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{row.title}</p>
                            <p className="text-[12px] text-muted-foreground">{row.detail}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Audit Readiness Tab */}
        <TabsContent value="audit" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{auditReadinessMetrics.overallReadiness}%</div>
                <Progress value={auditReadinessMetrics.overallReadiness} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{auditReadinessMetrics.criticalIssues}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pending Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{auditReadinessMetrics.pendingActions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {auditReadinessMetrics.documentationComplete}/{auditReadinessMetrics.documentationTotal}
                </div>
                <Progress
                  value={(auditReadinessMetrics.documentationComplete / auditReadinessMetrics.documentationTotal) * 100}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Gaps</CardTitle>
              <CardDescription>Critical areas requiring attention before the next audit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditReadinessMetrics.complianceGaps.map((gap) => (
                  <div key={gap.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{gap.category}</h3>
                          <Badge className={getSeverityColor(gap.severity)}>{gap.severity}</Badge>
                          <Badge variant="outline">{gap.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-slate-600 mt-1">{gap.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-3">
                      {gap.assignedTo && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Assigned to: {gap.assignedTo}</span>
                        </div>
                      )}
                      {gap.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(gap.dueDate, 'PP')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditReadinessMetrics.lastAuditDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Last Audit</span>
                    <span className="font-semibold">{format(auditReadinessMetrics.lastAuditDate, 'PPP')}</span>
                  </div>
                )}
                {auditReadinessMetrics.nextAuditDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Next Audit</span>
                    <span className="font-semibold text-brand">{format(auditReadinessMetrics.nextAuditDate, 'PPP')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
