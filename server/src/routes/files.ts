import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';

export const filesRouter = Router();

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

filesRouter.post('/upload', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({
      fileName: z.string().min(1),
      contentBase64: z.string().min(1),
      mimeType: z.string().optional(),
    })
    .parse(req.body);

  const ext = path.extname(body.fileName).toLowerCase();
  const blocked = ['.exe', '.bat', '.cmd', '.sh', '.msi'];
  if (blocked.includes(ext)) {
    res.status(400).json({ error: 'Unsupported file type.' });
    return;
  }

  const orgId = req.user!.db.organizationId;
  const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const relPath = path.join(orgId, `${Date.now()}-${safeName}`);
  const absPath = path.join(UPLOAD_ROOT, relPath);
  ensureDir(path.dirname(absPath));

  const buf = Buffer.from(body.contentBase64, 'base64');
  fs.writeFileSync(absPath, buf);

  const fileUrl = `/api/v1/files/download?path=${encodeURIComponent(relPath.replace(/\\/g, '/'))}`;

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'file_uploaded',
    resource: 'files',
    resourceId: safeName,
    resourceType: 'file',
    actionDetails: `Uploaded file: ${safeName}`,
    req,
  });

  res.status(201).json({
    fileUrl,
    fileName: safeName,
    fileSize: buf.length,
    mimeType: body.mimeType ?? 'application/octet-stream',
  });
});

filesRouter.get('/download', authenticate, async (req: AuthRequest, res) => {
  const rel = String(req.query.path ?? '');
  const orgId = req.user!.db.organizationId;
  if (!rel || !rel.startsWith(`${orgId}/`)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  const absPath = path.join(UPLOAD_ROOT, rel);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'file_downloaded',
    resource: 'files',
    resourceId: rel,
    resourceType: 'file',
    actionDetails: `Downloaded file: ${rel}`,
    req,
  });

  res.download(absPath);
});
