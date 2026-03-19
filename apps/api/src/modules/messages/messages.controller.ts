import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { FbSyncService } from './fb-sync.service';
import { AiSuggestService } from './ai-suggest.service';
import { FirebaseAuthGuard } from '../../common/guards/auth.guard';

@Controller('messages')
@UseGuards(FirebaseAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly fbSyncService: FbSyncService,
    private readonly aiSuggestService: AiSuggestService,
  ) {}

  @Get(':userId/suggestions')
  getSuggestions(@Param('userId') userId: string) {
    return this.aiSuggestService.getSuggestions(userId);
  }

  @Get(':userId')
  getMessages(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessages(userId, limit ? parseInt(limit, 10) : 50);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('docId') docId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!docId) throw new BadRequestException('docId is required');

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (!isImage && !isVideo) {
      throw new BadRequestException('Only image and video files are allowed');
    }

    const result = await this.messagesService.uploadMedia(file, docId);
    return {
      ...result,
      mediaType: isImage ? 'image' : 'video',
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post('fb-sync')
  syncFacebookReplies(@Req() req: any) {
    return this.fbSyncService.syncNow();
  }

  @Post('fb-sync/full')
  syncFacebookFull(@Req() req: any) {
    // Run in background, return immediately
    this.fbSyncService.syncFullHistory().catch((e) =>
      console.error('Full sync error:', e.message),
    );
    return { status: 'started', message: 'Full sync running in background' };
  }

  @Post('send')
  sendMessage(
    @Req() req: any,
    @Body()
    body: {
      oduserId: string;
      docId: string;
      text?: string;
      mediaType?: 'image' | 'video';
      mediaUrl?: string;
      previewUrl?: string;
      channel: string;
    },
  ) {
    return this.messagesService.sendMessage({
      ...body,
      adminId: req.admin?.id,
      adminName: req.admin?.name,
    });
  }
}
