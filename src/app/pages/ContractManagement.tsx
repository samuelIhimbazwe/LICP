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
import { Progress } from '../components/ui/progress';
import {
  FolderOpen,
  FileText,
  Upload,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Lock,
  Unlock,
  FileSignature,
  History,
  Users,
  Calendar,
  DollarSign,
  Tag
} from 'lucide-react';
import { useContracts, type ApiContract } from '../hooks/useContracts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { downloadTextFile } from '../lib/ui-actions';
import { copyToClipboard } from '../lib/ui-actions';
import { clearSearchParams } from '../lib/citation-routes';

export function ContractManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'nda',
    counterparty: '',
    folderId: '',
    contractValue: '',
    expiryDate: '',
    fileName: '',
    tags: '',
  });
  const [uploading, setUploading] = useState(false);
  const [editDoc, setEditDoc] = useState<ApiContract | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCounterparty, setEditCounterparty] = useState('');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; version: number; createdAt: string; changeNotes?: string }>>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'nda', description: '' });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const {
    contracts,
    folders,
    summary,
    templates,
    approvals,
    expiryAlerts,
    loading,
    error,
    createContract,
    createFromTemplate,
    checkoutContract,
    checkinContract,
    signContract,
    shareContract,
    updateContract,
    getVersions,
    decideApproval,
    submitForApproval,
    createTemplate,
    createFolder,
  } = useContracts({
    folder: selectedFolder,
    status: selectedStatus,
    search: searchQuery,
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'templates' || tab === 'documents' || tab === 'approvals' || tab === 'expiry' || tab === 'sharing') {
      setActiveTab(tab);
    }
    const contractId = searchParams.get('contract');
    if (contractId) {
      setSelectedFolder('all');
      setSelectedStatus('all');
      setActiveTab('documents');
      if (contracts.some((c) => c.id === contractId)) {
        setSelectedContract(contractId);
      }
    }
    const templateId = searchParams.get('template');
    if (templateId) {
      setSelectedTemplate(templateId);
      setActiveTab('templates');
      requestAnimationFrame(() => {
        document.getElementById(`template-${templateId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchParams, contracts, templates]);

  const clearContractParam = () => {
    clearSearchParams(searchParams, setSearchParams, ['contract']);
    setSelectedContract(null);
  };

  const filteredDocuments = contracts;

  const downloadContract = (doc: ApiContract) => {
    const body = [
      doc.title,
      `Status: ${doc.status}`,
      doc.counterparty ? `Counterparty: ${doc.counterparty}` : '',
      doc.content || 'No content stored for this contract.',
      doc.fileUrl ? `File: ${doc.fileUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    downloadTextFile(`${doc.title.replace(/[^\w.-]+/g, '_')}.txt`, body);
    toast.success('Contract downloaded.');
  };

  const handleShare = async (doc: ApiContract) => {
    try {
      const result = await shareContract(doc.id);
      const share = (result as { share?: { token?: string; publicUrl?: string } }).share;
      const link = share?.publicUrl
        ? `${window.location.origin}${share.publicUrl}`
        : share?.token
          ? `${window.location.origin}/api/v1/public/share/contracts/${share.token}`
          : '';
      if (!link) {
        toast.error('Share created but no link returned.');
        return;
      }
      await copyToClipboard(link, 'Share link copied to clipboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Share failed.');
    }
  };

  const handleCheckout = async (doc: ApiContract) => {
    try {
      await checkoutContract(doc.id);
      toast.success(`Checked out: ${doc.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed.');
    }
  };

  const handleCheckin = async (doc: ApiContract) => {
    try {
      await checkinContract(doc.id);
      toast.success(`Checked in: ${doc.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-in failed.');
    }
  };

  const handleSign = async (doc: ApiContract) => {
    try {
      await signContract(doc.id);
      toast.success(`Signed: ${doc.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign failed.');
    }
  };

  const openEdit = (doc: ApiContract) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditCounterparty(doc.counterparty ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    try {
      await updateContract(editDoc.id, { title: editTitle, counterparty: editCounterparty });
      toast.success('Metadata updated.');
      setEditDoc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleVersions = async (doc: ApiContract) => {
    try {
      const result = await getVersions(doc.id);
      setVersions(result.versions ?? []);
      setVersionsOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load versions.');
    }
  };

  const handleUseTemplate = async (templateId: string, name: string) => {
    try {
      await createFromTemplate(templateId, { title: `${name} — Draft` });
      toast.success('Contract created from template.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Template create failed.');
    }
  };

  const handleAddTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Template name is required.');
      return;
    }
    try {
      await createTemplate(templateForm);
      toast.success('Template created.');
      setTemplateDialogOpen(false);
      setTemplateForm({ name: '', type: 'nda', description: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create template.');
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await decideApproval(id, status);
      toast.success(status === 'approved' ? 'Contract approved.' : 'Contract rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval action failed.');
    }
  };

  const handleSubmitApproval = async (doc: ApiContract) => {
    try {
      await submitForApproval(doc.id);
      toast.success('Submitted for approval.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
      pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      approved: { label: 'Approved', className: 'bg-brand/10 text-brand hover:bg-brand/10' },
      executed: { label: 'Executed', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      expired: { label: 'Expired', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      archived: { label: 'Archived', className: 'bg-slate-100 text-slate-800 hover:bg-slate-100' },
    };
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getTemplateTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      nda: 'NDA',
      service_agreement: 'Service Agreement',
      employment: 'Employment',
      purchase_order: 'Purchase Order',
      mou: 'MOU',
      custom: 'Custom',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const totalDocs = summary?.total ?? contracts.length;
  const executedDocs = summary?.executed ?? 0;
  const pendingApproval = summary?.pendingApproval ?? 0;
  const expiringCount = summary?.expiringSoon ?? expiryAlerts.filter((a) => (a.daysUntilExpiry ?? 999) <= 90).length;

  const handleUploadContract = async () => {
    if (!uploadForm.title.trim()) {
      toast.error('Document title is required.');
      return;
    }
    setUploading(true);
    try {
      await createContract({
        title: uploadForm.title,
        type: uploadForm.type,
        counterparty: uploadForm.counterparty || undefined,
        folderId: uploadForm.folderId || undefined,
        contractValue: uploadForm.contractValue ? Number(uploadForm.contractValue) : undefined,
        expiryDate: uploadForm.expiryDate || undefined,
        fileUrl: uploadForm.fileName ? `/contracts/${uploadForm.fileName}` : undefined,
        tags: uploadForm.tags
          ? uploadForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        status: 'draft',
      });
      toast.success('Contract uploaded.');
      setUploadForm({
        title: '',
        type: 'nda',
        counterparty: '',
        folderId: '',
        contractValue: '',
        expiryDate: '',
        fileName: '',
        tags: '',
      });
      setUploadDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !error && <p className="text-sm text-muted-foreground">Loading contracts…</p>}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contract & Document Management</h1>
        <p className="text-slate-600 mt-1">Manage contracts, documents, and approvals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executedDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApproval}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Tracking</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Folders Sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Folders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full flex items-center gap-2 p-2 rounded text-sm ${
                    selectedFolder === 'all' ? 'bg-brand/5 text-brand' : 'hover:bg-slate-50'
                  }`}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>All Documents</span>
                  <span className="ml-auto text-xs text-slate-500">{contracts.length}</span>
                </button>
                {folders.filter(f => !f.parentId).map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-sm ${
                      selectedFolder === folder.id ? 'bg-brand/5 text-brand' : 'hover:bg-slate-50'
                    }`}
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>{folder.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{folder.documentCount}</span>
                  </button>
                ))}
                <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Folder</DialogTitle>
                      <DialogDescription>Create a folder to organize contracts and documents</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Folder name</Label>
                        <Input
                          placeholder="e.g. NDAs 2026"
                          value={folderName}
                          onChange={(e) => setFolderName(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={creatingFolder || !folderName.trim()}
                        onClick={async () => {
                          try {
                            setCreatingFolder(true);
                            await createFolder(folderName.trim());
                            toast.success(`Folder "${folderName.trim()}" created.`);
                            setFolderName('');
                            setFolderDialogOpen(false);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Failed to create folder.');
                          } finally {
                            setCreatingFolder(false);
                          }
                        }}
                      >
                        {creatingFolder ? 'Creating…' : 'Create Folder'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Documents List */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Documents</CardTitle>
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Upload New Document</DialogTitle>
                          <DialogDescription>Upload a contract or legal document</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                            <p className="text-sm text-slate-600 mb-2">Drag and drop files here, or click to browse</p>
                            <Input
                              type="file"
                              className="hidden"
                              id="file-upload"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setUploadForm({ ...uploadForm, fileName: file.name });
                              }}
                            />
                            <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                              Select File
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Document Title</Label>
                              <Input
                                placeholder="Enter document title"
                                value={uploadForm.title}
                                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Document Type</Label>
                              <Select
                                value={uploadForm.type}
                                onValueChange={(v) => setUploadForm({ ...uploadForm, type: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nda">NDA</SelectItem>
                                  <SelectItem value="service_agreement">Service Agreement</SelectItem>
                                  <SelectItem value="employment">Employment Contract</SelectItem>
                                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                                  <SelectItem value="mou">MOU</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Counterparty</Label>
                              <Input
                                placeholder="Other party name"
                                value={uploadForm.counterparty}
                                onChange={(e) => setUploadForm({ ...uploadForm, counterparty: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Folder</Label>
                              <Select
                                value={uploadForm.folderId}
                                onValueChange={(v) => setUploadForm({ ...uploadForm, folderId: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select folder" />
                                </SelectTrigger>
                                <SelectContent>
                                  {folders.map(folder => (
                                    <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Contract Value</Label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={uploadForm.contractValue}
                                onChange={(e) => setUploadForm({ ...uploadForm, contractValue: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Expiry Date</Label>
                              <Input
                                type="date"
                                value={uploadForm.expiryDate}
                                onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Tags (comma-separated)</Label>
                            <Input
                              placeholder="e.g., vendor, it, annual"
                              value={uploadForm.tags}
                              onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="approval" />
                            <label htmlFor="approval" className="text-sm">Requires approval</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="signature" />
                            <label htmlFor="signature" className="text-sm">Requires e-signature</label>
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleUploadContract}
                            disabled={uploading}
                          >
                            {uploading ? 'Uploading…' : 'Upload Document'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Search documents, counterparties, tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="executed">Executed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    {filteredDocuments.map(doc => (
                      <div key={doc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-5 w-5 text-brand" />
                              <h3 className="font-semibold">{doc.title}</h3>
                              {doc.checkedOutBy && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="mr-1 h-3 w-3" />
                                  Checked out by {doc.checkedOutBy}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
                              {doc.counterparty && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {doc.counterparty}
                                </span>
                              )}
                              {doc.contractValue && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {doc.currency} {doc.contractValue.toLocaleString()}
                                </span>
                              )}
                              {doc.expiryDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Expires: {format(new Date(doc.expiryDate), 'MMM dd, yyyy')}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <History className="h-3 w-3" />
                                v{doc.currentVersion}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {getTemplateTypeBadge(doc.type)}
                              {doc.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <Tag className="mr-1 h-2 w-2" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4">
                            {getStatusBadge(doc.status)}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t">
                          <Dialog
                            open={selectedContract === doc.id}
                            onOpenChange={(open) => {
                              if (!open) clearContractParam();
                              else setSelectedContract(doc.id);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedContract(doc.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{doc.title}</DialogTitle>
                                <DialogDescription>
                                  Version {doc.currentVersion} • Created by {doc.createdBy} on {format(new Date(doc.updatedAt), 'MMM dd, yyyy')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <Label className="text-sm font-semibold">Status</Label>
                                    <div className="mt-1">{getStatusBadge(doc.status)}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-semibold">Document Type</Label>
                                    <div className="mt-1">{getTemplateTypeBadge(doc.type)}</div>
                                  </div>
                                  {doc.counterparty && (
                                    <div>
                                      <Label className="text-sm font-semibold">Counterparty</Label>
                                      <p className="text-sm mt-1">{doc.counterparty}</p>
                                    </div>
                                  )}
                                  {doc.contractValue && (
                                    <div>
                                      <Label className="text-sm font-semibold">Contract Value</Label>
                                      <p className="text-sm mt-1">{doc.currency} {doc.contractValue.toLocaleString()}</p>
                                    </div>
                                  )}
                                  {doc.startDate && (
                                    <div>
                                      <Label className="text-sm font-semibold">Start Date</Label>
                                      <p className="text-sm mt-1">{format(new Date(doc.startDate), 'MMM dd, yyyy')}</p>
                                    </div>
                                  )}
                                  {doc.endDate && (
                                    <div>
                                      <Label className="text-sm font-semibold">End Date</Label>
                                      <p className="text-sm mt-1">{format(new Date(doc.endDate), 'MMM dd, yyyy')}</p>
                                    </div>
                                  )}
                                </div>
                                {(doc.status === 'pending_approval' || !doc.signedAt) && (
                                  <div className="p-3 bg-brand/5 rounded">
                                    <div className="flex items-center gap-2">
                                      <FileSignature className="h-4 w-4 text-brand" />
                                      <span className="text-sm font-medium">
                                        {doc.signedAt ? 'Signed' : 'Signature available'}
                                      </span>
                                    </div>
                                    {doc.signedAt && (
                                      <p className="text-sm text-slate-600 mt-1">
                                        Signed on {format(new Date(doc.signedAt), 'MMM dd, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => downloadContract(doc)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Metadata
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleVersions(doc)}>
                                    <History className="mr-2 h-4 w-4" />
                                    Version History
                                  </Button>
                                  {doc.status === 'draft' && (
                                    <Button size="sm" variant="outline" onClick={() => handleSubmitApproval(doc)}>
                                      Submit for Approval
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="outline" onClick={() => downloadContract(doc)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleShare(doc)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </Button>
                          {!doc.checkedOutBy ? (
                            <Button size="sm" variant="outline" onClick={() => handleCheckout(doc)}>
                              <Lock className="mr-2 h-4 w-4" />
                              Check Out
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleCheckin(doc)}>
                              <Unlock className="mr-2 h-4 w-4" />
                              Check In
                            </Button>
                          )}
                          {!doc.signedAt && doc.status !== 'executed' && (
                            <Button size="sm" onClick={() => handleSign(doc)}>
                              <FileSignature className="mr-2 h-4 w-4" />
                              Sign
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contract Templates</CardTitle>
                  <CardDescription>Pre-approved templates for common agreements</CardDescription>
                </div>
                <Button onClick={() => setTemplateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    id={`template-${template.id}`}
                    className={`p-4 border rounded-lg hover:border-brand transition-colors ${
                      selectedTemplate === template.id ? 'border-brand bg-brand/5 ring-2 ring-brand/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <FileText className="h-8 w-8 text-brand" />
                      {getTemplateTypeBadge(template.type)}
                    </div>
                    <h3 className="font-semibold mb-2">{template.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span>Used {template.usageCount} times</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleUseTemplate(template.id, template.name)}>
                        Use Template
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadTextFile(
                            `${template.name.replace(/[^\w.-]+/g, '_')}.txt`,
                            `${template.name}\n\n${template.description}\nType: ${template.type}`
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab - Will continue in next part */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflows</CardTitle>
              <CardDescription>Manage document approval processes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvals.map((workflow) => {
                const doc = contracts.find((d) => d.id === workflow.contractId);
                return (
                  <div key={workflow.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold mb-1">{doc?.title ?? 'Contract'}</h3>
                        <p className="text-sm text-slate-600">
                          Requested by {workflow.submittedBy} on {format(new Date(workflow.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge className={workflow.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <p className="font-medium">{workflow.approverName}</p>
                      {workflow.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {workflow.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                      {workflow.comment && <p className="text-slate-600 italic">"{workflow.comment}"</p>}
                    </div>
                    {workflow.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button size="sm" onClick={() => handleApproval(workflow.id, 'approved')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApproval(workflow.id, 'rejected')}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {approvals.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No pending approvals.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiry Tracking Tab */}
        <TabsContent value="expiry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Expiry Tracking</CardTitle>
              <CardDescription>Monitor contract renewals and expirations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {expiryAlerts.map((alert) => (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{alert.title}</h3>
                        {(alert.daysUntilExpiry ?? 999) <= 30 && (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {alert.daysUntilExpiry} days
                          </Badge>
                        )}
                        {(alert.daysUntilExpiry ?? 999) > 30 && (alert.daysUntilExpiry ?? 999) <= 90 && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            {alert.daysUntilExpiry} days
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {alert.expiryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {format(new Date(alert.expiryDate), 'MMM dd, yyyy')}
                          </span>
                        )}
                        {alert.autoRenew && <span>Auto-renew enabled</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const doc = contracts.find((c) => c.id === alert.id);
                        if (doc) downloadContract(doc);
                        else toast.info('Open Contracts tab to view this document.');
                      }}
                    >
                      View Document
                    </Button>
                  </div>
                </div>
              ))}
              {expiryAlerts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No contracts expiring in the next 90 days.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Sharing</CardTitle>
              <CardDescription>Use Share on any contract to create an external view link (copied to clipboard).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Open the Documents tab and click <strong>Share</strong> on a contract. A secure public link is generated
                and copied so you can send it to reviewers.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contract metadata</DialogTitle>
            <DialogDescription>Update title and counterparty for this contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Counterparty</Label>
              <Input value={editCounterparty} onChange={(e) => setEditCounterparty(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>Previous versions of this contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versions.length === 0 && <p className="text-sm text-slate-500">No versions recorded yet.</p>}
            {versions.map((v) => (
              <div key={v.id} className="border rounded p-3 text-sm">
                <p className="font-medium">Version {v.version}</p>
                <p className="text-slate-500">{format(new Date(v.createdAt), 'PPp')}</p>
                {v.changeNotes && <p className="mt-1">{v.changeNotes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contract template</DialogTitle>
            <DialogDescription>Create a reusable template for new contracts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={templateForm.type}
                onValueChange={(value) => setTemplateForm((f) => ({ ...f, type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="service_agreement">Service Agreement</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTemplate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
