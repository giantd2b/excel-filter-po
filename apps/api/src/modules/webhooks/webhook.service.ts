import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { FirebaseService } from '../../common/providers/firebase.service';
import { PrismaService } from '../../common/providers/prisma.service';
import { ReplyTokenCacheService } from '../../common/providers/reply-token-cache.service';
import { InboxGateway } from '../inbox-gateway/inbox-gateway.gateway';
import { InboxStatsService } from '../inbox-gateway/inbox-stats.service';
import { findThaiPhones, formatThaiPhone } from '../../common/utils/phone.utils';
import { pushGroupMessage } from '../../common/utils/line-notify.utils';
import { SlipDetectionService } from '../slips/slip-detection.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly replyTokenCache: ReplyTokenCacheService,
    private readonly inboxGateway: InboxGateway,
    private readonly inboxStats: InboxStatsService,
  ) {}

  // ─── LINE Text Message ────────────────────────────────────────

  async processLineTextMessage(event: any, accessToken: string, lineBot: string) {
    const { message, source } = event;
    const messageID = message.id;
    const messageTime = event.timestamp;
    const userId = source.userId;

    if (event.replyToken) {
      this.replyTokenCache.set(userId, event.replyToken, lineBot);
    }

    try {
      const proFile = await this.getLineProfile(userId, accessToken);
      if (!proFile?.userId) {
        this.logger.error(`Failed to get LINE profile for userId: ${userId}`);
        return;
      }

      let profileImg: string | null = null;
      try {
        if (proFile.pictureUrl) {
          profileImg = await this.uploadProfileImage(proFile.pictureUrl, userId);
        }
      } catch (imgError: any) {
        this.logger.error(`Failed to download profile picture: ${imgError.message}`);
      }

      const messageText = message.text || '';
      const messagePreview = messageText.substring(0, 100);
      const phoneNumber = findThaiPhones(messageText).length > 0
        ? formatThaiPhone(findThaiPhones(messageText)[0])
        : undefined;

      // Composite ID: userId__channel (separate chat per channel)
      const customerId = `${proFile.userId}__${lineBot}`;

      // Save markAsReadToken from webhook event (LINE only, never expires)
      const markAsReadToken = event.markAsReadToken || null;

      // Upsert customer in PostgreSQL
      await this.prisma.customer.upsert({
        where: { id: customerId },
        create: {
          id: customerId,
          platformUserId: proFile.userId,
          displayName: proFile.displayName || 'ไม่ระบุชื่อ',
          pictureUrl: profileImg || proFile.pictureUrl || null,
          profilePic: proFile.pictureUrl || null,
          channel: lineBot,
          channelType: 'LINE',
          statusMessage: proFile.statusMessage || null,
          phoneNumber: phoneNumber || null,
          markAsReadToken,
          unreadCount: 1,
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: messagePreview,
          firstContactAt: new Date(messageTime),
        },
        update: {
          displayName: proFile.displayName,
          ...(markAsReadToken && { markAsReadToken }),
          ...(profileImg && { pictureUrl: profileImg, profilePic: proFile.pictureUrl }),
          ...(phoneNumber && { phoneNumber }),
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: messagePreview,
        },
      });

      // Save message to PostgreSQL (primary)
      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId: customerId,
          text: messageText,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
        },
      });

      // Backup write to Firestore (fire-and-forget, non-blocking)
      this.backupToFirestore(proFile.userId, messageID, {
        text: messageText,
        type: 'incoming',
        sender: 'user',
        timestamp: messageTime,
        channel: lineBot,
      }, {
        displayName: proFile.displayName,
        pictureUrl: profileImg || proFile.pictureUrl,
        channel: lineBot,
        lastmessagetime: messageTime,
        lastMessagePreview: messagePreview,
        unreadCount: 1,
      });

      // Broadcast via WebSocket
      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID,
        text: messageText,
        type: 'incoming',
        sender: 'user',
        timestamp: messageTime,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId,
        oduserId: proFile.userId,
        displayName: proFile.displayName,
        pictureUrl: profileImg || proFile.pictureUrl || '',
        channel: lineBot,
        lastmessagetime: messageTime,
        lastMessagePreview: messagePreview,
      });
      this.inboxStats.refreshAndBroadcast();

      this.logger.log(`Saved message for LINE user ${userId} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process LINE text: ${error.message}`);
    }
  }

  // ─── LINE Image Message (slip detection) ──────────────────────

  async processLineImageMessage(event: any, accessToken: string, lineBot: string) {
    const { message, source } = event;
    const messageID = message.id;
    const userId = source.userId;
    const customerId = `${userId}__${lineBot}`;
    const messageTime = event.timestamp;

    if (event.replyToken) {
      this.replyTokenCache.set(userId, event.replyToken, lineBot);
    }

    try {
      // Download image
      const response = await axios({
        url: `https://api-data.line.me/v2/bot/message/${messageID}/content`,
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);

      // Upload to Firebase Storage
      const bucket = this.firebase.storage.bucket();
      const file = bucket.file(`chat-media/${customerId}/${messageID}.jpg`);
      await file.save(buffer);
      await file.makePublic();
      const imageUrl = file.publicUrl();

      // Ensure customer exists
      await this.ensureCustomerExists(userId, customerId, lineBot, 'LINE', accessToken);

      // Always save image as message
      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId,
          text: '[รูปภาพ]',
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
          mediaType: 'IMAGE',
          mediaUrl: imageUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: '[รูปภาพ]',
        },
      });

      // Broadcast via WebSocket
      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID, text: '[รูปภาพ]', type: 'incoming', sender: 'user',
        timestamp: messageTime, mediaType: 'image', mediaUrl: imageUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '[รูปภาพ]',
      });
      this.inboxStats.refreshAndBroadcast();

      // Backup to Firestore
      this.backupToFirestore(userId, messageID, {
        text: '[รูปภาพ]', type: 'incoming', sender: 'user',
        timestamp: messageTime, channel: lineBot,
      }, {
        channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '[รูปภาพ]', unreadCount: 1,
      });

      // Run slip detection (async, non-blocking)
      const slipDetection = new SlipDetectionService();
      slipDetection.analyzeSlip(buffer).then(async (slipData) => {
        if (slipData) {
          await this.prisma.slip.create({
            data: {
              id: messageID,
              imageUrl,
              customerId,
              channel: lineBot,
              bankName: slipData.bank_name || null,
              amount: slipData.amount ? parseFloat(String(slipData.amount)) : null,
              dateTime: slipData.date_time || null,
              senderName: slipData.sender_name || null,
              receiverName: slipData.receiver_name || null,
              referenceNumber: slipData.reference_number || null,
            },
          });

          const lines = [`มีสลิปส่งมา ${imageUrl}`];
          if (slipData.bank_name) lines.push(`ธนาคาร: ${slipData.bank_name}`);
          if (slipData.amount) lines.push(`จำนวน: ${slipData.amount}`);
          if (slipData.sender_name) lines.push(`ผู้โอน: ${slipData.sender_name}`);
          lines.push(`ช่องทาง: ${lineBot}`);
          await pushGroupMessage(lines.join('\n'));
          this.logger.log('Slip detected and notified');
        }
      }).catch(() => {});

      this.logger.log(`Saved LINE image for ${userId} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process LINE image: ${error.message}`);
    }
  }

  // ─── Facebook Text Message ────────────────────────────────────

  async processFacebookTextMessage(
    senderID: string,
    message: any,
    timeOfMessage: number,
    fbToken: string,
    fbbot: string,
  ) {
    const messageId = message.mid;
    const messageText = message.text;
    const messagePreview = messageText.substring(0, 100);

    try {
      const proFile = await this.getFacebookProfile(senderID, fbToken);
      if (!proFile?.id) {
        this.logger.error(`Failed to get Facebook profile for ${senderID}`);
        return;
      }

      let profileImg: string | null = null;
      try {
        if (proFile.profile_pic) {
          profileImg = await this.uploadProfileImage(proFile.profile_pic, messageId);
        }
      } catch (imgError: any) {
        this.logger.error(`Failed to download profile picture: ${imgError.message}`);
      }

      const displayName = `${proFile.first_name} ${proFile.last_name}`;
      const phoneNumber = findThaiPhones(messageText).length > 0
        ? formatThaiPhone(findThaiPhones(messageText)[0])
        : undefined;

      // Composite ID: userId__channel (separate chat per channel)
      const customerId = `${proFile.id}__${fbbot}`;

      // Upsert customer in PostgreSQL
      await this.prisma.customer.upsert({
        where: { id: customerId },
        create: {
          id: customerId,
          platformUserId: proFile.id,
          displayName,
          firstName: proFile.first_name || null,
          lastName: proFile.last_name || null,
          pictureUrl: profileImg || proFile.profile_pic || null,
          profilePic: proFile.profile_pic || null,
          channel: fbbot,
          channelType: 'FACEBOOK',
          phoneNumber: phoneNumber || null,
          unreadCount: 1,
          lastMessageAt: new Date(timeOfMessage),
          lastMessagePreview: messagePreview,
          firstContactAt: new Date(),
        },
        update: {
          ...(profileImg && { pictureUrl: profileImg, profilePic: proFile.profile_pic }),
          ...(phoneNumber && { phoneNumber }),
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(timeOfMessage),
          lastMessagePreview: messagePreview,
        },
      });

      // Save message to PostgreSQL (primary)
      await this.prisma.message.create({
        data: {
          id: messageId,
          customerId: customerId,
          text: messageText,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(timeOfMessage),
        },
      });

      // Backup write to Firestore (fire-and-forget)
      this.backupToFirestore(proFile.id, messageId, {
        text: messageText,
        type: 'incoming',
        sender: 'user',
        timestamp: timeOfMessage,
        channel: fbbot,
      }, {
        displayName,
        pictureUrl: profileImg || proFile.profile_pic,
        channel: fbbot,
        lastmessagetime: timeOfMessage,
        lastMessagePreview: messagePreview,
        unreadCount: 1,
      });

      // Broadcast via WebSocket
      this.inboxGateway.emitNewMessage(customerId, {
        id: messageId,
        text: messageText,
        type: 'incoming',
        sender: 'user',
        timestamp: timeOfMessage,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId,
        oduserId: proFile.id,
        displayName,
        pictureUrl: profileImg || proFile.profile_pic || '',
        channel: fbbot,
        lastmessagetime: timeOfMessage,
        lastMessagePreview: messagePreview,
      });
      this.inboxStats.refreshAndBroadcast();

      this.logger.log(`Saved message for Facebook user ${senderID} on ${fbbot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process Facebook text: ${error.message}`);
    }
  }

  // ─── Facebook Image Message (slip detection) ──────────────────

  async processFacebookImageMessage(
    attachmentUrl: string,
    senderID: string,
    messageId: string,
    fbToken: string,
    fbbot: string,
  ) {
    const customerId = `${senderID}__${fbbot}`;

    try {
      // Download image
      const response = await axios({
        url: attachmentUrl,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);

      // Upload to Firebase Storage
      const bucket = this.firebase.storage.bucket();
      const file = bucket.file(`chat-media/${customerId}/${messageId}.jpg`);
      await file.save(buffer);
      await file.makePublic();
      const imageUrl = file.publicUrl();

      // Ensure customer exists
      await this.ensureCustomerExists(senderID, customerId, fbbot, 'FACEBOOK', undefined, fbToken);

      // Save image as message (always)
      await this.prisma.message.create({
        data: {
          id: messageId,
          customerId,
          text: '[รูปภาพ]',
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(Date.now()),
          mediaType: 'IMAGE',
          mediaUrl: imageUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(),
          lastMessagePreview: '[รูปภาพ]',
        },
      });

      // Broadcast via WebSocket
      this.inboxGateway.emitNewMessage(customerId, {
        id: messageId, text: '[รูปภาพ]', type: 'incoming', sender: 'user',
        timestamp: Date.now(), mediaType: 'image', mediaUrl: imageUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: fbbot, lastmessagetime: Date.now(),
        lastMessagePreview: '[รูปภาพ]',
      });
      this.inboxStats.refreshAndBroadcast();

      // Backup to Firestore
      this.backupToFirestore(senderID, messageId, {
        text: '[รูปภาพ]', type: 'incoming', sender: 'user',
        timestamp: Date.now(), channel: fbbot,
      }, {
        channel: fbbot, lastmessagetime: Date.now(),
        lastMessagePreview: '[รูปภาพ]', unreadCount: 1,
      });

      // Run slip detection (async, non-blocking)
      const slipDetection = new SlipDetectionService();
      slipDetection.analyzeSlip(buffer).then(async (slipData) => {
        if (slipData) {
          await this.prisma.slip.create({
            data: {
              id: messageId,
              imageUrl,
              customerId,
              channel: fbbot,
              bankName: slipData.bank_name || null,
              amount: slipData.amount ? parseFloat(String(slipData.amount)) : null,
              dateTime: slipData.date_time || null,
              senderName: slipData.sender_name || null,
              receiverName: slipData.receiver_name || null,
              referenceNumber: slipData.reference_number || null,
            },
          });

          const lines = [`มีสลิปส่งมา ${imageUrl}`];
          if (slipData.bank_name) lines.push(`ธนาคาร: ${slipData.bank_name}`);
          if (slipData.amount) lines.push(`จำนวน: ${slipData.amount}`);
          if (slipData.sender_name) lines.push(`ผู้โอน: ${slipData.sender_name}`);
          lines.push(`ช่องทาง: ${fbbot}`);
          await pushGroupMessage(lines.join('\n'));
          this.logger.log('Slip detected and notified');
        }
      }).catch(() => {});

      this.logger.log(`Saved FB image for ${senderID} on ${fbbot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process Facebook image: ${error.message}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  // ─── LINE: Group/Room Messages ──────────────────────────────

  async processLineGroupMessage(
    event: any,
    accessToken: string,
    lineBot: string,
    sourceType: 'group' | 'room',
  ) {
    const { message, source } = event;
    const messageID = message.id;
    const messageTime = event.timestamp;
    const groupId = sourceType === 'group' ? source.groupId : source.roomId;
    const senderId = source.userId || null; // May not be available
    const customerId = `${groupId}__${lineBot}`;

    if (event.replyToken) {
      this.replyTokenCache.set(groupId, event.replyToken, lineBot);
    }

    try {
      // Get group name
      let groupName = `Group ${groupId.substring(0, 8)}`;
      let groupPicture: string | null = null;
      try {
        const groupProfile = await axios({
          url: `https://api.line.me/v2/bot/${sourceType}/${groupId}/summary`,
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        groupName = groupProfile.data.groupName || groupProfile.data.roomName || groupName;
        groupPicture = groupProfile.data.pictureUrl || null;
      } catch {
        // Group summary API may not be available
      }

      // Get sender name if userId is available
      let senderName = 'Unknown';
      if (senderId) {
        try {
          const memberProfile = await axios({
            url: `https://api.line.me/v2/bot/${sourceType}/${groupId}/member/${senderId}`,
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          senderName = memberProfile.data.displayName || senderName;
        } catch {
          // Fall back to regular profile
          const profile = await this.getLineProfile(senderId, accessToken);
          if (profile) senderName = profile.displayName || senderName;
        }
      }

      // Build message text
      let messageText: string;
      let mediaUrl: string | null = null;
      let mediaType: 'IMAGE' | 'VIDEO' | null = null;

      if (message.type === 'text') {
        messageText = message.text || '';
      } else if (message.type === 'image') {
        messageText = '[รูปภาพ]';
        mediaType = 'IMAGE';
        // Download image
        try {
          const response = await axios({
            url: `https://api-data.line.me/v2/bot/message/${messageID}/content`,
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(response.data);
          const bucket = this.firebase.storage.bucket();
          const file = bucket.file(`chat-media/${customerId}/${messageID}.jpg`);
          await file.save(buffer);
          await file.makePublic();
          mediaUrl = file.publicUrl();
        } catch {}
      } else if (message.type === 'video' || message.type === 'audio') {
        messageText = message.type === 'video' ? '[วิดีโอ]' : '[เสียง]';
        mediaType = message.type === 'video' ? 'VIDEO' : null;
        // Download video/audio content
        try {
          const response = await axios({
            url: `https://api-data.line.me/v2/bot/message/${messageID}/content`,
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(response.data);
          const ext = message.type === 'video' ? 'mp4' : 'm4a';
          const bucket = this.firebase.storage.bucket();
          const file = bucket.file(`chat-media/${customerId}/${messageID}.${ext}`);
          await file.save(buffer);
          await file.makePublic();
          mediaUrl = file.publicUrl();
        } catch (err: any) {
          this.logger.warn(`Failed to download ${message.type}: ${err.message}`);
        }
      } else if (message.type === 'sticker') {
        messageText = '[สติกเกอร์]';
        mediaType = 'IMAGE';
        mediaUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/iPhone/sticker@2x.png`;
      } else if (message.type === 'file') {
        messageText = `[ไฟล์: ${message.fileName || 'file'}]`;
        // Download file content
        try {
          const response = await axios({
            url: `https://api-data.line.me/v2/bot/message/${messageID}/content`,
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(response.data);
          const ext = message.fileName?.split('.').pop() || 'bin';
          const bucket = this.firebase.storage.bucket();
          const file = bucket.file(`chat-media/${customerId}/${messageID}.${ext}`);
          await file.save(buffer);
          await file.makePublic();
          mediaUrl = file.publicUrl();
        } catch (err: any) {
          this.logger.warn(`Failed to download file: ${err.message}`);
        }
      } else if (message.type === 'location') {
        messageText = `📍 ${message.title || 'Location'}\nhttps://maps.google.com/?q=${message.latitude},${message.longitude}`;
      } else {
        messageText = `[${message.type}]`;
      }

      // Prefix with sender name for group context
      const displayText = senderId ? `${senderName}: ${messageText}` : messageText;
      const messagePreview = displayText.substring(0, 100);

      // Upsert group as a customer (type group)
      await this.prisma.customer.upsert({
        where: { id: customerId },
        create: {
          id: customerId,
          platformUserId: groupId,
          displayName: `👥 ${groupName}`,
          pictureUrl: groupPicture,
          channel: lineBot,
          channelType: 'LINE',
          unreadCount: 1,
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: messagePreview,
          firstContactAt: new Date(messageTime),
        },
        update: {
          ...(groupPicture && { pictureUrl: groupPicture }),
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: messagePreview,
        },
      });

      // Save message with sender info
      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId,
          text: displayText,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
          adminName: senderName, // Reuse adminName field for sender display
          mediaType,
          mediaUrl,
        },
      });

      // Backup to Firestore
      this.backupToFirestore(groupId, messageID, {
        text: displayText,
        type: 'incoming',
        sender: 'user',
        timestamp: messageTime,
        channel: lineBot,
        senderName,
      }, {
        displayName: `👥 ${groupName}`,
        pictureUrl: groupPicture,
        channel: lineBot,
        lastmessagetime: messageTime,
        lastMessagePreview: messagePreview,
        unreadCount: 1,
      });

      // Broadcast via WebSocket
      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID,
        text: displayText,
        type: 'incoming',
        sender: 'user',
        timestamp: messageTime,
        mediaType: mediaType?.toLowerCase(),
        mediaUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId,
        oduserId: groupId,
        displayName: `👥 ${groupName}`,
        pictureUrl: groupPicture || '',
        channel: lineBot,
        lastmessagetime: messageTime,
        lastMessagePreview: messagePreview,
      });
      this.inboxStats.refreshAndBroadcast();

      this.logger.log(`Saved group message from ${senderName} in ${groupName} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process group message: ${error.message}`);
    }
  }

  // ─── LINE: Video, Audio, File ───────────────────────────────

  async processLineMediaMessage(
    event: any,
    accessToken: string,
    lineBot: string,
    mediaType: string,
  ) {
    const { message, source } = event;
    const messageID = message.id;
    const messageTime = event.timestamp;
    const userId = source.userId;
    const customerId = `${userId}__${lineBot}`;

    if (event.replyToken) {
      this.replyTokenCache.set(userId, event.replyToken, lineBot);
    }

    try {
      // Download media content from LINE
      let mediaUrl: string | null = null;
      try {
        const response = await axios({
          url: `https://api-data.line.me/v2/bot/message/${messageID}/content`,
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        });

        const buffer = Buffer.from(response.data);
        const ext = mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'm4a' : 'bin';
        const bucket = this.firebase.storage.bucket();
        const file = bucket.file(`chat-media/${customerId}/${messageID}.${ext}`);
        await file.save(buffer);
        await file.makePublic();
        mediaUrl = file.publicUrl();
      } catch (err: any) {
        this.logger.warn(`Failed to download LINE ${mediaType}: ${err.message}`);
      }

      const dbMediaType = mediaType === 'video' ? 'VIDEO' : 'IMAGE'; // Store all as IMAGE for mediaUrl rendering
      const preview = mediaType === 'video' ? '[วิดีโอ]' : mediaType === 'audio' ? '[เสียง]' : `[ไฟล์: ${message.fileName || 'file'}]`;

      await this.ensureCustomerExists(userId, customerId, lineBot, 'LINE', accessToken);

      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId,
          text: preview,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
          mediaType: dbMediaType,
          mediaUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: preview,
        },
      });

      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID, text: preview, type: 'incoming', sender: 'user',
        timestamp: messageTime, mediaType, mediaUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: preview,
      });
      this.inboxStats.refreshAndBroadcast();

      this.backupToFirestore(userId, messageID, {
        text: preview, type: 'incoming', sender: 'user',
        timestamp: messageTime, channel: lineBot,
      }, {
        channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: preview, unreadCount: 1,
      });

      this.logger.log(`Saved LINE ${mediaType} for ${userId} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process LINE ${mediaType}: ${error.message}`);
    }
  }

  // ─── LINE: Sticker ────────────────────────────────────────────

  async processLineStickerMessage(event: any, accessToken: string, lineBot: string) {
    const { message, source } = event;
    const messageID = message.id;
    const messageTime = event.timestamp;
    const userId = source.userId;
    const customerId = `${userId}__${lineBot}`;

    if (event.replyToken) {
      this.replyTokenCache.set(userId, event.replyToken, lineBot);
    }

    try {
      const stickerUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/iPhone/sticker@2x.png`;

      await this.ensureCustomerExists(userId, customerId, lineBot, 'LINE', accessToken);

      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId,
          text: '[สติกเกอร์]',
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
          mediaType: 'IMAGE',
          mediaUrl: stickerUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: '[สติกเกอร์]',
        },
      });

      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID, text: '[สติกเกอร์]', type: 'incoming', sender: 'user',
        timestamp: messageTime, mediaType: 'image', mediaUrl: stickerUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '[สติกเกอร์]',
      });
      this.inboxStats.refreshAndBroadcast();

      this.backupToFirestore(userId, messageID, {
        text: '[สติกเกอร์]', type: 'incoming', sender: 'user',
        timestamp: messageTime, channel: lineBot,
      }, {
        channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '[สติกเกอร์]', unreadCount: 1,
      });

      this.logger.log(`Saved LINE sticker for ${userId} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process LINE sticker: ${error.message}`);
    }
  }

  // ─── LINE: Location ───────────────────────────────────────────

  async processLineLocationMessage(event: any, accessToken: string, lineBot: string) {
    const { message, source } = event;
    const messageID = message.id;
    const messageTime = event.timestamp;
    const userId = source.userId;
    const customerId = `${userId}__${lineBot}`;

    if (event.replyToken) {
      this.replyTokenCache.set(userId, event.replyToken, lineBot);
    }

    try {
      const locationText = `📍 ${message.title || 'Location'}\n${message.address || ''}\nhttps://maps.google.com/?q=${message.latitude},${message.longitude}`;

      await this.ensureCustomerExists(userId, customerId, lineBot, 'LINE', accessToken);

      await this.prisma.message.create({
        data: {
          id: messageID,
          customerId,
          text: locationText,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(messageTime),
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(messageTime),
          lastMessagePreview: '📍 แชร์ตำแหน่ง',
        },
      });

      this.inboxGateway.emitNewMessage(customerId, {
        id: messageID, text: locationText, type: 'incoming', sender: 'user',
        timestamp: messageTime,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '📍 แชร์ตำแหน่ง',
      });
      this.inboxStats.refreshAndBroadcast();

      this.backupToFirestore(userId, messageID, {
        text: locationText, type: 'incoming', sender: 'user',
        timestamp: messageTime, channel: lineBot,
      }, {
        channel: lineBot, lastmessagetime: messageTime,
        lastMessagePreview: '📍 แชร์ตำแหน่ง', unreadCount: 1,
      });

      this.logger.log(`Saved LINE location for ${userId} on ${lineBot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process LINE location: ${error.message}`);
    }
  }

  // ─── Facebook: Video, Audio, File ─────────────────────────────

  async processFacebookMediaMessage(
    senderID: string,
    messageId: string,
    timeOfMessage: number,
    mediaUrl: string,
    mediaType: string,
    fbToken: string,
    fbbot: string,
  ) {
    const customerId = `${senderID}__${fbbot}`;
    const preview = mediaType === 'video' ? '[วิดีโอ]' : mediaType === 'audio' ? '[เสียง]' : '[ไฟล์]';
    const dbMediaType = mediaType === 'video' ? 'VIDEO' : null;

    try {
      await this.ensureCustomerExists(senderID, customerId, fbbot, 'FACEBOOK', undefined, fbToken);

      await this.prisma.message.create({
        data: {
          id: messageId,
          customerId,
          text: preview,
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(timeOfMessage),
          mediaType: dbMediaType,
          mediaUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(timeOfMessage),
          lastMessagePreview: preview,
        },
      });

      this.inboxGateway.emitNewMessage(customerId, {
        id: messageId, text: preview, type: 'incoming', sender: 'user',
        timestamp: timeOfMessage, mediaType, mediaUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: fbbot, lastmessagetime: timeOfMessage,
        lastMessagePreview: preview,
      });
      this.inboxStats.refreshAndBroadcast();

      this.backupToFirestore(senderID, messageId, {
        text: preview, type: 'incoming', sender: 'user',
        timestamp: timeOfMessage, channel: fbbot,
      }, {
        channel: fbbot, lastmessagetime: timeOfMessage,
        lastMessagePreview: preview, unreadCount: 1,
      });

      this.logger.log(`Saved FB ${mediaType} for ${senderID} on ${fbbot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process FB ${mediaType}: ${error.message}`);
    }
  }

  // ─── Facebook: Sticker ────────────────────────────────────────

  async processFacebookStickerMessage(
    senderID: string,
    message: any,
    timeOfMessage: number,
    fbToken: string,
    fbbot: string,
  ) {
    const customerId = `${senderID}__${fbbot}`;
    const stickerUrl = message.attachments?.[0]?.payload?.url || null;

    try {
      await this.ensureCustomerExists(senderID, customerId, fbbot, 'FACEBOOK', undefined, fbToken);

      await this.prisma.message.create({
        data: {
          id: message.mid,
          customerId,
          text: '[สติกเกอร์]',
          type: 'INCOMING',
          sender: 'USER',
          timestamp: BigInt(timeOfMessage),
          mediaType: stickerUrl ? 'IMAGE' : null,
          mediaUrl: stickerUrl,
        },
      });

      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(timeOfMessage),
          lastMessagePreview: '[สติกเกอร์]',
        },
      });

      this.inboxGateway.emitNewMessage(customerId, {
        id: message.mid, text: '[สติกเกอร์]', type: 'incoming', sender: 'user',
        timestamp: timeOfMessage, mediaType: 'image', mediaUrl: stickerUrl,
      });
      this.inboxGateway.emitConversationUpdated({
        id: customerId, channel: fbbot, lastmessagetime: timeOfMessage,
        lastMessagePreview: '[สติกเกอร์]',
      });
      this.inboxStats.refreshAndBroadcast();

      this.backupToFirestore(senderID, message.mid, {
        text: '[สติกเกอร์]', type: 'incoming', sender: 'user',
        timestamp: timeOfMessage, channel: fbbot,
      }, {
        channel: fbbot, lastmessagetime: timeOfMessage,
        lastMessagePreview: '[สติกเกอร์]', unreadCount: 1,
      });

      this.logger.log(`Saved FB sticker for ${senderID} on ${fbbot}`);
    } catch (error: any) {
      this.logger.error(`Failed to process FB sticker: ${error.message}`);
    }
  }

  // ─── Helper: Ensure customer exists ───────────────────────────

  private async ensureCustomerExists(
    platformUserId: string,
    customerId: string,
    channel: string,
    channelType: 'LINE' | 'FACEBOOK',
    lineAccessToken?: string,
    fbToken?: string,
  ) {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (existing) return;

    let displayName = 'ไม่ระบุชื่อ';
    let pictureUrl: string | null = null;

    if (channelType === 'LINE' && lineAccessToken) {
      const profile = await this.getLineProfile(platformUserId, lineAccessToken);
      if (profile) {
        displayName = profile.displayName || displayName;
        pictureUrl = profile.pictureUrl || null;
      }
    } else if (channelType === 'FACEBOOK' && fbToken) {
      const profile = await this.getFacebookProfile(platformUserId, fbToken);
      if (profile) {
        displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || displayName;
        pictureUrl = profile.profile_pic || null;
      }
    }

    await this.prisma.customer.create({
      data: {
        id: customerId,
        platformUserId,
        displayName,
        pictureUrl,
        channel,
        channelType,
        unreadCount: 0,
        firstContactAt: new Date(),
      },
    });
  }

  /**
   * Backup write to Firestore (fire-and-forget, non-blocking).
   * Ensures no message is lost even if PostgreSQL has issues.
   */
  private backupToFirestore(
    firestoreUserId: string,
    messageId: string,
    messageData: any,
    userData: any,
  ) {
    const userRef = this.firebase.firestore.doc(`user/${firestoreUserId}`);

    // Fire-and-forget — don't await, don't block the main flow
    Promise.all([
      // Save message to subcollection
      userRef.collection('messages').doc(messageId).set({
        id: messageId,
        ...messageData,
      }),
      // Update user doc
      userRef.set(
        {
          ...userData,
          userId: firestoreUserId,
          lastmessage: this.firebase.fieldValue.arrayUnion({
            id: messageId,
            text: messageData.text || '',
            timesent: messageData.timestamp,
          }),
          unreadCount: this.firebase.fieldValue.increment(1),
        },
        { merge: true },
      ),
    ]).catch((err) => {
      this.logger.warn(`Firestore backup failed for ${firestoreUserId}: ${err.message}`);
    });
  }

  private async getLineProfile(userId: string, accessToken: string) {
    try {
      const response = await axios({
        url: `https://api.line.me/v2/bot/profile/${userId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`getLineProfile error: ${error.message}`);
      return null;
    }
  }

  private async getFacebookProfile(pid: string, token: string) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${pid}?fields=first_name,last_name,profile_pic&access_token=${token}`,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`getFacebookProfile error: ${error.message}`);
      return null;
    }
  }

  private async uploadProfileImage(imageUrl: string, id: string): Promise<string> {
    const uuid = uuidv4();
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    const filename = `${id}.jpg`;
    const tempLocalFile = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tempLocalFile, response.data);

    const bucket = this.firebase.storage.bucket();
    const file = await bucket.upload(tempLocalFile, {
      destination: `photos/${id}/${filename}`,
      metadata: {
        cacheControl: 'no-cache',
        metadata: { firebaseStorageDownloadTokens: uuid },
      },
    });

    fs.unlinkSync(tempLocalFile);

    const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o`;
    const suffix = `alt=media&token=${uuid}`;
    return `${prefix}/${encodeURIComponent(file[0].name)}?${suffix}`;
  }
}
