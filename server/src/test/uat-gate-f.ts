/**
 * Gate F UAT automation — M08 (15) + M11 (16) = 31 tests
 * Run: npm run test:uat-f --prefix server
 */

const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api/v1';

type Verdict = 'PASS' | 'FAIL' | 'SKIP';
type Result = { id: string; gate: string; verdict: Verdict; notes: string };

const results: Result[] = [];

function record(id: string, gate: string, verdict: Verdict, notes: string) {
  results.push({ id, gate, verdict, notes });
  const icon = verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '○';
  console.log(`  ${icon} ${id}: ${notes}`);
}

class Session {
  cookies = '';
  async request(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers as HeadersInit);
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
    if (this.cookies) headers.set('Cookie', this.cookies);
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) this.cookies = setCookie.map((c) => c.split(';')[0]).join('; ');
    else {
      const raw = res.headers.get('set-cookie');
      if (raw) this.cookies = raw.split(';')[0];
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { res, data, text };
  }
}

async function login(session: Session, email: string) {
  const { res, data } = await session.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'demo123' }),
  });
  if (!res.ok) throw new Error(`Login ${email} failed`);
  if ((data as { requiresMfa?: boolean }).requiresMfa && process.env.SKIP_LOGIN_MFA !== 'true') {
    throw new Error(`MFA required for ${email}`);
  }
}

async function runM08(sarah: Session, lp: Session, admin: Session) {
  console.log('\nM08 — AI Legal Intelligence (15 tests)');

  const t0 = Date.now();
  const ai = await sarah.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'What are the requirements for data protection in Rwanda?' }),
  });
  const elapsed = Date.now() - t0;
  const aiBody = ai.data as {
    id?: string;
    answer?: string;
    sources?: unknown[];
    confidence?: number;
    confidenceLevel?: string;
    processingTimeMs?: number;
  };
  record(
    'UAT-M08-001',
    'M08',
    ai.res.ok && aiBody.answer && elapsed < 30000 ? 'PASS' : 'FAIL',
    `Query ${ai.res.status} in ${elapsed}ms; answer=${!!aiBody.answer}`
  );

  record(
    'UAT-M08-002',
    'M08',
    (aiBody.sources?.length ?? 0) >= 1 && typeof aiBody.confidence === 'number' && !!aiBody.confidenceLevel
      ? 'PASS'
      : 'FAIL',
    `Sources=${aiBody.sources?.length}; confidence=${aiBody.confidenceLevel}`
  );

  const obligationsQuery = await sarah.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'Summarize our data protection compliance obligations' }),
  });
  const ob = obligationsQuery.data as { answer?: string; sources?: { module?: string }[] };
  const hasObligationRef =
    (ob.answer?.toLowerCase().includes('obligation') ?? false) ||
    (ob.sources ?? []).some((s) => s.module === 'compliance' || s.module === 'knowledge');
  record(
    'UAT-M08-003',
    'M08',
    obligationsQuery.res.ok && hasObligationRef ? 'PASS' : 'FAIL',
    'Obligation-aware RAG response'
  );

  const risk = await lp.request('/ai/risk-assessment', {
    method: 'POST',
    body: JSON.stringify({ action: 'Implementing a 2-year non-compete clause for new employees in Rwanda.' }),
  });
  const riskBody = risk.data as { riskLevel?: string; score?: number; factors?: unknown[]; recommendations?: unknown[]; confidence?: number };
  record(
    'UAT-M08-004',
    'M08',
    risk.res.ok && riskBody.riskLevel && riskBody.factors?.length && riskBody.recommendations?.length ? 'PASS' : 'FAIL',
    `Risk=${riskBody.riskLevel}; factors=${riskBody.factors?.length}`
  );

  const clause = await lp.request('/ai/clause-analysis', {
    method: 'POST',
    body: JSON.stringify({
      clause: 'Party A shall indemnify Party B for unlimited liability without limitation. Termination for convenience without notice.',
    }),
  });
  const clauseBody = clause.data as { riskLevel?: string; issues?: unknown[] };
  record(
    'UAT-M08-005',
    'M08',
    clause.res.ok && clauseBody.riskLevel === 'high' && (clauseBody.issues?.length ?? 0) >= 1 ? 'PASS' : 'FAIL',
    `Clause risk=${clauseBody.riskLevel}; issues=${clauseBody.issues?.length ?? 0}`
  );

  const compare = await lp.request('/ai/document-compare', {
    method: 'POST',
    body: JSON.stringify({ docA: 'Master agreement v1 payment net-30', docB: 'Master agreement v2 payment net-45 with data protection clause added' }),
  });
  const cmp = compare.data as { modifications?: number; similarityScore?: number; changes?: unknown[] };
  record(
    'UAT-M08-006',
    'M08',
    compare.res.ok && typeof cmp.similarityScore === 'number' && (cmp.changes?.length ?? 0) >= 1 ? 'PASS' : 'FAIL',
    `Compare similarity=${cmp.similarityScore}`
  );

  const compliance = await sarah.request('/ai/compliance-check', {
    method: 'POST',
    body: JSON.stringify({ query: 'Are we compliant with employee data retention requirements?' }),
  });
  const cc = compliance.data as { items?: unknown[]; regulations?: unknown[] };
  record(
    'UAT-M08-007',
    'M08',
    compliance.res.ok && Array.isArray(cc.items) ? 'PASS' : 'FAIL',
    `Compliance check items=${cc.items?.length ?? 0}`
  );

  const queryId = aiBody.id;
  const helpful = queryId
    ? await sarah.request('/ai/feedback', { method: 'POST', body: JSON.stringify({ queryId, helpful: true }) })
    : { res: { ok: false } };
  const notHelpful = queryId
    ? await sarah.request('/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({ queryId, helpful: false, comment: 'Missing recent amendment.' }),
      })
    : { res: { ok: false } };
  const fbGet = queryId ? await sarah.request(`/ai/feedback/${queryId}`) : { res: { ok: false }, data: {} };
  record(
    'UAT-M08-008',
    'M08',
    helpful.res.ok && notHelpful.res.ok ? 'PASS' : 'FAIL',
    `Feedback stored=${(fbGet.data as { feedback?: string }).feedback ?? 'n/a'}`
  );

  const requery = await sarah.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'What are the requirements for data protection in Rwanda?' }),
  });
  record(
    'UAT-M08-009',
    'M08',
    notHelpful.res.ok && requery.res.ok && ((requery.data as { sources?: unknown[] }).sources?.length ?? 0) >= 1
      ? 'PASS'
      : 'FAIL',
    'Feedback loop + re-query returns sources'
  );

  const history = await sarah.request('/ai/history');
  const histLp = await lp.request('/ai/history');
  const sarahHist = (history.data as { history?: unknown[] }).history ?? [];
  const lpHist = (histLp.data as { history?: unknown[] }).history ?? [];
  record(
    'UAT-M08-010',
    'M08',
    history.res.ok && sarahHist.length >= 1 ? 'PASS' : 'FAIL',
    `Sarah history=${sarahHist.length}; LP history=${lpHist.length} (user-scoped)`
  );

  const users = await admin.request('/users');
  const lpUser = ((users.data as { users?: { id: string; email: string }[] }).users ?? []).find((u) =>
    u.email.includes('michael.chen')
  );
  if (lpUser) {
    await admin.request(`/users/${lpUser.id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ modules: { aiIntelligence: 'none' } }),
    });
  }
  const denied = await lp.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'test denied' }),
  });
  if (lpUser) {
    await admin.request(`/users/${lpUser.id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ modules: { aiIntelligence: 'full' } }),
    });
  }
  record(
    'UAT-M08-011',
    'M08',
    denied.res.status === 403 ? 'PASS' : 'FAIL',
    `AI RBAC denied status=${denied.res.status}`
  );

  const audit = await admin.request('/audit/logs?limit=50');
  const aiLogs = ((audit.data as { logs?: { action: string; resourceType: string }[] }).logs ?? []).filter(
    (l) => l.action === 'ai_query' || l.resourceType === 'ai_query'
  );
  record(
    'UAT-M08-012',
    'M08',
    audit.res.ok && aiLogs.length >= 1 ? 'PASS' : 'FAIL',
    `AI audit entries=${aiLogs.length}`
  );

  const timeout = await sarah.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'timeout test', simulateTimeout: true }),
  });
  const retry = await sarah.request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query: 'retry after timeout' }),
  });
  record(
    'UAT-M08-013',
    'M08',
    timeout.res.status === 503 && retry.res.ok ? 'PASS' : 'FAIL',
    `Timeout=${timeout.res.status}; retry=${retry.res.status}`
  );

  const dash = await sarah.request('/dashboard');
  const dashBody = dash.data as { quickActions?: { apiPath?: string }[] };
  const quick = dashBody.quickActions?.find((a) => a.apiPath === '/ai/compliance-check');
  const quickRun = quick
    ? await sarah.request('/ai/compliance-check', {
        method: 'POST',
        body: JSON.stringify({ query: 'Dashboard compliance check' }),
      })
    : { res: { ok: false } };
  record(
    'UAT-M08-014',
    'M08',
    !!quick && quickRun.res.ok ? 'PASS' : 'FAIL',
    'Dashboard quick action → compliance check API'
  );

  record(
    'UAT-M08-015',
    'M08',
    ai.res.ok && clause.res.ok && compare.res.ok && helpful.res.ok ? 'PASS' : 'FAIL',
    'Regression: query, clause, compare, feedback'
  );
}

async function runM11(admin: Session, sarah: Session, lp: Session) {
  console.log('\nM11 — Integration Module (16 tests)');

  const list = await admin.request('/integrations');
  const items = (list.data as { integrations?: { id: string; type: string; name: string; status: string }[] }).integrations ?? [];
  const types = new Set(items.map((i) => i.type));
  const coList = await sarah.request('/integrations');
  const coKeys = await sarah.request('/integrations/keys/list');
  record(
    'UAT-M11-001',
    'M11',
    list.res.ok && items.length >= 4 && types.has('regulatory') && types.has('e_sign') && coList.res.ok && coKeys.res.status === 403
      ? 'PASS'
      : 'FAIL',
    `${items.length} integrations; CO keys=${coKeys.res.status} (403 expected)`
  );

  const regulatory = items.find((i) => i.type === 'regulatory');
  const configure = regulatory
    ? await admin.request(`/integrations/${regulatory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'connected',
          isActive: true,
          config: { endpoint: 'https://gazette.mock.rw/api', apiKey: 'secret-test-key', syncFrequency: 'daily' },
        }),
      })
    : { res: { ok: false }, data: {} };
  const cfg = (configure.data as { integration?: { config?: { apiKey?: string } } }).integration;
  record(
    'UAT-M11-002',
    'M11',
    configure.res.ok && cfg?.config?.apiKey?.includes('****') ? 'PASS' : 'FAIL',
    'Regulatory connector configured; credentials masked'
  );

  const sync1 = regulatory
    ? await admin.request(`/integrations/${regulatory.id}/sync`, { method: 'POST', body: '{}' })
    : { res: { ok: false }, data: {} };
  const sync2 = regulatory
    ? await admin.request(`/integrations/${regulatory.id}/sync`, { method: 'POST', body: '{}' })
    : { res: { ok: false }, data: {} };
  const regFeed = await sarah.request('/regulatory/updates');
  const regCount = ((regFeed.data as { updates?: unknown[] }).updates ?? []).length;
  record(
    'UAT-M11-003',
    'M11',
    sync1.res.ok && (sync2.data as { duplicate?: boolean }).duplicate === true && regCount >= 1 ? 'PASS' : 'FAIL',
    `Regulatory sync; feed entries=${regCount}; duplicate on re-sync`
  );

  const esign = items.find((i) => i.type === 'e_sign');
  const esignCfg = esign
    ? await admin.request(`/integrations/${esign.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'connected',
          isActive: true,
          config: { accountId: 'sandbox-123', webhookUrl: 'https://licp.local/webhooks/docusign' },
        }),
      })
    : { res: { ok: false } };
  const esignTest = esign ? await admin.request(`/integrations/${esign.id}/test`, { method: 'POST', body: '{}' }) : { res: { ok: false } };
  record(
    'UAT-M11-004',
    'M11',
    esignCfg.res.ok && esignTest.res.ok ? 'PASS' : 'FAIL',
    'DocuSign stub configured and test connection'
  );

  const dms = items.find((i) => i.name.includes('Google Drive'));
  if (dms) {
    await admin.request(`/integrations/${dms.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'connected', isActive: true }),
    });
  }
  const dmsSync = dms
    ? await admin.request(`/integrations/${dms.id}/sync`, { method: 'POST', body: '{}' })
    : { res: { ok: false }, data: {} };
  record(
    'UAT-M11-005',
    'M11',
    dmsSync.res.ok && (dmsSync.data as { contractId?: string }).contractId ? 'PASS' : 'FAIL',
    'DMS sync creates contract link'
  );

  const erp = items.find((i) => i.type === 'erp_hris');
  const erpSync = erp
    ? await admin.request(`/integrations/${erp.id}/sync`, { method: 'POST', body: '{}' })
    : { res: { ok: false } };
  const org = await admin.request('/users/org-structure');
  record(
    'UAT-M11-006',
    'M11',
    erpSync.res.ok && org.res.ok && ((org.data as { units?: unknown[] }).units?.length ?? 0) >= 1 ? 'PASS' : 'FAIL',
    'ERP/HRIS sync + org structure'
  );

  const keyCreate = await admin.request('/integrations/keys', {
    method: 'POST',
    body: JSON.stringify({ name: 'UAT Regulatory Key' }),
  });
  const keyBody = keyCreate.data as { key?: { id: string; token: string } };
  const keyList = await admin.request('/integrations/keys/list');
  const keys = (keyList.data as { keys?: { id: string; token?: string }[] }).keys ?? [];
  if (keyBody.key?.id) {
    await admin.request(`/integrations/keys/${keyBody.key.id}`, { method: 'DELETE' });
  }
  record(
    'UAT-M11-007',
    'M11',
    keyCreate.res.status === 201 && !!keyBody.key?.token && !keys.some((k) => (k as { token?: string }).token) ? 'PASS' : 'FAIL',
    'API key create/list/revoke lifecycle'
  );

  const first = items[0];
  const health = first ? await admin.request(`/integrations/${first.id}/health`) : { res: { ok: false }, data: {} };
  const hb = health.data as { healthy?: boolean; uptime?: number; successRate?: number };
  record(
    'UAT-M11-008',
    'M11',
    health.res.ok && typeof hb.uptime === 'number' && typeof hb.successRate === 'number' ? 'PASS' : 'FAIL',
    `Health monitoring uptime=${hb.uptime}%`
  );

  record(
    'UAT-M11-009',
    'M11',
    configure.res.ok && (cfg?.config as { syncFrequency?: string })?.syncFrequency === 'daily' ? 'PASS' : 'FAIL',
    'Sync schedule stored in integration config'
  );

  const logs = await admin.request('/integrations/logs');
  record(
    'UAT-M11-010',
    'M11',
    logs.res.ok && ((logs.data as { logs?: unknown[] }).logs?.length ?? 0) >= 1 ? 'PASS' : 'FAIL',
    `Integration logs=${(logs.data as { logs?: unknown[] }).logs?.length ?? 0}`
  );

  const testConn = regulatory
    ? await admin.request(`/integrations/${regulatory.id}/test`, { method: 'POST', body: '{}' })
    : { res: { ok: false } };
  record(
    'UAT-M11-011',
    'M11',
    testConn.res.ok ? 'PASS' : 'FAIL',
    'Test connection interface'
  );

  record(
    'UAT-M11-012',
    'M11',
    configure.res.ok && !JSON.stringify(configure.data).includes('secret-test-key') ? 'PASS' : 'FAIL',
    'Credentials not returned in plain text'
  );

  const sharePoint = items.find((i) => i.name.includes('SharePoint'));
  const disable = sharePoint
    ? await admin.request(`/integrations/${sharePoint.id}/disable`, { method: 'POST', body: '{}' })
    : { res: { ok: false } };
  record(
    'UAT-M11-013',
    'M11',
    disable.res.ok ? 'PASS' : 'FAIL',
    'Disable integration API'
  );

  record(
    'UAT-M11-014',
    'M11',
    sync1.res.ok && regCount >= 1 ? 'PASS' : 'FAIL',
    'End-to-end regulatory API → M05 feed'
  );

  record(
    'UAT-M11-015',
    'M11',
    list.res.ok && health.res.ok && testConn.res.ok ? 'PASS' : 'FAIL',
    'Regression: list, health, test connection'
  );

  const overview = await sarah.request('/analytics/overview');
  const users = await admin.request('/users');
  record(
    'UAT-M11-016',
    'M11',
    overview.res.ok && users.res.ok && list.res.ok ? 'PASS' : 'FAIL',
    'Gate F final regression: analytics + users + integrations'
  );
}

async function main() {
  console.log('Gate F UAT — Automated Assessment');
  console.log(`API: ${BASE}\n`);

  try {
    await fetch(`${BASE}/health`);
  } catch {
    console.error('API not reachable. Start: npm run dev:api');
    process.exit(1);
  }

  const sarah = new Session();
  const admin = new Session();
  const lp = new Session();

  await login(sarah, 'sarah.johnson@legalfirm.com');
  await login(admin, 'david.park@legalfirm.com');
  await login(lp, 'michael.chen@legalfirm.com');

  await runM08(sarah, lp, admin);
  await runM11(admin, sarah, lp);

  const passed = results.filter((r) => r.verdict === 'PASS').length;
  const failed = results.filter((r) => r.verdict === 'FAIL').length;
  const skipped = results.filter((r) => r.verdict === 'SKIP').length;

  console.log('\n--- Gate F UAT Summary ---');
  console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
  if (failed === 0) {
    console.log('\nGate F status: APPROVED (all non-skipped tests passed)\n');
  } else {
    console.log('\nGate F status: NOT APPROVED\n');
  }

  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
