export type ProbeResult = {
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  message: string;
};

export async function probeIntegrationEndpoint(endpoint: string, apiKey?: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    return {
      ok: res.ok,
      latencyMs,
      statusCode: res.status,
      message: res.ok ? `Connected (${res.status}) in ${latencyMs}ms` : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

export type GazetteItem = {
  title: string;
  description?: string;
  source?: string;
  jurisdiction?: string;
  category?: string;
  impact?: string;
};

export async function fetchGazetteItems(endpoint: string, apiKey?: string): Promise<GazetteItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {}),
    },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Gazette API returned ${res.status}`);
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) {
    return data.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        title: String(row.title ?? row.name ?? 'Regulatory update'),
        description: String(row.description ?? row.summary ?? ''),
        source: String(row.source ?? 'External feed'),
        jurisdiction: String(row.jurisdiction ?? 'Rwanda'),
        category: String(row.category ?? 'Regulatory'),
        impact: String(row.impact ?? 'medium'),
      };
    });
  }
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return fetchGazetteItems(endpoint, apiKey).catch(() => []);
  }
  return [];
}
