import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface ApiLegalDocument {
  id: string;
  title: string;
  type: string;
  jurisdiction?: string;
  industry?: string;
  datePublished?: string;
  lastAmended?: string;
  version: string;
  summary: string;
  content: string;
  citations: string[];
  citationLinks?: Array<{ label: string; href: string; documentId?: string; external: boolean }>;
  fileUrl: string;
  status: string;
  tags: string[];
  searchHighlights?: string[];
}

export interface KnowledgeSummary {
  total: number;
  byType: Record<string, number>;
  active: number;
}

export interface DocumentBookmark {
  id: string;
  documentId: string;
  documentType: string;
  notes?: string;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
}

export function useKnowledgeBase(filters?: {
  type?: string;
  jurisdiction?: string;
  industry?: string;
  search?: string;
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<ApiLegalDocument[]>([]);
  const [summary, setSummary] = useState<KnowledgeSummary | null>(null);
  const [bookmarks, setBookmarks] = useState<DocumentBookmark[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const type = filters?.type ?? 'all';
  const jurisdiction = filters?.jurisdiction ?? 'all';
  const industry = filters?.industry ?? 'all';
  const search = filters?.search ?? '';

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setDocuments([]);
      setSummary(null);
      setBookmarks([]);
      setSavedSearches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (jurisdiction !== 'all') params.set('jurisdiction', jurisdiction);
      if (industry !== 'all') params.set('industry', industry);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';

      const [list, sum, bm, ss] = await Promise.all([
        apiRequestSafe<{ documents?: ApiLegalDocument[] }>(`/knowledge/documents${query}`),
        apiRequestSafe<KnowledgeSummary>('/knowledge/documents/summary'),
        apiRequestSafe<{ bookmarks?: DocumentBookmark[] }>('/knowledge/bookmarks'),
        apiRequestSafe<{ savedSearches?: SavedSearch[] }>('/knowledge/saved-searches'),
      ]);
      setDocuments(Array.isArray(list.documents) ? list.documents : []);
      setSummary(sum);
      setBookmarks(Array.isArray(bm.bookmarks) ? bm.bookmarks : []);
      setSavedSearches(Array.isArray(ss.savedSearches) ? ss.savedSearches : []);
      setError(null);
    } catch (err) {
      setDocuments([]);
      setSummary(null);
      setBookmarks([]);
      setSavedSearches([]);
      setError(err instanceof Error ? err.message : 'Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, type, jurisdiction, industry, search]);

  useEffect(() => {
    load();
  }, [load]);

  const createDocument = async (data: {
    title: string;
    type: string;
    summary?: string;
    jurisdiction?: string;
    industry?: string;
    fileUrl?: string;
    tags?: string[];
  }) => {
    await apiRequest('/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await load();
  };

  const addBookmark = async (documentId: string, notes?: string) => {
    await apiRequest('/knowledge/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ documentId, notes }),
    });
    await load();
  };

  const removeBookmark = async (id: string) => {
    await apiRequest(`/knowledge/bookmarks/${id}`, { method: 'DELETE' });
    await load();
  };

  const saveSearch = async (name: string, query: Record<string, unknown>) => {
    await apiRequest('/knowledge/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name, query }),
    });
    await load();
  };

  return {
    documents,
    summary,
    bookmarks,
    savedSearches,
    loading,
    error,
    refresh: load,
    createDocument,
    addBookmark,
    removeBookmark,
    saveSearch,
  };
}
