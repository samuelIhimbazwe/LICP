import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import {
  Bell,
  FileText,
  CheckCircle2,
  Upload,
  TrendingUp,
  BarChart3,
  Shield,
  ArrowRight,
  Eye,
  Plus,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface RegulationFlowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'completed' | 'in_progress' | 'pending';
  role: string;
  action?: string;
}

export function RegulatoryComplianceFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createObligationOpen, setCreateObligationOpen] = useState(false);
  const [uploadEvidenceOpen, setUploadEvidenceOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [createdObligationId, setCreatedObligationId] = useState<string | null>(null);
  const [obligationForm, setObligationForm] = useState({
    title: 'GDPR Article 30 - Records of Processing',
    description: 'Maintain records of data processing activities as required by GDPR Article 30',
    deadline: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    assignedTo: user?.fullName ?? 'Compliance Officer',
    regulation: 'GDPR Article 30',
  });
  const [evidenceForm, setEvidenceForm] = useState({
    title: 'Data Processing Records',
    notes: '',
    file: null as File | null,
  });

  const canAccessStep = (stepRole: string) => {
    if (stepRole === 'all') return true;
    if (user?.role === 'admin') return true;
    if (stepRole === 'compliance_officer' && user?.role === 'compliance_officer') return true;
    if (stepRole === 'manager' && (user?.role === 'manager' || user?.role === 'admin')) return true;
    return false;
  };

  const steps: RegulationFlowStep[] = [
    {
      id: 1,
      title: 'New Regulation Published',
      description: 'Regulatory update is received and logged in the system',
      icon: Bell,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'in_progress' : 'pending',
      role: 'all',
      action: 'View Regulation'
    },
    {
      id: 2,
      title: 'Compliance Officer Reviews',
      description: 'Assigned compliance officer reviews and assesses impact',
      icon: Eye,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'in_progress' : 'pending',
      role: 'compliance_officer',
      action: 'Review Update'
    },
    {
      id: 3,
      title: 'Obligation Created',
      description: 'Compliance obligation is created based on the regulation',
      icon: FileText,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'in_progress' : 'pending',
      role: 'compliance_officer',
      action: 'Create Obligation'
    },
    {
      id: 4,
      title: 'Evidence Uploaded',
      description: 'Supporting documents and evidence are collected',
      icon: Upload,
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'in_progress' : 'pending',
      role: 'compliance_officer',
      action: 'Upload Evidence'
    },
    {
      id: 5,
      title: 'Status Tracked',
      description: 'Compliance status is monitored and updated',
      icon: TrendingUp,
      status: currentStep > 5 ? 'completed' : currentStep === 5 ? 'in_progress' : 'pending',
      role: 'compliance_officer',
      action: 'Update Status'
    },
    {
      id: 6,
      title: 'Reports Generated',
      description: 'Compliance reports are generated for stakeholders',
      icon: BarChart3,
      status: currentStep > 6 ? 'completed' : currentStep === 6 ? 'in_progress' : 'pending',
      role: 'manager',
      action: 'Generate Report'
    },
    {
      id: 7,
      title: 'Audit Log Recorded',
      description: 'All actions are logged for audit trail',
      icon: Shield,
      status: currentStep > 7 ? 'completed' : currentStep === 7 ? 'in_progress' : 'pending',
      role: 'admin',
      action: 'View Audit Log'
    }
  ];

  const handleCreateObligation = async () => {
    if (!obligationForm.title.trim() || !obligationForm.deadline) {
      toast.error('Title and deadline are required.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<{ obligation: { id: string } }>('/compliance/obligations', {
        method: 'POST',
        body: JSON.stringify({
          title: obligationForm.title.trim(),
          description: obligationForm.description,
          regulation: obligationForm.regulation,
          jurisdiction: 'Rwanda',
          department: 'Legal',
          requirementLevel: 'mandatory',
          deadline: obligationForm.deadline,
          assignedTo: obligationForm.assignedTo,
          status: 'not_assessed',
        }),
      });
      setCreatedObligationId(result.obligation.id);
      setCreateObligationOpen(false);
      setCurrentStep(4);
      toast.success('Compliance obligation created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create obligation.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!createdObligationId) {
      toast.error('Create an obligation first (step 3).');
      return;
    }
    if (!evidenceForm.title.trim() && !evidenceForm.file) {
      toast.error('Provide an evidence title or file.');
      return;
    }
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      let fileName = evidenceForm.title.trim() || 'evidence.txt';
      if (evidenceForm.file) {
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result ?? '');
            resolve(result.includes(',') ? result.split(',')[1] : result);
          };
          reader.onerror = () => reject(new Error('Could not read file'));
          reader.readAsDataURL(evidenceForm.file!);
        });
        const uploaded = await apiRequest<{ fileUrl: string; fileName: string }>('/files/upload', {
          method: 'POST',
          body: JSON.stringify({
            fileName: evidenceForm.file.name,
            contentBase64,
            mimeType: evidenceForm.file.type || 'application/octet-stream',
          }),
        });
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
      }
      await apiRequest(`/compliance/obligations/${createdObligationId}/evidence`, {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          fileUrl,
          notes: evidenceForm.notes || undefined,
        }),
      });
      setUploadEvidenceOpen(false);
      setCurrentStep(5);
      toast.success('Evidence uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Evidence upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!createdObligationId) {
      toast.error('Create an obligation first.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/compliance/obligations/${createdObligationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'compliant' }),
      });
      setCurrentStep(6);
      toast.success('Status updated to Compliant.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed. Evidence may be required.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateReport = async () => {
    setBusy(true);
    try {
      await apiRequest('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: `Compliance Workflow Report ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
          sections: ['compliance-metrics', 'compliance-gaps', 'obligations'],
          format: 'pdf',
          templateId: 'compliance-overview',
        }),
      });
      setCurrentStep(7);
      toast.success('Compliance report generated. Open Analytics & Reporting to download.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Report generation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleStepAction = async (step: RegulationFlowStep) => {
    if (!canAccessStep(step.role)) {
      toast.error(`Access denied. This action requires ${step.role.replace('_', ' ')} role.`);
      return;
    }

    switch (step.id) {
      case 1:
        navigate('/regulatory-updates');
        setCurrentStep(2);
        break;
      case 2:
        navigate('/regulatory-updates');
        setCurrentStep(3);
        toast.success('Open a regulatory update to complete your review.');
        break;
      case 3:
        setCreateObligationOpen(true);
        break;
      case 4:
        setUploadEvidenceOpen(true);
        break;
      case 5:
        await handleUpdateStatus();
        break;
      case 6:
        await handleGenerateReport();
        break;
      case 7:
        navigate('/security');
        break;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'in_progress':
        return 'bg-brand/10 border-brand text-brand';
      case 'pending':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Compliance Workflow</CardTitle>
          <p className="text-sm text-slate-600">
            End-to-end workflow from regulation publication to audit trail
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                <div
                  className={`border-2 rounded-lg p-4 ${getStepColor(step.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${step.status === 'completed' ? 'bg-green-200' : step.status === 'in_progress' ? 'bg-brand/20' : 'bg-gray-200'}`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{step.title}</h3>
                          {step.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {!canAccessStep(step.role) && (
                            <Badge variant="outline" className="text-xs">
                              Restricted
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm opacity-90">{step.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {step.role === 'all' ? 'All Roles' : step.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {step.status === 'completed' && (
                            <span className="text-xs">
                              Completed at {format(new Date(), 'MMM dd, HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {step.action && (step.status === 'in_progress' || step.status === 'completed') && (
                      <Button
                        variant={step.status === 'in_progress' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStepAction(step)}
                        disabled={!canAccessStep(step.role) || busy}
                      >
                        {step.action}
                      </Button>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {user?.role === 'compliance_officer' && (
            <div className="mt-6 p-4 bg-brand/5 border border-brand/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-brand mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground">Your Role Access</h4>
                  <p className="text-sm text-brand mt-1">
                    As a Compliance Officer, you can review regulations, create obligations,
                    upload evidence, and track compliance status (Steps 2-5).
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'manager' && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900">Your Role Access</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    As a Manager, you can view all steps and generate compliance reports (Step 6).
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Your Role Access</h4>
                  <p className="text-sm text-green-700 mt-1">
                    As an Administrator, you have full access to all steps including audit logs (All Steps).
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createObligationOpen} onOpenChange={setCreateObligationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Compliance Obligation</DialogTitle>
            <DialogDescription>
              Create a new compliance obligation from the regulatory update
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="obl-title">Obligation Title</Label>
              <Input
                id="obl-title"
                value={obligationForm.title}
                onChange={(e) => setObligationForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="obl-desc">Description</Label>
              <Textarea
                id="obl-desc"
                rows={3}
                value={obligationForm.description}
                onChange={(e) => setObligationForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="obl-due">Due Date</Label>
                <Input
                  id="obl-due"
                  type="date"
                  value={obligationForm.deadline}
                  onChange={(e) => setObligationForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="obl-reg">Regulation</Label>
                <Input
                  id="obl-reg"
                  value={obligationForm.regulation}
                  onChange={(e) => setObligationForm((f) => ({ ...f, regulation: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="obl-owner">Assigned To</Label>
              <Input
                id="obl-owner"
                value={obligationForm.assignedTo}
                onChange={(e) => setObligationForm((f) => ({ ...f, assignedTo: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateObligationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateObligation} disabled={busy}>
              <Plus className="mr-2 h-4 w-4" />
              {busy ? 'Creating…' : 'Create Obligation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadEvidenceOpen} onOpenChange={setUploadEvidenceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Compliance Evidence</DialogTitle>
            <DialogDescription>
              Upload supporting documents and evidence for this obligation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="evidence-title">Evidence Title</Label>
              <Input
                id="evidence-title"
                value={evidenceForm.title}
                onChange={(e) => setEvidenceForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Data Processing Records 2026"
              />
            </div>
            <div>
              <Label htmlFor="evidence-file">Upload File</Label>
              <Input
                id="evidence-file"
                type="file"
                className="mt-2"
                onChange={(e) => setEvidenceForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
              <p className="text-xs text-slate-600 mt-1">
                Accepted formats: PDF, DOCX, JPG, PNG (Max 10MB)
              </p>
            </div>
            <div>
              <Label htmlFor="evidence-notes">Notes</Label>
              <Textarea
                id="evidence-notes"
                rows={3}
                value={evidenceForm.notes}
                onChange={(e) => setEvidenceForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Add any additional notes about this evidence..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setUploadEvidenceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadEvidence} disabled={busy}>
              <Upload className="mr-2 h-4 w-4" />
              {busy ? 'Uploading…' : 'Upload Evidence'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
