import { prisma } from './prisma.js';

export interface CitationLink {
  label: string;
  href: string;
  documentId?: string;
  external: boolean;
}

/** Well-known legal references → official or authoritative URLs */
const EXTERNAL_REFERENCE_URLS: Record<string, string> = {
  'Constitution of Rwanda': 'https://www.constituteproject.org/constitution/Rwanda_2003',
  'EU Directive 95/46/EC': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31995L0046',
  'EAC Treaty': 'https://www.eac.int/overview/how-the-community-works/legal-framework',
  'FATF Recommendations': 'https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html',
  'Banking Law': 'https://www.bnr.rw/',
  'Rwanda Labour Law No. 66/2018': 'https://www.ilo.org/dyn/normlex/en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:P12976',
  'Rwanda Data Protection Law': 'https://www.rppa.gov.rw/',
  'GDPR - General Data Protection Regulation': 'https://gdpr-info.eu/',
};

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function knowledgeDocumentPath(documentId: string): string {
  return `/knowledge-base?doc=${encodeURIComponent(documentId)}`;
}

export async function resolveCitationLinks(
  orgId: string,
  citations: unknown
): Promise<CitationLink[]> {
  const raw = Array.isArray(citations) ? (citations as string[]) : [];
  if (raw.length === 0) return [];

  const docs = await prisma.legalDocument.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true },
  });

  return raw.map((ref) => {
    const label = ref.trim();
    if (!label) return { label: ref, href: '', external: false };

    if (isHttpUrl(label)) {
      return { label, href: label, external: true };
    }

    const doc = docs.find((d) => d.id === label) ?? docs.find((d) => d.title === label);
    if (doc) {
      return {
        label: doc.title,
        href: knowledgeDocumentPath(doc.id),
        documentId: doc.id,
        external: false,
      };
    }

    const exactExternal = EXTERNAL_REFERENCE_URLS[label];
    if (exactExternal) {
      return { label, href: exactExternal, external: true };
    }

    const fuzzyKey = Object.keys(EXTERNAL_REFERENCE_URLS).find(
      (key) =>
        label.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(label.toLowerCase())
    );
    if (fuzzyKey) {
      return { label, href: EXTERNAL_REFERENCE_URLS[fuzzyKey], external: true };
    }

    // Unresolved refs still link into the knowledge base search so the button works.
    return {
      label,
      href: `/knowledge-base?q=${encodeURIComponent(label)}`,
      external: false,
    };
  });
}

export function sourceLinkForModule(
  module: string | undefined,
  id: string,
  title: string
): { href: string; external: boolean } {
  if (module === 'knowledge' || module === 'legal_document') {
    return { href: knowledgeDocumentPath(id), external: false };
  }
  if (module === 'compliance' || module === 'obligation') {
    return { href: `/compliance-tracking?obligation=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'regulatory') {
    return { href: `/regulatory-updates?update=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'contract') {
    return { href: `/contracts?contract=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'integration') {
    return { href: `/integrations?id=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'user') {
    return { href: `/user-management?user=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'notification') {
    return { href: `/notifications?id=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'report') {
    return { href: `/analytics?report=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'evidence') {
    return { href: `/compliance-tracking?tab=evidence&evidence=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'template') {
    return { href: `/contracts?tab=templates&template=${encodeURIComponent(id)}`, external: false };
  }
  if (module === 'audit') {
    return { href: `/security?tab=audit&log=${encodeURIComponent(id)}`, external: false };
  }
  const known = EXTERNAL_REFERENCE_URLS[title];
  if (known) return { href: known, external: true };
  const fuzzyKey = Object.keys(EXTERNAL_REFERENCE_URLS).find(
    (key) =>
      title.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(title.toLowerCase())
  );
  if (fuzzyKey) return { href: EXTERNAL_REFERENCE_URLS[fuzzyKey], external: true };
  if (title.trim()) {
    return { href: `/knowledge-base?q=${encodeURIComponent(title)}`, external: false };
  }
  return { href: '', external: false };
}
