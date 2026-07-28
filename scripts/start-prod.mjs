/**
 * Production bootstrap for Render (and similar hosts).
 * Pushes Prisma schema, seeds demo data if the org is empty, then starts the API.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(root, 'prisma', 'schema.postgresql.prisma');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('[licp] DATABASE_URL is required in production.');
  process.exit(1);
}

console.log('[licp] Applying database schema...');
run('npx', ['prisma', 'db', 'push', '--schema', schema, '--skip-generate']);

const require = createRequire(path.join(root, 'server', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

try {
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    console.log('[licp] Empty database — seeding demo data...');
    run('node', [path.join(root, 'server', 'dist', 'seed.js')]);
  } else {
    console.log('[licp] Database already seeded — skipping seed.');
  }
} finally {
  await prisma.$disconnect();
}

console.log('[licp] Starting API...');
run('npm', ['run', 'start', '--prefix', 'server']);
