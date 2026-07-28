import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { runGlobalSearch } from '../lib/global-search.js';

export const searchRouter = Router();

searchRouter.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      res.json({ results: [], query: q });
      return;
    }

    const results = await runGlobalSearch(
      req.user!.db.organizationId,
      q,
      req.user!.safe.permissions,
      req.user!.db.role
    );

    res.json({ results, query: q, count: results.length });
  } catch (err) {
    console.error('[search]', err);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});
