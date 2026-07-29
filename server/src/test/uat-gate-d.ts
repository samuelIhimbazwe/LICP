/**
 * Gate D UAT automation — M03 (18) + M06 (16) = 34 tests
 * Run: npm run test:uat-d --prefix server
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

async function runM03(sarah: Session, admin: Session, lp: Session, anon: Session) {
  console.log('\nM03 — Legal Knowledge Base (18 tests)');

  const all = await sarah.request('/knowledge/documents');
  const docs = (all.data as { documents?: Array<{ id: string; type: string }> }).documents ?? [];
  const summary = await sarah.request('/knowledge/documents/summary');
  const sum = summary.data as { total?: number };

  if (all.res.ok && docs.length >= 8 && sum.total === docs.length) {
    const filtered = await sarah.request('/knowledge/documents?type=law');
    const laws = (filtered.data as { documents?: unknown[] }).documents ?? [];
    record('UAT-M03-001', 'M03', laws.length >= 1 ? 'PASS' : 'FAIL', `Repository ${docs.length} docs; type filter returns ${laws.length}`);
  } else {
    record('UAT-M03-001', 'M03', 'FAIL', `List/summary mismatch: ${docs.length} vs ${sum.total}`);
  }

  const types = ['law', 'regulation', 'case_law', 'template', 'guidance'];
  const typeOk = (
    await Promise.all(
      types.map(async (t) => {
        const r = await sarah.request(`/knowledge/documents?type=${t}`);
        return ((r.data as { documents?: unknown[] }).documents ?? []).length >= 1;
      })
    )
  ).every(Boolean);
  record('UAT-M03-002', 'M03', typeOk ? 'PASS' : 'FAIL', typeOk ? 'All 5 document types filterable' : 'Missing document type in seed');

  const rwanda = await sarah.request('/knowledge/documents?jurisdiction=Rwanda');
  const rwCount = ((rwanda.data as { documents?: unknown[] }).documents ?? []).length;
  const finance = await sarah.request('/knowledge/documents?industry=Finance');
  const finCount = ((finance.data as { documents?: unknown[] }).documents ?? []).length;
  record('UAT-M03-003', 'M03', rwCount >= 2 && finCount >= 1 ? 'PASS' : 'FAIL', `Rwanda=${rwCount}, Finance=${finCount}`);

  const search = await sarah.request('/knowledge/documents?search=LICP-TEST-PHRASE-7742');
  const hits = (search.data as { documents?: { searchHighlights?: string[] }[] }).documents ?? [];
  const hasHighlight = hits.some((d) => (d.searchHighlights?.length ?? 0) > 0);
  record(
    'UAT-M03-004',
    'M03',
    hits.length >= 1 && hasHighlight ? 'PASS' : 'FAIL',
    hits.length >= 1 ? `Search hit with ${hits[0]?.searchHighlights?.length ?? 0} highlight(s)` : 'Search phrase not found'
  );

  const regDoc = docs.find((d) => d.type === 'regulation') ?? docs[0];
  const versionPost = await admin.request(`/knowledge/documents/${regDoc.id}/versions`, {
    method: 'POST',
    body: JSON.stringify({ version: '2.0', summary: 'Amended summary UAT', content: 'Updated content' }),
  });
  const versionsGet = await sarah.request(`/knowledge/documents/${regDoc.id}/versions`);
  const versionList = (versionsGet.data as { versions?: unknown[] }).versions ?? [];
  record(
    'UAT-M03-005',
    'M03',
    versionPost.res.ok && versionList.length >= 1 ? 'PASS' : 'FAIL',
    `Version POST ${versionPost.res.status}; history count=${versionList.length}`
  );

  const annotDoc = docs[0];
  const annotPost = await sarah.request(`/knowledge/documents/${annotDoc.id}/annotations`, {
    method: 'POST',
    body: JSON.stringify({ content: 'Applies to our HR policy' }),
  });
  const annotId = (annotPost.data as { annotation?: { id: string } }).annotation?.id;
  const annotPatch = annotId
    ? await sarah.request(`/knowledge/annotations/${annotId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated HR policy note' }),
      })
    : { res: { ok: false, status: 0 } };
  record(
    'UAT-M03-006',
    'M03',
    annotPost.res.status === 201 && annotPatch.res.ok ? 'PASS' : 'FAIL',
    `Annotation create/patch ${annotPost.res.status}/${annotPatch.res.status}`
  );

  const bm1 = await lp.request('/knowledge/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ documentId: docs[0].id, notes: 'UAT bookmark 1' }),
  });
  const bm2 = await lp.request('/knowledge/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ documentId: docs[1]?.id ?? docs[0].id, notes: 'UAT bookmark 2' }),
  });
  const bmList = await lp.request('/knowledge/bookmarks');
  const bookmarks = (bmList.data as { bookmarks?: { id: string }[] }).bookmarks ?? [];
  const bmId = (bm1.data as { bookmark?: { id: string } }).bookmark?.id;
  if (bmId) await lp.request(`/knowledge/bookmarks/${bmId}`, { method: 'DELETE' });
  record(
    'UAT-M03-007',
    'M03',
    bm1.res.status === 201 && bm2.res.status === 201 && bookmarks.length >= 1 ? 'PASS' : 'FAIL',
    `Bookmarks API: list=${bookmarks.length}`
  );

  const templateDoc = docs.find((d) => d.type === 'template') ?? docs[0];
  const cites = await sarah.request(`/knowledge/documents/${templateDoc.id}/citations`);
  const citationLinks = (cites.data as { citations?: { documentId?: string }[] }).citations ?? [];
  const linkedId = citationLinks.find((c) => c.documentId)?.documentId;
  const backLinks = linkedId
    ? await sarah.request(`/knowledge/documents/${linkedId}/referenced-by`)
    : { res: { ok: false, status: 0 }, data: {} };
  const refBy = ((backLinks.data as { referencedBy?: unknown[] }).referencedBy ?? []).length;
  record(
    'UAT-M03-008',
    'M03',
    cites.res.ok && linkedId && refBy >= 1 ? 'PASS' : 'FAIL',
    `Citation links resolved=${!!linkedId}; back-links=${refBy}`
  );

  const dl = await sarah.request(`/knowledge/documents/${docs[0].id}/download`);
  record(
    'UAT-M03-009',
    'M03',
    dl.res.ok && (dl.res.headers.get('content-type') ?? '').includes('pdf') ? 'PASS' : 'FAIL',
    `PDF download status=${dl.res.status}`
  );

  const ssPost = await sarah.request('/knowledge/saved-searches', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rwanda Data Protection UAT',
      query: { type: 'regulation', jurisdiction: 'Rwanda', search: 'data' },
    }),
  });
  const ssId = (ssPost.data as { savedSearch?: { id: string } }).savedSearch?.id;
  const ssList = await sarah.request('/knowledge/saved-searches');
  const saved = (ssList.data as { savedSearches?: unknown[] }).savedSearches ?? [];
  if (ssId) await sarah.request(`/knowledge/saved-searches/${ssId}`, { method: 'DELETE' });
  record(
    'UAT-M03-010',
    'M03',
    ssPost.res.status === 201 && saved.length >= 1 ? 'PASS' : 'FAIL',
    `Saved searches: create+list OK (${saved.length})`
  );

  const adminUpload = await admin.request('/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify({ title: `UAT Admin Upload ${Date.now()}`, type: 'guidance', summary: 'Admin seed test' }),
  });
  const coUpload = await sarah.request('/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify({ title: 'RBAC test', type: 'guidance' }),
  });
  record(
    'UAT-M03-011',
    'M03',
    adminUpload.res.status === 201 && coUpload.res.status === 403 ? 'PASS' : 'FAIL',
    `Admin upload ${adminUpload.res.status}; CO denied ${coUpload.res.status}`
  );

  const archiveTarget = (adminUpload.data as { document?: { id: string } }).document?.id ?? docs[0].id;
  const archive = await admin.request(`/knowledge/documents/${archiveTarget}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'archived' }),
  });
  record(
    'UAT-M03-012',
    'M03',
    archive.res.ok ? 'PASS' : 'FAIL',
    `Archive document status=${archive.res.status}`
  );

  record('UAT-M03-013', 'M03', 'SKIP', 'M03↔M05 cross-link UI requires regulatory KB link in staging');

  const unauth = await anon.request('/knowledge/documents');
  record(
    'UAT-M03-014',
    'M03',
    unauth.res.status === 401 && coUpload.res.status === 403 ? 'PASS' : 'FAIL',
    `Unauth ${unauth.res.status}; CO upload ${coUpload.res.status}`
  );

  const t0 = Date.now();
  await sarah.request('/knowledge/documents?search=data');
  const elapsed = Date.now() - t0;
  record('UAT-M03-015', 'M03', elapsed < 3000 ? 'PASS' : 'FAIL', `Search ${elapsed}ms (<3s)`);

  record('UAT-M03-016', 'M03', 'SKIP', 'Multi-org isolation requires second org in staging');

  const regSearch = await sarah.request('/knowledge/documents?search=LICP-TEST-PHRASE-7742');
  const regOk = ((regSearch.data as { documents?: unknown[] }).documents ?? []).length >= 1;
  record('UAT-M03-017', 'M03', regOk && annotPost.res.ok && adminUpload.res.ok ? 'PASS' : 'FAIL', 'Regression: search, annotations, admin upload');
}

async function runM06(lp: Session, sarah: Session, admin: Session, emily: Session, anon: Session) {
  console.log('\nM06 — Contract Management (16 tests)');

  const list = await lp.request('/contracts');
  const contracts = (list.data as { contracts?: Array<Record<string, unknown>> }).contracts ?? [];
  const folders = await lp.request('/contracts/folders');
  const folderList = (folders.data as { folders?: { id: string; name: string; documentCount: number }[] }).folders ?? [];

  const vendorFolder = folderList.find((f) => f.name.includes('Vendor'));
  const vendorDocs = vendorFolder
    ? ((await lp.request(`/contracts?folder=${vendorFolder.id}`)).data as { contracts?: unknown[] }).contracts ?? []
    : [];
  const newFolder = await lp.request('/contracts/folders', {
    method: 'POST',
    body: JSON.stringify({ name: `UAT 2026 Agreements ${Date.now()}` }),
  });
  const moveTarget = (list.data as { contracts?: { id: string }[] }).contracts?.[0];
  const newFolderId = (newFolder.data as { folder?: { id: string } }).folder?.id;
  const moved = moveTarget && newFolderId
    ? await lp.request(`/contracts/${moveTarget.id}`, { method: 'PATCH', body: JSON.stringify({ folderId: newFolderId }) })
    : { res: { ok: false, status: 0 } };
  record(
    'UAT-M06-001',
    'M06',
    folderList.length >= 3 && vendorDocs.length >= 1 && newFolder.res.status === 201 && moved.res.ok ? 'PASS' : 'FAIL',
    `${folderList.length} folders; vendor=${vendorDocs.length}; create/move folder`
  );

  const templates = await lp.request('/contracts/templates');
  const templateList = (templates.data as { templates?: { id: string; type: string }[] }).templates ?? [];
  const ndaTemplate = templateList.find((t) => t.type === 'nda');
  const fromTemplate = ndaTemplate
    ? await lp.request(`/contracts/from-template/${ndaTemplate.id}`, {
        method: 'POST',
        body: JSON.stringify({ counterparty: 'UAT Counterparty Ltd' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const fromContract = (fromTemplate.data as { contract?: { type: string; status: string } }).contract;
  record(
    'UAT-M06-002',
    'M06',
    templateList.length >= 3 && fromTemplate.res.status === 201 && fromContract?.type === 'nda' && fromContract?.status === 'draft'
      ? 'PASS'
      : 'FAIL',
    `Templates=${templateList.length}; from-template type=${fromContract?.type}`
  );

  const sampleContent = Buffer.from('NDA sample content for UAT').toString('base64');
  const upload = await lp.request('/files/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName: 'nda-template-v1.docx', contentBase64: sampleContent }),
  });
  const badUpload = await lp.request('/files/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName: 'malware.exe', contentBase64: sampleContent }),
  });
  const fileUrl = (upload.data as { fileUrl?: string }).fileUrl;
  record(
    'UAT-M06-003',
    'M06',
    upload.res.status === 201 && !!fileUrl && badUpload.res.status === 400 ? 'PASS' : 'FAIL',
    `File upload ${upload.res.status}; rejects .exe=${badUpload.res.status === 400}`
  );

  const draft = contracts.find((c) => c.status === 'draft');
  const metaPatch = draft
    ? await lp.request(`/contracts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          counterparty: 'Acme Ltd',
          contractValue: 50000,
          tags: ['uat', 'draft'],
        }),
      })
    : { res: { ok: false, status: 0 } };
  const acmeSearch = await lp.request('/contracts?search=TechCorp');
  const acmeHits = ((acmeSearch.data as { contracts?: unknown[] }).contracts ?? []).length;
  const draftFilter = await lp.request('/contracts?status=draft');
  const drafts = ((draftFilter.data as { contracts?: unknown[] }).contracts ?? []).length;
  record(
    'UAT-M06-004',
    'M06',
    metaPatch.res.ok && acmeHits >= 1 && drafts >= 1 ? 'PASS' : 'FAIL',
    `Metadata patch; search=${acmeHits}; drafts=${drafts}`
  );

  const versionDoc = (fromTemplate.data as { contract?: { id: string } }).contract?.id ?? (draft as { id?: string })?.id;
  const checkout1 = versionDoc
    ? await lp.request(`/contracts/${versionDoc}/checkout`, { method: 'POST', body: '{}' })
    : { res: { ok: false, status: 0 }, data: {} };
  const checkout2 = versionDoc
    ? await sarah.request(`/contracts/${versionDoc}/checkout`, { method: 'POST', body: '{}' })
    : { res: { status: 0 } };
  const checkin = versionDoc
    ? await lp.request(`/contracts/${versionDoc}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ changeNotes: 'UAT v2 check-in' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const vers = versionDoc ? await lp.request(`/contracts/${versionDoc}/versions`) : { res: { ok: false, status: 0 }, data: {} };
  const versionCount = ((vers.data as { versions?: unknown[] }).versions ?? []).length;
  record(
    'UAT-M06-005',
    'M06',
    checkout1.res.ok && checkout2.res.status === 409 && checkin.res.ok && versionCount >= 1 ? 'PASS' : 'FAIL',
    `Checkout lock ${checkout2.res.status}; versions=${versionCount}`
  );

  const approvalContract = (fromTemplate.data as { contract?: { id: string } }).contract?.id;
  const submit = approvalContract
    ? await lp.request(`/contracts/${approvalContract}/submit-approval`, {
        method: 'POST',
        body: JSON.stringify({ approverName: 'Sarah Johnson' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const approvalsList = await sarah.request('/contracts/approvals');
  const pending = ((approvalsList.data as { approvals?: { id: string; status: string }[] }).approvals ?? []).find(
    (a) => a.status === 'pending'
  );
  const approve = pending
    ? await sarah.request(`/contracts/approvals/${pending.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', comment: 'Looks good' }),
      })
    : { res: { ok: false, status: 0 } };
  record(
    'UAT-M06-006',
    'M06',
    submit.res.status === 201 && approve.res.ok ? 'PASS' : 'FAIL',
    `Submit ${submit.res.status}; approve ${approve.res.status}`
  );

  const expiring = await lp.request('/contracts/expiring');
  const alerts = (expiring.data as { alerts?: { daysUntilExpiry: number | null }[] }).alerts ?? [];
  const managerView = await emily.request('/contracts/expiring');
  record(
    'UAT-M06-007',
    'M06',
    alerts.length >= 1 && managerView.res.ok ? 'PASS' : 'FAIL',
    `Expiring alerts=${alerts.length}; manager can view`
  );

  const expiryRun = await lp.request('/contracts/expiry-alerts/run', { method: 'POST', body: '{}' });
  const notifs = await lp.request('/notifications');
  const contractExpiryNotifs = ((notifs.data as { notifications?: { type: string }[] }).notifications ?? []).filter(
    (n) => n.type === 'contract_expiry'
  );
  record(
    'UAT-M06-008',
    'M06',
    expiryRun.res.ok && contractExpiryNotifs.length >= 1 ? 'PASS' : 'FAIL',
    `Expiry job sent; contract_expiry notifications=${contractExpiryNotifs.length}`
  );

  const clauseSearch = await lp.request('/contracts?search=CONTRACT-CLAUSE-XYZ-991');
  const clauseHits = ((clauseSearch.data as { contracts?: unknown[] }).contracts ?? []).length;
  const noHits = await lp.request('/contracts?search=NONEXISTENT-CLAUSE-000');
  const empty = ((noHits.data as { contracts?: unknown[] }).contracts ?? []).length;
  record(
    'UAT-M06-009',
    'M06',
    clauseHits >= 1 && empty === 0 ? 'PASS' : 'FAIL',
    `Full-text content search hits=${clauseHits}`
  );

  const shareContract = (draft as { id?: string })?.id ?? versionDoc;
  const emilyUser = await admin.request('/users');
  const users = (emilyUser.data as { users?: { id: string; fullName: string }[] }).users ?? [];
  const manager = users.find((u) => u.fullName.includes('Emily'));
  const internalShare = shareContract && manager
    ? await lp.request(`/contracts/${shareContract}/shares`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId: manager.id, permission: 'view' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const shareId = (internalShare.data as { share?: { id: string } }).share?.id;
  const permUpdate = shareId
    ? await lp.request(`/contracts/shares/${shareId}`, { method: 'PATCH', body: JSON.stringify({ permission: 'edit' }) })
    : { res: { ok: false, status: 0 } };
  if (shareId) await lp.request(`/contracts/shares/${shareId}`, { method: 'DELETE' });
  record(
    'UAT-M06-010',
    'M06',
    internalShare.res.status === 201 && permUpdate.res.ok ? 'PASS' : 'FAIL',
    `Internal share create/update/revoke`
  );

  const extShare = shareContract
    ? await lp.request(`/contracts/${shareContract}/shares`, {
        method: 'POST',
        body: JSON.stringify({ external: true, expiresInDays: 7, permission: 'view' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const token = (extShare.data as { share?: { token: string } }).share?.token;
  const publicView = token ? await anon.request(`/public/share/contracts/${token}`) : { res: { ok: false, status: 0 }, data: {} };
  record(
    'UAT-M06-011',
    'M06',
    extShare.res.status === 201 && publicView.res.ok ? 'PASS' : 'FAIL',
    `External share token access ${publicView.res.status}`
  );

  const signTarget = approvalContract ?? shareContract;
  const sign = signTarget
    ? await lp.request(`/contracts/${signTarget}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signerEmail: 'signer@example.com' }),
      })
    : { res: { ok: false, status: 0 }, data: {} };
  const signed = (sign.data as { contract?: { status: string; signedAt?: string } }).contract;
  record(
    'UAT-M06-012',
    'M06',
    sign.res.ok && signed?.status === 'executed' && !!signed?.signedAt ? 'PASS' : 'FAIL',
    `E-sign stub status=${signed?.status}`
  );

  const audit = await admin.request('/audit/logs?limit=100');
  const logs = (audit.data as { logs?: { action: string; resourceType: string }[] }).logs ?? [];
  const hasContractAudit = logs.some((l) => l.resourceType === 'contract' || l.action.includes('contract'));
  record(
    'UAT-M06-013',
    'M06',
    audit.res.ok && hasContractAudit ? 'PASS' : 'FAIL',
    `Audit logs include contract actions`
  );

  const sum = await lp.request('/contracts/summary');
  const s = sum.data as { total?: number };
  record(
    'UAT-M06-014',
    'M06',
    sum.res.ok && (s.total ?? 0) >= contracts.length ? 'PASS' : 'FAIL',
    `Summary total=${s.total}`
  );

  record(
    'UAT-M06-015',
    'M06',
    publicView.res.ok ? 'PASS' : 'FAIL',
    `Public external share link without auth`
  );

  const templatesAgain = await lp.request('/contracts/templates');
  const approvalsAgain = await lp.request('/contracts/approvals');
  record(
    'UAT-M06-016',
    'M06',
    templatesAgain.res.ok && approvalsAgain.res.ok ? 'PASS' : 'FAIL',
    'Regression: templates and approvals APIs stable'
  );
}

async function main() {
  console.log('Gate D UAT — Automated Assessment');
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
  const emily = new Session();
  const anon = new Session();

  await login(sarah, 'sarah.johnson@legalfirm.com');
  await login(admin, 'david.park@legalfirm.com');
  await login(lp, 'michael.chen@legalfirm.com');
  await login(emily, 'emily.rodriguez@legalfirm.com');

  await runM03(sarah, admin, lp, anon);
  await runM06(lp, sarah, admin, emily, anon);

  const passed = results.filter((r) => r.verdict === 'PASS').length;
  const failed = results.filter((r) => r.verdict === 'FAIL').length;
  const skipped = results.filter((r) => r.verdict === 'SKIP').length;

  console.log('\n--- Gate D UAT Summary ---');
  console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
  if (failed === 0) {
    console.log('\nGate D status: APPROVED (all non-skipped tests passed)\n');
  } else {
    console.log('\nGate D status: NOT APPROVED\n');
  }

  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
