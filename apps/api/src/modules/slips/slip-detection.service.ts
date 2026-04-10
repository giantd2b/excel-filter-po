import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

export interface SlipData {
  is_slip: boolean;
  bank_name?: string;
  amount?: string;
  date_time?: string;
  sender_name?: string;
  receiver_name?: string;
  reference_number?: string;
}

interface CachedResult {
  data: SlipData | null;
  timestamp: number;
}

@Injectable()
export class SlipDetectionService {
  private readonly logger = new Logger(SlipDetectionService.name);

  // Pre-filter thresholds: typical Thai bank slips are 30KB–4MB JPEG/PNG.
  // Skip tiny stickers/emojis and absurdly huge files to avoid wasted calls.
  private static readonly MIN_IMAGE_BYTES = 15 * 1024; // 15 KB
  private static readonly MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

  // In-memory result cache keyed by SHA-256 of the image bytes.
  // Prevents re-billing the same image (common when customers resend).
  private static readonly cache = new Map<string, CachedResult>();
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  private static readonly CACHE_MAX_ENTRIES = 5000;

  async analyzeSlip(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg',
  ): Promise<SlipData | null> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    // 1) Cheap pre-filter: size + mime type
    const size = imageBuffer?.length ?? 0;
    if (size < SlipDetectionService.MIN_IMAGE_BYTES) {
      this.logger.debug(`Skipping slip detection: image too small (${size} bytes)`);
      return null;
    }
    if (size > SlipDetectionService.MAX_IMAGE_BYTES) {
      this.logger.warn(`Skipping slip detection: image too large (${size} bytes)`);
      return null;
    }
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(mimeType)) {
      this.logger.debug(`Skipping slip detection: unsupported mime ${mimeType}`);
      return null;
    }

    // 2) Dedupe cache by image hash
    const hash = createHash('sha256').update(imageBuffer).digest('hex');
    const cached = SlipDetectionService.cache.get(hash);
    if (cached && Date.now() - cached.timestamp < SlipDetectionService.CACHE_TTL_MS) {
      this.logger.debug(`Slip detection cache hit for ${hash.slice(0, 12)}`);
      return cached.data;
    }

    const anthropic = new Anthropic();
    const base64Image = imageBuffer.toString('base64');

    try {
      const response = await anthropic.messages.create({
        // Haiku 4.5 handles vision and is ~4-5x cheaper than Sonnet for this task.
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this image. If it is a Thai bank transfer slip, extract the following information and return ONLY a JSON object (no markdown, no code fences, no explanation):

{
  "is_slip": true,
  "bank_name": "ชื่อธนาคาร (ภาษาไทย)",
  "amount": "จำนวนเงิน (ตัวเลข เช่น 1500.00)",
  "date_time": "วันที่และเวลา",
  "sender_name": "ชื่อผู้โอน",
  "receiver_name": "ชื่อผู้รับ",
  "reference_number": "หมายเลขอ้างอิง"
}

If any field is not visible or unclear, use null for that field.
If this image is NOT a bank transfer slip, return ONLY: {"is_slip": false}`,
              },
            ],
          },
        ],
      });

      const text = (response.content[0] as any).text.trim();

      const parseResult = (raw: string): SlipData | null => {
        try {
          const data = JSON.parse(raw);
          if (!data.is_slip) return null;
          return data;
        } catch {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (!data.is_slip) return null;
            return data;
          }
          this.logger.error('Failed to parse Claude Vision response:', raw);
          return null;
        }
      };

      const result = parseResult(text);
      this.storeInCache(hash, result);
      return result;
    } catch (error: any) {
      this.logger.error('Claude Vision API error:', error.message);
      return null;
    }
  }

  private storeInCache(hash: string, data: SlipData | null) {
    const cache = SlipDetectionService.cache;
    if (cache.size >= SlipDetectionService.CACHE_MAX_ENTRIES) {
      // Drop oldest entry (Map preserves insertion order)
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(hash, { data, timestamp: Date.now() });
  }
}
