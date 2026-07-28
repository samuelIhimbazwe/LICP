import React, { useEffect, useState } from 'react';
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
import { Progress } from '../components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Upload,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  Download,
  Eye,
  Plus,
  Activity
} from 'lucide-react';
import { useCompliance } from '../hooks/useCompliance';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { RegulatoryComplianceFlow } from '../components/workflow/RegulatoryComplianceFlow';
import { apiRequest, downloadAuthenticated } from '../lib/api';
import { clearSearchParams } from '../lib/citation-routes';

export function ComplianceTracking() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('obligations');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedObligation, setSelectedObligation] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [newObligation, setNewObligation] = useState({
    title: '',
    regulation: '',
    description: '',
    jurisdiction: 'Rwanda',
    department: 'Legal',
    requirementLevel: 'mandatory',
    deadline: '',
    assignedTo: user?.fullName ?? '',
  });
  const [saving, setSaving] = useState(false);

  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState('compliant');
  const [uploadObligationId, setUploadObligationId] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const {
    obligations,
    summary,
    evidence,
    auditActions,
    heatMap,
    calendarEvents,
    loading,
    error,
    createObligation,
    updateObligation,
    uploadEvidence,
    exportReport,
  } = useCompliance(selectedStatus);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'evidence' || tab === 'obligations' || tab === 'audit-trail' || tab === 'heat-map' || tab === 'calendar') {
      setActiveTab(tab);
    }
    const obligationId = searchParams.get('obligation');
    if (obligationId) {
      setSelectedStatus('all');
      setActiveTab('obligations');
      if (obligations.some((o) => o.id === obligationId)) {
        setSelectedObligation(obligationId);
      }
    }
    const evidenceId = searchParams.get('evidence');
    if (evidenceId) {
      setSelectedEvidence(evidenceId);
      setActiveTab('evidence');
      requestAnimationFrame(() => {
        document.getElementById(`evidence-${evidenceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchParams, obligations, evidence]);

  const clearObligationParam = () => {
    clearSearchParams(searchParams, setSearchParams, ['obligation']);
    setSelectedObligation(null);
  };

  const filteredObligations = obligations;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'partially_compliant':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'not_assessed':
        return <Clock className="h-5 w-5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Compliant</Badge>;
      case 'partially_compliant':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partially Compliant</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Non-Compliant</Badge>;
      case 'not_assessed':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Not Assessed</Badge>;
      default:
        return null;
    }
  };

  const getRequirementLevelBadge = (level: string) => {
    switch (level) {
      case 'mandatory':
        return <Badge variant="destructive">Mandatory</Badge>;
      case 'recommended':
        return <Badge variant="secondary">Recommended</Badge>;
      case 'optional':
        return <Badge variant="outline">Optional</Badge>;
      default:
        return null;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const compliantCount = summary?.compliant ?? 0;
  const partialCount = summary?.partial ?? 0;
  const nonCompliantCount = summary?.nonCompliant ?? 0;
  const notAssessedCount = summary?.notAssessed ?? 0;
  const overallRate = summary?.overallRate ?? 0;

  const handleCreateObligation = async () => {
    if (!newObligation.title.trim() || !newObligation.deadline) {
      toast.error('Title and deadline are required.');
      return;
    }
    setSaving(true);
    try {
      await createObligation(newObligation);
      toast.success('Obligation created.');
      setNewObligation({
        title: '',
        regulation: '',
        description: '',
        jurisdiction: 'Rwanda',
        department: 'Legal',
        requirementLevel: 'mandatory',
        deadline: '',
        assignedTo: user?.fullName ?? '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create obligation.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportReport();
      toast.success('Report exported.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateId) return;
    try {
      await updateObligation(statusUpdateId, { status: statusUpdateValue });
      toast.success('Status updated.');
      setStatusUpdateId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleUploadEvidence = async () => {
    if (!uploadObligationId || (!uploadFileName.trim() && !uploadFile)) {
      toast.error('Select a file and obligation.');
      return;
    }
    try {
      let fileUrl: string | undefined;
      let fileName = uploadFileName.trim();
      if (uploadFile) {
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result ?? '');
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Could not read file'));
          reader.readAsDataURL(uploadFile);
        });
        const uploaded = await apiRequest<{ fileUrl: string; fileName: string }>('/files/upload', {
          method: 'POST',
          body: JSON.stringify({
            fileName: uploadFile.name,
            contentBase64,
            mimeType: uploadFile.type || 'application/octet-stream',
          }),
        });
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
      }
      await uploadEvidence(uploadObligationId, {
        fileName,
        notes: uploadNotes || undefined,
        fileUrl,
      });
      toast.success('Evidence uploaded.');
      setUploadObligationId(null);
      setUploadFileName('');
      setUploadNotes('');
      setUploadFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const handleDownloadEvidence = async (item: { id: string; fileName: string }) => {
    try {
      await downloadAuthenticated(`/compliance/evidence/${item.id}/download`, item.fileName || 'evidence.txt');
      toast.success('Evidence downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load compliance data</AlertTitle>
          <AlertDescription>
            {error}. Ensure the API is running with <code className="text-xs">npm run dev:api</code>, then refresh.
          </AlertDescription>
        </Alert>
      )}

      {loading && !error && (
        <p className="text-sm text-muted-foreground">Loading compliance data…</p>
      )}
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Compliance Tracking</h1>
          <p className="text-slate-600 mt-1">Manage compliance obligations and track organizational compliance status</p>
        </div>
        <Button onClick={() => setShowWorkflow(!showWorkflow)} variant="outline">
          {showWorkflow ? 'Hide' : 'View'} Complete Workflow
        </Button>
      </div>

      {/* Workflow Visualization */}
      {showWorkflow && <RegulatoryComplianceFlow />}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliantCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partialCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonCompliantCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Assessed</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notAssessedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallRate}%</div>
            <Progress value={overallRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="heat-map">Compliance Heat Map</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Obligations Tab */}
        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Obligations</CardTitle>
                  <CardDescription>Manage and track all compliance requirements</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Obligation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Compliance Obligation</DialogTitle>
                      <DialogDescription>Create a new compliance requirement for tracking</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="Obligation title"
                            value={newObligation.title}
                            onChange={(e) => setNewObligation({ ...newObligation, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Regulation</Label>
                          <Input
                            placeholder="Source regulation"
                            value={newObligation.regulation}
                            onChange={(e) => setNewObligation({ ...newObligation, regulation: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Detailed description of the requirement"
                          value={newObligation.description}
                          onChange={(e) => setNewObligation({ ...newObligation, description: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Jurisdiction</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rwanda">Rwanda</SelectItem>
                              <SelectItem value="EAC">EAC</SelectItem>
                              <SelectItem value="International">International</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Industry</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Labor">Labor</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Requirement Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mandatory">Mandatory</SelectItem>
                              <SelectItem value="recommended">Recommended</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Deadline</Label>
                          <Input
                            type="date"
                            value={newObligation.deadline}
                            onChange={(e) => setNewObligation({ ...newObligation, deadline: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once">Once</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                              <SelectItem value="ongoing">Ongoing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleCreateObligation} disabled={saving}>
                        {saving ? 'Creating…' : 'Create Obligation'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="partially_compliant">Partially Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="not_assessed">Not Assessed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>

              <div className="space-y-3">
                {!loading && filteredObligations.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No compliance obligations found.
                    {selectedStatus !== 'all' ? ' Try clearing the status filter.' : ' Add one with the button above.'}
                  </div>
                )}
                {filteredObligations.map((obligation) => (
                  <div key={obligation.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(obligation.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{obligation.title}</h3>
                            {getRequirementLevelBadge(obligation.requirementLevel)}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{obligation.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {obligation.regulation}
                            </span>
                            <span>•</span>
                            <span>{obligation.jurisdiction ?? '—'}</span>
                            {obligation.department && (
                              <>
                                <span>•</span>
                                <span>{obligation.department}</span>
                              </>
                            )}
                            {obligation.deadline && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due {format(new Date(obligation.deadline), 'MMM dd, yyyy')}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Assigned to:
                            </span>
                            {obligation.assignedTo?.length ? (
                              obligation.assignedTo.map((person, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {person}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Unassigned
                              </Badge>
                            )}
                            {obligation.assignedTeam && (
                              <Badge variant="secondary" className="text-xs">
                                Team: {obligation.assignedTeam}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(obligation.status)}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t">
                      <Dialog
                        open={selectedObligation === obligation.id}
                        onOpenChange={(open) => {
                          if (!open) clearObligationParam();
                          else setSelectedObligation(obligation.id);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedObligation(obligation.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{obligation.title}</DialogTitle>
                            <DialogDescription>{obligation.regulation}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Description</h4>
                              <p className="text-sm text-slate-600">{obligation.description}</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <h4 className="font-semibold mb-2">Compliance Status</h4>
                                {getStatusBadge(obligation.status)}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Requirement Level</h4>
                                {getRequirementLevelBadge(obligation.requirementLevel)}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Evidence Required</h4>
                              <ul className="list-disc list-inside text-sm text-slate-600">
                                {(obligation.evidenceRequired ?? []).length > 0 ? (
                                  obligation.evidenceRequired!.map((evidence, idx) => (
                                    <li key={idx}>{evidence}</li>
                                  ))
                                ) : (
                                  <li>No specific evidence requirements recorded.</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Timeline</h4>
                              <div className="grid gap-2 text-sm">
                                {obligation.lastAssessment && (
                                  <p>
                                    Last Assessment:{' '}
                                    {format(new Date(obligation.lastAssessment), 'MMM dd, yyyy')}
                                  </p>
                                )}
                                {obligation.nextReview && (
                                  <p>
                                    Next Review:{' '}
                                    {format(new Date(obligation.nextReview), 'MMM dd, yyyy')}
                                  </p>
                                )}
                                {obligation.deadline && (
                                  <p>Deadline: {format(new Date(obligation.deadline), 'MMM dd, yyyy')}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={uploadObligationId === obligation.id}
                        onOpenChange={(open) => {
                          if (!open) setUploadObligationId(null);
                          else {
                            setUploadObligationId(obligation.id);
                            setUploadFileName('');
                            setUploadNotes('');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setUploadObligationId(obligation.id)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Evidence
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Compliance Evidence</DialogTitle>
                            <DialogDescription>Upload documents to demonstrate compliance</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Describe the evidence being uploaded"
                                value={uploadNotes}
                                onChange={(e) => setUploadNotes(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>File Upload</Label>
                              <Input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  setUploadFile(file);
                                  if (file) setUploadFileName(file.name);
                                }}
                              />
                            </div>
                            <Button className="w-full" onClick={handleUploadEvidence}>
                              Upload Evidence
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={statusUpdateId === obligation.id}
                        onOpenChange={(open) => {
                          if (!open) setStatusUpdateId(null);
                          else {
                            setStatusUpdateId(obligation.id);
                            setStatusUpdateValue(obligation.status);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setStatusUpdateId(obligation.id)}>
                            Update Status
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Compliance Status</DialogTitle>
                            <DialogDescription>{obligation.title}</DialogDescription>
                          </DialogHeader>
                          <Select value={statusUpdateValue} onValueChange={setStatusUpdateValue}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compliant">Compliant</SelectItem>
                              <SelectItem value="partially_compliant">Partially Compliant</SelectItem>
                              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                              <SelectItem value="not_assessed">Not Assessed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button className="w-full mt-4" onClick={handleStatusUpdate}>
                            Save Status
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Evidence</CardTitle>
              <CardDescription>Uploaded documents and evidence for compliance demonstration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {evidence.map((item) => {
                  const obligation = obligations.find((o) => o.id === item.obligationId);
                  const highlighted = selectedEvidence === item.id;
                  return (
                    <div
                      key={item.id}
                      id={`evidence-${item.id}`}
                      className={`p-4 border rounded-lg ${highlighted ? 'border-brand bg-brand/5 ring-2 ring-brand/30' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-brand mt-1" />
                          <div>
                            <h4 className="font-semibold">{item.fileName}</h4>
                            <p className="text-sm text-slate-600 mt-1">{item.description ?? item.notes}</p>
                            {obligation && (
                              <p className="text-xs text-slate-500 mt-1">For: {obligation.title}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span>Uploaded by {item.uploadedBy}</span>
                              <span>•</span>
                              <span>{format(new Date(item.uploadedAt), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadEvidence(item)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!loading && evidence.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No evidence uploaded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete history of all compliance-related actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditActions.map((action, index) => {
                  const obligation = obligations.find((o) => o.id === action.obligationId);
                  return (
                    <div key={action.id}>
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-brand mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{action.action}</p>
                          {obligation && (
                            <p className="text-sm text-slate-600 mt-1">Obligation: {obligation.title}</p>
                          )}
                          {action.notes && (
                            <p className="text-sm text-slate-600 mt-1">Notes: {action.notes}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            {action.performedBy} • {format(new Date(action.timestamp), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      {index < auditActions.length - 1 && (
                        <div className="ml-2.5 h-8 w-px bg-slate-200" />
                      )}
                    </div>
                  );
                })}
                {!loading && auditActions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No compliance audit entries yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heat Map Tab */}
        <TabsContent value="heat-map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Heat Map</CardTitle>
              <CardDescription>Visual overview of compliance risk by department and regulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm">
                  <span>Risk Level:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Critical</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {heatMap.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">{item.department}</div>
                      <div className="w-40 text-sm text-slate-600">{item.regulation}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded ${getRiskLevelColor(item.riskLevel)}`} />
                          <Progress value={item.complianceRate} className="flex-1" />
                          <span className="text-sm font-semibold w-12">{item.complianceRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && heatMap.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No heat map data available.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Calendar</CardTitle>
              <CardDescription>Upcoming compliance deadlines and reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(calendarEvents.length ? calendarEvents : obligations.filter((o) => o.deadline))
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                  .map((obligation) => (
                    <div key={obligation.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-brand/5">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-brand">
                            {format(new Date(obligation.deadline), 'd')}
                          </div>
                          <div className="text-xs text-brand">
                            {format(new Date(obligation.deadline), 'MMM')}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{obligation.title}</h4>
                        <p className="text-sm text-slate-600">{obligation.regulation}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(obligation.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Deadline</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(obligation.deadline), 'MMM dd, yyyy')}
                        </p>
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
