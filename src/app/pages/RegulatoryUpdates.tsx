import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
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
import { Separator } from '../components/ui/separator';
import {
  Bell,
  AlertCircle,
  FileText,
  Eye,
  Mail,
  Smartphone,
  Plus,
  Check,
  Clock,
  TrendingUp,
  Settings,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { impactAssessments, updateSubscriptions } from '../data/modulesData';
import { useRegulatoryUpdates } from '../hooks/useRegulatoryUpdates';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { RegulatoryComplianceFlow } from '../components/workflow/RegulatoryComplianceFlow';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { clearSearchParams } from '../lib/citation-routes';

export function RegulatoryUpdates() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedUpdate, setSelectedUpdate] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [subscriptions, setSubscriptions] = useState(updateSubscriptions);
  const [assessments, setAssessments] = useState(impactAssessments);
  const [assessOpenFor, setAssessOpenFor] = useState<string | null>(null);
  const [assessForm, setAssessForm] = useState({
    impactLevel: 'medium',
    departments: '',
    actions: '',
    cost: '',
    effort: '',
    deadline: '',
    notes: '',
  });
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [statusDialogFor, setStatusDialogFor] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState('reviewed');
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subForm, setSubForm] = useState({
    rwanda: true,
    eac: false,
    international: false,
    finance: false,
    labor: true,
    tech: false,
    email: true,
    sms: false,
  });
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{
          settings: {
            regulatorySubscriptions?: typeof updateSubscriptions;
            impactAssessments?: typeof impactAssessments;
          };
        }>('/org/settings');
        const apiSubs = data.settings?.regulatorySubscriptions;
        const apiImpact = data.settings?.impactAssessments;
        if (apiSubs?.length) setSubscriptions([...updateSubscriptions, ...apiSubs]);
        if (apiImpact?.length) setAssessments([...impactAssessments, ...apiImpact]);
      } catch {
        // Keep demo data
      }
    })();
  }, []);

  const { updates, summary, loading, error, reviewUpdate, createObligationFromUpdate, createUpdate, updateUpdate } =
    useRegulatoryUpdates(selectedCategory, selectedStatus);

  useEffect(() => {
    const updateId = searchParams.get('update');
    if (updateId && updates.some((u) => u.id === updateId)) {
      setSelectedUpdate(updateId);
    }
    const impact = searchParams.get('impact');
    if (impact === 'high' || impact === 'medium' || impact === 'low' || impact === 'all') {
      setSelectedImpact(impact);
    }
    const status = searchParams.get('status');
    if (status) setSelectedStatus(status);
  }, [searchParams, updates]);

  const clearUpdateParam = () => {
    clearSearchParams(searchParams, setSearchParams, ['update']);
    setSelectedUpdate(null);
  };

  const persistOrgList = async (
    key: 'impactAssessments' | 'regulatorySubscriptions',
    next: unknown[]
  ) => {
    try {
      const current = await apiRequest<{ settings: Record<string, unknown> }>('/org/settings');
      await apiRequest('/org/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...current.settings,
          [key]: next,
        }),
      });
    } catch {
      // Non-admin or settings unavailable — keep local state
    }
  };

  const handleSaveAssessment = async (updateId: string) => {
    setSavingAssessment(true);
    try {
      await updateUpdate(updateId, {
        impact: assessForm.impactLevel,
        status: 'action_required',
        isRead: true,
      });
      const entry = {
        id: `ia-${Date.now()}`,
        updateId,
        assessedBy: user?.fullName ?? 'Current User',
        assessedAt: new Date(),
        impactLevel: assessForm.impactLevel as 'critical' | 'high' | 'medium' | 'low' | 'minimal',
        affectedDepartments: assessForm.departments
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        requiredActions: assessForm.actions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        estimatedCost: Number(assessForm.cost) || 0,
        estimatedEffort: assessForm.effort || 'TBD',
        deadline: assessForm.deadline ? new Date(assessForm.deadline) : new Date(),
        notes: assessForm.notes,
      };
      const next = [entry, ...assessments];
      setAssessments(next);
      await persistOrgList(
        'impactAssessments',
        next.map((a) => ({
          ...a,
          assessedAt: a.assessedAt instanceof Date ? a.assessedAt.toISOString() : a.assessedAt,
          deadline: a.deadline instanceof Date ? a.deadline.toISOString() : a.deadline,
        }))
      );
      toast.success('Impact assessment saved.');
      setAssessOpenFor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleUpdateStatus = async (updateId: string) => {
    try {
      await reviewUpdate(updateId, statusValue);
      toast.success('Status updated.');
      setStatusDialogFor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleCreateSubscription = async () => {
    setSavingSub(true);
    try {
      const jurisdictions = [
        subForm.rwanda && 'Rwanda',
        subForm.eac && 'EAC',
        subForm.international && 'International',
      ].filter(Boolean) as string[];
      const industries = [
        subForm.finance && 'Finance',
        subForm.labor && 'Labor',
        subForm.tech && 'Technology',
      ].filter(Boolean) as string[];
      if (jurisdictions.length === 0) {
        toast.error('Select at least one jurisdiction.');
        return;
      }
      const entry = {
        id: `sub-${Date.now()}`,
        userId: user?.id ?? 'current',
        jurisdictions,
        industries,
        categories: ['new_law', 'amendment'] as Array<'new_law' | 'amendment'>,
        emailNotifications: subForm.email,
        smsNotifications: subForm.sms,
      };
      const next = [...subscriptions, entry];
      setSubscriptions(next);
      await persistOrgList('regulatorySubscriptions', next);
      toast.success('Subscription created.');
      setSubDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription.');
    } finally {
      setSavingSub(false);
    }
  };

  const [newUpdate, setNewUpdate] = useState({
    title: '',
    description: '',
    category: 'new_law',
    jurisdiction: 'Rwanda',
    source: '',
    impact: 'medium',
    effectiveDate: '',
  });
  const [savingUpdate, setSavingUpdate] = useState(false);

  const filteredUpdates = (updates ?? []).filter(
    (u) => selectedImpact === 'all' || u.impactLevel === selectedImpact
  );
  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      new_law: { label: 'New Law', className: 'bg-brand/10 text-brand hover:bg-brand/10' },
      amendment: { label: 'Amendment', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      repeal: { label: 'Repeal', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      guidance: { label: 'Guidance', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      notice: { label: 'Notice', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    };
    const badge = badges[category] || { label: category, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending_review: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      reviewed: { label: 'Reviewed', className: 'bg-brand/10 text-brand hover:bg-brand/10' },
      action_required: { label: 'Action Required', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
      implemented: { label: 'Implemented', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      not_applicable: { label: 'Not Applicable', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getImpactBadge = (impact?: string) => {
    if (!impact) return null;
    const badges: Record<string, { label: string; variant: any }> = {
      critical: { label: 'Critical Impact', variant: 'destructive' },
      high: { label: 'High Impact', variant: 'destructive' },
      medium: { label: 'Medium Impact', variant: 'secondary' },
      low: { label: 'Low Impact', variant: 'outline' },
      minimal: { label: 'Minimal Impact', variant: 'outline' },
    };
    const badge = badges[impact];
    return badge ? <Badge variant={badge.variant as any}>{badge.label}</Badge> : null;
  };

  const pendingCount = summary?.pendingReview ?? 0;
  const actionRequiredCount = summary?.actionRequired ?? 0;
  const reviewedCount = summary?.reviewed ?? 0;
  const implementedCount = summary?.implemented ?? 0;

  const handleReview = async (id: string) => {
    try {
      await reviewUpdate(id, 'reviewed');
      toast.success('Update marked as reviewed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  const handleCreateObligation = async (id: string) => {
    try {
      await createObligationFromUpdate(id);
      toast.success('Compliance obligation created from this update.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create obligation.');
    }
  };

  const handleCreateUpdate = async () => {
    if (!newUpdate.title.trim() || !newUpdate.description.trim()) {
      toast.error('Title and summary are required.');
      return;
    }
    setSavingUpdate(true);
    try {
      await createUpdate({
        title: newUpdate.title,
        description: newUpdate.description,
        category: newUpdate.category,
        jurisdiction: newUpdate.jurisdiction,
        source: newUpdate.source || undefined,
        impact: newUpdate.impact,
        effectiveDate: newUpdate.effectiveDate || undefined,
      });
      toast.success('Regulatory update added.');
      setNewUpdate({
        title: '',
        description: '',
        category: 'new_law',
        jurisdiction: 'Rwanda',
        source: '',
        impact: 'medium',
        effectiveDate: '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add update.');
    } finally {
      setSavingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load regulatory updates</AlertTitle>
          <AlertDescription>
            {error}. Ensure the API is running with <code className="text-xs">npm run dev:api</code>, then refresh.
          </AlertDescription>
        </Alert>
      )}

      {loading && !error && (
        <p className="text-sm text-muted-foreground">Loading regulatory updates…</p>
      )}
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Updates</h1>
          <p className="text-slate-600 mt-1">Monitor and manage regulatory changes and compliance alerts</p>
        </div>
        <Button onClick={() => setShowWorkflow(!showWorkflow)} variant="outline">
          {showWorkflow ? 'Hide' : 'View'} Complete Workflow
        </Button>
      </div>

      {/* Workflow Visualization */}
      {showWorkflow && <RegulatoryComplianceFlow />}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionRequiredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{implementedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="updates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="updates">All Updates</TabsTrigger>
          <TabsTrigger value="impact">Impact Assessments</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regulatory Feed</CardTitle>
                  <CardDescription>Recent regulatory changes and updates</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Update
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Regulatory Update</DialogTitle>
                      <DialogDescription>Manually add a new regulatory update</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="Update title"
                          value={newUpdate.title}
                          onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={newUpdate.category}
                            onValueChange={(v) => setNewUpdate({ ...newUpdate, category: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new_law">New Law</SelectItem>
                              <SelectItem value="amendment">Amendment</SelectItem>
                              <SelectItem value="repeal">Repeal</SelectItem>
                              <SelectItem value="guidance">Guidance</SelectItem>
                              <SelectItem value="notice">Notice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Jurisdiction</Label>
                          <Select
                            value={newUpdate.jurisdiction}
                            onValueChange={(v) => setNewUpdate({ ...newUpdate, jurisdiction: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select jurisdiction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rwanda">Rwanda</SelectItem>
                              <SelectItem value="EAC">EAC</SelectItem>
                              <SelectItem value="International">International</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Summary</Label>
                        <Textarea
                          placeholder="Brief summary of the update"
                          value={newUpdate.description}
                          onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Source</Label>
                        <Input
                          placeholder="Official source of the update"
                          value={newUpdate.source}
                          onChange={(e) => setNewUpdate({ ...newUpdate, source: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Impact</Label>
                          <Select
                            value={newUpdate.impact}
                            onValueChange={(v) => setNewUpdate({ ...newUpdate, impact: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="minimal">Minimal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Effective Date (Optional)</Label>
                          <Input
                            type="date"
                            value={newUpdate.effectiveDate}
                            onChange={(e) => setNewUpdate({ ...newUpdate, effectiveDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleCreateUpdate} disabled={savingUpdate}>
                        {savingUpdate ? 'Adding…' : 'Add Update'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="new_law">New Law</SelectItem>
                    <SelectItem value="amendment">Amendment</SelectItem>
                    <SelectItem value="repeal">Repeal</SelectItem>
                    <SelectItem value="guidance">Guidance</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="action_required">Action Required</SelectItem>
                    <SelectItem value="implemented">Implemented</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {!loading && filteredUpdates.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    {error ? 'Regulatory updates could not be loaded.' : 'No regulatory updates found.'}
                  </div>
                )}
                {filteredUpdates.map((update) => (
                  <div key={update.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryBadge(update.category)}
                          {getImpactBadge(update.impactLevel)}
                          {update.jurisdiction && (
                            <Badge variant="outline">{update.jurisdiction}</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{update.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{update.summary}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Published: {format(new Date(update.datePublished), 'MMM dd, yyyy')}</span>
                          {update.effectiveDate && (
                            <>
                              <span>•</span>
                              <span>Effective: {format(new Date(update.effectiveDate), 'MMM dd, yyyy')}</span>
                            </>
                          )}
                          {update.source && (
                            <>
                              <span>•</span>
                              <span>
                                Source:{' '}
                                {/^https?:\/\//i.test(update.source) ? (
                                  <a
                                    href={update.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand hover:underline"
                                  >
                                    {update.source}
                                  </a>
                                ) : (
                                  update.source
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(update.status)}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      {update.status === 'pending_review' && (
                        <Button size="sm" onClick={() => handleReview(update.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          Mark Reviewed
                        </Button>
                      )}
                      {(update.status === 'reviewed' || update.status === 'action_required') && (
                        <Button size="sm" variant="outline" onClick={() => handleCreateObligation(update.id)}>
                          Create Obligation
                        </Button>
                      )}
                      <Dialog
                        open={selectedUpdate === update.id}
                        onOpenChange={(open) => {
                          if (!open) clearUpdateParam();
                          else setSelectedUpdate(update.id);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUpdate(update.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{update.title}</DialogTitle>
                            <DialogDescription>
                              {update.jurisdiction} • {format(new Date(update.datePublished), 'MMM dd, yyyy')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Summary</h4>
                              <p className="text-sm text-slate-600">{update.summary}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Full Text</h4>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">{update.description}</p>
                            </div>
                            {(update.affectedRegulations ?? []).length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Affected Regulations</h4>
                                <ul className="list-disc list-inside text-sm text-slate-600">
                                  {(update.affectedRegulations ?? []).map((reg, idx) => (
                                    <li key={idx}>{reg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {update.reviewedBy && update.reviewedAt && (
                              <div className="p-3 bg-green-50 rounded">
                                <p className="text-sm">
                                  Reviewed by {update.reviewedBy} on{' '}
                                  {format(new Date(update.reviewedAt), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={assessOpenFor === update.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setAssessOpenFor(update.id);
                            setAssessForm({
                              impactLevel: update.impactLevel || 'medium',
                              departments: '',
                              actions: '',
                              cost: '',
                              effort: '',
                              deadline: '',
                              notes: '',
                            });
                          } else {
                            setAssessOpenFor(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Assess Impact
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Impact Assessment</DialogTitle>
                            <DialogDescription>Assess the impact of this regulatory update on your organization</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Impact Level</Label>
                              <Select
                                value={assessForm.impactLevel}
                                onValueChange={(v) => setAssessForm((f) => ({ ...f, impactLevel: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select impact level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="critical">Critical</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Affected Departments</Label>
                              <Input
                                placeholder="e.g., Legal, Compliance, HR"
                                value={assessForm.departments}
                                onChange={(e) => setAssessForm((f) => ({ ...f, departments: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Required Actions</Label>
                              <Textarea
                                placeholder="One action per line"
                                rows={4}
                                value={assessForm.actions}
                                onChange={(e) => setAssessForm((f) => ({ ...f, actions: e.target.value }))}
                              />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Estimated Cost (RWF)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={assessForm.cost}
                                  onChange={(e) => setAssessForm((f) => ({ ...f, cost: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Estimated Effort</Label>
                                <Input
                                  placeholder="e.g., 2 weeks"
                                  value={assessForm.effort}
                                  onChange={(e) => setAssessForm((f) => ({ ...f, effort: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Implementation Deadline</Label>
                              <Input
                                type="date"
                                value={assessForm.deadline}
                                onChange={(e) => setAssessForm((f) => ({ ...f, deadline: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Additional Notes</Label>
                              <Textarea
                                placeholder="Any additional notes or considerations"
                                rows={3}
                                value={assessForm.notes}
                                onChange={(e) => setAssessForm((f) => ({ ...f, notes: e.target.value }))}
                              />
                            </div>
                            <Button
                              className="w-full"
                              disabled={savingAssessment}
                              onClick={() => handleSaveAssessment(update.id)}
                            >
                              {savingAssessment ? 'Saving…' : 'Save Assessment'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={statusDialogFor === update.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setStatusDialogFor(update.id);
                            setStatusValue(update.status || 'reviewed');
                          } else {
                            setStatusDialogFor(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Status</DialogTitle>
                            <DialogDescription>Change workflow status for this regulatory update</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select value={statusValue} onValueChange={setStatusValue}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending_review">Pending review</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="action_required">Action required</SelectItem>
                                <SelectItem value="implemented">Implemented</SelectItem>
                                <SelectItem value="not_applicable">Not applicable</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button className="w-full" onClick={() => handleUpdateStatus(update.id)}>
                              Save Status
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Assessments Tab */}
        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impact Assessments</CardTitle>
              <CardDescription>Detailed assessments of regulatory updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessments.map((assessment) => {
                const update = filteredUpdates.find((u) => u.id === assessment.updateId);
                return (
                  <div key={assessment.id} className="p-4 border rounded-lg">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getImpactBadge(assessment.impactLevel)}
                        {update && getCategoryBadge(update.category)}
                      </div>
                      <h3 className="font-semibold text-lg">{update?.title}</h3>
                      <p className="text-sm text-slate-600">
                        Assessed by {assessment.assessedBy} on {format(assessment.assessedAt, 'MMM dd, yyyy')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Affected Departments</p>
                        <div className="flex flex-wrap gap-2">
                          {assessment.affectedDepartments.map((dept, idx) => (
                            <Badge key={idx} variant="secondary">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Required Actions</p>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {assessment.requiredActions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        {assessment.estimatedCost && (
                          <div>
                            <p className="font-medium">Estimated Cost</p>
                            <p className="text-slate-600">RWF {assessment.estimatedCost.toLocaleString()}</p>
                          </div>
                        )}
                        {assessment.estimatedEffort && (
                          <div>
                            <p className="font-medium">Estimated Effort</p>
                            <p className="text-slate-600">{assessment.estimatedEffort}</p>
                          </div>
                        )}
                        {assessment.deadline && (
                          <div>
                            <p className="font-medium">Implementation Deadline</p>
                            <p className="text-slate-600">{format(assessment.deadline, 'MMM dd, yyyy')}</p>
                          </div>
                        )}
                      </div>

                      {assessment.notes && (
                        <div className="p-3 bg-slate-50 rounded">
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-slate-600">{assessment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Subscriptions</CardTitle>
              <CardDescription>Manage your regulatory update subscriptions and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-brand" />
                      <div>
                        <p className="font-medium">Active Subscription</p>
                        <p className="text-sm text-slate-600">Receiving updates for selected topics</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubForm({
                          rwanda: subscription.jurisdictions.includes('Rwanda'),
                          eac: subscription.jurisdictions.includes('EAC'),
                          international: subscription.jurisdictions.includes('International'),
                          finance: subscription.industries.includes('Finance'),
                          labor: subscription.industries.includes('Labor'),
                          tech: subscription.industries.includes('Technology'),
                          email: subscription.emailNotifications,
                          sms: subscription.smsNotifications,
                        });
                        setSubDialogOpen(true);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold">Jurisdictions</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {subscription.jurisdictions.map((jurisdiction, idx) => (
                            <Badge key={idx} variant="outline">
                              {jurisdiction}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Industries</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {subscription.industries.map((industry, idx) => (
                            <Badge key={idx} variant="secondary">
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Categories</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {subscription.categories.map((category, idx) => (
                            <Badge key={idx}>
                              {category.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">Notification Methods</Label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-brand" />
                              <div>
                                <p className="font-medium text-sm">Email Notifications</p>
                                <p className="text-xs text-slate-600">Receive updates via email</p>
                              </div>
                            </div>
                            <Switch checked={subscription.emailNotifications} />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Smartphone className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium text-sm">SMS Notifications</p>
                                <p className="text-xs text-slate-600">Receive critical updates via SMS</p>
                              </div>
                            </div>
                            <Switch checked={subscription.smsNotifications} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Add New Subscription</h3>
                <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Subscription</DialogTitle>
                      <DialogDescription>Subscribe to regulatory updates for specific topics</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Jurisdictions</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="rwanda"
                              checked={subForm.rwanda}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, rwanda: Boolean(c) }))}
                            />
                            <label htmlFor="rwanda" className="text-sm">Rwanda</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="eac"
                              checked={subForm.eac}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, eac: Boolean(c) }))}
                            />
                            <label htmlFor="eac" className="text-sm">EAC</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="international"
                              checked={subForm.international}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, international: Boolean(c) }))}
                            />
                            <label htmlFor="international" className="text-sm">International</label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Industries</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="finance"
                              checked={subForm.finance}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, finance: Boolean(c) }))}
                            />
                            <label htmlFor="finance" className="text-sm">Finance</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="labor"
                              checked={subForm.labor}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, labor: Boolean(c) }))}
                            />
                            <label htmlFor="labor" className="text-sm">Labor</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="tech"
                              checked={subForm.tech}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, tech: Boolean(c) }))}
                            />
                            <label htmlFor="tech" className="text-sm">Technology</label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notification Preferences</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="email"
                              checked={subForm.email}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, email: Boolean(c) }))}
                            />
                            <label htmlFor="email" className="text-sm">Email notifications</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="sms"
                              checked={subForm.sms}
                              onCheckedChange={(c) => setSubForm((f) => ({ ...f, sms: Boolean(c) }))}
                            />
                            <label htmlFor="sms" className="text-sm">SMS notifications (critical only)</label>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full" disabled={savingSub} onClick={handleCreateSubscription}>
                        {savingSub ? 'Creating…' : 'Create Subscription'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
