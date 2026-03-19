import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../common/providers/prisma.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

// Static fallbacks (used only when DB has no entries)
import { KNOWLEDGE_BASE } from '../../data/kb-temboon-merit';
import { KB_THAI_BUFFET } from '../../data/kb-thai-buffet';
import { KB_CHINESE_TABLE } from '../../data/kb-chinese-table';
import { KB_COCKTAIL_CANAPE } from '../../data/kb-cocktail-canape';
import { KB_WEDDING } from '../../data/kb-wedding';

interface CachedSuggestions {
  suggestions: string[];
  timestamp: number;
}

@Injectable()
export class AiSuggestService {
  private readonly logger = new Logger(AiSuggestService.name);
  private readonly cache = new Map<string, CachedSuggestions>();
  private readonly CACHE_TTL = 30_000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  /**
   * Build knowledge base text: prefer DB, fall back to static .ts files.
   */
  private async getKnowledgeBaseText(): Promise<string> {
    try {
      const dbText = await this.knowledgeService.getAllKnowledgeAsText();
      if (dbText && dbText.trim().length > 0) {
        return dbText;
      }
    } catch (err) {
      this.logger.warn('Failed to load KB from DB, using static fallback', err);
    }

    // Fallback to static .ts files
    return `Knowledge base for งานบุญ/พิธีสงฆ์:
${KNOWLEDGE_BASE}

Knowledge base for อาหารไทยบุฟเฟต์:
${KB_THAI_BUFFET}

Knowledge base for โต๊ะจีน:
${KB_CHINESE_TABLE}

Knowledge base for Cocktail & Canapé:
${KB_COCKTAIL_CANAPE}

Knowledge base for งานแต่งงาน:
${KB_WEDDING}`;
  }

  async getSuggestions(customerId: string): Promise<string[]> {
    // Check cache
    const cached = this.cache.get(customerId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.suggestions;
    }

    try {
      // Fetch last 10 messages
      const messages = await this.prisma.message.findMany({
        where: { customerId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      if (messages.length === 0) {
        return [];
      }

      // Reverse to chronological order
      messages.reverse();

      // Fetch customer info
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          tags: { include: { tag: true } },
        },
      });

      if (!customer) {
        return [];
      }

      // Fetch recent slips for this customer
      const recentSlips = await this.prisma.slip.findMany({
        where: { customerId },
        orderBy: { detectedAt: 'desc' },
        take: 3,
      });

      // Build conversation context
      const conversationLines = messages.map((m) => {
        const role = m.sender === 'ADMIN' ? 'แอดมิน' : 'ลูกค้า';
        const text = m.text || (m.mediaType ? `[${m.mediaType === 'IMAGE' ? 'รูปภาพ' : 'วิดีโอ'}]` : '');
        return `${role}: ${text}`;
      });

      const tagNames = customer.tags.map((ct) => ct.tag.name);
      const channelType = customer.channelType === 'LINE' ? 'LINE' : 'Facebook';

      let contextInfo = `ชื่อลูกค้า: ${customer.displayName}\nช่องทาง: ${channelType} (${customer.channel})`;
      if (tagNames.length > 0) {
        contextInfo += `\nแท็ก: ${tagNames.join(', ')}`;
      }
      if (customer.status === 'FOLLOW_UP') {
        contextInfo += '\nสถานะ: ติดตามงาน';
      }
      if (recentSlips.length > 0) {
        const slipInfo = recentSlips.map((s) => {
          const parts: string[] = [];
          if (s.amount) parts.push(`${s.amount} บาท`);
          if (s.bankName) parts.push(s.bankName);
          return parts.join(' - ') || 'สลิป';
        });
        contextInfo += `\nสลิปล่าสุด: ${slipInfo.join(', ')}`;
      }

      // Get knowledge base text (DB with fallback)
      const knowledgeText = await this.getKnowledgeBaseText();

      const prompt = `You are a Thai customer service agent for เติมบุญ บาย ไอริส (Temboon by IRIS), a catering and merit ceremony business.

We offer 6 service categories:
1. งานบุญ/งานทำบุญ/พิธีสงฆ์
2. งานจัดเลี้ยงอาหารไทยบุฟเฟต์
3. งานจัดเลี้ยงโต๊ะจีน
4. งานจัดเลี้ยง Cocktail/Canapé
5. งานแต่งงาน
6. งานบุฟเฟต์อินเตอร์ (International Buffet)

${knowledgeText}

RULES:
- First, detect which service the customer is asking about from the conversation context
- If about งานบุญ/พิธีสงฆ์: Use EXACT prices and info from the งานบุญ knowledge base
- If about อาหารไทยบุฟเฟต์: Use EXACT prices and info from the อาหารไทยบุฟเฟต์ knowledge base
- If about โต๊ะจีน: Use EXACT prices, menus, and info from the โต๊ะจีน knowledge base
- If about Cocktail/Canapé: Use EXACT prices and info from the Cocktail & Canapé knowledge base
- If about งานแต่งงาน: Use EXACT prices and info from the งานแต่งงาน knowledge base
- If about International Buffet: suggest helpful general replies only — DO NOT quote prices you don't have
- For unknown services, suggest "สอบถามรายละเอียดเพิ่มเติมได้เลยค่ะ" or similar
- Suggest 3 short reply messages in Thai
- Keep replies natural, polite (ค่ะ/ครับ), and helpful
- Each reply must be under 100 characters
- NEVER make up prices or info not in the knowledge base
- Return ONLY a JSON array of 3 strings, no explanation, no markdown.

ข้อมูลลูกค้า:
${contextInfo}

บทสนทนา:
${conversationLines.join('\n')}`;

      if (!process.env.ANTHROPIC_API_KEY) {
        this.logger.warn('ANTHROPIC_API_KEY not set, skipping AI suggestions');
        return [];
      }

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (response.content[0] as any).text.trim();
      let suggestions: string[];

      try {
        suggestions = JSON.parse(text);
      } catch {
        // Try to extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          this.logger.warn('Failed to parse AI suggestions:', text);
          return [];
        }
      }

      // Validate and trim
      if (!Array.isArray(suggestions)) return [];
      suggestions = suggestions
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().substring(0, 100))
        .slice(0, 3);

      // Cache
      this.cache.set(customerId, { suggestions, timestamp: Date.now() });

      return suggestions;
    } catch (error: any) {
      this.logger.error(`AI suggestion error for ${customerId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Invalidate cache for a customer (call when new message arrives).
   */
  invalidateCache(customerId: string) {
    this.cache.delete(customerId);
  }
}
