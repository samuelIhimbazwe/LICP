import { prisma } from './prisma.js';

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
}

function textMatchesQuery(text: string, query: string) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (q && lower.includes(q)) return true;
  const terms = queryTerms(query);
  if (!terms.length) return false;
  const hits = terms.filter((term) => lower.includes(term)).length;
  return hits >= Math.min(2, terms.length) || (terms.length === 1 && hits === 1);
}

function relevanceScore(text: string, query: string, index = 0) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  let score = 55 - index * 3;
  if (q && lower.includes(q)) score += 30;
  const terms = queryTerms(query);
  const hits = terms.filter((t) => lower.includes(t)).length;
  score += Math.min(25, hits * 8);
  return Math.max(40, Math.min(98, score));
}

export type AiHitModule =
  | 'knowledge'
  | 'compliance'
  | 'regulatory'
  | 'contract'
  | 'integration'
  | 'user'
  | 'notification'
  | 'report'
  | 'evidence'
  | 'template'
  | 'audit';

export interface AiPlatformHit {
  id: string;
  module: AiHitModule;
  title: string;
  excerpt: string;
  meta?: string;
  relevance: number;
  type?: string;
  jurisdiction?: string | null;
}

function wantsModule(query: string, keywords: string[]) {
  const q = query.toLowerCase();
  return keywords.some((k) => q.includes(k));
}

/**
 * Search across the whole LICP organisation dataset so the local AI can
 * answer questions about anything stored in the platform.
 */
export async function searchPlatform(orgId: string, query: string): Promise<AiPlatformHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const inventoryMode =
    /how many|list|show|status|overview|summary|what.*(do we|are our)|tell me about|any|all/i.test(q) ||
    wantsModule(q, [
      'contract',
      'obligation',
      'compliance',
      'regulation',
      'regulatory',
      'user',
      'integration',
      'report',
      'document',
      'knowledge',
      'notification',
      'evidence',
      'template',
      'audit',
    ]);

  const [
    docs,
    obligations,
    updates,
    contracts,
    integrations,
    users,
    notifications,
    reports,
    evidence,
    templates,
    audits,
  ] = await Promise.all([
    prisma.legalDocument.findMany({ where: { organizationId: orgId }, take: 120 }),
    prisma.complianceObligation.findMany({ where: { organizationId: orgId }, take: 120 }),
    prisma.regulatoryUpdate.findMany({
      where: { organizationId: orgId },
      orderBy: { publishedAt: 'desc' },
      take: 80,
    }),
    prisma.contract.findMany({ where: { organizationId: orgId }, take: 100 }),
    prisma.integration.findMany({ where: { organizationId: orgId }, take: 40 }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        department: true,
        mfaEnabled: true,
        lastLoginAt: true,
      },
      take: 80,
    }),
    prisma.notification.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.generatedReport.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.complianceEvidence.findMany({
      where: { organizationId: orgId },
      orderBy: { uploadedAt: 'desc' },
      take: 40,
    }),
    prisma.contractTemplate.findMany({ where: { organizationId: orgId }, take: 40 }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    }),
  ]);

  const hits: AiPlatformHit[] = [];

  const pushScored = (
    items: Array<{
      id: string;
      module: AiHitModule;
      title: string;
      blob: string;
      excerpt: string;
      meta?: string;
      type?: string;
      jurisdiction?: string | null;
      forceInclude?: boolean;
    }>
  ) => {
    items.forEach((item, index) => {
      const matched = textMatchesQuery(item.blob, q) || Boolean(item.forceInclude);
      if (!matched) return;
      hits.push({
        id: item.id,
        module: item.module,
        title: item.title,
        excerpt: item.excerpt.slice(0, 280),
        meta: item.meta,
        type: item.type,
        jurisdiction: item.jurisdiction,
        relevance: relevanceScore(item.blob, q, index) + (item.forceInclude && !textMatchesQuery(item.blob, q) ? -8 : 0),
      });
    });
  };

  const forceKnowledge = inventoryMode && wantsModule(q, ['document', 'knowledge', 'law', 'guidance']);
  pushScored(
    docs.map((d) => ({
      id: d.id,
      module: 'knowledge' as const,
      title: d.title,
      blob: `${d.title} ${d.summary} ${d.content} ${d.type} ${d.jurisdiction ?? ''} ${(d.tags as string[] | null) ?? ''}`,
      excerpt: d.summary || d.content.slice(0, 280),
      meta: d.type,
      type: d.type,
      jurisdiction: d.jurisdiction,
      forceInclude: forceKnowledge,
    }))
  );

  const forceCompliance =
    inventoryMode && wantsModule(q, ['obligation', 'compliance', 'deadline', 'gap']);
  pushScored(
    obligations.map((o) => ({
      id: o.id,
      module: 'compliance' as const,
      title: o.title,
      blob: `${o.title} ${o.description} ${o.regulation} ${o.status} ${o.department ?? ''} ${o.jurisdiction ?? ''}`,
      excerpt: o.description || o.regulation,
      meta: `${o.status} · ${o.regulation}`,
      type: 'obligation',
      jurisdiction: o.jurisdiction,
      forceInclude: forceCompliance || (/non.?compliant|overdue|open gap/i.test(q) && o.status !== 'compliant'),
    }))
  );

  const forceRegulatory = inventoryMode && wantsModule(q, ['regulation', 'regulatory', 'update', 'gazette']);
  pushScored(
    updates.map((u) => ({
      id: u.id,
      module: 'regulatory' as const,
      title: u.title,
      blob: `${u.title} ${u.description} ${u.category} ${u.impact} ${u.jurisdiction ?? ''} ${u.status} ${u.source ?? ''}`,
      excerpt: u.description,
      meta: `${u.category} · ${u.impact} impact · ${u.status}`,
      type: u.category,
      jurisdiction: u.jurisdiction,
      forceInclude: forceRegulatory,
    }))
  );

  const forceContracts = inventoryMode && wantsModule(q, ['contract', 'agreement', 'vendor', 'counterparty']);
  pushScored(
    contracts.map((c) => ({
      id: c.id,
      module: 'contract' as const,
      title: c.title,
      blob: `${c.title} ${c.content} ${c.counterparty ?? ''} ${c.type} ${c.status} ${c.createdBy}`,
      excerpt: c.content?.slice(0, 280) || `${c.type} · ${c.status}${c.counterparty ? ` · ${c.counterparty}` : ''}`,
      meta: `${c.status}${c.counterparty ? ` · ${c.counterparty}` : ''}`,
      type: c.type,
      forceInclude: forceContracts,
    }))
  );

  const forceIntegrations = inventoryMode && wantsModule(q, ['integration', 'connector', 'sync', 'api']);
  pushScored(
    integrations.map((i) => ({
      id: i.id,
      module: 'integration' as const,
      title: i.name,
      blob: `${i.name} ${i.type} ${i.status} active=${i.isActive} synced=${i.recordsSynced}`,
      excerpt: `${i.type} · status ${i.status} · ${i.isActive ? 'active' : 'inactive'} · ${i.recordsSynced} records synced`,
      meta: i.status,
      type: i.type,
      forceInclude: forceIntegrations,
    }))
  );

  const forceUsers = inventoryMode && wantsModule(q, ['user', 'people', 'team', 'role', 'staff', 'account']);
  pushScored(
    users.map((u) => ({
      id: u.id,
      module: 'user' as const,
      title: u.fullName,
      blob: `${u.fullName} ${u.email} ${u.role} ${u.status} ${u.department ?? ''} mfa=${u.mfaEnabled}`,
      excerpt: `${u.email} · ${u.role.replace(/_/g, ' ')} · ${u.status}${u.department ? ` · ${u.department}` : ''}`,
      meta: u.role,
      type: 'user',
      forceInclude: forceUsers,
    }))
  );

  const forceNotifications = inventoryMode && wantsModule(q, ['notification', 'alert', 'inbox']);
  pushScored(
    notifications.map((n) => ({
      id: n.id,
      module: 'notification' as const,
      title: n.title,
      blob: `${n.title} ${n.message} ${n.type} ${n.priority}`,
      excerpt: n.message,
      meta: `${n.type} · ${n.priority}${n.isRead ? '' : ' · unread'}`,
      type: n.type,
      forceInclude: forceNotifications,
    }))
  );

  const forceReports = inventoryMode && wantsModule(q, ['report', 'analytics', 'export']);
  pushScored(
    reports.map((r) => ({
      id: r.id,
      module: 'report' as const,
      title: r.reportName,
      blob: `${r.reportName} ${r.type} ${r.format} ${r.generatedBy} ${r.content.slice(0, 400)}`,
      excerpt: `${r.type} · ${r.format} · generated by ${r.generatedBy}`,
      meta: r.format,
      type: r.type,
      forceInclude: forceReports,
    }))
  );

  const forceEvidence = inventoryMode && wantsModule(q, ['evidence', 'proof', 'upload']);
  pushScored(
    evidence.map((e) => ({
      id: e.id,
      module: 'evidence' as const,
      title: e.fileName,
      blob: `${e.fileName} ${e.notes ?? ''} ${e.uploadedBy}`,
      excerpt: e.notes || `Uploaded by ${e.uploadedBy}`,
      meta: e.uploadedBy,
      type: 'evidence',
      forceInclude: forceEvidence,
    }))
  );

  const forceTemplates = inventoryMode && wantsModule(q, ['template']);
  pushScored(
    templates.map((t) => ({
      id: t.id,
      module: 'template' as const,
      title: t.name,
      blob: `${t.name} ${t.description} ${t.type} ${t.body.slice(0, 300)}`,
      excerpt: t.description || t.type || 'Contract template',
      meta: t.type,
      type: 'template',
      forceInclude: forceTemplates,
    }))
  );

  const forceAudit = inventoryMode && wantsModule(q, ['audit', 'security', 'log', 'activity']);
  pushScored(
    audits.map((a) => ({
      id: a.id,
      module: 'audit' as const,
      title: a.actionDetails || a.action,
      blob: `${a.action} ${a.actionDetails} ${a.userName ?? ''} ${a.resource} ${a.resourceType}`,
      excerpt: `${a.userName ?? 'System'} · ${a.action} · ${a.resourceType}`,
      meta: a.status,
      type: 'audit',
      forceInclude: forceAudit,
    }))
  );

  // Deduplicate by module+id and keep strongest relevance
  const byKey = new Map<string, AiPlatformHit>();
  for (const hit of hits) {
    const key = `${hit.module}:${hit.id}`;
    const prev = byKey.get(key);
    if (!prev || hit.relevance > prev.relevance) byKey.set(key, hit);
  }

  return [...byKey.values()].sort((a, b) => b.relevance - a.relevance).slice(0, 18);
}

export async function searchKnowledge(orgId: string, query: string) {
  const hits = await searchPlatform(orgId, query);
  return hits
    .filter((h) => h.module === 'knowledge')
    .slice(0, 5)
    .map((h) => ({
      id: h.id,
      title: h.title,
      summary: h.excerpt,
      content: h.excerpt,
      type: h.type ?? 'document',
      jurisdiction: h.jurisdiction ?? undefined,
      relevance: h.relevance,
    }));
}

export async function searchObligations(orgId: string, query: string) {
  const hits = await searchPlatform(orgId, query);
  // Prefer real obligation rows for compliance-check compatibility
  const ids = hits.filter((h) => h.module === 'compliance').map((h) => h.id);
  if (!ids.length) {
    const q = query.toLowerCase();
    const broad = /obligation|compliance|retention|data protection|summarize our|risk|gdpr|privacy/.test(q);
    const obligations = await prisma.complianceObligation.findMany({ where: { organizationId: orgId } });
    return obligations
      .map((o) => {
        const blob = `${o.title} ${o.regulation} ${o.description}`;
        const matched =
          textMatchesQuery(blob, query) ||
          (broad &&
            (o.regulation.toLowerCase().includes('data') ||
              o.title.toLowerCase().includes('data') ||
              o.title.toLowerCase().includes('audit') ||
              o.title.toLowerCase().includes('soc') ||
              o.status !== 'compliant'));
        return { o, matched, score: relevanceScore(blob, query, 0) };
      })
      .filter((x) => x.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => ({ ...x.o, relevance: x.score }));
  }
  const obligations = await prisma.complianceObligation.findMany({
    where: { organizationId: orgId, id: { in: ids } },
  });
  return obligations.map((o) => ({
    ...o,
    relevance: hits.find((h) => h.id === o.id)?.relevance ?? 70,
  }));
}

export function buildResearchAnswerFromHits(query: string, hits: AiPlatformHit[]) {
  if (!hits.length) {
    return [
      'No matching information was found across the LICP platform for this question.',
      'Try keywords from contracts, obligations, regulations, users, integrations, reports, or documents stored in your organisation.',
      'You can also ask inventory questions such as “list our open obligations” or “how many contracts do we have”.',
    ].join(' ');
  }

  const byModule = hits.reduce<Record<string, AiPlatformHit[]>>((acc, hit) => {
    (acc[hit.module] ??= []).push(hit);
    return acc;
  }, {});

  const parts: string[] = [];
  parts.push(
    `Found ${hits.length} relevant item(s) in your LICP system for: “${query.trim()}”.`
  );

  const section = (label: string, module: AiHitModule, formatter: (h: AiPlatformHit) => string) => {
    const group = byModule[module];
    if (!group?.length) return;
    parts.push(
      `${label} (${group.length}):\n` +
        group
          .slice(0, 5)
          .map((h, i) => `${i + 1}. ${formatter(h)}`)
          .join('\n')
    );
  };

  section('Knowledge documents', 'knowledge', (h) => `${h.title}${h.meta ? ` [${h.meta}]` : ''} — ${h.excerpt}`);
  section('Compliance obligations', 'compliance', (h) => `${h.title} (${h.meta ?? 'obligation'}) — ${h.excerpt}`);
  section('Regulatory updates', 'regulatory', (h) => `${h.title} (${h.meta ?? 'update'}) — ${h.excerpt}`);
  section('Contracts', 'contract', (h) => `${h.title} (${h.meta ?? 'contract'}) — ${h.excerpt}`);
  section('Users', 'user', (h) => `${h.title} — ${h.excerpt}`);
  section('Integrations', 'integration', (h) => `${h.title} — ${h.excerpt}`);
  section('Notifications', 'notification', (h) => `${h.title} — ${h.excerpt}`);
  section('Reports', 'report', (h) => `${h.title} — ${h.excerpt}`);
  section('Evidence files', 'evidence', (h) => `${h.title} — ${h.excerpt}`);
  section('Contract templates', 'template', (h) => `${h.title} — ${h.excerpt}`);
  section('Audit / security events', 'audit', (h) => `${h.title} — ${h.excerpt}`);

  return parts.join('\n\n');
}

/** @deprecated Prefer buildResearchAnswerFromHits after searchPlatform */
export function buildResearchAnswer(
  query: string,
  docs: Array<{ title: string; summary?: string; content?: string }>,
  obligations: Array<{ title: string; status: string; regulation?: string }>
) {
  const hits: AiPlatformHit[] = [
    ...docs.map((d, i) => ({
      id: `doc-${i}`,
      module: 'knowledge' as const,
      title: d.title,
      excerpt: d.summary || d.content?.slice(0, 280) || '',
      relevance: 80 - i,
    })),
    ...obligations.map((o, i) => ({
      id: `obl-${i}`,
      module: 'compliance' as const,
      title: o.title,
      excerpt: o.regulation || '',
      meta: o.status,
      relevance: 75 - i,
    })),
  ];
  return buildResearchAnswerFromHits(query, hits);
}

export function buildResearchRecommendationsFromHits(hits: AiPlatformHit[]) {
  const recs: string[] = [];
  const open = hits.filter((h) => h.module === 'compliance' && /non_compliant|partial|not_assessed|warning/i.test(h.meta ?? ''));
  if (open.length) {
    recs.push(`Review open compliance item(s): ${open.map((h) => h.title).slice(0, 3).join('; ')}.`);
  }
  const contracts = hits.filter((h) => h.module === 'contract');
  if (contracts.length) {
    recs.push(`Open Contracts module for: ${contracts[0].title}.`);
  }
  const docs = hits.filter((h) => h.module === 'knowledge');
  if (docs.length) {
    recs.push(`Cross-check Knowledge Base source: ${docs[0].title}.`);
  }
  const regs = hits.filter((h) => h.module === 'regulatory');
  if (regs.length) {
    recs.push(`Review regulatory update: ${regs[0].title}.`);
  }
  if (!recs.length) {
    recs.push('Open the cited module links to verify details.');
    recs.push('Ask a more specific question if you need a deeper drill-down.');
  } else {
    recs.push('Use the cited sources in LICP to verify before taking action.');
  }
  return recs.slice(0, 4);
}

export function buildResearchRecommendations(
  docs: Array<{ title: string }>,
  obligations: Array<{ title: string; status: string }>
) {
  const hits: AiPlatformHit[] = [
    ...docs.map((d, i) => ({
      id: `d-${i}`,
      module: 'knowledge' as const,
      title: d.title,
      excerpt: '',
      relevance: 80,
    })),
    ...obligations.map((o, i) => ({
      id: `o-${i}`,
      module: 'compliance' as const,
      title: o.title,
      excerpt: '',
      meta: o.status,
      relevance: 75,
    })),
  ];
  return buildResearchRecommendationsFromHits(hits);
}

async function callOptionalLlm(system: string, user: string, maxTokens = 800): Promise<string | null> {
  // Prefer Groq free tier (OpenAI-compatible). Fall back to OpenAI if configured.
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = groqKey || openAiKey;
  if (!apiKey) return null;

  const baseUrl = (
    process.env.LLM_BASE_URL?.trim() ||
    (groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1')
  ).replace(/\/$/, '');

  const model =
    process.env.LLM_MODEL?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    (groqKey ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`[licp:ai] LLM request failed (${res.status}): ${detail.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.warn('[licp:ai] LLM request error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export type ResearchAnswerResult = {
  answer: string;
  usedExternalLlm: boolean;
  hasLocalSources: boolean;
};

/**
 * Prefer LICP platform data. External LLM (Groq/OpenAI) is used only when
 * search across the whole organisation finds no matching records.
 */
export async function buildResearchAnswerWithLlm(
  query: string,
  hits: AiPlatformHit[]
): Promise<ResearchAnswerResult> {
  const hasLocalSources = hits.length > 0;

  if (hasLocalSources) {
    return {
      answer: buildResearchAnswerFromHits(query, hits),
      usedExternalLlm: false,
      hasLocalSources: true,
    };
  }

  const llm = await callOptionalLlm(
    [
      'You are a legal research assistant for LICP (Legal Intelligence & Compliance Platform).',
      'The organisation platform had NO matching records (documents, obligations, contracts, users, integrations, etc.).',
      'Provide a short, practical general answer based on widely known legal principles.',
      'Prefer Rwanda / EAC context when relevant.',
      'Start with a clear disclaimer that this is general guidance only, not grounded in the organisation\'s LICP data, and counsel should verify.',
      'Do not invent case citations or statute numbers you are unsure of.',
      'Be concise (under 250 words).',
    ].join(' '),
    `Question: ${query}`
  );

  if (llm) {
    const disclaimer =
      '⚠️ General guidance (no matching records found across your LICP system).\n\n';
    const answer = llm.startsWith('⚠️') || /disclaimer|general guidance/i.test(llm.slice(0, 120))
      ? llm
      : disclaimer + llm;
    return { answer, usedExternalLlm: true, hasLocalSources: false };
  }

  return {
    answer: buildResearchAnswerFromHits(query, hits),
    usedExternalLlm: false,
    hasLocalSources: false,
  };
}

export async function assessRisk(orgId: string, action: string) {
  const lower = action.toLowerCase();
  const high =
    /personal data|non-compete|without consent|cross-border|biometric|transfer abroad|unlimited liability|perpetual/.test(
      lower
    );
  const medium = /employee|contract|vendor|retention|marketing|cookie|consent|termination/.test(lower);

  const compliance = await runComplianceCheck(orgId, action);
  const openItems = compliance.items.filter((i) => i.category !== 'compliant');

  let riskLevel: 'critical' | 'high' | 'medium' | 'low' = high ? 'high' : medium ? 'medium' : 'low';
  let score = high ? 78 : medium ? 55 : 28;
  if (openItems.length >= 3) {
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel === 'medium' ? 'high' : riskLevel;
    score = Math.min(95, score + openItems.length * 4);
  }

  const factors = [
    {
      name: 'Regulatory exposure',
      severity: high ? 'high' : 'medium',
      description: high
        ? 'Action touches regulated data, labour, or cross-border rules.'
        : 'Standard regulatory review is recommended for the described action.',
      likelihood: high ? 'high' : medium ? 'medium' : 'low',
      impact: high ? 'high' : 'medium',
      mitigation: 'Map applicable Rwanda / regional statutes and document legal basis.',
    },
    {
      name: 'Contract / policy enforceability',
      severity: /non-compete|indemnif|liability/.test(lower) ? 'high' : 'medium',
      description: 'Contractual terms may be limited by local law or public policy.',
      likelihood: 'medium',
      impact: /non-compete|indemnif/.test(lower) ? 'high' : 'medium',
      mitigation: 'Limit duration, geography, and consideration; add liability caps where needed.',
    },
    {
      name: 'Compliance obligation gaps',
      severity: openItems.length ? 'high' : 'low',
      description: openItems.length
        ? `${openItems.length} related obligation(s) are not fully compliant.`
        : 'No open matching obligations detected in the compliance register.',
      likelihood: openItems.length ? 'high' : 'low',
      impact: openItems.length ? 'high' : 'low',
      mitigation: openItems.length
        ? `Prioritise: ${openItems
            .slice(0, 2)
            .map((i) => i.title)
            .join('; ')}.`
        : 'Keep evidence current and re-check after policy changes.',
    },
  ];

  const recommendations = [
    ...compliance.items
      .filter((i) => i.category !== 'compliant')
      .slice(0, 2)
      .map((i) => `Close compliance gap: ${i.title}`),
    'Review Rwanda Data Protection Law and labour requirements where relevant',
    'Document legal basis, retain evidence, and escalate high-risk items to counsel',
  ].slice(0, 5);

  // External LLM only when local register + heuristics found little to go on.
  if (!openItems.length && !high && !medium) {
    const llm = await callOptionalLlm(
      'You are a legal risk analyst. Reply with 2-3 short mitigation recommendations as a plain bullet list. This is general guidance only.',
      `Assess risk for: ${action}\nKnown gaps: none in organisation register`
    );
    if (llm) {
      const extras = llm
        .split(/\n+/)
        .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
        .filter((l) => l.length > 10)
        .slice(0, 2);
      recommendations.unshift(...extras);
    }
  }

  return {
    riskLevel,
    score,
    confidence: high || openItems.length ? 0.84 : 0.72,
    factors,
    recommendations: [...new Set(recommendations)].slice(0, 5),
    complianceIssues: compliance.items.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.category === 'compliant' ? 'low' : i.category === 'unclear' ? 'medium' : 'high',
      description: i.explanation,
      regulation: i.title,
      status: i.status,
      category: i.category,
    })),
  };
}

export async function analyzeClause(clause: string) {
  const patterns: Array<{
    re: RegExp;
    type: string;
    severity: string;
    location: string;
    description: string;
    recommendation: string;
  }> = [
    {
      re: /indemnif/i,
      type: 'indemnification',
      severity: 'high',
      location: 'Indemnification language',
      description: 'Broad indemnification can create uncapped financial exposure.',
      recommendation: 'Narrow indemnified claims and exclude consequential damages where appropriate.',
    },
    {
      re: /unlimited liability|liability shall not be limited|without limitation.*liable/i,
      type: 'liability',
      severity: 'high',
      location: 'Liability section',
      description: 'Unlimited or uncapped liability increases residual risk.',
      recommendation: 'Add an aggregate liability cap tied to fees paid in a defined period.',
    },
    {
      re: /perpetual|in perpetuity|forever/i,
      type: 'duration',
      severity: 'high',
      location: 'Term / survival',
      description: 'Perpetual obligations are often unenforceable or commercially unbalanced.',
      recommendation: 'Replace with a defined survival period (e.g. 2–5 years) where legally allowed.',
    },
    {
      re: /termination for convenience/i,
      type: 'termination',
      severity: 'medium',
      location: 'Termination clause',
      description: 'Termination for convenience without notice can disrupt operations.',
      recommendation: 'Require written notice (e.g. 30 days) and wind-down assistance.',
    },
    {
      re: /non-compete|noncompete|restraint of trade/i,
      type: 'restrictive_covenant',
      severity: 'high',
      location: 'Restrictive covenants',
      description: 'Non-compete terms must be reasonable in time, geography, and scope.',
      recommendation: 'Limit duration and geography; ensure adequate consideration under local labour law.',
    },
    {
      re: /personal data|data subject|gdpr|cross-border transfer/i,
      type: 'data_protection',
      severity: 'medium',
      location: 'Data / privacy',
      description: 'Personal data processing triggers data-protection duties.',
      recommendation: 'Specify legal basis, retention, and transfer safeguards.',
    },
    {
      re: /without notice|immediately terminate|sole discretion/i,
      type: 'termination',
      severity: 'medium',
      location: 'Termination / discretion',
      description: 'Unilateral termination or sole discretion language may be challenged.',
      recommendation: 'Define objective triggers and minimum notice where feasible.',
    },
  ];

  const issues = patterns
    .filter((p) => p.re.test(clause))
    .map((p) => ({
      type: p.type,
      severity: p.severity,
      location: p.location,
      description: p.description,
      recommendation: p.recommendation,
    }));

  const risky = issues.some((i) => i.severity === 'high');
  const score = Math.min(95, issues.reduce((s, i) => s + (i.severity === 'high' ? 22 : 12), 0));

  let alternativeLanguage: string | undefined;
  if (risky) {
    alternativeLanguage =
      "Each party's aggregate liability arising out of this Agreement shall not exceed the total fees paid or payable in the twelve (12) months preceding the claim, except for fraud, wilful misconduct, or breaches of confidentiality or data-protection obligations.";
  }

  let suggestions = issues.length
    ? issues.map((i) => i.recommendation)
    : ['No high-risk patterns detected. Confirm jurisdiction-specific enforceability with counsel.'];

  // External LLM only when local pattern matching found no issues.
  if (!issues.length) {
    const llm = await callOptionalLlm(
      'You are a contracts lawyer. Reply ONLY with JSON: {"suggestions":["..."],"alternativeLanguage":"..."} General guidance only; no org documents were matched.',
      `Analyse this clause and suggest safer wording:\n\n${clause.slice(0, 2500)}`,
      500
    );
    if (llm) {
      try {
        const jsonMatch = llm.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            suggestions?: string[];
            alternativeLanguage?: string;
          };
          if (parsed.suggestions?.length) suggestions = parsed.suggestions.slice(0, 5);
          if (parsed.alternativeLanguage) alternativeLanguage = parsed.alternativeLanguage;
        }
      } catch {
        // keep heuristic suggestions
      }
    }
  }

  const clauseType = /indemnif/i.test(clause)
    ? 'Indemnification'
    : /terminat/i.test(clause)
      ? 'Termination'
      : /confidential/i.test(clause)
        ? 'Confidentiality'
        : /non-compete|noncompete/i.test(clause)
          ? 'Restrictive covenant'
          : 'General contract clause';

  return {
    riskLevel: score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low',
    score: issues.length ? Math.max(18, score) : 12,
    confidence: issues.length ? 0.8 : 0.65,
    flaggedTerms: issues.map((i) => i.type),
    clauseType,
    issues,
    suggestions: [...new Set(suggestions)].slice(0, 5),
    alternativeLanguage,
  };
}

/** Line-oriented diff using LCS for real additions / deletions / modifications. */
export function compareDocuments(docA: string, docB: string) {
  const a = docA.replace(/\r\n/g, '\n').split('\n');
  const b = docB.replace(/\r\n/g, '\n').split('\n');

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  type Change = {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    section: string;
    context: string;
    originalText?: string;
    newText?: string;
    significance: 'major' | 'minor';
  };

  const changes: Change[] = [];
  let i = 0;
  let j = 0;
  let line = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
      line++;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      changes.push({
        type: 'removed',
        section: `Line ${line}`,
        context: 'Removed from original',
        originalText: a[i],
        significance: a[i].trim().length > 80 ? 'major' : 'minor',
      });
      i++;
      line++;
    } else {
      changes.push({
        type: 'added',
        section: `Line ${line}`,
        context: 'Added in revised document',
        newText: b[j],
        significance: b[j].trim().length > 80 ? 'major' : 'minor',
      });
      j++;
      line++;
    }
  }
  while (i < n) {
    changes.push({
      type: 'removed',
      section: `Line ${line++}`,
      context: 'Removed from original',
      originalText: a[i++],
      significance: 'minor',
    });
  }
  while (j < m) {
    changes.push({
      type: 'added',
      section: `Line ${line++}`,
      context: 'Added in revised document',
      newText: b[j++],
      significance: 'minor',
    });
  }

  // Collapse adjacent remove+add into modified
  const collapsed: Change[] = [];
  for (let k = 0; k < changes.length; k++) {
    const cur = changes[k];
    const next = changes[k + 1];
    if (cur.type === 'removed' && next?.type === 'added') {
      collapsed.push({
        type: 'modified',
        section: cur.section,
        context: 'Line modified',
        originalText: cur.originalText,
        newText: next.newText,
        significance:
          (cur.originalText?.length ?? 0) > 60 || (next.newText?.length ?? 0) > 60 ? 'major' : 'minor',
      });
      k++;
    } else {
      collapsed.push(cur);
    }
  }

  const additions = collapsed.filter((c) => c.type === 'added').length;
  const deletions = collapsed.filter((c) => c.type === 'removed').length;
  const modifications = collapsed.filter((c) => c.type === 'modified').length;
  const totalLines = Math.max(n, m, 1);
  const changed = additions + deletions + modifications;
  const similarityScore = Math.max(0, Math.min(100, Math.round(100 - (changed / totalLines) * 100)));

  const material = collapsed.filter((c) => c.type !== 'unchanged');
  const summary =
    material.length === 0
      ? 'Documents are identical.'
      : `Found ${additions} addition(s), ${deletions} deletion(s), and ${modifications} modification(s). Similarity ${similarityScore}%.`;

  return {
    additions,
    deletions,
    modifications,
    similarityScore,
    changes: material.slice(0, 50),
    summary,
    originalText: docA,
    revisedText: docB,
  };
}

export async function runComplianceCheck(orgId: string, query: string) {
  let obligations = await searchObligations(orgId, query);
  if (!obligations.length) {
    obligations = await prisma.complianceObligation.findMany({
      where: { organizationId: orgId },
      take: 8,
    });
  }
  const docs = await searchKnowledge(orgId, query);
  const items = obligations.map((o) => {
    const status = String(o.status);
    const category =
      status === 'compliant'
        ? 'compliant'
        : status === 'partially_compliant' || status === 'not_assessed' || status === 'warning'
          ? 'unclear'
          : 'non_compliant';
    return {
      id: o.id,
      title: o.title,
      status,
      explanation:
        category === 'compliant'
          ? 'Evidence and controls appear satisfied.'
          : category === 'unclear'
            ? 'Status requires review or additional evidence.'
            : 'Past deadline, non-compliant, or missing evidence.',
      category: category as 'compliant' | 'unclear' | 'non_compliant',
    };
  });

  return {
    query,
    summary: items.length
      ? `Found ${items.length} related obligation(s). ${items.filter((i) => i.category === 'compliant').length} compliant, ${items.filter((i) => i.category === 'non_compliant').length} non-compliant, ${items.filter((i) => i.category === 'unclear').length} needing review.`
      : 'No specific obligations matched; general regulatory guidance applies.',
    items,
    regulations: docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      jurisdiction: d.jurisdiction,
      relevance: 'relevance' in d ? (d as { relevance?: number }).relevance : undefined,
    })),
  };
}

export async function getAiStats(orgId: string, userId?: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const whereOrg = { organizationId: orgId };
  const whereUser = userId ? { organizationId: orgId, userId } : whereOrg;

  const [todayCount, recent, allFeedback] = await Promise.all([
    prisma.aiQueryLog.count({
      where: { ...whereUser, createdAt: { gte: startOfDay } },
    }),
    prisma.aiQueryLog.findMany({
      where: whereUser,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { confidence: true, feedback: true, createdAt: true, query: true, response: true, sources: true },
    }),
    prisma.aiQueryLog.findMany({
      where: { ...whereOrg, feedback: { not: null } },
      select: { feedback: true },
      take: 200,
    }),
  ]);

  const avgConfidence =
    recent.length > 0 ? recent.reduce((s, r) => s + r.confidence, 0) / recent.length : 0;
  const helpful = allFeedback.filter((f) => f.feedback === 'helpful').length;
  const rated = allFeedback.length;
  const helpfulRate = rated ? Math.round((helpful / rated) * 100) : 0;

  const timed = recent
    .map((r) => {
      const src = r.sources as { processingTimeMs?: number } | unknown[] | null;
      if (src && !Array.isArray(src) && typeof src === 'object' && typeof src.processingTimeMs === 'number') {
        return src.processingTimeMs;
      }
      return null;
    })
    .filter((ms): ms is number => ms != null && ms > 0);
  const avgResponseSec =
    timed.length > 0
      ? Number((timed.reduce((a, b) => a + b, 0) / timed.length / 1000).toFixed(1))
      : recent.length > 0
        ? Number((1.2 + Math.min(2.5, recent[0].response.length / 800)).toFixed(1))
        : 0;

  return {
    queriesToday: todayCount,
    avgConfidence: Math.round(avgConfidence * 100),
    avgResponseSeconds: avgResponseSec || 0,
    helpfulRate,
    totalQueries: await prisma.aiQueryLog.count({ where: whereUser }),
  };
}

export async function getAiInsights(orgId: string) {
  const [obligations, docs, recentQueries] = await Promise.all([
    prisma.complianceObligation.findMany({
      where: { organizationId: orgId },
      orderBy: { deadline: 'asc' },
      take: 20,
    }),
    prisma.legalDocument.findMany({ where: { organizationId: orgId }, take: 10 }),
    prisma.aiQueryLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { query: true, confidence: true },
    }),
  ]);

  const open = obligations.filter((o) => o.status !== 'compliant');
  const overdue = obligations.filter(
    (o) => o.deadline < new Date() && o.status !== 'compliant'
  );
  const insights: Array<{
    id: string;
    type: 'trend' | 'risk' | 'opportunity' | 'alert';
    title: string;
    description: string;
    sources: Array<{ label: string; href: string }>;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  if (overdue.length) {
    insights.push({
      id: 'overdue',
      type: 'alert',
      title: `${overdue.length} overdue compliance obligation(s)`,
      description: `Immediate attention needed for: ${overdue
        .slice(0, 3)
        .map((o) => o.title)
        .join('; ')}.`,
      sources: overdue.slice(0, 3).map((o) => ({
        label: o.title,
        href: `/compliance-tracking?obligation=${encodeURIComponent(o.id)}`,
      })),
      priority: 'high',
    });
  }

  if (open.length) {
    insights.push({
      id: 'open-gaps',
      type: 'risk',
      title: 'Open compliance gaps detected',
      description: `${open.length} obligation(s) are not fully compliant. Use AI Risk Assessment or Compliance Check for prioritisation.`,
      sources: open.slice(0, 3).map((o) => ({
        label: o.regulation || o.title,
        href: `/compliance-tracking?obligation=${encodeURIComponent(o.id)}`,
      })),
      priority: open.length > 5 ? 'high' : 'medium',
    });
  }

  if (docs.length) {
    insights.push({
      id: 'kb-coverage',
      type: 'opportunity',
      title: 'Knowledge base ready for research',
      description: `${docs.length}+ documents available. Ask the Research Assistant about jurisdiction-specific requirements.`,
      sources: docs.slice(0, 3).map((d) => ({
        label: d.title,
        href: `/knowledge-base?doc=${encodeURIComponent(d.id)}`,
      })),
      priority: 'low',
    });
  } else {
    insights.push({
      id: 'kb-empty',
      type: 'opportunity',
      title: 'Enrich the knowledge base',
      description: 'Upload laws and guidance to improve AI research quality and citation coverage.',
      sources: [],
      priority: 'medium',
    });
  }

  if (recentQueries.length >= 3) {
    const themes = recentQueries
      .map((q) => q.query.split(/\s+/).slice(0, 4).join(' '))
      .slice(0, 3);
    insights.push({
      id: 'query-trend',
      type: 'trend',
      title: 'Recent research themes',
      description: `Teams have been asking about: ${themes.join(' · ')}.`,
      sources: themes.map((t) => ({
        label: t,
        href: `/knowledge-base?q=${encodeURIComponent(t)}`,
      })),
      priority: 'low',
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'getting-started',
      type: 'opportunity',
      title: 'Start with a research query',
      description: 'Ask about data protection, employment, or contract risks to generate live insights.',
      sources: [],
      priority: 'low',
    });
  }

  return insights;
}
