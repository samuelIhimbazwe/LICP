import { authenticator } from 'otplib';
import { generateToken, hashToken } from './crypto.js';

authenticator.options = { window: 1 };

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function getOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, 'LICP', secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

export function generateTotp(secret: string): string {
  return authenticator.generate(secret);
}

export function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: count }, () =>
    generateToken(4).slice(0, 8).toUpperCase()
  );
  return { plain, hashed: plain.map(hashToken) };
}

export function verifyBackupCode(code: string, hashes: string[]): number {
  const hashed = hashToken(code.toUpperCase());
  return hashes.findIndex((h) => h === hashed);
}
