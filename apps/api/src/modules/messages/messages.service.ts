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

  async getMessages(userId: string, limit = 50, before?: number, after?: number) {
    // Fetch newest messages first, then reverse for chronological display
    const messages = await this.prisma.message.findMany({
      where: {
        customerId: userId,
        ...(after
          ? { timestamp: { gt: BigInt(after) } }
          : before
          ? { timestamp: { lt: BigInt(before) } }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        reactions: {
          select: { emoji: true, adminName: true, adminId: true },
        },
        replyTo: {
          select: { id: true, text: true, type: true, sender: true, mediaType: true, adminName: true },
        },
      },
    });

    // Reverse to chronological order (oldest first)
    messages.reverse();

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
      quoteToken: m.quoteToken,
      replyToId: m.replyToId,
      replyTo: m.replyTo ? {
        id: m.replyTo.id,
        text: m.replyTo.text,
        type: m.replyTo.type === 'OUTGOING' ? 'outgoing' : 'incoming',
        sender: m.replyTo.sender === 'ADMIN' ? 'admin' : 'user',
        mediaType: m.replyTo.mediaType?.toLowerCase() || undefined,
        adminName: m.replyTo.adminName,
      } : undefined,
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
    replyToId?: string;
    clientTempId?: string;
  }) {
    const { oduserId, docId, text, mediaType, mediaUrl, previewUrl, stickerId, stickerPackageId, channel, adminId, adminName, replyToId, clientTempId } = data;

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

    const messageId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = Date.now();

    // Auto-detect file type if not set
    if (!mediaType && mediaUrl && text?.startsWith('[ไฟล์')) {
      (data as any).mediaType = 'file';
    }
    const effectiveMediaType = data.mediaType || (mediaUrl && text?.startsWith('[ไฟล์') ? 'file' : undefined);

    // Don't send [ไฟล์: xxx] text to platform — only send the file/link
    const platformText = (effectiveMediaType === 'file' || stickerId) ? undefined : text;
    this.logger.log(`sendMessage: channel=${channel}, mediaType=${effectiveMediaType}, mediaUrl=${mediaUrl ? 'YES' : 'NO'}, sticker=${stickerId || 'NO'}, text=${(text || '').substring(0, 30)}`);

    // Look up quoteToken / FB mid if replying to a message
    let quoteToken: string | null = null;
    let replyToMid: string | null = null;
    if (replyToId) {
      const replyMsg = await this.prisma.message.findUnique({
        where: { id: replyToId },
        select: { id: true, quoteToken: true },
      });
      if (replyMsg) {
        quoteToken = replyMsg.quoteToken || null;
        replyToMid = replyMsg.id; // For FB, the message ID is the mid
      }
    }

    const stickerUrl = stickerId ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png` : null;
    const preview = stickerId
      ? '[You] [สติกเกอร์]'
      : effectiveMediaType === 'file'
      ? `[You] [ไฟล์]`
      : effectiveMediaType
      ? `[You] [${effectiveMediaType === 'image' ? 'รูปภาพ' : 'วิดีโอ'}]`
      : `[You] ${(text || '').substring(0, 80)}`;

    // Persist first (status 'sending'), then respond + emit immediately —
    // the client never waits on the LINE/FB round-trip.
    const [, customer] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          id: messageId,
          customerId: docId,
          text: stickerId ? '[สติกเกอร์]' : (text || null),
          type: 'OUTGOING',
          sender: 'ADMIN',
          timestamp: BigInt(timestamp),
          status: 'sending',
          adminId: adminId || null,
          adminName: adminName || null,
          mediaType: stickerId ? 'IMAGE' : effectiveMediaType === 'image' ? 'IMAGE' : effectiveMediaType === 'video' ? 'VIDEO' : null,
          mediaUrl: stickerUrl || mediaUrl || null,
          previewUrl: previewUrl || null,
          replyToId: replyToId || null,
          quoteToken: null,
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

    // Broadcast via WebSocket
    this.inboxGateway.emitNewMessage(docId, {
      id: messageId,
      text: stickerId ? '[สติกเกอร์]' : (text || null),
      type: 'outgoing',
      sender: 'admin',
      timestamp,
      status: 'sending',
      adminId: adminId || null,
      adminName: adminName || null,
      mediaType: stickerId ? 'image' : (effectiveMediaType || undefined),
      mediaUrl: stickerUrl || mediaUrl || undefined,
      replyToId: replyToId || undefined,
      clientTempId: clientTempId || undefined,
    });
    this.inboxGateway.emitConversationUpdated({
      id: docId,
      oduserId: oduserId,
      channel,
      lastmessagetime: timestamp,
      lastMessagePreview: preview,
      unreadCount: customer.unreadCount,
    });

    // Deliver to LINE/FB asynchronously, serialized per customer so rapid
    // sends (e.g. text + images) arrive in order.
    this.queueDelivery(docId, () =>
      this.deliverToPlatform({
        isLine,
        oduserId,
        docId,
        channel,
        platformText,
        effectiveMediaType,
        mediaUrl,
        previewUrl,
        stickerId,
        stickerPackageId,
        quoteToken,
        replyToMid,
        messageId,
        preview,
        timestamp,
        text,
        adminId,
        adminName,
      }),
    );

    return {
      success: true,
      messageId,
      timestamp,
      status: 'sending',
      sendMethod: null,
      error: null,
      clientTempId: clientTempId || undefined,
    };
  }

  // Per-customer delivery chains keep platform message order for rapid sends
  private deliveryQueues = new Map<string, Promise<void>>();

  private queueDelivery(docId: string, task: () => Promise<void>) {
    const prev = this.deliveryQueues.get(docId) || Promise.resolve();
    const next = prev.then(task).catch((err: any) => {
      this.logger.error(`Delivery task failed: ${err?.message || err}`);
    });
    this.deliveryQueues.set(docId, next);
    next.finally(() => {
      if (this.deliveryQueues.get(docId) === next) {
        this.deliveryQueues.delete(docId);
      }
    });
  }

  private async deliverToPlatform(params: {
    isLine: boolean;
    oduserId: string;
    docId: string;
    channel: string;
    platformText?: string;
    effectiveMediaType?: string;
    mediaUrl?: string;
    previewUrl?: string;
    stickerId?: string;
    stickerPackageId?: string;
    quoteToken: string | null;
    replyToMid: string | null;
    messageId: string;
    preview: string;
    timestamp: number;
    text?: string;
    adminId?: string;
    adminName?: string;
  }) {
    const {
      isLine, oduserId, docId, channel, platformText,
      effectiveMediaType, mediaUrl, previewUrl, stickerId, stickerPackageId,
      quoteToken, replyToMid, messageId, preview, timestamp,
      text, adminId, adminName,
    } = params;

    let status = 'sent';
    let sendError: string | null = null;
    // LINE mid / FB message_id — stored in quoteToken so incoming quote
    // replies can reference this message
    let platformMid: string | null = null;

    try {
      if (isLine) {
        const lineMessages = this.buildLineMessages(platformText, effectiveMediaType, mediaUrl, previewUrl, stickerId, stickerPackageId, quoteToken);
        const lineResult = await this.sendLineMessage(oduserId, lineMessages, channel);
        platformMid = lineResult.lineMid;
      } else {
        // For Facebook: convert LINE sticker to image
        const fbMediaType = stickerId ? 'image' : effectiveMediaType;
        const fbMediaUrl = stickerId
          ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/iPhone/sticker@2x.png`
          : mediaUrl;
        platformMid = await this.sendFacebookMessage(oduserId, platformText, fbMediaType, fbMediaUrl, channel, replyToMid);
      }
    } catch (err: any) {
      status = 'failed';
      sendError = err.response?.data?.message || err.message || 'Unknown error';
      this.logger.error(`Failed to send message to ${channel}:${oduserId}: ${sendError}`);
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { status, quoteToken: platformMid || null },
    }).catch((err: any) => {
      this.logger.error(`Failed to update message ${messageId} status: ${err.message}`);
    });

    this.inboxGateway.emitMessageUpdate(docId, messageId, status, sendError);

    if (status === 'failed') {
      this.inboxGateway.emitConversationUpdated({
        id: docId,
        oduserId,
        channel,
        lastmessagetime: timestamp,
        lastMessagePreview: `[ส่งไม่สำเร็จ] ${preview}`,
      });
    }

    // Backup outgoing message to Firestore with the final status (fire-and-forget)
    const userRef = this.firebase.firestore.doc(`user/${oduserId}`);
    Promise.all([
      userRef.collection('messages').doc(messageId).set({
        id: messageId,
        text: text || '',
        type: 'outgoing',
        sender: 'admin',
        timestamp,
        status,
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
  }

  // ─── LINE ─────────────────────────────────────────────────────────

  private buildLineMessages(
    text?: string,
    mediaType?: string,
    mediaUrl?: string,
    previewUrl?: string,
    stickerId?: string,
    stickerPackageId?: string,
    quoteToken?: string | null,
  ): any[] {
    const messages: any[] = [];

    if (stickerId && stickerPackageId) {
      messages.push({
        type: 'sticker',
        packageId: stickerPackageId,
        stickerId: stickerId,
        ...(quoteToken && { quoteToken }),
      });
    }

    if (mediaType === 'image' && mediaUrl) {
      messages.push({
        type: 'image',
        originalContentUrl: mediaUrl,
        previewImageUrl: previewUrl || mediaUrl,
        ...(quoteToken && { quoteToken }),
      });
    } else if (mediaType === 'video' && mediaUrl) {
      messages.push({
        type: 'video',
        originalContentUrl: mediaUrl,
        previewImageUrl: previewUrl || mediaUrl,
        ...(quoteToken && { quoteToken }),
      });
    } else if (mediaType === 'file' && mediaUrl) {
      const fileName = decodeURIComponent(mediaUrl.split('/').pop() || 'file');
      messages.push({
        type: 'text',
        text: `📎 ไฟล์: ${fileName}\n${mediaUrl}`,
        ...(quoteToken && { quoteToken }),
      });
    }

    if (text && !(mediaType === 'file' && mediaUrl)) {
      messages.push({ type: 'text', text, ...(quoteToken && { quoteToken }) });
    }

    return messages;
  }

  private async sendLineMessage(userId: string, messages: any[], channel: string): Promise<{ method: string; lineMid: string | null }> {
    const accessToken = getLineAccessToken(channel);

    // Try Reply API first (free)
    const cached = this.replyTokenCache.consume(userId);
    if (cached) {
      try {
        const res = await axios({
          url: 'https://api.line.me/v2/bot/message/reply',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          data: { replyToken: cached.replyToken, messages },
        });
        const lineMid = res.data?.sentMessages?.[0]?.id || null;
        this.logger.log(`Reply API used for ${userId} — FREE (mid: ${lineMid})`);
        return { method: 'line_reply', lineMid };
      } catch (err: any) {
        this.logger.warn(
          `Reply API failed, falling back to Push: ${err.response?.data?.message || err.message}`,
        );
      }
    }

    // Fallback: Push API
    const res = await axios({
      url: 'https://api.line.me/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: { to: userId, messages },
    });
    const lineMid = res.data?.sentMessages?.[0]?.id || null;
    this.logger.log(`Push API used for ${userId} — QUOTA (mid: ${lineMid})`);
    return { method: 'line_push', lineMid };
  }

  // ─── Facebook ─────────────────────────────────────────────────────

  private async sendFacebookMessage(
    userId: string,
    text?: string,
    mediaType?: string,
    mediaUrl?: string,
    channel?: string,
    replyToMid?: string | null,
  ): Promise<string | null> {
    const pageToken = getFacebookPageToken(channel!);
    let fbMessageId: string | null = null;

    // Send media/file first if present
    if (mediaType && mediaUrl) {
      const fbType = mediaType === 'file' ? 'file' : mediaType;
      const res = await axios({
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
          ...(replyToMid && { reply_to: { mid: replyToMid } }),
        },
      });
      fbMessageId = res.data?.message_id || null;
    }

    // Send text if present (skip if file was sent with text like [ไฟล์: xxx])
    if (text && !(mediaType === 'file' && text.startsWith('[ไฟล์'))) {
      const res = await axios({
        url: 'https://graph.facebook.com/v18.0/me/messages',
        method: 'POST',
        params: { access_token: pageToken },
        data: {
          recipient: { id: userId },
          message: { text },
          ...(replyToMid && { reply_to: { mid: replyToMid } }),
        },
      });
      fbMessageId = res.data?.message_id || fbMessageId || null;
    }

    return fbMessageId;
  }
}
