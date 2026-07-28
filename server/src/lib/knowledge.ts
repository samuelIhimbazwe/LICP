import type { LegalDocument, LegalDocumentStatus, LegalDocumentType } from '@prisma/client';
import { buildSearchHighlights } from './search.js';

export function serializeLegalDocument(doc: LegalDocument, options?: { search?: string }) {
  const citations = Array.isArray(doc.citations) ? (doc.citations as string[]) : [];
  const tags = Array.isArray(doc.tags) ? (doc.tags as string[]) : [];
  const search = options?.search?.trim();

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type as LegalDocumentType,
    jurisdiction: doc.jurisdiction ?? undefined,
    industry: doc.industry ?? undefined,
    datePublished: doc.datePublished?.toISOString(),
    lastAmended: doc.lastAmended?.toISOString(),
    version: doc.version,
    summary: doc.summary,
    content: doc.content,
    citations,
    fileUrl: doc.fileUrl,
    status: doc.status as LegalDocumentStatus,
    tags,
    searchHighlights: search
      ? buildSearchHighlights(`${doc.title} ${doc.summary} ${doc.content}`, search)
      : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
