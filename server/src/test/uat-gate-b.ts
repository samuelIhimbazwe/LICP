/**
 * Gate B UAT automation — M02 Dashboard + M07 Notifications
 * Run: npm run test:uat-b --prefix server
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
  if (!res.ok) throw new Error(`Login ${email} failed: ${res.status}`);
  if ((data as { requiresMfa?: boolean }).requiresMfa && process.env.SKIP_LOGIN_MFA !== 'true') {
    throw new Error(`MFA required for ${email}`);
  }
}

async function runM02(sarah: Session, david: Session, lp: Session) {
  console.log('\nM02 — Dashboard');

  const coDash = await sarah.request('/dashboard');
  const coBody = coDash.data as { role?: string; stats?: unknown };
  record(
    'UAT-M02-001',
    'M02',
    coDash.res.ok && coBody.role === 'compliance_officer' ? 'PASS' : 'FAIL',
    `CO dashboard role=${coBody.role}`
  );

  const lpDash = await lp.request('/dashboard/legal-practitioner');
  record(
    'UAT-M02-001b',
    'M02',
    lpDash.res.ok ? 'PASS' : 'FAIL',
    `LP role dashboard ${lpDash.res.status}`
  );

  const coAdminDash = await sarah.request('/dashboard/admin');
  record(
    'UAT-M02-001c',
    'M02',
    coAdminDash.res.status === 403 ? 'PASS' : 'FAIL',
    `CO denied admin dashboard: ${coAdminDash.res.status}`
  );

  const live = await sarah.request('/dashboard/live');
  const liveBody = live.data as { changes?: unknown; updatedAt?: string };
  record(
    'UAT-M02-002',
    'M02',
    live.res.ok && liveBody.changes && liveBody.updatedAt ? 'PASS' : 'FAIL',
    'Dashboard live updates endpoint'
  );

  const adminDash = await david.request('/dashboard/admin');
  const adminBody = adminDash.data as { stats?: { totalUsers?: number } };
  record(
    'UAT-M02-003',
    'M02',
    adminDash.res.ok && typeof adminBody.stats?.totalUsers === 'number' ? 'PASS' : 'FAIL',
    `Admin dashboard users=${adminBody.stats?.totalUsers}`
  );
}

async function runM07(sarah: Session, david: Session) {
  console.log('\nM07 — Notifications');

  const list = await sarah.request('/notifications');
  const notifications = (list.data as { notifications?: unknown[] }).notifications ?? [];
  record(
    'UAT-M07-001',
    'M07',
    list.res.ok && notifications.length >= 1 ? 'PASS' : 'FAIL',
    `Listed ${notifications.length} notifications`
  );

  const unread = await sarah.request('/notifications/unread-count');
  record(
    'UAT-M07-001b',
    'M07',
    unread.res.ok && typeof (unread.data as { count?: number }).count === 'number' ? 'PASS' : 'FAIL',
    `Unread count=${(unread.data as { count?: number }).count}`
  );

  const prefsGet = await sarah.request('/notifications/preferences');
  const prefs = (prefsGet.data as { preferences?: { channels?: { email?: boolean } } }).preferences;
  record(
    'UAT-M07-008',
    'M07',
    prefsGet.res.ok && prefs?.channels?.email !== undefined ? 'PASS' : 'FAIL',
    'GET notification preferences'
  );

  const prefsPut = await sarah.request('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      ...prefs,
      channels: { inApp: true, email: false, sms: false },
    }),
  });
  record(
    'UAT-M07-008b',
    'M07',
    prefsPut.res.ok ? 'PASS' : 'FAIL',
    prefsPut.res.ok
      ? 'PUT notification preferences (email off)'
      : `PUT failed ${prefsPut.res.status}: ${prefsPut.text.slice(0, 120)}`
  );

  const logs = await sarah.request('/notifications/logs');
  record(
    'UAT-M07-009',
    'M07',
    logs.res.ok && Array.isArray((logs.data as { logs?: unknown[] }).logs) ? 'PASS' : 'FAIL',
    'Delivery history logs API'
  );

  const broadcast = await david.request('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      title: `UAT Broadcast ${Date.now()}`,
      message: 'Gate B automated broadcast test',
      priority: 'medium',
      channels: ['in_app'],
    }),
  });
  const bc = broadcast.data as { recipientCount?: number };
  record(
    'UAT-M07-007',
    'M07',
    broadcast.res.ok && (bc.recipientCount ?? 0) > 0 ? 'PASS' : 'FAIL',
    `Broadcast sent to ${bc.recipientCount} users`
  );

  const broadcasts = await david.request('/notifications/broadcasts');
  record(
    'UAT-M07-007b',
    'M07',
    broadcasts.res.ok && ((broadcasts.data as { broadcasts?: unknown[] }).broadcasts?.length ?? 0) >= 1
      ? 'PASS'
      : 'FAIL',
    'Broadcast history list'
  );

  const rules = await david.request('/notifications/escalation-rules');
  record(
    'UAT-M07-010',
    'M07',
    rules.res.ok && ((rules.data as { rules?: unknown[] }).rules?.length ?? 0) >= 1 ? 'PASS' : 'FAIL',
    'Escalation rules API'
  );

  const regNotify = await david.request('/regulatory/updates', {
    method: 'POST',
    body: JSON.stringify({
      title: `UAT Regulatory ${Date.now()}`,
      description: 'Gate B event-driven notification test',
      category: 'Finance',
      jurisdiction: 'Rwanda',
      impact: 'high',
    }),
  });
  record(
    'UAT-M07-002',
    'M07',
    regNotify.res.status === 201 ? 'PASS' : 'FAIL',
    'Regulatory update triggers notification pipeline'
  );

  if (regNotify.res.status === 201) {
    const after = await sarah.request('/notifications?type=regulatory_update&limit=5');
    const regList = (after.data as { notifications?: { title?: string }[] }).notifications ?? [];
    record(
      'UAT-M07-002b',
      'M07',
      regList.some((n) => n.title?.includes('UAT Regulatory')) ? 'PASS' : 'FAIL',
      'CO received regulatory notification'
    );
  }

  const markAll = await sarah.request('/notifications/mark-all-read', { method: 'POST' });
  const afterUnread = await sarah.request('/notifications/unread-count');
  record(
    'UAT-M07-003',
    'M07',
    markAll.res.ok && (afterUnread.data as { count?: number }).count === 0 ? 'PASS' : 'FAIL',
    'Mark all read clears unread count'
  );
}

async function main() {
  console.log('Gate B UAT — Dashboard & Notifications');
  console.log(`API: ${BASE}`);

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

  await runM02(sarah, david, lp);
  await runM07(sarah, david);

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  const skip = results.filter((r) => r.verdict === 'SKIP').length;
  console.log(`\n--- Gate B UAT: ${pass} pass / ${fail} fail / ${skip} skip (${results.length} total) ---`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
