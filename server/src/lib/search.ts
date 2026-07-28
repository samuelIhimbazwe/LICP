export function buildSearchHighlights(text: string, query: string, max = 3): string[] {
  const q = query.trim().toLowerCase();
  if (!q || !text) return [];
  const lower = text.toLowerCase();
  const highlights: string[] = [];
  let idx = 0;
  while (highlights.length < max) {
    const found = lower.indexOf(q, idx);
    if (found === -1) break;
    const start = Math.max(0, found - 40);
    const end = Math.min(text.length, found + q.length + 40);
    highlights.push(text.slice(start, end));
    idx = found + q.length;
  }
  return highlights;
}
