/**
 * Gate C UAT automation — M04 Compliance + M05 Regulatory
 * Run: npm run test:uat-c --prefix server
 */

const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api/v1';

type Verdict = 'PASS' | 'FAIL' | 'SKIP';
const results: { id: string; gate: string; verdict: Verdict; notes: string }[] = [];

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

async function runM04(sarah: Session, lp: Session) {
  console.log('\nM04 — Compliance Tracking');

  const summary = await sarah.request('/compliance/summary');
  const s = summary.data as { total?: number; overallRate?: number };
  record(
    'UAT-M04-001',
    'M04',
    summary.res.ok && typeof s.total === 'number' ? 'PASS' : 'FAIL',
    `Summary total=${s.total}, rate=${s.overallRate}%`
  );

  const list = await sarah.request('/compliance/obligations');
  const obligations = (list.data as { obligations?: { id: string }[] }).obligations ?? [];
  record(
    'UAT-M04-002',
    'M04',
    list.res.ok && obligations.length >= 1 ? 'PASS' : 'FAIL',
    `Obligations listed: ${obligations.length}`
  );

  const create = await sarah.request('/compliance/obligations', {
    method: 'POST',
    body: JSON.stringify({
      title: `UAT Obligation ${Date.now()}`,
      regulation: 'Law N° 058/2021',
      description: 'Gate C test obligation',
      jurisdiction: 'Rwanda',
      department: 'Legal',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      assignedTo: 'Michael Chen',
      requirementLevel: 'mandatory',
    }),
  });
  const created = (create.data as { obligation?: { id: string } }).obligation;
  record('UAT-M04-002b', 'M04', create.res.status === 201 && created?.id ? 'PASS' : 'FAIL', 'Create obligation');

  if (!created?.id) return;

  const assignNotif = await lp.request('/notifications?type=task_assignment&limit=5');
  const lpNotifs = (assignNotif.data as { notifications?: { title?: string }[] }).notifications ?? [];
  record(
    'UAT-M04-003',
    'M04',
    lpNotifs.some((n) => n.title?.includes('UAT Obligation')) ? 'PASS' : 'FAIL',
    'Assignment notification to LP'
  );

  const noEvidenceCompliant = await sarah.request(`/compliance/obligations/${created.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'compliant' }),
  });
  record(
    'UAT-M04-008',
    'M04',
    noEvidenceCompliant.res.status === 400 ? 'PASS' : 'FAIL',
    `Compliant without evidence blocked: ${noEvidenceCompliant.res.status}`
  );

  const evidence = await sarah.request(`/compliance/obligations/${created.id}/evidence`, {
    method: 'POST',
    body: JSON.stringify({ fileName: 'uat-evidence.pdf', notes: 'Gate C evidence' }),
  });
  record('UAT-M04-005', 'M04', evidence.res.status === 201 ? 'PASS' : 'FAIL', 'Evidence upload');

  const compliant = await sarah.request(`/compliance/obligations/${created.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'compliant' }),
  });
  record('UAT-M04-004', 'M04', compliant.res.ok ? 'PASS' : 'FAIL', 'Status updated to compliant with evidence');

  const calendar = await sarah.request('/compliance/calendar');
  const events = (calendar.data as { events?: unknown[] }).events ?? [];
  record('UAT-M04-007', 'M04', calendar.res.ok && events.length >= 1 ? 'PASS' : 'FAIL', `Calendar events=${events.length}`);

  const auto = await sarah.request('/compliance/status-rules/run', { method: 'POST' });
  record(
    'UAT-M04-014',
    'M04',
    auto.res.ok ? 'PASS' : 'FAIL',
    `Auto-status rules run: updated=${(auto.data as { obligationsUpdated?: number }).obligationsUpdated}`
  );

  const audit = await sarah.request('/compliance/audit-trail');
  const actions = (audit.data as { actions?: unknown[] }).actions ?? [];
  record('UAT-M04-006', 'M04', audit.res.ok && actions.length >= 1 ? 'PASS' : 'FAIL', `Audit trail entries=${actions.length}`);

  const exportRes = await sarah.request('/compliance/obligations/export');
  record(
    'UAT-M04-010',
    'M04',
    exportRes.res.ok && exportRes.text.includes('title') ? 'PASS' : 'FAIL',
    'CSV export'
  );

  const heat = await sarah.request('/compliance/heat-map');
  record(
    'UAT-M04-009',
    'M04',
    heat.res.ok && Array.isArray((heat.data as { heatMap?: unknown[] }).heatMap) ? 'PASS' : 'FAIL',
    'Heat map API'
  );
}

async function runM05(sarah: Session, david: Session) {
  console.log('\nM05 — Regulatory Updates');

  const updates = await sarah.request('/regulatory/updates');
  record(
    'UAT-M05-001',
    'M05',
    updates.res.ok && ((updates.data as { updates?: unknown[] }).updates?.length ?? 0) >= 1
      ? 'PASS'
      : 'FAIL',
    'List regulatory updates'
  );

  const create = await david.request('/regulatory/updates', {
    method: 'POST',
    body: JSON.stringify({
      title: `UAT Regulation ${Date.now()}`,
      description: 'Gate C regulatory publish test',
      category: 'new_law',
      jurisdiction: 'Rwanda',
      impact: 'high',
    }),
  });
  const created = (create.data as { update?: { id: string } }).update;
  record(
    'UAT-M05-012',
    'M05',
    create.res.status === 201 && created?.id ? 'PASS' : 'FAIL',
    create.res.status === 201
      ? 'Publish regulatory update'
      : `Publish failed ${create.res.status}: ${create.text.slice(0, 120)}`
  );

  if (!created?.id) return;

  const history = await sarah.request(`/regulatory/updates/${created.id}/history`);
  record(
    'UAT-M05-009',
    'M05',
    history.res.ok && ((history.data as { history?: unknown[] }).history?.length ?? 0) >= 1
      ? 'PASS'
      : 'FAIL',
    'Regulatory update history log'
  );

  const review = await sarah.request(`/regulatory/updates/${created.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'reviewed', isRead: true }),
  });
  record('UAT-M05-005', 'M05', review.res.ok ? 'PASS' : 'FAIL', 'Review regulatory update');

  const docs = await sarah.request('/knowledge/documents?limit=1');
  const docId = (docs.data as { documents?: { id: string }[] }).documents?.[0]?.id;
  if (docId) {
    const link = await sarah.request(`/regulatory/updates/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ knowledgeDocumentId: docId }),
    });
    record('UAT-M05-018', 'M05', link.res.ok ? 'PASS' : 'FAIL', 'Link KB document to regulatory update');
  } else {
    record('UAT-M05-018', 'M05', 'SKIP', 'No KB document to link');
  }

  const obligation = await sarah.request(`/regulatory/updates/${created.id}/create-obligation`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo: 'Sarah Johnson', department: 'Legal' }),
  });
  record(
    'UAT-M05-011',
    'M05',
    obligation.res.status === 201 ? 'PASS' : 'FAIL',
    'Create obligation from regulatory update'
  );

  const sync = await david.request('/regulatory/updates/sync', { method: 'POST' });
  record(
    'UAT-M05-015',
    'M05',
    sync.res.status === 201 ? 'PASS' : 'FAIL',
    `Regulatory sync connector: ${sync.res.status}`
  );
}

async function main() {
  console.log('Gate C UAT — Compliance & Regulatory');
  try {
    const health = await fetch(`${BASE.replace('/api/v1', '')}/api/v1/health`);
    if (!health.ok) throw new Error('API down');
  } catch {
    console.error('\nAPI not running. Start with: npm run dev:api');
    process.exit(1);
  }

  const sarah = new Session();
  const david = new Session();
  const lp = new Session();
  await login(sarah, 'sarah.johnson@legalfirm.com');
  await login(david, 'david.park@legalfirm.com');
  await login(lp, 'michael.chen@legalfirm.com');

  await runM04(sarah, lp);
  await runM05(sarah, david);

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  const skip = results.filter((r) => r.verdict === 'SKIP').length;
  console.log(`\n--- Gate C UAT: ${pass} pass / ${fail} fail / ${skip} skip (${results.length} total) ---`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
