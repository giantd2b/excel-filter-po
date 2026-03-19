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
import { FirebaseService } from '../../common/providers/firebase.service';

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

  constructor(private readonly firebase: FirebaseService) {}

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
