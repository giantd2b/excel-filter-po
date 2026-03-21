import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/providers/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.replyTemplate.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: { title: string; text: string; category?: string; images?: string[] }) {
    return this.prisma.replyTemplate.create({ data });
  }

  async update(id: string, data: Partial<{ title: string; text: string; category: string; sortOrder: number; images: string[] }>) {
    const existing = await this.prisma.replyTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    return this.prisma.replyTemplate.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.replyTemplate.delete({ where: { id } });
    return { success: true };
  }
}
