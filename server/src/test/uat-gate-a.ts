/**
 * Gate A UAT automation — M01 (17) + M12 (21) = 38 tests (API-verifiable subset)
 * Run: npm run test:uat-a --prefix server
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

async function login(session: Session, email: string, password = 'demo123') {
  const { res, data } = await session.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login ${email} failed: ${res.status}`);
  const body = data as { requiresMfa?: boolean };
  if (body.requiresMfa && process.env.SKIP_LOGIN_MFA !== 'true') {
    throw new Error(`MFA required for ${email} — set SKIP_LOGIN_MFA=true for automated UAT`);
  }
}

async function runM01(admin: Session, co: Session, lp: Session) {
  console.log('\nM01 — Authentication (API tests)');

  const register = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hacker@test.org', password: 'HackPass1!' }),
  });
  record(
    'UAT-M01-001',
    'M01',
    register.status === 403 || register.status === 404 ? 'PASS' : 'FAIL',
    `POST /auth/register → ${register.status}`
  );

  const inviteEmail = `uat-a-${Date.now()}@test.org`;
  const invite = await admin.request('/invitations', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'UAT Gate A User',
      email: inviteEmail,
      phone: '+250788000001',
      role: 'legal_practitioner',
      requireMfa: false,
      expirationDays: 7,
    }),
  });
  const inviteToken = (invite.data as { token?: string }).token;
  record(
    'UAT-M01-002',
    'M01',
    invite.res.ok && inviteToken ? 'PASS' : 'FAIL',
    invite.res.ok ? `Invited ${inviteEmail}` : `Invite failed ${invite.res.status}`
  );

  if (inviteToken) {
    const accept = await fetch(`${BASE}/invitations/${inviteToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'TestPass1!' }),
    });
    const acceptData = (await accept.json()) as { requiresEmailVerification?: boolean };
    record(
      'UAT-M01-003',
      'M01',
      accept.ok ? 'PASS' : 'FAIL',
      accept.ok ? 'Strong password accepted on invite' : `Accept failed ${accept.status}`
    );

    const newUser = new Session();
    const loginRes = await newUser.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail, password: 'TestPass1!' }),
    });
    const loginBody = loginRes.data as {
      requiresEmailVerification?: boolean;
      user?: { emailVerified?: boolean };
    };
    record(
      'UAT-M01-004',
      'M01',
      loginRes.res.ok && loginBody.requiresEmailVerification ? 'PASS' : 'FAIL',
      `Unverified login ok; requiresEmailVerification=${loginBody.requiresEmailVerification}`
    );

    const blocked = await newUser.request('/compliance/summary');
    record(
      'UAT-M01-004b',
      'M01',
      blocked.res.status === 403 ? 'PASS' : 'FAIL',
      `Unverified blocked from API: ${blocked.res.status}`
    );

    const me = await newUser.request('/auth/me');
    const meUser = (me.data as { user?: { emailVerified?: boolean } }).user;
    record(
      'UAT-M01-004c',
      'M01',
      me.res.ok && meUser?.emailVerified === false ? 'PASS' : 'FAIL',
      `/auth/me works for unverified user`
    );

    const devToken = await fetch(
      `${BASE}/auth/dev/verification-token?email=${encodeURIComponent(inviteEmail)}`
    );
    const devData = (await devToken.json()) as { token?: string };
    if (devData.token) {
      const verify = await fetch(`${BASE}/auth/verify-email/${devData.token}`);
      record(
        'UAT-M01-004d',
        'M01',
        verify.ok ? 'PASS' : 'FAIL',
        `Email verified via token`
      );

      const afterVerify = await newUser.request('/compliance/summary');
      record(
        'UAT-M01-004e',
        'M01',
        afterVerify.res.ok ? 'PASS' : 'FAIL',
        `Verified user can access API: ${afterVerify.res.status}`
      );
    } else {
      record('UAT-M01-004d', 'M01', 'SKIP', 'Dev verification token unavailable');
      record('UAT-M01-004e', 'M01', 'SKIP', 'Depends on verification');
    }

    record(
      'UAT-M01-005',
      'M01',
      acceptData.requiresEmailVerification !== undefined ? 'PASS' : 'FAIL',
      'Login flow returns verification state'
    );
  } else {
    record('UAT-M01-003', 'M01', 'SKIP', 'No invite token');
    record('UAT-M01-004', 'M01', 'SKIP', 'No invite token');
  }

  const badLogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah.johnson@legalfirm.com', password: 'wrong' }),
  });
  const badBody = (await badLogin.json()) as { error?: string };
  record(
    'UAT-M01-005b',
    'M01',
    badLogin.status === 401 && badBody.error?.includes('Invalid') ? 'PASS' : 'FAIL',
    'Invalid password returns generic error'
  );

  const forgot = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.org' }),
  });
  const forgotBody = (await forgot.json()) as { success?: boolean };
  record(
    'UAT-M01-006',
    'M01',
    forgot.ok && forgotBody.success ? 'PASS' : 'FAIL',
    'Forgot password same response for unknown email'
  );

  const coUsers = await co.request('/users');
  record(
    'UAT-M01-RBAC-001',
    'M01',
    coUsers.res.status === 403 ? 'PASS' : 'FAIL',
    `CO denied GET /users: ${coUsers.res.status}`
  );

  const lpAudit = await lp.request('/audit/logs');
  record(
    'UAT-M01-RBAC-002',
    'M01',
    lpAudit.res.status === 403 ? 'PASS' : 'FAIL',
    `LP denied GET /audit/logs: ${lpAudit.res.status}`
  );

  const sessions = await admin.request('/auth/sessions');
  record(
    'UAT-M01-008',
    'M01',
    sessions.res.ok && Array.isArray((sessions.data as { sessions?: unknown[] }).sessions)
      ? 'PASS'
      : 'FAIL',
    'Admin can list active sessions'
  );

  const meAdmin = await admin.request('/auth/me');
  const adminUser = (meAdmin.data as { user?: { sessionTimeoutMinutes?: number } }).user;
  record(
    'UAT-M01-008b',
    'M01',
    typeof adminUser?.sessionTimeoutMinutes === 'number' ? 'PASS' : 'FAIL',
    `sessionTimeoutMinutes=${adminUser?.sessionTimeoutMinutes}`
  );
}

async function runM12(admin: Session, co: Session) {
  console.log('\nM12 — Security & Audit (API tests)');

  const logs = await admin.request('/audit/logs');
  record(
    'UAT-M12-005',
    'M12',
    logs.res.ok && Array.isArray((logs.data as { logs?: unknown[] }).logs) ? 'PASS' : 'FAIL',
    'Admin audit log viewer API'
  );

  const loginActivity = await admin.request('/audit/login-activity');
  record(
    'UAT-M12-004',
    'M12',
    loginActivity.res.ok ? 'PASS' : 'FAIL',
    'Login activity API'
  );

  const exportRes = await admin.request('/audit/logs/export');
  record(
    'UAT-M12-010',
    'M12',
    exportRes.res.ok && exportRes.text.includes('timestamp') ? 'PASS' : 'FAIL',
    'Audit log CSV export'
  );

  const perms = await admin.request('/audit/permissions');
  record(
    'UAT-M12-001',
    'M12',
    perms.res.ok ? 'PASS' : 'FAIL',
    'Permission matrix API'
  );

  const coAudit = await co.request('/audit/logs');
  record(
    'UAT-M12-RBAC-001',
    'M12',
    coAudit.res.status === 403 ? 'PASS' : 'FAIL',
    `CO denied audit logs (admin-only): ${coAudit.res.status}`
  );

  const health = await fetch(`${BASE.replace('/api/v1', '')}/api/v1/health`);
  record(
    'UAT-M12-002',
    'M12',
    health.ok ? 'PASS' : 'FAIL',
    'API health check (TLS assumed in staging)'
  );
}

async function main() {
  console.log('Gate A UAT — Auth & Security');
  console.log(`API: ${BASE}`);

  try {
    const health = await fetch(`${BASE.replace('/api/v1', '')}/api/v1/health`);
    if (!health.ok) throw new Error('API not reachable — run npm run dev:api');
  } catch {
    console.error('\nAPI not running. Start with: npm run dev:api');
    process.exit(1);
  }

  const admin = new Session();
  const co = new Session();
  const lp = new Session();

  await login(admin, 'david.park@legalfirm.com');
  await login(co, 'sarah.johnson@legalfirm.com');
  await login(lp, 'michael.chen@legalfirm.com');

  await runM01(admin, co, lp);
  await runM12(admin, co);

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  const skip = results.filter((r) => r.verdict === 'SKIP').length;

  console.log(`\n--- Gate A UAT: ${pass} pass / ${fail} fail / ${skip} skip (${results.length} total) ---`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
