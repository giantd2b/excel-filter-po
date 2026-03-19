import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('templates')
@UseGuards(FirebaseAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  create(@Body() body: { title: string; text: string; category?: string }) {
    return this.templatesService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ title: string; text: string; category: string; order: number }>) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }
}
