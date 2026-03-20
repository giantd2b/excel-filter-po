import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import axios from 'axios';
import { FirebaseService } from '../../common/providers/firebase.service';
import { PrismaService } from '../../common/providers/prisma.service';

@WebSocketGateway({
  cors: {
    origin: true, // Allow same-origin and configured origins
    credentials: true,
  },
  namespace: '/inbox',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const decoded = await this.firebase.auth.verifyIdToken(token);
      client.data.uid = decoded.uid;
      client.join('all');
      this.logger.log(`Client connected: ${decoded.uid} (${client.id})`);
    } catch {
      this.logger.warn(`Auth failed for client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data?.uid || client.id}`);
  }

  @SubscribeMessage('subscribe:conversations')
  handleSubscribeConversations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel?: string; channelType?: string },
  ) {
    // Leave previous conversation rooms
    client.rooms.forEach((room) => {
      if (room.startsWith('conversations:')) client.leave(room);
    });

    // Join new rooms
    client.join('conversations:all');
    if (data.channel) {
      client.join(`conversations:channel:${data.channel}`);
    }
    if (data.channelType) {
      client.join(`conversations:type:${data.channelType}`);
    }

    client.data.conversationFilter = data;
    this.logger.debug(`${client.data.uid} subscribed to conversations: ${JSON.stringify(data)}`);
  }

  @SubscribeMessage('subscribe:messages')
  handleSubscribeMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    // Leave previous message room
    client.rooms.forEach((room) => {
      if (room.startsWith('messages:')) client.leave(room);
    });

    if (data.userId) {
      client.join(`messages:${data.userId}`);
      client.data.viewingUser = data.userId;
    }
  }

  @SubscribeMessage('unsubscribe:messages')
  handleUnsubscribeMessages(@ConnectedSocket() client: Socket) {
    client.rooms.forEach((room) => {
      if (room.startsWith('messages:')) client.leave(room);
    });
    client.data.viewingUser = null;
  }

  // ─── Broadcast methods (called by webhook/messages services) ──────

  emitNewMessage(userId: string, message: any) {
    this.server.to(`messages:${userId}`).emit('message:new', {
      userId,
      message,
    });

    // Send push notification for incoming messages (fire-and-forget)
    if (message.type === 'incoming') {
      this.sendPushWithCustomerInfo(userId, message).catch(() => {});
    }
  }

  emitReactionUpdate(userId: string, messageId: string, reactions: any[]) {
    this.server.to(`messages:${userId}`).emit('reaction:update', {
      userId,
      messageId,
      reactions,
    });
  }

  emitSuggestionsUpdate(userId: string, suggestions: string[]) {
    this.server.to(`messages:${userId}`).emit('suggestions:update', {
      userId,
      suggestions,
    });
  }

  private async sendPushWithCustomerInfo(customerId: string, message: any) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          displayName: true,
          nickname: true,
          pictureUrl: true,
          channel: true,
          channelType: true,
          platformUserId: true,
        },
      });

      const name = customer?.nickname || customer?.displayName || 'ลูกค้า';
      const channel = (customer?.channel || '')
        .replace('Line_', 'LINE ')
        .replace('FB_', 'FB ')
        .replace('fb_', 'FB ');
      const channelType = customer?.channelType === 'LINE' ? 'line' : 'facebook';

      const title = `${name} • ${channel}`;
      const body = message.text || (message.mediaType ? '[สื่อ]' : 'ข้อความใหม่');

      await this.sendPushNotification(title, body, {
        docId: customerId,
        oduserId: customer?.platformUserId,
        displayName: name,
        pictureUrl: customer?.pictureUrl || '',
        channel: customer?.channel || '',
        channelType,
        type: 'new_message',
      });
    } catch (err: any) {
      this.logger.warn(`Push with customer info failed: ${err.message}`);
    }
  }

  private async sendPushNotification(title: string, body: string, data?: Record<string, any>) {
    try {
      const tokens = await this.prisma.pushToken.findMany();
      if (tokens.length === 0) return;

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default',
        title,
        body: body.length > 100 ? body.substring(0, 100) + '...' : body,
        data: data || {},
      }));

      const res = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });

      // Clean up invalid tokens
      const results = res.data?.data || [];
      for (let i = 0; i < results.length; i++) {
        if (results[i]?.details?.error === 'DeviceNotRegistered') {
          this.prisma.pushToken.delete({ where: { token: messages[i].to } }).catch(() => {});
        }
      }
    } catch (err: any) {
      this.logger.warn(`Push failed: ${err.message}`);
    }
  }

  emitConversationUpdated(conversation: any) {
    const channel = conversation.channel || '';
    const channelType = channel.startsWith('Line_') ? 'line' : 'facebook';

    // Broadcast to all conversation subscribers
    this.server.to('conversations:all').emit('conversation:updated', conversation);
    this.server.to(`conversations:channel:${channel}`).emit('conversation:updated', conversation);
    this.server.to(`conversations:type:${channelType}`).emit('conversation:updated', conversation);
  }

  emitUnreadUpdate(stats: { totalUnread: number; channelUnread: Record<string, number> }) {
    this.server.to('all').emit('unread:update', stats);
  }
}
