import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Search,
  Filter,
  BookOpen,
  Download,
  Printer,
  Star,
  Bookmark as BookmarkIcon,
  FileText,
  Scale,
  BookMarked,
  Upload,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { CitationLinksList } from '../components/legal/CitationLinks';

export function LegalKnowledgeBase() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'law',
    summary: '',
    fileName: '',
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { documents, summary, bookmarks, savedSearches, loading, error, createDocument, saveSearch, addBookmark, removeBookmark, refresh } = useKnowledgeBase({
    type: selectedType,
    jurisdiction: selectedJurisdiction,
    industry: selectedIndustry,
    search: searchQuery,
  });

  const [annotateDocId, setAnnotateDocId] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState('');

  const filteredDocuments = documents;

  const downloadDocument = async (doc: { id: string; title: string }) => {
    try {
      const { downloadAuthenticated } = await import('../lib/api');
      await downloadAuthenticated(
        `/knowledge/documents/${doc.id}/download`,
        `${doc.title.replace(/[^\w.-]+/g, '_')}.pdf`
      );
      toast.success('Download started.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const printDocument = (doc: { title: string; summary: string; content: string }) => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Pop-up blocked. Allow pop-ups to print.');
      return;
    }
    w.document.write(
      `<html><head><title>${doc.title}</title></head><body><h1>${doc.title}</h1><h3>Summary</h3><p>${doc.summary}</p><h3>Content</h3><pre style="white-space:pre-wrap;font-family:serif">${doc.content}</pre></body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const handleBookmark = async (documentId: string) => {
    const existing = bookmarks.find((b) => b.documentId === documentId);
    try {
      if (existing) {
        await removeBookmark(existing.id);
        toast.success('Bookmark removed.');
      } else {
        await addBookmark(documentId);
        toast.success('Document bookmarked.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bookmark failed.');
    }
  };

  const handleAnnotate = async () => {
    if (!annotateDocId || !annotationText.trim()) {
      toast.error('Enter an annotation note.');
      return;
    }
    try {
      const { apiRequest } = await import('../lib/api');
      await apiRequest(`/knowledge/documents/${annotateDocId}/annotations`, {
        method: 'POST',
        body: JSON.stringify({ content: annotationText.trim(), page: 1 }),
      });
      toast.success('Annotation saved.');
      setAnnotateDocId(null);
      setAnnotationText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Annotation failed.');
    }
  };

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && documents.some((d) => d.id === docId)) {
      setSelectedDocument(docId);
    }
    const q = searchParams.get('q');
    if (q && q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams, documents]);

  const clearDocParam = () => {
    if (searchParams.get('doc')) {
      const next = new URLSearchParams(searchParams);
      next.delete('doc');
      setSearchParams(next, { replace: true });
    }
    setSelectedDocument(null);
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    setUploading(true);
    try {
      await createDocument({
        title: uploadForm.title,
        type: uploadForm.type,
        summary: uploadForm.summary,
        fileUrl: uploadForm.fileName ? `/documents/${uploadForm.fileName}` : undefined,
      });
      toast.success('Document added to knowledge base.');
      setUploadForm({ title: '', type: 'law', summary: '', fileName: '' });
      setUploadOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      law: 'Law',
      regulation: 'Regulation',
      case_law: 'Case Law',
      template: 'Template',
      guidance: 'Guidance',
    };
    return labels[type] || type;
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      law: 'bg-brand/10 text-brand',
      regulation: 'bg-purple-100 text-purple-800',
      case_law: 'bg-green-100 text-green-800',
      template: 'bg-orange-100 text-orange-800',
      guidance: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Archived</Badge>;
      case 'repealed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Repealed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !error && <p className="text-sm text-muted-foreground">Loading knowledge base…</p>}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Legal Knowledge Base</h1>
        <p className="text-slate-600 mt-1">Centralized repository of laws, regulations, and legal resources</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total ?? documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Laws</CardTitle>
            <Scale className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.byType?.law ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookmarks</CardTitle>
            <BookmarkIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookmarks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedSearches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Legal Documents</CardTitle>
          <CardDescription>Search across all documents with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by title, keywords, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => refresh()}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="law">Laws</SelectItem>
                  <SelectItem value="regulation">Regulations</SelectItem>
                  <SelectItem value="case_law">Case Law</SelectItem>
                  <SelectItem value="template">Templates</SelectItem>
                  <SelectItem value="guidance">Guidance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jurisdiction</Label>
              <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Jurisdictions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  <SelectItem value="Rwanda">Rwanda</SelectItem>
                  <SelectItem value="EAC">EAC</SelectItem>
                  <SelectItem value="Kenya">Kenya</SelectItem>
                  <SelectItem value="Uganda">Uganda</SelectItem>
                  <SelectItem value="Tanzania">Tanzania</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Labor">Labor</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-600">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const name = searchQuery.trim() || 'Saved search';
                  try {
                    await saveSearch(name, {
                      q: searchQuery,
                      type: selectedType,
                      jurisdiction: selectedJurisdiction,
                      industry: selectedIndustry,
                    });
                    toast.success('Search saved.');
                  } catch {
                    toast.error('Could not save search.');
                  }
                }}
              >
                <Star className="mr-2 h-4 w-4" />
                Save Search
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedJurisdiction('all');
                setSelectedIndustry('all');
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-4 border rounded-lg hover:border-brand transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getDocumentTypeColor(doc.type)}>
                          {getDocumentTypeLabel(doc.type)}
                        </Badge>
                        {getStatusBadge(doc.status)}
                        <Badge variant="outline">{doc.jurisdiction}</Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{doc.title}</h3>
                      <p className="text-sm text-slate-600 mb-2">{doc.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Published: {doc.datePublished ? format(new Date(doc.datePublished), 'MMM dd, yyyy') : '—'}</span>
                        {doc.lastAmended && (
                          <>
                            <span>•</span>
                            <span>Amended: {format(new Date(doc.lastAmended), 'MMM dd, yyyy')}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Version {doc.version}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Dialog
                      open={selectedDocument === doc.id}
                      onOpenChange={(open) => {
                        if (!open) clearDocParam();
                        else setSelectedDocument(doc.id);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedDocument(doc.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{doc.title}</DialogTitle>
                          <DialogDescription>
                            {doc.jurisdiction} • {doc.industry} • Version {doc.version}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <p className="text-sm text-slate-600">{doc.summary}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Full Text</h4>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{doc.content}</p>
                          </div>
                          {(doc.citationLinks?.length ? doc.citationLinks : doc.citations.map((c) => ({ label: c, href: '', external: false }))).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">References & Citations</h4>
                              <CitationLinksList
                                links={doc.citationLinks?.length
                                  ? doc.citationLinks
                                  : doc.citations.map((c) => ({ label: c, href: '', external: false }))}
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => downloadDocument(doc)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => printDocument(doc)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Print
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookmark(doc.id)}>
                              <BookmarkIcon className="mr-2 h-4 w-4" />
                              {bookmarks.some((b) => b.documentId === doc.id) ? 'Remove Bookmark' : 'Bookmark'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => downloadDocument(doc)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBookmark(doc.id)}>
                      <BookmarkIcon className="mr-2 h-4 w-4" />
                      {bookmarks.some((b) => b.documentId === doc.id) ? 'Bookmarked' : 'Bookmark'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAnnotateDocId(doc.id); setAnnotationText(''); }}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Annotate
                    </Button>
                  </div>
                </div>
              ))}

              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">No documents found matching your search criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload New Document</DialogTitle>
                    <DialogDescription>Add a new legal document to the knowledge base</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="Document title"
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
                          <SelectItem value="law">Law</SelectItem>
                          <SelectItem value="regulation">Regulation</SelectItem>
                          <SelectItem value="case_law">Case Law</SelectItem>
                          <SelectItem value="template">Template</SelectItem>
                          <SelectItem value="guidance">Guidance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <Textarea
                        placeholder="Brief summary of the document"
                        value={uploadForm.summary}
                        onChange={(e) => setUploadForm({ ...uploadForm, summary: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>File Upload</Label>
                      <Input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setUploadForm({ ...uploadForm, fileName: file.name });
                        }}
                      />
                    </div>
                    <Button className="w-full" onClick={handleUploadDocument} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Upload Document'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => {
                  const first = savedSearches[0];
                  if (!first) {
                    toast.info('No saved searches yet. Use Save Search after filtering.');
                    return;
                  }
                  const q = first.query as Record<string, string>;
                  setSearchQuery(q.q ?? '');
                  setSelectedType(q.type ?? 'all');
                  setSelectedJurisdiction(q.jurisdiction ?? 'all');
                  setSelectedIndustry(q.industry ?? 'all');
                  toast.success(`Loaded "${first.name}".`);
                }}
              >
                <Star className="mr-2 h-4 w-4" />
                Manage Saved Searches
              </Button>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Saved Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <button
                    key={search.id}
                    type="button"
                    className="w-full text-left p-2 rounded hover:bg-slate-50 border"
                    onClick={() => {
                      const q = search.query as Record<string, string>;
                      setSearchQuery(q.q ?? '');
                      setSelectedType(q.type ?? 'all');
                      setSelectedJurisdiction(q.jurisdiction ?? 'all');
                      setSelectedIndustry(q.industry ?? 'all');
                      toast.success(`Applied "${search.name}".`);
                    }}
                  >
                    <p className="font-medium text-sm">{search.name}</p>
                    <p className="text-xs text-slate-600">{JSON.stringify(search.query)}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bookmarks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bookmarks.slice(0, 3).map((bookmark) => {
                  const doc = documents.find((d) => d.id === bookmark.documentId);
                  return doc ? (
                    <div key={bookmark.id} className="p-2 border rounded text-sm">
                      <p className="font-medium">{doc.title}</p>
                      {bookmark.notes && (
                        <p className="text-xs text-slate-600 mt-1">{bookmark.notes}</p>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!annotateDocId} onOpenChange={(open) => !open && setAnnotateDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add annotation</DialogTitle>
            <DialogDescription>Save a note against this knowledge base document.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            rows={4}
            placeholder="Your note or highlight..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAnnotateDocId(null)}>Cancel</Button>
            <Button onClick={handleAnnotate}>Save annotation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
