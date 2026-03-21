import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export interface Conversation {
  id: string;
  oduserId: string;
  displayName: string;
  nickname?: string | null;
  platformName?: string;
  pictureUrl: string;
  channel: string;
  channelType: 'line' | 'facebook';
  lastmessagetime: number;
  unreadCount: number;
  lastMessagePreview: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  nextJobDate?: string | null;
  nextJobTitle?: string | null;
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface Props {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วันก่อน`;
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
}

function formatChannel(channel?: string): string {
  if (!channel) return '';
  return channel
    .replace('Line_', 'LINE ')
    .replace('FB_', 'FB ')
    .replace('fb_', 'FB ');
}

export default function ConversationItem({ conversation, onPress }: Props) {
  const {
    displayName,
    pictureUrl,
    channelType,
    lastMessagePreview,
    lastmessagetime,
    unreadCount,
  } = conversation;

  const isLine = channelType === 'line';

  return (
    <TouchableOpacity
      style={[styles.container, unreadCount > 0 && styles.unreadContainer]}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {pictureUrl ? (
          <Image source={{ uri: pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.channelBadge,
            { backgroundColor: isLine ? '#10b981' : '#3b82f6' },
          ]}
        >
          <Text style={styles.channelBadgeText}>
            {isLine ? 'L' : 'F'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName || 'ไม่ทราบชื่อ'}
          </Text>
          <Text style={styles.time}>{formatTime(lastmessagetime)}</Text>
        </View>
        {conversation.nickname && conversation.platformName && conversation.nickname !== conversation.platformName && (
          <Text style={styles.platformName} numberOfLines={1}>
            ({conversation.platformName})
          </Text>
        )}
        <Text style={styles.channelName} numberOfLines={1}>
          {formatChannel(conversation.channel)}
          {conversation.nextJobDate && (
            <Text style={styles.jobDate}> • 📅 {conversation.nextJobDate}</Text>
          )}
        </Text>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              unreadCount > 0 && styles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {lastMessagePreview || '...'}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unreadContainer: {
    backgroundColor: '#f0f0ff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  channelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  channelBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
  },
  platformName: {
    fontSize: 11,
    color: '#b0b8c4',
    fontStyle: 'italic',
  },
  channelName: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  jobDate: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 13,
    color: '#94a3b8',
    flex: 1,
    marginRight: 8,
  },
  previewUnread: {
    color: '#1e293b',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
