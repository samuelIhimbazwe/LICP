import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function parseUserAgent(ua?: string): { browser: string; device: string } {
  if (!ua) return { browser: 'Unknown', device: 'Unknown' };
  const browser = ua.includes('Chrome')
    ? 'Chrome'
    : ua.includes('Firefox')
      ? 'Firefox'
      : ua.includes('Safari')
        ? 'Safari'
        : 'Other';
  const device = ua.includes('Mobile') ? 'mobile' : 'desktop';
  return { browser, device };
}
