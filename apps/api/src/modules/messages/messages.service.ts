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
    }));
  }

  /**
   * Upload media file to Firebase Storage, returns public URL.
   */
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
    mediaType?: 'image' | 'video';
    mediaUrl?: string;
    previewUrl?: string;
    channel: string;
    adminId?: string;
    adminName?: string;
  }) {
    const { oduserId, docId, text, mediaType, mediaUrl, previewUrl, channel, adminId, adminName } = data;

    if (!oduserId || !docId || !channel) {
      throw new BadRequestException('Missing required fields: oduserId, docId, channel');
    }
    if (!text && !mediaUrl) {
      throw new BadRequestException('Must provide text or mediaUrl');
    }

    const isLine = channel.startsWith('Line_');
    const isFacebook = channel.startsWith('FB_');

    if (!isLine && !isFacebook) {
      throw new BadRequestException('Invalid channel format');
    }

    // Build platform messages
    if (isLine) {
      const messages = this.buildLineMessages(text, mediaType, mediaUrl, previewUrl);
      await this.sendLineMessage(oduserId, messages, channel);
    } else {
      await this.sendFacebookMessage(oduserId, text, mediaType, mediaUrl, channel);
    }

    // Save outgoing message to PostgreSQL
    const messageId = `out_${Date.now()}`;
    const timestamp = Date.now();

    const preview = mediaType
      ? `[You] [${mediaType === 'image' ? 'รูปภาพ' : 'วิดีโอ'}]`
      : `[You] ${(text || '').substring(0, 80)}`;

    // Save message + update customer in a transaction
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          id: messageId,
          customerId: docId,
          text: text || null,
          type: 'OUTGOING',
          sender: 'ADMIN',
          timestamp: BigInt(timestamp),
          status: 'sent',
          adminId: adminId || null,
          adminName: adminName || null,
          mediaType: mediaType === 'image' ? 'IMAGE' : mediaType === 'video' ? 'VIDEO' : null,
          mediaUrl: mediaUrl || null,
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
      text: text || null,
      type: 'outgoing',
      sender: 'admin',
      timestamp,
      status: 'sent',
      adminId: adminId || null,
      adminName: adminName || null,
      mediaType: mediaType || undefined,
      mediaUrl: mediaUrl || undefined,
    });
    this.inboxGateway.emitConversationUpdated({
      id: docId,
      channel,
      lastmessagetime: timestamp,
      lastMessagePreview: preview,
    });

    return { success: true, messageId, timestamp };
  }

  // ─── LINE ─────────────────────────────────────────────────────────

  private buildLineMessages(
    text?: string,
    mediaType?: string,
    mediaUrl?: string,
    previewUrl?: string,
  ): any[] {
    const messages: any[] = [];

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
    }

    if (text) {
      messages.push({ type: 'text', text });
    }

    return messages;
  }

  private async sendLineMessage(userId: string, messages: any[], channel: string) {
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
        return;
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

    // Send media first if present
    if (mediaType && mediaUrl) {
      await axios({
        url: 'https://graph.facebook.com/v18.0/me/messages',
        method: 'POST',
        params: { access_token: pageToken },
        data: {
          recipient: { id: userId },
          message: {
            attachment: {
              type: mediaType,
              payload: { url: mediaUrl, is_reusable: true },
            },
          },
        },
      });
    }

    // Send text if present
    if (text) {
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
