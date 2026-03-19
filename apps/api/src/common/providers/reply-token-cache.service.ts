import { Injectable, Logger } from '@nestjs/common';

interface CachedToken {
  replyToken: string;
  channel: string;
  receivedAt: number;
}

const TOKEN_TTL_MS = 25_000; // 25 seconds (LINE expires at ~30s, we use 25s for safety)

@Injectable()
export class ReplyTokenCacheService {
  private readonly logger = new Logger(ReplyTokenCacheService.name);
  private cache = new Map<string, CachedToken>();

  /**
   * Store a replyToken when a webhook message arrives.
   * Key is the LINE userId.
   */
  set(userId: string, replyToken: string, channel: string) {
    this.cache.set(userId, {
      replyToken,
      channel,
      receivedAt: Date.now(),
    });
    this.logger.debug(`Cached replyToken for ${userId}`);
  }

  /**
   * Get a fresh replyToken if available (< 25 seconds old).
   * Returns null if expired or not found.
   * Consumes the token (one-time use).
   */
  consume(userId: string): { replyToken: string; channel: string } | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Always delete — replyToken is single-use
    this.cache.delete(userId);

    const age = Date.now() - cached.receivedAt;
    if (age > TOKEN_TTL_MS) {
      this.logger.debug(`ReplyToken expired for ${userId} (${age}ms old)`);
      return null;
    }

    this.logger.log(`Using replyToken for ${userId} (${age}ms old) — FREE reply`);
    return { replyToken: cached.replyToken, channel: cached.channel };
  }

  /**
   * Cleanup old entries (called periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.receivedAt > TOKEN_TTL_MS * 2) {
        this.cache.delete(key);
      }
    }
  }
}
