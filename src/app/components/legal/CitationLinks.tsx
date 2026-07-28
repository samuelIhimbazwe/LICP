import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

export interface CitationLinkItem {
  label: string;
  href: string;
  documentId?: string;
  external?: boolean;
}

export function CitationLinksList({
  links,
  className = '',
}: {
  links: CitationLinkItem[];
  className?: string;
}) {
  if (!links.length) return null;

  return (
    <ul className={`space-y-1.5 text-sm ${className}`}>
      {links.map((link, idx) => (
        <li key={`${link.label}-${idx}`}>
          {link.href ? (
            link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <Link to={link.href} className="text-brand hover:underline">
                {link.label}
              </Link>
            )
          ) : (
            <Link
              to={`/knowledge-base?q=${encodeURIComponent(link.label)}`}
              className="text-brand hover:underline"
            >
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SourceReferenceButton({
  title,
  href,
  external,
}: {
  title: string;
  href?: string;
  external?: boolean;
}) {
  const resolved =
    href?.trim() ||
    (title.trim() ? `/knowledge-base?q=${encodeURIComponent(title.trim())}` : '');

  if (!resolved) return null;

  if (external || /^https?:\/\//i.test(resolved)) {
    return (
      <a href={resolved} target="_blank" rel="noopener noreferrer">
        <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">
          <ExternalLink className="mr-1 h-3 w-3" />
          View reference
        </span>
      </a>
    );
  }

  return (
    <Link to={resolved}>
      <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">
        <ExternalLink className="mr-1 h-3 w-3" />
        Open {title.length > 40 ? 'source' : title}
      </span>
    </Link>
  );
}
