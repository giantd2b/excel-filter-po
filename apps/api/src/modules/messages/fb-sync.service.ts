import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * Syncs Facebook admin replies from Conversations API into PostgreSQL.
 * This captures messages sent by admins via Meta Business Suite / Messenger.
 */

interface FBPage {
  pageId: string;
  channel: string;
  tokenEnvKey: string;
}

const FB_PAGES: FBPage[] = [
  { pageId: '342502096352138', channel: 'FB_IRIS', tokenEnvKey: 'FB_IRIS_TOKEN' },
  { pageId: '100433364819860', channel: 'FB_IRIS_RAYONG', tokenEnvKey: 'FB_IRIS_RAYONG_TOKEN' },
  { pageId: '2323861754514969', channel: 'FB_เติมบุญ', tokenEnvKey: 'FB_TERMBOON_TOKEN' },
  { pageId: '1179375335569460', channel: 'FB_ชล', tokenEnvKey: 'FB_CHON_TOKEN' },
  { pageId: '100315376073691', channel: 'FB_โต๊ะจีน', tokenEnvKey: 'FB_TOHJEEN_TOKEN' },
  { pageId: '111545563829281', channel: 'FB_ทดสอบระบบ', tokenEnvKey: 'FB_TEST_TOKEN' },
  { pageId: '2205446836437741', channel: 'FB_ทดสอบระบบ2', tokenEnvKey: 'FB_TEST2_TOKEN' },
];

@Injectable()
export class FbSyncService {
  private readonly logger = new Logger(FbSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every 5 minutes — sync admin replies from Facebook Conversations API.
   */
  @Cron('*/5 * * * *')
  async syncAdminReplies() {
    this.logger.log('Starting Facebook admin replies sync...');

    let totalSynced = 0;

    for (const page of FB_PAGES) {
      const token = process.env[page.tokenEnvKey];
      if (!token) continue;

      try {
        const synced = await this.syncPage(page.pageId, page.channel, token);
        totalSynced += synced;
      } catch (err: any) {
        this.logger.error(`Failed to sync ${page.channel}: ${err.message}`);
      }
    }

    if (totalSynced > 0) {
      this.logger.log(`Synced ${totalSynced} admin replies from Facebook`);
    }
  }

  /**
   * Sync a single Facebook page — get recent conversations and find admin messages.
   */
  private async syncPage(pageId: string, channel: string, token: string): Promise<number> {
    let synced = 0;

    // Get recent conversations (last 25)
    const convResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/conversations`,
      {
        params: {
          access_token: token,
          fields: 'participants,updated_time',
          limit: 25,
        },
      },
    );

    const conversations = convResponse.data?.data || [];

    for (const conv of conversations) {
      try {
        // Get messages in this conversation
        const msgResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${conv.id}/messages`,
          {
            params: {
              access_token: token,
              fields: 'message,from,to,created_time,attachments',
              limit: 20,
            },
          },
        );

        const messages = msgResponse.data?.data || [];

        // Find the customer (non-page participant)
        const participants = conv.participants?.data || [];
        const customer = participants.find((p: any) => p.id !== pageId);
        if (!customer) continue;

        const customerId = `${customer.id}__${channel}`;

        // Check if customer exists in our DB
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { id: customerId },
        });
        if (!existingCustomer) continue;

        // Process each message — find admin (page) replies
        for (const msg of messages) {
          const isFromPage = msg.from?.id === pageId;
          if (!isFromPage) continue; // Skip customer messages (already captured by webhook)

          const messageId = `fb_sync_${msg.id}`;
          const timestamp = new Date(msg.created_time).getTime();

          // Check if already exists
          const existing = await this.prisma.message.findUnique({
            where: { id: messageId },
          });
          if (existing) continue;

          // Also check by original FB message ID
          const existingOriginal = await this.prisma.message.findUnique({
            where: { id: msg.id },
          });
          if (existingOriginal) continue;

          // Check by same text + same timestamp (within 5 seconds) to avoid duplicates
          if (msg.message) {
            const existingByText = await this.prisma.message.findFirst({
              where: {
                customerId,
                text: msg.message,
                type: 'OUTGOING',
                timestamp: { gte: BigInt(timestamp - 5000), lte: BigInt(timestamp + 5000) },
              },
            });
            if (existingByText) continue;
          }

          // Determine content
          let text = msg.message || null;
          let mediaType: 'IMAGE' | 'VIDEO' | null = null;
          let mediaUrl: string | null = null;

          // Check attachments
          const attachments = msg.attachments?.data || [];
          if (attachments.length > 0) {
            const att = attachments[0];
            if (att.mime_type?.startsWith('image/') || att.type === 'image') {
              mediaType = 'IMAGE';
              mediaUrl = att.image_data?.url || att.file_url || null;
              if (!text) text = '[รูปภาพ]';
            } else if (att.mime_type?.startsWith('video/') || att.type === 'video') {
              mediaType = 'VIDEO';
              mediaUrl = att.video_data?.url || att.file_url || null;
              if (!text) text = '[วิดีโอ]';
            } else if (!text) {
              text = '[ไฟล์]';
            }
          }

          if (!text) text = '[ข้อความ]';

          // Save admin reply
          await this.prisma.message.create({
            data: {
              id: messageId,
              customerId,
              text,
              type: 'OUTGOING',
              sender: 'ADMIN',
              timestamp: BigInt(timestamp),
              status: 'sent',
              adminName: 'Business Suite',
              mediaType,
              mediaUrl,
            },
          });

          synced++;
        }
      } catch (err: any) {
        // Skip individual conversation errors
        this.logger.warn(`Failed to sync conversation ${conv.id}: ${err.message}`);
      }
    }

    return synced;
  }

  /**
   * Manual trigger — sync all pages now (called via API endpoint).
   */
  async syncNow(): Promise<{ synced: number }> {
    let total = 0;

    for (const page of FB_PAGES) {
      const token = process.env[page.tokenEnvKey];
      if (!token) continue;

      try {
        total += await this.syncPage(page.pageId, page.channel, token);
      } catch (err: any) {
        this.logger.error(`Failed to sync ${page.channel}: ${err.message}`);
      }
    }

    return { synced: total };
  }

  /**
   * Full history sync — go deeper into conversation history.
   * Use for initial backfill.
   */
  async syncFullHistory(): Promise<{ synced: number }> {
    this.logger.log('Starting full Facebook history sync...');
    let total = 0;

    for (const page of FB_PAGES) {
      const token = process.env[page.tokenEnvKey];
      if (!token) continue;

      try {
        let url = `https://graph.facebook.com/v18.0/${page.pageId}/conversations?access_token=${token}&fields=participants,updated_time&limit=100`;

        while (url) {
          const response = await axios.get(url);
          const conversations = response.data?.data || [];

          for (const conv of conversations) {
            try {
              total += await this.syncConversationHistory(conv, page.pageId, page.channel, token);
            } catch {}
          }

          url = response.data?.paging?.next || null;
          this.logger.log(`${page.channel}: synced ${total} admin replies so far...`);
        }
      } catch (err: any) {
        this.logger.error(`Full sync failed for ${page.channel}: ${err.message}`);
      }
    }

    this.logger.log(`Full sync complete: ${total} admin replies`);
    return { synced: total };
  }

  private async syncConversationHistory(
    conv: any,
    pageId: string,
    channel: string,
    token: string,
  ): Promise<number> {
    let synced = 0;

    const participants = conv.participants?.data || [];
    const customer = participants.find((p: any) => p.id !== pageId);
    if (!customer) return 0;

    const customerId = `${customer.id}__${channel}`;
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    // Also try old format
    const altCustomer = !existingCustomer
      ? await this.prisma.customer.findUnique({ where: { id: customer.id } })
      : null;
    const targetCustomerId = existingCustomer?.id || altCustomer?.id;
    if (!targetCustomerId) return 0;

    let msgUrl = `https://graph.facebook.com/v18.0/${conv.id}/messages?access_token=${token}&fields=message,from,created_time,attachments&limit=100`;

    while (msgUrl) {
      const msgResponse = await axios.get(msgUrl);
      const messages = msgResponse.data?.data || [];

      for (const msg of messages) {
        if (msg.from?.id !== pageId) continue;

        const messageId = `fb_sync_${msg.id}`;
        const timestamp = new Date(msg.created_time).getTime();

        const exists = await this.prisma.message.findFirst({
          where: { OR: [{ id: messageId }, { id: msg.id }] },
        });
        if (exists) continue;

        let text = msg.message || '[ข้อความ]';
        let mediaType: 'IMAGE' | 'VIDEO' | null = null;
        let mediaUrl: string | null = null;

        const attachments = msg.attachments?.data || [];
        if (attachments.length > 0) {
          const att = attachments[0];
          if (att.type === 'image' || att.mime_type?.startsWith('image/')) {
            mediaType = 'IMAGE';
            mediaUrl = att.image_data?.url || null;
            if (text === '[ข้อความ]') text = '[รูปภาพ]';
          } else if (att.type === 'video' || att.mime_type?.startsWith('video/')) {
            mediaType = 'VIDEO';
            mediaUrl = att.video_data?.url || null;
            if (text === '[ข้อความ]') text = '[วิดีโอ]';
          }
        }

        try {
          await this.prisma.message.create({
            data: {
              id: messageId,
              customerId: targetCustomerId,
              text,
              type: 'OUTGOING',
              sender: 'ADMIN',
              timestamp: BigInt(timestamp),
              status: 'sent',
              adminName: 'Business Suite',
              mediaType,
              mediaUrl,
            },
          });
          synced++;
        } catch {}
      }

      msgUrl = msgResponse.data?.paging?.next || null;
    }

    return synced;
  }
}
