import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'AI_ENCRYPTION_KEY environment variable is required for storing API keys',
    );
  }
  return scryptSync(secret, 'transweave-ai-salt', 32);
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptApiKey(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const [ivB64, tagB64, encB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(encB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    throw new Error(
      'AI provider API key could not be decrypted. The encryption key may have changed. Please re-enter your API key in settings.',
    );
  }
}

export function maskApiKey(key: string): string {
  if (key.length < 4) return '****';
  return `...${key.slice(-4)}`;
}
