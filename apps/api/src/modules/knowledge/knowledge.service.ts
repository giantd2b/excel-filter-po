import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';

interface FindAllOptions {
  service?: string;
  category?: string;
  search?: string;
  isActive?: boolean;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  // Cache for prompt text
  private cachedPromptText: string | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}) {
    const where: any = {};

    if (options.service) {
      where.service = options.service;
    }
    if (options.category) {
      where.category = options.category;
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options.search) {
      where.OR = [
        { question: { contains: options.search, mode: 'insensitive' } },
        { answer: { contains: options.search, mode: 'insensitive' } },
        { keywords: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.knowledgeEntry.findMany({
      where,
      orderBy: [{ service: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const entry = await this.prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Knowledge entry not found');
    return entry;
  }

  async getDistinctServices(): Promise<string[]> {
    const results = await this.prisma.knowledgeEntry.findMany({
      select: { service: true },
      distinct: ['service'],
      orderBy: { service: 'asc' },
    });
    return results.map((r) => r.service);
  }

  async create(data: {
    service: string;
    category: string;
    question: string;
    answer: string;
    keywords?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    this.invalidateCache();
    return this.prisma.knowledgeEntry.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      service: string;
      category: string;
      question: string;
      answer: string;
      keywords: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Knowledge entry not found');
    this.invalidateCache();
    return this.prisma.knowledgeEntry.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await this.prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Knowledge entry not found');
    await this.prisma.knowledgeEntry.delete({ where: { id } });
    this.invalidateCache();
    return { success: true };
  }

  async bulkImport(entries: Array<{
    service: string;
    category: string;
    question: string;
    answer: string;
    keywords?: string;
    sortOrder?: number;
  }>) {
    const created = await this.prisma.knowledgeEntry.createMany({
      data: entries.map((e) => ({
        service: e.service,
        category: e.category,
        question: e.question,
        answer: e.answer,
        keywords: e.keywords || null,
        sortOrder: e.sortOrder || 0,
      })),
    });
    this.invalidateCache();
    return { count: created.count };
  }

  /**
   * Get all active knowledge entries formatted as prompt-ready text.
   * Uses 5-minute cache to avoid DB query on every AI suggestion.
   */
  async getAllKnowledgeAsText(): Promise<string> {
    // Check cache
    if (this.cachedPromptText && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedPromptText;
    }

    const entries = await this.prisma.knowledgeEntry.findMany({
      where: { isActive: true },
      orderBy: [{ service: 'asc' }, { sortOrder: 'asc' }],
    });

    if (entries.length === 0) {
      return '';
    }

    // Group by service
    const grouped: Record<string, typeof entries> = {};
    for (const entry of entries) {
      if (!grouped[entry.service]) grouped[entry.service] = [];
      grouped[entry.service].push(entry);
    }

    // Build text per service
    const sections: string[] = [];
    for (const [service, serviceEntries] of Object.entries(grouped)) {
      const lines: string[] = [`## ${service}`];

      // Group by category within service
      const byCategory: Record<string, typeof serviceEntries> = {};
      for (const e of serviceEntries) {
        if (!byCategory[e.category]) byCategory[e.category] = [];
        byCategory[e.category].push(e);
      }

      for (const [category, catEntries] of Object.entries(byCategory)) {
        lines.push(`\n### ${category}`);
        for (const e of catEntries) {
          lines.push(`- ${e.question}: ${e.answer}`);
        }
      }

      sections.push(lines.join('\n'));
    }

    const text = sections.join('\n\n');

    // Cache it
    this.cachedPromptText = text;
    this.cacheTimestamp = Date.now();

    return text;
  }

  /**
   * Get knowledge text for a specific service.
   */
  async getKnowledgeForService(service: string): Promise<string> {
    const entries = await this.prisma.knowledgeEntry.findMany({
      where: { service, isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    if (entries.length === 0) return '';

    const lines: string[] = [`## ${service}`];
    const byCategory: Record<string, typeof entries> = {};
    for (const e of entries) {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    }

    for (const [category, catEntries] of Object.entries(byCategory)) {
      lines.push(`\n### ${category}`);
      for (const e of catEntries) {
        lines.push(`- ${e.question}: ${e.answer}`);
      }
    }

    return lines.join('\n');
  }

  private invalidateCache() {
    this.cachedPromptText = null;
    this.cacheTimestamp = 0;
  }
}
