import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import {
  getSocket,
  subscribeConversations,
} from '../services/socket';
import ConversationItem, {
  type Conversation,
} from '../components/ConversationItem';

export default function InboxScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'line', 'facebook', or specific channel name
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  // Determine API channelType param from filter
  const apiChannelType = useMemo(() => {
    if (channelFilter === 'all') return undefined;
    if (channelFilter === 'line') return 'line';
    if (channelFilter === 'facebook') return 'facebook';
    // Specific channel: determine type from name
    if (channelFilter.startsWith('Line_')) return 'line';
    if (channelFilter.startsWith('FB_') || channelFilter.startsWith('fb_')) return 'facebook';
    return undefined;
  }, [channelFilter]);

  const fetchConversations = useCallback(async () => {
    try {
      const params: any = { limit: '200' };
      if (apiChannelType) {
        params.channelType = apiChannelType;
      }
      const { data } = await api.get('/inbox/conversations', { params });
      setConversations(data);
    } catch (err) {
      console.error('[InboxScreen] Fetch error:', err);
    }
  }, [apiChannelType]);

  useEffect(() => {
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations]),
  );

  // Socket real-time
  useEffect(() => {
    const filter: any = {};
    if (apiChannelType) filter.channelType = apiChannelType;
    subscribeConversations(filter);

    const socket = getSocket();

    const handleUpdate = (updated: Conversation) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === updated.id);
        let next: Conversation[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = { ...next[idx], ...updated };
        } else {
          next = [updated, ...prev];
        }
        return next.sort(
          (a, b) => (b.lastmessagetime || 0) - (a.lastmessagetime || 0),
        );
      });
    };

    socket?.on('conversation:updated', handleUpdate);

    return () => {
      socket?.off('conversation:updated', handleUpdate);
    };
  }, [apiChannelType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const handlePress = (conversation: Conversation) => {
    navigation.navigate('Chat', {
      userId: conversation.oduserId,
      docId: conversation.id,
      displayName: conversation.displayName,
      pictureUrl: conversation.pictureUrl,
      channel: conversation.channel,
      channelType: conversation.channelType,
    });
  };

  // Get unique channel names for the picker
  const channelNames = useMemo(() => {
    const names = new Set<string>();
    conversations.forEach((c) => {
      if (c.channel) names.add(c.channel);
    });
    return Array.from(names).sort();
  }, [conversations]);

  // Filter by search + specific channel
  const filtered = useMemo(() => {
    let result = conversations;

    // Filter by specific channel name (not just type)
    if (channelFilter !== 'all' && channelFilter !== 'line' && channelFilter !== 'facebook') {
      result = result.filter((c) => c.channel === channelFilter);
    }

    // Filter by search
    if (search.trim()) {
      result = result.filter((c) =>
        c.displayName?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return result;
  }, [conversations, channelFilter, search]);

  // Format channel name for display
  const formatChannelName = (channel: string) => {
    if (channel.startsWith('Line_')) return channel.replace('Line_', 'LINE ');
    if (channel.startsWith('FB_')) return channel.replace('FB_', 'FB ');
    if (channel.startsWith('fb_')) return channel.replace('fb_', 'FB ');
    return channel;
  };

  const filterLabel = useMemo(() => {
    if (channelFilter === 'all') return 'ทั้งหมด';
    if (channelFilter === 'line') return 'LINE';
    if (channelFilter === 'facebook') return 'Facebook';
    return formatChannelName(channelFilter);
  }, [channelFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>กล่องข้อความ</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาลูกค้า..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Channel filter row */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {/* Main tabs */}
          <TouchableOpacity
            style={[styles.tab, channelFilter === 'all' && styles.tabActive]}
            onPress={() => setChannelFilter('all')}
          >
            <Text style={[styles.tabText, channelFilter === 'all' && styles.tabTextActive]}>
              ทั้งหมด
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, channelFilter === 'line' && styles.tabActive]}
            onPress={() => setChannelFilter('line')}
          >
            <Text style={[styles.tabText, channelFilter === 'line' && styles.tabTextActive]}>
              LINE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, channelFilter === 'facebook' && styles.tabActive]}
            onPress={() => setChannelFilter('facebook')}
          >
            <Text style={[styles.tabText, channelFilter === 'facebook' && styles.tabTextActive]}>
              Facebook
            </Text>
          </TouchableOpacity>

          {/* Channel picker button */}
          <TouchableOpacity
            style={[
              styles.tab,
              styles.tabDropdown,
              channelFilter !== 'all' && channelFilter !== 'line' && channelFilter !== 'facebook' && styles.tabActive,
            ]}
            onPress={() => setShowChannelPicker(true)}
          >
            <Text
              style={[
                styles.tabText,
                channelFilter !== 'all' && channelFilter !== 'line' && channelFilter !== 'facebook' && styles.tabTextActive,
              ]}
            >
              {channelFilter !== 'all' && channelFilter !== 'line' && channelFilter !== 'facebook'
                ? formatChannelName(channelFilter)
                : 'เลือกเพจ ▾'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Conversation list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem conversation={item} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีการสนทนา</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 && styles.emptyList}
        />
      )}

      {/* Channel picker modal */}
      <Modal
        visible={showChannelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChannelPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChannelPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกช่องทาง</Text>

            <TouchableOpacity
              style={[styles.channelOption, channelFilter === 'all' && styles.channelOptionActive]}
              onPress={() => { setChannelFilter('all'); setShowChannelPicker(false); }}
            >
              <Text style={[styles.channelOptionText, channelFilter === 'all' && styles.channelOptionTextActive]}>
                ทั้งหมด
              </Text>
            </TouchableOpacity>

            {channelNames.length > 0 && (
              <>
                {/* LINE channels */}
                {channelNames.filter(c => c.startsWith('Line_')).length > 0 && (
                  <Text style={styles.channelSectionTitle}>LINE</Text>
                )}
                {channelNames.filter(c => c.startsWith('Line_')).map((ch) => (
                  <TouchableOpacity
                    key={ch}
                    style={[styles.channelOption, channelFilter === ch && styles.channelOptionActive]}
                    onPress={() => { setChannelFilter(ch); setShowChannelPicker(false); }}
                  >
                    <View style={[styles.channelDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.channelOptionText, channelFilter === ch && styles.channelOptionTextActive]}>
                      {ch.replace('Line_', '')}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Facebook channels */}
                {channelNames.filter(c => c.startsWith('FB_') || c.startsWith('fb_')).length > 0 && (
                  <Text style={styles.channelSectionTitle}>Facebook</Text>
                )}
                {channelNames.filter(c => c.startsWith('FB_') || c.startsWith('fb_')).map((ch) => (
                  <TouchableOpacity
                    key={ch}
                    style={[styles.channelOption, channelFilter === ch && styles.channelOptionActive]}
                    onPress={() => { setChannelFilter(ch); setShowChannelPicker(false); }}
                  >
                    <View style={[styles.channelDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={[styles.channelOptionText, channelFilter === ch && styles.channelOptionTextActive]}>
                      {ch.replace('FB_', '').replace('fb_', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  filterRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabDropdown: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyList: {
    flex: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  channelSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  channelOptionActive: {
    backgroundColor: '#eef2ff',
  },
  channelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  channelOptionText: {
    fontSize: 15,
    color: '#334155',
  },
  channelOptionTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
});
