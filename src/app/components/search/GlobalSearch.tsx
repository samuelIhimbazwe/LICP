import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Brain,
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Plug,
  Search,
  Users,
} from 'lucide-react';
import { apiRequestSafe } from '../../lib/api';
import { cn } from '../ui/utils';

export type GlobalSearchResultType =
  | 'obligation'
  | 'regulatory'
  | 'document'
  | 'contract'
  | 'user'
  | 'integration'
  | 'notification'
  | 'navigation';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  navigation: 'Pages',
  obligation: 'Compliance',
  regulatory: 'Regulatory',
  document: 'Knowledge Base',
  contract: 'Contracts',
  user: 'Users',
  integration: 'Integrations',
  notification: 'Notifications',
};

const TYPE_ICONS: Record<GlobalSearchResultType, React.ElementType> = {
  navigation: LayoutDashboard,
  obligation: ClipboardCheck,
  regulatory: AlertCircle,
  document: BookOpen,
  contract: FolderOpen,
  user: Users,
  integration: Plug,
  notification: Bell,
};

function groupResults(results: GlobalSearchResult[]) {
  const groups = new Map<GlobalSearchResultType, GlobalSearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.type) ?? [];
    list.push(result);
    groups.set(result.type, list);
  }
  return groups;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequestSafe<{ results: GlobalSearchResult[] }>(
        `/search?q=${encodeURIComponent(q)}`
      );
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleSelect = (result: GlobalSearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(result.href);
  };

  const grouped = groupResults(results);
  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search obligations, contracts, documents, regulations, users..."
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-20 text-[13px] text-foreground outline-none ring-brand/30 placeholder:text-muted-foreground focus:ring-2"
          aria-label="Global search"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          autoComplete="off"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          Ctrl K
        </kbd>
      </div>

      {showPanel && (
        <div
          id="global-search-results"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(24rem,60vh)] overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-6 text-[13px] text-destructive">{error}</div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="p-1">
              {Array.from(grouped.entries()).map(([type, items]) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type} className="py-1">
                    <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {TYPE_LABELS[type]}
                    </p>
                    <ul>
                      {items.map((result) => (
                        <li key={`${result.type}-${result.id}`}>
                          <button
                            type="button"
                            onClick={() => handleSelect(result)}
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-sm px-3 py-2 text-left transition-colors',
                              'hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.5} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">{result.title}</span>
                              {result.subtitle && (
                                <span className="block truncate text-[11px] text-muted-foreground">{result.subtitle}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && query.trim().length >= 2 && (
            <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {results.length} result{results.length === 1 ? '' : 's'} across your organisation
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
