import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import { FirebaseService } from '../../common/providers/firebase.service';
import { PrismaService } from '../../common/providers/prisma.service';
import { ReplyTokenCacheService } from '../../common/providers/reply-token-cache.service';
import { InboxGateway } from '../inbox-gateway/inbox-gateway.gateway';
import { getLineAccessToken, getFacebookPageToken } from '../../common/utils/channel-tokens';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly replyTokenCache: ReplyTokenCacheService,
    private readonly inboxGateway: InboxGateway,
  ) {}

  async getMessages(userId: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { customerId: userId },
      orderBy: { timestamp: 'asc' },
      take: limit,
      include: {
        reactions: {
          select: { emoji: true, adminName: true, adminId: true },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      text: m.text,
      type: m.type === 'OUTGOING' ? 'outgoing' : 'incoming',
      sender: m.sender === 'ADMIN' ? 'admin' : 'user',
      timestamp: Number(m.timestamp),
      status: m.status,
      adminId: m.adminId,
      adminName: m.adminName,
      mediaType: m.mediaType?.toLowerCase() || undefined,
      mediaUrl: m.mediaUrl,
      previewUrl: m.previewUrl,
      reactions: m.reactions || [],
    }));
  }

  /**
   * Upload media file to Firebase Storage, returns public URL.
   */
  async addReaction(messageId: string, emoji: string, adminId: string, adminName: string) {
    const reaction = await this.prisma.messageReaction.upsert({
      where: { messageId_adminId: { messageId, adminId } },
      update: { emoji },
      create: { messageId, adminId, adminName, emoji },
    });

    // Get all reactions for this message
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, adminName: true },
    });

    // Find customerId for WebSocket broadcast
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { customerId: true },
    });

    if (message) {
      this.inboxGateway.emitReactionUpdate(message.customerId, messageId, reactions);
    }

    return reaction;
  }

  async removeReaction(messageId: string, adminId: string) {
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, adminId },
    });

    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, adminName: true },
    });

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { customerId: true },
    });

    if (message) {
      this.inboxGateway.emitReactionUpdate(message.customerId, messageId, reactions);
    }

    return { success: true };
  }

  async uploadMedia(
    file: Express.Multer.File,
    docId: string,
  ): Promise<{ url: string; previewUrl: string }> {
    const bucket = this.firebase.storage.bucket();
    const timestamp = Date.now();
    const ext = file.originalname.split('.').pop() || 'jpg';
    const filePath = `chat-media/${docId}/${timestamp}.${ext}`;

    const storageFile = bucket.file(filePath);
    await storageFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        contentDisposition: `inline; filename="${file.originalname}"`,
        cacheControl: 'public, max-age=31536000',
      },
    });
    await storageFile.makePublic();
    const url = storageFile.publicUrl();

    return { url, previewUrl: url };
  }

  async sendMessage(data: {
    oduserId: string;
    docId: string;
    text?: string;
    mediaType?: 'image' | 'video' | 'file';
    mediaUrl?: string;
    previewUrl?: string;
    stickerId?: string;
    stickerPackageId?: string;
    channel: string;
    adminId?: string;
    adminName?: string;
  }) {
    const { oduserId, docId, text, mediaType, mediaUrl, previewUrl, stickerId, stickerPackageId, channel, adminId, adminName } = data;

    if (!oduserId || !docId || !channel) {
      throw new BadRequestException('Missing required fields: oduserId, docId, channel');
    }
    if (!text && !mediaUrl && !stickerId) {
      throw new BadRequestException('Must provide text, mediaUrl, or stickerId');
    }

    const isLine = channel.startsWith('Line_');
    const isFacebook = channel.startsWith('FB_');

    if (!isLine && !isFacebook) {
      throw new BadRequestException('Invalid channel format');
    }

    // Send to platform — track success/failure
    const messageId = `out_${Date.now()}`;
    const timestamp = Date.now();
    let status = 'sent';
    let sendError: string | null = null;
    let sendMethod: string | null = null;

    // Auto-detect file type if not set
    if (!mediaType && mediaUrl && text?.startsWith('[ไฟล์')) {
      (data as any).mediaType = 'file';
    }
    const effectiveMediaType = data.mediaType || (mediaUrl && text?.startsWith('[ไฟล์') ? 'file' : undefined);

    // Don't send [ไฟล์: xxx] text to platform — only send the file/link
    const platformText = (effectiveMediaType === 'file' || stickerId) ? undefined : text;
    this.logger.log(`sendMessage: channel=${channel}, mediaType=${effectiveMediaType}, mediaUrl=${mediaUrl ? 'YES' : 'NO'}, sticker=${stickerId || 'NO'}, text=${(text || '').substring(0, 30)}`);

    try {
      if (isLine) {
        const messages = this.buildLineMessages(platformText, effectiveMediaType, mediaUrl, previewUrl, stickerId, stickerPackageId);
        sendMethod = await this.sendLineMessage(oduserId, messages, channel);
      } else {
        // For Facebook: convert LINE sticker to image
        const fbMediaType = stickerId ? 'image' : effectiveMediaType;
        const fbMediaUrl = stickerId
          ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`
          : mediaUrl;
        await this.sendFacebookMessage(oduserId, platformText, fbMediaType, fbMediaUrl, channel);
        sendMethod = 'facebook';
      }
      status = 'sent';
    } catch (err: any) {
      status = 'failed';
      sendError = err.response?.data?.message || err.message || 'Unknown error';
      this.logger.error(`Failed to send message to ${channel}:${oduserId}: ${sendError}`);
    }

    const stickerUrl = stickerId ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png` : null;
    const preview = stickerId
      ? '[You] [สติกเกอร์]'
      : effectiveMediaType === 'file'
      ? `[You] [ไฟล์]`
      : effectiveMediaType
      ? `[You] [${effectiveMediaType === 'image' ? 'รูปภาพ' : 'วิดีโอ'}]`
      : `[You] ${(text || '').substring(0, 80)}`;

    // Save message with delivery status
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          id: messageId,
          customerId: docId,
          text: stickerId ? '[สติกเกอร์]' : (text || null),
          type: 'OUTGOING',
          sender: 'ADMIN',
          timestamp: BigInt(timestamp),
          status,
          adminId: adminId || null,
          adminName: adminName || null,
          mediaType: stickerId ? 'IMAGE' : effectiveMediaType === 'image' ? 'IMAGE' : effectiveMediaType === 'video' ? 'VIDEO' : null,
          mediaUrl: stickerUrl || mediaUrl || null,
          previewUrl: previewUrl || null,
        },
      }),
      this.prisma.customer.update({
        where: { id: docId },
        data: {
          lastMessageAt: new Date(timestamp),
          lastMessagePreview: preview,
        },
      }),
    ]);

    // Backup outgoing message to Firestore (fire-and-forget)
    const firestoreUserId = oduserId; // platform userId
    const userRef = this.firebase.firestore.doc(`user/${firestoreUserId}`);
    Promise.all([
      userRef.collection('messages').doc(messageId).set({
        id: messageId,
        text: text || '',
        type: 'outgoing',
        sender: 'admin',
        timestamp,
        status: 'sent',
        adminId: adminId || null,
        adminName: adminName || null,
      }),
      userRef.update({
        lastmessagetime: timestamp,
        lastMessagePreview: preview,
      }).catch(() => {}),
    ]).catch((err) => {
      this.logger.warn(`Firestore backup failed: ${err.message}`);
    });

    // Broadcast via WebSocket
    this.inboxGateway.emitNewMessage(docId, {
      id: messageId,
      text: stickerId ? '[สติกเกอร์]' : (text || null),
      type: 'outgoing',
      sender: 'admin',
      timestamp,
      status,
      adminId: adminId || null,
      adminName: adminName || null,
      mediaType: stickerId ? 'image' : (effectiveMediaType || undefined),
      mediaUrl: stickerUrl || mediaUrl || undefined,
    });
    this.inboxGateway.emitConversationUpdated({
      id: docId,
      channel,
      lastmessagetime: timestamp,
      lastMessagePreview: status === 'failed' ? `[ส่งไม่สำเร็จ] ${preview}` : preview,
    });

    return {
      success: status === 'sent',
      messageId,
      timestamp,
      status,
      sendMethod,
      error: sendError,
    };
  }

  // ─── LINE ─────────────────────────────────────────────────────────

  private buildLineMessages(
    text?: string,
    mediaType?: string,
    mediaUrl?: string,
    previewUrl?: string,
    stickerId?: string,
    stickerPackageId?: string,
  ): any[] {
    const messages: any[] = [];

    if (stickerId && stickerPackageId) {
      messages.push({
        type: 'sticker',
        packageId: stickerPackageId,
        stickerId: stickerId,
      });
    }

    if (mediaType === 'image' && mediaUrl) {
      messages.push({
        type: 'image',
        originalContentUrl: mediaUrl,
        previewImageUrl: previewUrl || mediaUrl,
      });
    } else if (mediaType === 'video' && mediaUrl) {
      messages.push({
        type: 'video',
        originalContentUrl: mediaUrl,
        previewImageUrl: previewUrl || mediaUrl,
      });
    } else if (mediaType === 'file' && mediaUrl) {
      // LINE doesn't support file type in messaging API
      // Send as text with link instead
      const fileName = decodeURIComponent(mediaUrl.split('/').pop() || 'file');
      messages.push({
        type: 'text',
        text: `📎 ไฟล์: ${fileName}\n${mediaUrl}`,
      });
    }

    if (text && !(mediaType === 'file' && mediaUrl)) {
      messages.push({ type: 'text', text });
    }

    return messages;
  }

  private async sendLineMessage(userId: string, messages: any[], channel: string): Promise<string> {
    const accessToken = getLineAccessToken(channel);

    // Try Reply API first (free)
    const cached = this.replyTokenCache.consume(userId);
    if (cached) {
      try {
        await axios({
          url: 'https://api.line.me/v2/bot/message/reply',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          data: { replyToken: cached.replyToken, messages },
        });
        this.logger.log(`Reply API used for ${userId} — FREE`);
        return 'line_reply';
      } catch (err: any) {
        this.logger.warn(
          `Reply API failed, falling back to Push: ${err.response?.data?.message || err.message}`,
        );
      }
    }

    // Fallback: Push API
    await axios({
      url: 'https://api.line.me/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: { to: userId, messages },
    });
    this.logger.log(`Push API used for ${userId} — QUOTA`);
    return 'line_push';
  }

  // ─── Facebook ─────────────────────────────────────────────────────

  private async sendFacebookMessage(
    userId: string,
    text?: string,
    mediaType?: string,
    mediaUrl?: string,
    channel?: string,
  ) {
    const pageToken = getFacebookPageToken(channel!);

    // Send media/file first if present
    if (mediaType && mediaUrl) {
      // Facebook attachment types: image, video, audio, file
      const fbType = mediaType === 'file' ? 'file' : mediaType;
      await axios({
        url: 'https://graph.facebook.com/v18.0/me/messages',
        method: 'POST',
        params: { access_token: pageToken },
        data: {
          recipient: { id: userId },
          message: {
            attachment: {
              type: fbType,
              payload: { url: mediaUrl, is_reusable: true },
            },
          },
        },
      });
    }

    // Send text if present (skip if file was sent with text like [ไฟล์: xxx])
    if (text && !(mediaType === 'file' && text.startsWith('[ไฟล์'))) {
      await axios({
        url: 'https://graph.facebook.com/v18.0/me/messages',
        method: 'POST',
        params: { access_token: pageToken },
        data: {
          recipient: { id: userId },
          message: { text },
        },
      });
    }
  }
}
