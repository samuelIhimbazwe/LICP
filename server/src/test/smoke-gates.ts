/**
 * Automated smoke tests for Gates A–D API endpoints.
 * Run: npm run test:smoke --prefix server
 * Requires API on http://localhost:3001 (npm run dev:api)
 */

const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api/v1';

type Result = { name: string; gate: string; ok: boolean; detail?: string };

const results: Result[] = [];

function pass(gate: string, name: string, detail?: string) {
  results.push({ gate, name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(gate: string, name: string, detail: string) {
  results.push({ gate, name, ok: false, detail });
  console.error(`  ✗ ${name}: ${detail}`);
}

class Session {
  cookies = '';

  async request(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers as HeadersInit);
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.cookies) headers.set('Cookie', this.cookies);

    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) {
      this.cookies = setCookie.map((c) => c.split(';')[0]).join('; ');
    } else {
      const raw = res.headers.get('set-cookie');
      if (raw) this.cookies = raw.split(';')[0];
    }

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { res, data };
  }
}

async function login(session: Session, email: string, password = 'demo123') {
  const { res, data } = await session.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const body = data as { requiresMfa?: boolean; user?: { email: string } };
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${JSON.stringify(data)}`);
  if (body.requiresMfa) throw new Error('MFA required — set SKIP_LOGIN_MFA=true in .env');
  return body.user!;
}

async function runGateA(sarah: Session, admin: Session) {
  console.log('\nGate A — Auth & Security');

  const health = await fetch(`${BASE}/health`);
  if (health.ok) pass('A', 'GET /health');
  else fail('A', 'GET /health', `status ${health.status}`);

  try {
    const { res, data } = await sarah.request('/auth/me');
    const me = data as { user?: { email: string } };
    if (res.ok && me.user?.email === 'sarah.johnson@legalfirm.com') {
      pass('A', 'GET /auth/me (Sarah)');
    } else fail('A', 'GET /auth/me', `status ${res.status}`);
  } catch (e) {
    fail('A', 'GET /auth/me', String(e));
  }

  try {
    const { res, data } = await admin.request('/audit/login-activity');
    const body = data as { activities?: unknown[] };
    if (res.ok && Array.isArray(body.activities)) {
      pass('A', 'GET /audit/login-activity', `${body.activities.length} entries`);
    } else fail('A', 'GET /audit/login-activity', `status ${res.status}`);
  } catch (e) {
    fail('A', 'GET /audit/login-activity', String(e));
  }

  try {
    const { res, data } = await admin.request('/users');
    const body = data as { users?: unknown[] };
    if (res.ok && Array.isArray(body.users) && body.users.length >= 4) {
      pass('A', 'GET /users', `${body.users.length} users`);
    } else fail('A', 'GET /users', `status ${res.status}`);
  } catch (e) {
    fail('A', 'GET /users', String(e));
  }
}

async function runGateB(session: Session) {
  console.log('\nGate B — Dashboard & Notifications');

  try {
    const { res, data } = await session.request('/dashboard');
    if (res.ok && data && typeof data === 'object') pass('B', 'GET /dashboard');
    else fail('B', 'GET /dashboard', `status ${res.status}`);
  } catch (e) {
    fail('B', 'GET /dashboard', String(e));
  }

  try {
    const { res, data } = await session.request('/notifications');
    const body = data as { notifications?: unknown[] };
    if (res.ok && Array.isArray(body.notifications) && body.notifications.length >= 1) {
      pass('B', 'GET /notifications', `${body.notifications.length} items`);
    } else fail('B', 'GET /notifications', `status ${res.status}`);
  } catch (e) {
    fail('B', 'GET /notifications', String(e));
  }

  try {
    const { res, data } = await session.request('/notifications/unread-count');
    const body = data as { count?: number };
    if (res.ok && typeof body.count === 'number') {
      pass('B', 'GET /notifications/unread-count', `count=${body.count}`);
    } else fail('B', 'GET /notifications/unread-count', `status ${res.status}`);
  } catch (e) {
    fail('B', 'GET /notifications/unread-count', String(e));
  }
}

async function runGateC(session: Session) {
  console.log('\nGate C — Compliance & Regulatory');

  const checks: Array<[string, string, (d: unknown) => boolean]> = [
    ['/compliance/summary', 'GET /compliance/summary', (d) => !!(d as { total?: number }).total],
    ['/compliance/obligations', 'GET /compliance/obligations', (d) => Array.isArray((d as { obligations?: unknown[] }).obligations) && (d as { obligations: unknown[] }).obligations.length >= 1],
    ['/compliance/evidence', 'GET /compliance/evidence', (d) => Array.isArray((d as { evidence?: unknown[] }).evidence)],
    ['/compliance/heat-map', 'GET /compliance/heat-map', (d) => Array.isArray((d as { heatMap?: unknown[] }).heatMap)],
    ['/compliance/audit-trail', 'GET /compliance/audit-trail', (d) => Array.isArray((d as { actions?: unknown[] }).actions)],
    ['/regulatory/updates', 'GET /regulatory/updates', (d) => Array.isArray((d as { updates?: unknown[] }).updates) && (d as { updates: unknown[] }).updates.length >= 1],
    ['/regulatory/updates/summary', 'GET /regulatory/updates/summary', (d) => typeof (d as { total?: number }).total === 'number'],
  ];

  for (const [path, name, validate] of checks) {
    try {
      const { res, data } = await session.request(path);
      if (res.ok && validate(data)) pass('C', name);
      else fail('C', name, `status ${res.status}`);
    } catch (e) {
      fail('C', name, String(e));
    }
  }
}

async function runGateEAdmin(admin: Session) {
  console.log('\nGate E — Admin endpoints');

  try {
    const { res, data } = await admin.request('/users/org-structure');
    const body = data as { units?: unknown[] };
    if (res.ok && Array.isArray(body.units) && body.units.length >= 1) {
      pass('E', 'GET /users/org-structure', `${body.units.length} units`);
    } else fail('E', 'GET /users/org-structure', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /users/org-structure', String(e));
  }

  try {
    const { res, data } = await admin.request('/users/permissions-matrix');
    const body = data as { matrix?: unknown[] };
    if (res.ok && Array.isArray(body.matrix) && body.matrix.length >= 4) {
      pass('E', 'GET /users/permissions-matrix', `${body.matrix.length} roles`);
    } else fail('E', 'GET /users/permissions-matrix', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /users/permissions-matrix', String(e));
  }
}

async function runGateE(session: Session) {
  console.log('\nGate E — Analytics & User Management');

  try {
    const { res, data } = await session.request('/analytics/overview');
    const body = data as { compliance?: { totalObligations?: number } };
    if (res.ok && (body.compliance?.totalObligations ?? 0) >= 1) {
      pass('E', 'GET /analytics/overview', `obligations=${body.compliance?.totalObligations}`);
    } else fail('E', 'GET /analytics/overview', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /analytics/overview', String(e));
  }

  try {
    const { res, data } = await session.request('/analytics/compliance');
    const body = data as { metrics?: { completionRate?: number } };
    if (res.ok && typeof body.metrics?.completionRate === 'number') {
      pass('E', 'GET /analytics/compliance', `rate=${body.metrics.completionRate}%`);
    } else fail('E', 'GET /analytics/compliance', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /analytics/compliance', String(e));
  }

  try {
    const { res, data } = await session.request('/analytics/documents');
    const body = data as { metrics?: { totalDocuments?: number } };
    if (res.ok && (body.metrics?.totalDocuments ?? 0) >= 1) {
      pass('E', 'GET /analytics/documents', `total=${body.metrics?.totalDocuments}`);
    } else fail('E', 'GET /analytics/documents', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /analytics/documents', String(e));
  }

  try {
    const { res, data } = await session.request('/users/org-structure');
    const body = data as { units?: unknown[] };
    if (res.status === 403) pass('E', 'GET /users/org-structure (CO denied)', '403 as expected');
    else fail('E', 'GET /users/org-structure RBAC', `status ${res.status}`);
  } catch (e) {
    fail('E', 'GET /users/org-structure RBAC', String(e));
  }
}

async function runGateF(session: Session) {
  console.log('\nGate F — AI & Integrations');

  try {
    const { res, data } = await session.request('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query: 'data protection Rwanda' }),
    });
    const body = data as { answer?: string };
    if (res.ok && body.answer) pass('F', 'POST /ai/query');
    else fail('F', 'POST /ai/query', `status ${res.status}`);
  } catch (e) {
    fail('F', 'POST /ai/query', String(e));
  }

  try {
    const { res, data } = await session.request('/integrations');
    const body = data as { integrations?: unknown[] };
    if (res.ok && Array.isArray(body.integrations) && body.integrations.length >= 1) {
      pass('F', 'GET /integrations', `${body.integrations.length} items`);
    } else fail('F', 'GET /integrations', `status ${res.status}`);
  } catch (e) {
    fail('F', 'GET /integrations', String(e));
  }
}

async function runGateD(session: Session, admin: Session) {
  console.log('\nGate D — Knowledge Base & Contracts');

  try {
    const { res, data } = await session.request('/knowledge/documents/summary');
    const body = data as { total?: number };
    if (res.ok && (body.total ?? 0) >= 1) pass('D', 'GET /knowledge/documents/summary', `total=${body.total}`);
    else fail('D', 'GET /knowledge/documents/summary', `status ${res.status}`);
  } catch (e) {
    fail('D', 'GET /knowledge/documents/summary', String(e));
  }

  try {
    const { res, data } = await session.request('/knowledge/documents');
    const body = data as { documents?: unknown[] };
    if (res.ok && Array.isArray(body.documents) && body.documents.length >= 1) {
      pass('D', 'GET /knowledge/documents', `${body.documents.length} docs`);
    } else fail('D', 'GET /knowledge/documents', `status ${res.status}`);
  } catch (e) {
    fail('D', 'GET /knowledge/documents', String(e));
  }

  try {
    const { res, data } = await session.request('/contracts/summary');
    const body = data as { total?: number };
    if (res.ok && (body.total ?? 0) >= 1) pass('D', 'GET /contracts/summary', `total=${body.total}`);
    else fail('D', 'GET /contracts/summary', `status ${res.status}`);
  } catch (e) {
    fail('D', 'GET /contracts/summary', String(e));
  }

  try {
    const { res, data } = await session.request('/contracts');
    const body = data as { contracts?: unknown[] };
    if (res.ok && Array.isArray(body.contracts) && body.contracts.length >= 1) {
      pass('D', 'GET /contracts', `${body.contracts.length} contracts`);
    } else fail('D', 'GET /contracts', `status ${res.status}`);
  } catch (e) {
    fail('D', 'GET /contracts', String(e));
  }

  try {
    const { res, data } = await session.request('/contracts/folders');
    const body = data as { folders?: unknown[] };
    if (res.ok && Array.isArray(body.folders) && body.folders.length >= 1) {
      pass('D', 'GET /contracts/folders', `${body.folders.length} folders`);
    } else fail('D', 'GET /contracts/folders', `status ${res.status}`);
  } catch (e) {
    fail('D', 'GET /contracts/folders', String(e));
  }

  try {
    const { res, data } = await admin.request('/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: `Smoke Test Doc ${Date.now()}`,
        type: 'guidance',
        summary: 'Created by smoke test',
      }),
    });
    const body = data as { document?: { id: string; title: string } };
    if (res.status === 201 && body.document?.id) {
      pass('D', 'POST /knowledge/documents (admin)', body.document.title);
    } else fail('D', 'POST /knowledge/documents (admin)', `status ${res.status}`);
  } catch (e) {
    fail('D', 'POST /knowledge/documents (admin)', String(e));
  }

  try {
    const coPost = await session.request('/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'RBAC test', type: 'guidance' }),
    });
    if (coPost.res.status === 403) pass('D', 'POST /knowledge/documents RBAC', 'CO denied');
    else fail('D', 'POST /knowledge/documents RBAC', `status ${coPost.res.status}`);
  } catch (e) {
    fail('D', 'POST /knowledge/documents RBAC', String(e));
  }

  try {
    const { res, data } = await session.request('/contracts', {
      method: 'POST',
      body: JSON.stringify({
        title: `Smoke Test Contract ${Date.now()}`,
        type: 'nda',
        counterparty: 'Smoke Test Corp',
        status: 'draft',
      }),
    });
    const body = data as { contract?: { id: string; title: string } };
    if (res.status === 201 && body.contract?.id) {
      pass('D', 'POST /contracts', body.contract.title);
    } else fail('D', 'POST /contracts', `status ${res.status}`);
  } catch (e) {
    fail('D', 'POST /contracts', String(e));
  }
}

async function main() {
  console.log('LICP Gate Smoke Tests');
  console.log(`API: ${BASE}`);

  try {
    await fetch(`${BASE}/health`);
  } catch {
    console.error('\nAPI not reachable. Start with: npm run dev:api');
    process.exit(1);
  }

  const sarah = new Session();
  const admin = new Session();

  try {
    await login(sarah, 'sarah.johnson@legalfirm.com');
    pass('A', 'POST /auth/login (Sarah)');
  } catch (e) {
    fail('A', 'POST /auth/login (Sarah)', String(e));
    process.exit(1);
  }

  try {
    await login(admin, 'david.park@legalfirm.com');
    pass('A', 'POST /auth/login (Admin)');
  } catch (e) {
    fail('A', 'POST /auth/login (Admin)', String(e));
  }

  await runGateA(sarah, admin);
  await runGateB(sarah);
  await runGateC(sarah);
  await runGateD(sarah, admin);
  await runGateE(sarah);
  await runGateEAdmin(admin);
  await runGateF(sarah);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed.length) {
    console.log('Failed:');
    for (const f of failed) console.log(`  [Gate ${f.gate}] ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log('All smoke tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
