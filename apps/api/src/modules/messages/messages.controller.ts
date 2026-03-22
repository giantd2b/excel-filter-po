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
    @Query('before') before?: string,
  ) {
    return this.messagesService.getMessages(
      userId,
      limit ? parseInt(limit, 10) : 50,
      before ? parseInt(before, 10) : undefined,
    );
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

    const result = await this.messagesService.uploadMedia(file, docId);
    return {
      ...result,
      mediaType: isImage ? 'image' : isVideo ? 'video' : 'file',
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Get('stickers')
  getStickers() {
    // Predefined sticker sets using emoji rendered as large images
    return {
      sets: [
        {
          name: 'ทักทาย',
          stickers: [
            { id: 'greet-1', emoji: '🙏', label: 'สวัสดี' },
            { id: 'greet-2', emoji: '😊', label: 'ยิ้ม' },
            { id: 'greet-3', emoji: '🙂', label: 'ยินดี' },
            { id: 'greet-4', emoji: '👋', label: 'หวัดดี' },
            { id: 'greet-5', emoji: '🤗', label: 'กอด' },
            { id: 'greet-6', emoji: '😍', label: 'รัก' },
          ],
        },
        {
          name: 'ตอบรับ',
          stickers: [
            { id: 'ok-1', emoji: '👍', label: 'โอเค' },
            { id: 'ok-2', emoji: '✅', label: 'เรียบร้อย' },
            { id: 'ok-3', emoji: '👌', label: 'ได้เลย' },
            { id: 'ok-4', emoji: '💯', label: 'เยี่ยม' },
            { id: 'ok-5', emoji: '🎉', label: 'ยินดี' },
            { id: 'ok-6', emoji: '❤️', label: 'ขอบคุณ' },
          ],
        },
        {
          name: 'งานบุญ',
          stickers: [
            { id: 'bun-1', emoji: '🪷', label: 'บัว' },
            { id: 'bun-2', emoji: '📿', label: 'สายประคำ' },
            { id: 'bun-3', emoji: '🕯️', label: 'เทียน' },
            { id: 'bun-4', emoji: '🙏', label: 'ไหว้' },
            { id: 'bun-5', emoji: '🏠', label: 'บ้าน' },
            { id: 'bun-6', emoji: '🎊', label: 'ฉลอง' },
          ],
        },
        {
          name: 'อาหาร',
          stickers: [
            { id: 'food-1', emoji: '🍱', label: 'อาหาร' },
            { id: 'food-2', emoji: '🍜', label: 'ก๋วยเตี๋ยว' },
            { id: 'food-3', emoji: '🍛', label: 'ข้าวแกง' },
            { id: 'food-4', emoji: '🧁', label: 'ขนม' },
            { id: 'food-5', emoji: '☕', label: 'ชา/กาแฟ' },
            { id: 'food-6', emoji: '🎂', label: 'เค้ก' },
          ],
        },
      ],
    };
  }

  @Post(':messageId/react')
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
    @Req() req: any,
  ) {
    return this.messagesService.addReaction(
      messageId,
      body.emoji,
      req.user?.uid || req.admin?.id || 'unknown',
      req.user?.name || req.admin?.name || req.user?.email || 'Admin',
    );
  }

  @Post(':messageId/unreact')
  async removeReaction(
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    return this.messagesService.removeReaction(
      messageId,
      req.user?.uid || req.admin?.id || 'unknown',
    );
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
      replyToId?: string;
    },
  ) {
    return this.messagesService.sendMessage({
      ...body,
      adminId: req.admin?.id,
      adminName: req.admin?.name,
    });
  }
}
