import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TemplatesService } from './templates.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';
import { FirebaseService } from '../../common/providers/firebase.service';

@Controller('templates')
@UseGuards(FirebaseAuthGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly firebase: FirebaseService,
  ) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  create(@Body() body: { title: string; text: string; category?: string; images?: string[] }) {
    return this.templatesService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ title: string; text: string; category: string; order: number; images: string[] }>) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) return { urls: [] };

    const bucket = this.firebase.storage.bucket();
    const urls: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filePath = `templates/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

      const storageFile = bucket.file(filePath);
      await storageFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000',
        },
      });
      await storageFile.makePublic();
      urls.push(storageFile.publicUrl());
    }

    return { urls };
  }
}
