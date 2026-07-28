/**
 * Shared citation deep-link helpers (mirrors server/src/lib/citation-links.ts paths).
 */

export function clearSearchParams(
  searchParams: URLSearchParams,
  setSearchParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void,
  keys: string[]
) {
  const next = new URLSearchParams(searchParams);
  let changed = false;
  for (const key of keys) {
    if (next.has(key)) {
      next.delete(key);
      changed = true;
    }
  }
  if (changed) setSearchParams(next, { replace: true });
}

export function citationHrefForModule(
  module: string | undefined,
  id: string
): string {
  if (!id) return '';
  const enc = encodeURIComponent(id);
  switch (module) {
    case 'knowledge':
    case 'legal_document':
      return `/knowledge-base?doc=${enc}`;
    case 'compliance':
    case 'obligation':
      return `/compliance-tracking?obligation=${enc}`;
    case 'regulatory':
      return `/regulatory-updates?update=${enc}`;
    case 'contract':
      return `/contracts?contract=${enc}`;
    case 'integration':
      return `/integrations?id=${enc}`;
    case 'user':
      return `/user-management?user=${enc}`;
    case 'notification':
      return `/notifications?id=${enc}`;
    case 'report':
      return `/analytics?report=${enc}`;
    case 'evidence':
      return `/compliance-tracking?tab=evidence&evidence=${enc}`;
    case 'template':
      return `/contracts?tab=templates&template=${enc}`;
    case 'audit':
      return `/security?tab=audit&log=${enc}`;
    default:
      return '';
  }
}
