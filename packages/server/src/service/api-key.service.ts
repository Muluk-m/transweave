import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { ApiKeyRepository } from '../repository/api-key.repository';

const KEY_PREFIX_LENGTH = 11; // "tw_" (3) + 8 hex chars

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepo: ApiKeyRepository) {}

  /**
   * Create a new API key. Returns the full key exactly once.
   */
  async createKey(
    userId: string,
    name: string,
    scopes?: string[],
    expiresAt?: Date,
  ) {
    const randomPart = randomBytes(32).toString('hex');
    const fullKey = `tw_${randomPart}`;
    const keyPrefix = fullKey.substring(0, KEY_PREFIX_LENGTH);
    const keyHash = hashPassword(fullKey);

    const record = await this.apiKeyRepo.create({
      name,
      keyPrefix,
      keyHash,
      userId,
      scopes: scopes ?? ['read', 'write'],
      expiresAt: expiresAt ?? null,
    });

    return {
      key: fullKey, // Only returned at creation time
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  /**
   * Validate a provided API key against stored hashes.
   * Returns user info if valid, null otherwise.
   */
  async validateKey(
    providedKey: string,
  ): Promise<{
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    scopes: string[];
  } | null> {
    const prefix = providedKey.substring(0, KEY_PREFIX_LENGTH);
    const candidates = await this.apiKeyRepo.findByPrefixWithUser(prefix);

    for (const candidate of candidates) {
      if (verifyPassword(providedKey, candidate.keyHash)) {
        // Update lastUsedAt in background (don't block the response)
        this.apiKeyRepo.updateLastUsed(candidate.id).catch(() => {});

        return {
          userId: candidate.userId,
          userName: candidate.userName,
          userEmail: candidate.userEmail,
          userAvatar: candidate.userAvatar,
          scopes: candidate.scopes,
        };
      }
    }

    return null;
  }

  /**
   * List all API keys for a user (never includes keyHash).
   */
  async listKeys(userId: string) {
    return this.apiKeyRepo.findByUserId(userId);
  }

  /**
   * Delete an API key. Ownership check is enforced.
   */
  async deleteKey(keyId: string, userId: string): Promise<boolean> {
    return this.apiKeyRepo.deleteByIdAndUserId(keyId, userId);
  }
}
