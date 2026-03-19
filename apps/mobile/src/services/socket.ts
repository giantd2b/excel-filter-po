import { io, Socket } from 'socket.io-client';
import { auth } from './firebase';

const SOCKET_URL = 'https://harmonious-presence-production.up.railway.app';

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  // Clean up existing socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Get fresh token from Firebase Auth
  let token: string | null = null;
  try {
    token = (await auth.currentUser?.getIdToken()) || null;
  } catch {
    // Will retry on reconnect
  }

  socket = io(`${SOCKET_URL}/inbox`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.on('connect_error', async (err) => {
    console.log('[Socket] Connection error:', err.message);
    // Refresh token on auth errors
    if (err.message.includes('auth') || err.message.includes('token') || err.message.includes('401')) {
      try {
        const freshToken = await auth.currentUser?.getIdToken(true);
        if (freshToken && socket) {
          socket.auth = { token: freshToken };
        }
      } catch {
        // Token refresh failed
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    // If server disconnected us, reconnect with fresh token after delay
    if (reason === 'io server disconnect' || reason === 'transport error') {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(async () => {
          reconnectTimer = null;
          try {
            const freshToken = await auth.currentUser?.getIdToken(true);
            if (freshToken && socket) {
              socket.auth = { token: freshToken };
              socket.connect();
            }
          } catch {
            // Will retry via built-in reconnection
          }
        }, 3000);
      }
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function subscribeConversations(filter?: {
  channel?: string;
  channelType?: string;
}) {
  socket?.emit('subscribe:conversations', filter || {});
}

export function subscribeMessages(userId: string) {
  socket?.emit('subscribe:messages', { userId });
}

export function unsubscribeMessages() {
  socket?.emit('unsubscribe:messages');
}
