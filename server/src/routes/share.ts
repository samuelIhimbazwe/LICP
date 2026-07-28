import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { serializeContract } from '../lib/contracts.js';

export const shareRouter = Router();

shareRouter.get('/contracts/:token', async (req, res) => {
  const share = await prisma.contractShare.findFirst({
    where: { token: String(req.params.token), isExternal: true },
    include: { contract: true },
  });

  if (!share) {
    res.status(404).json({ error: 'Share link not found.' });
    return;
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: 'Share link has expired.' });
    return;
  }

  await prisma.contractShare.update({
    where: { id: share.id },
    data: { accessCount: share.accessCount + 1 },
  });

  res.json({
    share: {
      permission: share.permission,
      accessCount: share.accessCount + 1,
      expiresAt: share.expiresAt?.toISOString(),
    },
    contract: serializeContract(share.contract),
  });
});
