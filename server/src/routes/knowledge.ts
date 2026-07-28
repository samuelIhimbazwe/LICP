import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeLegalDocument } from '../lib/knowledge.js';
import { resolveCitationLinks } from '../lib/citation-links.js';
import { writeAuditLog } from '../lib/audit.js';
import { authenticate, requireRoles, requireAdmin, requireModule, type AuthRequest } from '../middleware/auth.js';

export const knowledgeRouter = Router();
knowledgeRouter.use(authenticate, requireModule('knowledgeBase', 'view'));

const canEdit = requireRoles('compliance_officer', 'legal_practitioner', 'manager', 'admin');

knowledgeRouter.get('/documents/summary', authenticate, async (req: AuthRequest, res) => {
  const orgId = req.user!.db.organizationId;
  const docs = await prisma.legalDocument.findMany({
    where: { organizationId: orgId },
    select: { type: true, status: true },
  });
  res.json({
    total: docs.length,
    byType: {
      law: docs.filter((d) => d.type === 'law').length,
      regulation: docs.filter((d) => d.type === 'regulation').length,
      case_law: docs.filter((d) => d.type === 'case_law').length,
      template: docs.filter((d) => d.type === 'template').length,
      guidance: docs.filter((d) => d.type === 'guidance').length,
    },
    active: docs.filter((d) => d.status === 'active').length,
  });
});

knowledgeRouter.get('/documents', authenticate, async (req: AuthRequest, res) => {
  const type = req.query.type ? String(req.query.type) : undefined;
  const jurisdiction = req.query.jurisdiction ? String(req.query.jurisdiction) : undefined;
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const search = req.query.search ? String(req.query.search).toLowerCase() : undefined;

  const documents = await prisma.legalDocument.findMany({
    where: {
      organizationId: req.user!.db.organizationId,
      ...(type && type !== 'all' ? { type: type as never } : {}),
      ...(jurisdiction && jurisdiction !== 'all' ? { jurisdiction } : {}),
      ...(industry && industry !== 'all' ? { industry } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  const filtered = search
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.summary.toLowerCase().includes(search) ||
          d.content.toLowerCase().includes(search) ||
          (Array.isArray(d.tags) &&
            (d.tags as string[]).some((t) => t.toLowerCase().includes(search)))
      )
    : documents;

  res.json({
    documents: await Promise.all(
      filtered.map(async (d) => ({
        ...serializeLegalDocument(d, { search }),
        citationLinks: await resolveCitationLinks(req.user!.db.organizationId, d.citations),
      }))
    ),
  });
});

knowledgeRouter.get('/documents/:id', authenticate, async (req: AuthRequest, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  res.json({
    document: {
      ...serializeLegalDocument(doc),
      citationLinks: await resolveCitationLinks(req.user!.db.organizationId, doc.citations),
    },
  });
});

knowledgeRouter.post('/documents', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      type: z.enum(['law', 'regulation', 'case_law', 'template', 'guidance']),
      jurisdiction: z.string().optional(),
      industry: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .parse(req.body);

  const doc = await prisma.legalDocument.create({
    data: {
      organizationId: req.user!.db.organizationId,
      title: body.title,
      type: body.type,
      jurisdiction: body.jurisdiction,
      industry: body.industry,
      summary: body.summary ?? '',
      content: body.content ?? '',
      fileUrl: body.fileUrl ?? '',
      tags: body.tags ?? [],
      datePublished: new Date(),
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'document_uploaded',
    resource: 'knowledge',
    resourceId: doc.id,
    resourceType: 'legal_document',
    actionDetails: `Uploaded legal document: ${doc.title}`,
    req,
  });

  res.status(201).json({ document: serializeLegalDocument(doc) });
});

knowledgeRouter.patch('/documents/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['active', 'archived', 'repealed']).optional(),
    })
    .parse(req.body);

  const existing = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const doc = await prisma.legalDocument.update({
    where: { id: existing.id },
    data: body,
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'document_updated',
    resource: 'knowledge',
    resourceId: doc.id,
    resourceType: 'legal_document',
    actionDetails: `Updated document: ${doc.title}`,
    req,
  });

  res.json({ document: serializeLegalDocument(doc) });
});

knowledgeRouter.post('/documents/:id/versions', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      version: z.string(),
      summary: z.string().optional(),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
    })
    .parse(req.body);

  const existing = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  await prisma.legalDocumentVersion.create({
    data: {
      documentId: existing.id,
      version: existing.version,
      summary: existing.summary,
      content: existing.content,
      fileUrl: existing.fileUrl,
      createdBy: req.user!.db.fullName,
    },
  });

  const doc = await prisma.legalDocument.update({
    where: { id: existing.id },
    data: {
      version: body.version,
      summary: body.summary ?? existing.summary,
      content: body.content ?? existing.content,
      fileUrl: body.fileUrl ?? existing.fileUrl,
      lastAmended: new Date(),
    },
  });

  const versions = await prisma.legalDocumentVersion.findMany({
    where: { documentId: existing.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ document: serializeLegalDocument(doc), versions });
});

knowledgeRouter.get('/documents/:id/versions', authenticate, async (req: AuthRequest, res) => {
  const existing = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  const versions = await prisma.legalDocumentVersion.findMany({
    where: { documentId: existing.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    current: { version: existing.version, updatedAt: existing.updatedAt },
    versions,
  });
});

knowledgeRouter.get('/bookmarks', authenticate, async (req: AuthRequest, res) => {
  const bookmarks = await prisma.documentBookmark.findMany({
    where: { userId: req.user!.db.id, organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ bookmarks });
});

knowledgeRouter.post('/bookmarks', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({ documentId: z.string(), documentType: z.string().default('legal'), notes: z.string().optional() })
    .parse(req.body);
  const bookmark = await prisma.documentBookmark.create({
    data: {
      organizationId: req.user!.db.organizationId,
      userId: req.user!.db.id,
      documentId: body.documentId,
      documentType: body.documentType,
      notes: body.notes,
    },
  });
  res.status(201).json({ bookmark });
});

knowledgeRouter.delete('/bookmarks/:id', authenticate, async (req: AuthRequest, res) => {
  await prisma.documentBookmark.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.db.id },
  });
  res.json({ ok: true });
});

knowledgeRouter.get('/saved-searches', authenticate, async (req: AuthRequest, res) => {
  const items = await prisma.savedSearch.findMany({
    where: { userId: req.user!.db.id, organizationId: req.user!.db.organizationId, module: 'knowledge' },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ savedSearches: items });
});

knowledgeRouter.post('/saved-searches', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ name: z.string(), query: z.record(z.unknown()) }).parse(req.body);
  const item = await prisma.savedSearch.create({
    data: {
      organizationId: req.user!.db.organizationId,
      userId: req.user!.db.id,
      name: body.name,
      module: 'knowledge',
      query: body.query as object,
    },
  });
  res.status(201).json({ savedSearch: item });
});

knowledgeRouter.delete('/saved-searches/:id', authenticate, async (req: AuthRequest, res) => {
  await prisma.savedSearch.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.db.id },
  });
  res.json({ ok: true });
});

async function resolveCitationLinksForRoute(orgId: string, citations: unknown) {
  return resolveCitationLinks(orgId, citations);
}

knowledgeRouter.get('/documents/:id/citations', authenticate, async (req: AuthRequest, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  const citations = await resolveCitationLinksForRoute(req.user!.db.organizationId, doc.citations);
  res.json({ citations });
});

knowledgeRouter.get('/documents/:id/referenced-by', authenticate, async (req: AuthRequest, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  const all = await prisma.legalDocument.findMany({ where: { organizationId: req.user!.db.organizationId } });
  const referencedBy = all
    .filter((d) => {
      const cites = Array.isArray(d.citations) ? (d.citations as string[]) : [];
      return cites.includes(doc.id) || cites.includes(doc.title);
    })
    .map((d) => ({ id: d.id, title: d.title, type: d.type }));
  res.json({ referencedBy });
});

knowledgeRouter.get('/documents/:id/download', authenticate, async (req: AuthRequest, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'document_downloaded',
    resource: 'knowledge',
    resourceId: doc.id,
    resourceType: 'legal_document',
    actionDetails: `Downloaded PDF: ${doc.title}`,
    req,
  });

  const pdfBody = `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n${doc.title}\n\n${doc.content}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9-_]/gi, '_')}.pdf"`);
  res.send(Buffer.from(pdfBody));
});

knowledgeRouter.get('/documents/:id/annotations', authenticate, async (req: AuthRequest, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  const annotations = await prisma.documentAnnotation.findMany({
    where: {
      documentId: doc.id,
      organizationId: req.user!.db.organizationId,
      userId: req.user!.db.id,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ annotations });
});

knowledgeRouter.post('/documents/:id/annotations', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ content: z.string().min(1), page: z.number().optional() }).parse(req.body);
  const doc = await prisma.legalDocument.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  const annotation = await prisma.documentAnnotation.create({
    data: {
      organizationId: req.user!.db.organizationId,
      documentId: doc.id,
      userId: req.user!.db.id,
      userName: req.user!.db.fullName,
      content: body.content,
      page: body.page,
    },
  });
  res.status(201).json({ annotation });
});

knowledgeRouter.patch('/annotations/:id', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ content: z.string().min(1) }).parse(req.body);
  const existing = await prisma.documentAnnotation.findFirst({
    where: { id: String(req.params.id), userId: req.user!.db.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Annotation not found.' });
    return;
  }
  const annotation = await prisma.documentAnnotation.update({
    where: { id: existing.id },
    data: { content: body.content },
  });
  res.json({ annotation });
});
