/**
 * Simulates Knowledge Base and Contract upload dialogs via API.
 * Run: npm run test:uploads --prefix server
 */

const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api/v1';

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

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { res, data };
  }
}

async function main() {
  console.log('Upload verification (KB + Contracts)\n');

  try {
    await fetch(`${BASE}/health`);
  } catch {
    console.error('API not reachable. Start with: npm run dev:api');
    process.exit(1);
  }

  const session = new Session();
  const login = await session.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'sarah.johnson@legalfirm.com', password: 'demo123' }),
  });
  if (!login.res.ok) {
    console.error('Login failed:', login.data);
    process.exit(1);
  }

  const kbTitle = `Manual Check KB ${Date.now()}`;
  const contractTitle = `Manual Check Contract ${Date.now()}`;

  const kbPost = await session.request('/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify({
      title: kbTitle,
      type: 'guidance',
      jurisdiction: 'Rwanda',
      industry: 'Finance',
      summary: 'Upload verification test document',
      fileUrl: '/documents/manual-check.pdf',
      tags: ['manual-check', 'uat'],
    }),
  });
  const kbBody = kbPost.data as { document?: { id: string } };
  if (kbPost.res.status !== 201 || !kbBody.document?.id) {
    console.error('✗ KB upload failed:', kbPost.res.status, kbPost.data);
    process.exit(1);
  }
  console.log(`✓ KB upload created: ${kbTitle}`);

  const contractPost = await session.request('/contracts', {
    method: 'POST',
    body: JSON.stringify({
      title: contractTitle,
      type: 'nda',
      counterparty: 'Manual Check Corp',
      status: 'draft',
      fileUrl: '/contracts/manual-check.pdf',
      tags: ['manual-check'],
    }),
  });
  const contractBody = contractPost.data as { contract?: { id: string } };
  if (contractPost.res.status !== 201 || !contractBody.contract?.id) {
    console.error('✗ Contract upload failed:', contractPost.res.status, contractPost.data);
    process.exit(1);
  }
  console.log(`✓ Contract upload created: ${contractTitle}`);

  const kbList = await session.request('/knowledge/documents?search=Manual%20Check%20KB');
  const kbDocs = (kbList.data as { documents?: { title: string }[] }).documents ?? [];
  const kbFound = kbDocs.some((d) => d.title === kbTitle);
  console.log(kbFound ? `✓ KB appears in search results (${kbDocs.length} matches)` : '✗ KB not found in list');

  const contractList = await session.request('/contracts?search=Manual%20Check%20Contract');
  const contracts = (contractList.data as { contracts?: { title: string }[] }).contracts ?? [];
  const contractFound = contracts.some((c) => c.title === contractTitle);
  console.log(
    contractFound
      ? `✓ Contract appears in search results (${contracts.length} matches)`
      : '✗ Contract not found in list'
  );

  const kbGet = await session.request(`/knowledge/documents/${kbBody.document.id}`);
  const kbDetail = (kbGet.data as { document?: { title: string } }).document;
  console.log(
    kbGet.res.ok && kbDetail?.title === kbTitle
      ? '✓ KB detail endpoint returns uploaded document'
      : '✗ KB detail endpoint failed'
  );

  if (!kbFound || !contractFound || !kbGet.res.ok) {
    process.exit(1);
  }

  console.log('\nAll upload checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
