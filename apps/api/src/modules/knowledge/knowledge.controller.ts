import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('knowledge')
@UseGuards(FirebaseAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  findAll(
    @Query('service') service?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.knowledgeService.findAll({
      service,
      category,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('services')
  getServices() {
    return this.knowledgeService.getDistinctServices();
  }

  @Get('prompt-text')
  getPromptText() {
    return this.knowledgeService.getAllKnowledgeAsText();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeService.findById(id);
  }

  @Post()
  create(
    @Body()
    body: {
      service: string;
      category: string;
      question: string;
      answer: string;
      keywords?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.knowledgeService.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      service: string;
      category: string;
      question: string;
      answer: string;
      keywords: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.knowledgeService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    const admin = req.admin;
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can delete knowledge entries');
    }
    return this.knowledgeService.delete(id);
  }

  @Post('import')
  bulkImport(
    @Body()
    body: Array<{
      service: string;
      category: string;
      question: string;
      answer: string;
      keywords?: string;
      sortOrder?: number;
    }>,
    @Req() req: any,
  ) {
    const admin = req.admin;
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can bulk import');
    }
    return this.knowledgeService.bulkImport(body);
  }
}
