import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { apiRequestSafe } from '../lib/api';
import type { GlobalSearchResult } from '../components/search/GlobalSearch';

export function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    setParams(q ? { q } : {}, { replace: true });
    if (q.length < 2) {
      setResults([]);
      setError(q ? 'Enter at least 2 characters.' : null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
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
  }, [setParams]);

  useEffect(() => {
    if (initial.trim().length >= 2) {
      void runSearch(initial);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — run once for deep link

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Search</h1>
        <p className="text-slate-600 mt-1">
          Full search across obligations, regulations, knowledge documents, contracts, users, and more
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-brand" />
            Advanced Search
          </CardTitle>
          <CardDescription>Results come from the live organisation database via the search API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search laws, contracts, obligations, users…"
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {searched && !loading && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{results.length} result{results.length === 1 ? '' : 's'}</p>
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  className="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(r.href)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{r.type}</Badge>
                    <span className="font-medium">{r.title}</span>
                  </div>
                  {r.subtitle && <p className="text-sm text-slate-600">{r.subtitle}</p>}
                </button>
              ))}
              {results.length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">No matches found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
