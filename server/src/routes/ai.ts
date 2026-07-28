import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { writeAuditLog } from '../lib/audit.js';
import {
  analyzeClause,
  assessRisk,
  buildResearchAnswerWithLlm,
  buildResearchRecommendationsFromHits,
  compareDocuments,
  getAiInsights,
  getAiStats,
  runComplianceCheck,
  searchPlatform,
} from '../lib/ai-services.js';
import { sourceLinkForModule } from '../lib/citation-links.js';
import { authenticate, requireModule, type AuthRequest } from '../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(authenticate, requireModule('aiIntelligence', 'view'));

async function logAiQuery(
  req: AuthRequest,
  data: {
    query: string;
    response: string;
    confidence: number;
    sources: unknown;
    action: string;
    processingTimeMs?: number;
  }
) {
  const orgId = req.user!.db.organizationId;
  const sourcesPayload =
    data.processingTimeMs != null
      ? { items: data.sources, processingTimeMs: data.processingTimeMs }
      : data.sources;
  const log = await prisma.aiQueryLog.create({
    data: {
      organizationId: orgId,
      userId: req.user!.db.id,
      query: data.query,
      response: data.response,
      confidence: data.confidence,
      sources: sourcesPayload as object,
    },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: data.action,
    resource: 'ai',
    resourceId: log.id,
    resourceType: 'ai_query',
    actionDetails: `${data.action}: ${data.query.slice(0, 120)}`,
    req,
  });
  return log;
}

aiRouter.get('/history', authenticate, async (req: AuthRequest, res) => {
  const logs = await prisma.aiQueryLog.findMany({
    where: { organizationId: req.user!.db.organizationId, userId: req.user!.db.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      query: true,
      response: true,
      confidence: true,
      sources: true,
      feedback: true,
      createdAt: true,
    },
  });
  res.json({
    history: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

aiRouter.get('/history/:id', authenticate, async (req: AuthRequest, res) => {
  const log = await prisma.aiQueryLog.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.user!.db.organizationId,
      userId: req.user!.db.id,
    },
  });
  if (!log) {
    res.status(404).json({ error: 'Query not found.' });
    return;
  }
  const raw = log.sources as { items?: unknown; processingTimeMs?: number } | unknown;
  const sources = raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw ? raw.items : raw;
  const processingTimeMs =
    raw && typeof raw === 'object' && !Array.isArray(raw) && typeof (raw as { processingTimeMs?: number }).processingTimeMs === 'number'
      ? (raw as { processingTimeMs: number }).processingTimeMs
      : undefined;
  res.json({
    query: {
      ...log,
      sources,
      processingTimeMs,
      answer: log.response,
      createdAt: log.createdAt.toISOString(),
    },
  });
});

aiRouter.get('/stats', authenticate, async (req: AuthRequest, res) => {
  const stats = await getAiStats(req.user!.db.organizationId, req.user!.db.id);
  res.json({ stats });
});

aiRouter.get('/insights', authenticate, async (req: AuthRequest, res) => {
  const insights = await getAiInsights(req.user!.db.organizationId);
  res.json({ insights });
});

aiRouter.post('/query', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({ query: z.string().min(1), simulateTimeout: z.boolean().optional() })
    .parse(req.body);

  if (body.simulateTimeout || process.env.AI_SIMULATE_TIMEOUT === 'true') {
    res.status(503).json({ error: 'AI service temporarily unavailable. Please retry.' });
    return;
  }

  const started = Date.now();
  const orgId = req.user!.db.organizationId;
  const hits = await searchPlatform(orgId, body.query);

  const sources = hits.map((h) => {
    const link = sourceLinkForModule(h.module, h.id, h.title);
    return {
      id: h.id,
      title: h.title,
      type: h.type ?? h.module,
      jurisdiction: h.jurisdiction ?? undefined,
      excerpt: h.excerpt,
      module: h.module,
      url: link.href,
      external: link.external,
      relevanceScore: h.relevance,
      meta: h.meta,
    };
  });

  const research = await buildResearchAnswerWithLlm(body.query, hits);
  const answer = research.answer;
  const recommendations = research.hasLocalSources
    ? buildResearchRecommendationsFromHits(hits)
    : research.usedExternalLlm
      ? [
          'This answer was not grounded in your LICP data — verify with counsel.',
          'Add or update records in Knowledge Base, Compliance, or Contracts to improve answers.',
          'Try inventory questions such as “list our contracts” or “show open obligations”.',
        ]
      : buildResearchRecommendationsFromHits(hits);
  const confidence = research.hasLocalSources
    ? sources.length >= 3
      ? 0.9
      : sources.length >= 2
        ? 0.82
        : 0.7
    : research.usedExternalLlm
      ? 0.4
      : 0.35;
  const processingTimeMs = Date.now() - started;

  const log = await logAiQuery(req, {
    query: body.query,
    response: answer,
    confidence,
    sources,
    action: research.usedExternalLlm ? 'ai_query_external_fallback' : 'ai_query',
    processingTimeMs,
  });

  res.json({
    id: log.id,
    answer,
    summary: answer.slice(0, 240) + (answer.length > 240 ? '…' : ''),
    recommendations,
    confidence,
    confidenceLevel:
      confidence >= 0.85 ? 'very_high' : confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
    sources,
    processingTimeMs,
    usedExternalLlm: research.usedExternalLlm,
    hasLocalSources: research.hasLocalSources,
  });
});

aiRouter.post('/compliance-check', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ query: z.string().min(1) }).parse(req.body);
  const started = Date.now();
  const result = await runComplianceCheck(req.user!.db.organizationId, body.query);
  const processingTimeMs = Date.now() - started;
  const log = await logAiQuery(req, {
    query: body.query,
    response: result.summary,
    confidence: result.items.length ? 0.8 : 0.4,
    sources: result.regulations,
    action: 'ai_compliance_check',
    processingTimeMs,
  });
  res.json({ id: log.id, ...result, processingTimeMs });
});

aiRouter.post('/risk-assessment', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ action: z.string().min(1) }).parse(req.body);
  const started = Date.now();
  const result = await assessRisk(req.user!.db.organizationId, body.action);
  const processingTimeMs = Date.now() - started;
  const log = await logAiQuery(req, {
    query: body.action,
    response: `Risk ${result.riskLevel} (score ${result.score}). ${result.recommendations.join(' ')}`,
    confidence: result.confidence,
    sources: result.complianceIssues,
    action: 'ai_risk_assessment',
    processingTimeMs,
  });
  res.json({ id: log.id, ...result, processingTimeMs });
});

aiRouter.post('/clause-analysis', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ clause: z.string().min(1) }).parse(req.body);
  const started = Date.now();
  const result = await analyzeClause(body.clause);
  const processingTimeMs = Date.now() - started;
  const log = await logAiQuery(req, {
    query: body.clause.slice(0, 500),
    response: `Clause risk ${result.riskLevel} (score ${result.score}). ${result.suggestions.join(' ')}`,
    confidence: result.confidence,
    sources: result.issues,
    action: 'ai_clause_analysis',
    processingTimeMs,
  });
  res.json({ id: log.id, ...result, processingTimeMs });
});

aiRouter.post('/document-compare', authenticate, async (req: AuthRequest, res) => {
  const body = z.object({ docA: z.string().min(1), docB: z.string().min(1) }).parse(req.body);
  const started = Date.now();
  const result = compareDocuments(body.docA, body.docB);
  const processingTimeMs = Date.now() - started;
  const log = await logAiQuery(req, {
    query: 'document_compare',
    response: result.summary,
    confidence: 0.9,
    sources: result.changes.slice(0, 10),
    action: 'ai_document_compare',
    processingTimeMs,
  });
  res.json({ id: log.id, ...result, processingTimeMs });
});

aiRouter.post('/feedback', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({ queryId: z.string(), helpful: z.boolean(), comment: z.string().optional() })
    .parse(req.body);
  const result = await prisma.aiQueryLog.updateMany({
    where: { id: body.queryId, userId: req.user!.db.id },
    data: {
      feedback: body.helpful ? 'helpful' : body.comment ? `not_helpful:${body.comment}` : 'not_helpful',
    },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Query not found or not owned by you.' });
    return;
  }
  res.json({ ok: true });
});

aiRouter.get('/feedback/:queryId', authenticate, async (req: AuthRequest, res) => {
  const log = await prisma.aiQueryLog.findFirst({
    where: { id: String(req.params.queryId), organizationId: req.user!.db.organizationId },
    select: { id: true, feedback: true, query: true },
  });
  if (!log) {
    res.status(404).json({ error: 'Query not found.' });
    return;
  }
  res.json({ feedback: log });
});
