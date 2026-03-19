import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

interface MonthStats {
  total: number;
  line: number;
  facebook: number;
  channels: Record<string, number>;
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(d: Date) {
  return `${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getPrevMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [prevStats, setPrevStats] = useState<MonthStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const fetchData = useCallback(async (month: Date) => {
    try {
      const monthStr = getMonthStr(month);
      const prevMonthStr = getMonthStr(getPrevMonth(month));
      const [sRes, pRes, iRes] = await Promise.all([
        api.get(`/users/stats?month=${monthStr}`),
        api.get(`/users/stats?month=${prevMonthStr}`),
        api.get('/inbox/stats').catch(() => ({ data: { totalUnread: 0 } })),
      ]);
      setStats(sRes.data);
      setPrevStats(pRes.data);
      setUnreadCount(iRes.data?.totalUnread || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(selectedMonth);
    setRefreshing(false);
  };

  const changeMonth = (dir: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + dir, 1));
  };

  const formatChannel = (ch: string) =>
    ch.replace('Line_', 'LINE ').replace('FB_', 'FB ').replace('fb_', 'FB ');

  const diffBadge = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff === 0) return null;
    const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
    const isUp = diff > 0;
    return (
      <Text style={[diffStyles.badge, isUp ? diffStyles.up : diffStyles.down]}>
        {isUp ? '▲' : '▼'} {Math.abs(diff).toLocaleString()} {pct ? `(${isUp ? '+' : ''}${pct}%)` : ''}
      </Text>
    );
  };

  // Generate month picker options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    return d;
  });

  const channels = stats?.channels ? Object.entries(stats.channels).sort((a, b) => b[1] - a[1]) : [];

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}><Text style={styles.headerTitle}>แดชบอร์ด</Text></View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366f1" /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.headerTitle}>แดชบอร์ด</Text></View>

      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.monthLabel}>
          <Text style={styles.monthLabelText}>{formatMonthLabel(selectedMonth)}</Text>
          <Text style={styles.monthDropdown}> ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Customer stats */}
        <View style={styles.cardsRow}>
          <StatCard
            label="ลูกค้าใหม่"
            value={stats?.total || 0}
            color="#6366f1"
            diff={prevStats ? diffBadge(stats?.total || 0, prevStats.total) : null}
          />
          <StatCard
            label="ยังไม่อ่าน"
            value={unreadCount}
            color="#dc2626"
          />
        </View>
        <View style={styles.cardsRow}>
          <StatCard
            label="LINE"
            value={stats?.line || 0}
            color="#10b981"
            diff={prevStats ? diffBadge(stats?.line || 0, prevStats.line) : null}
          />
          <StatCard
            label="Facebook"
            value={stats?.facebook || 0}
            color="#3b82f6"
            diff={prevStats ? diffBadge(stats?.facebook || 0, prevStats.facebook) : null}
          />
        </View>

        {/* Message stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อความ</Text>
          <View style={styles.msgStatsRow}>
            <View style={styles.msgStatItem}>
              <Text style={styles.msgStatValue}>{(stats?.totalMessages || 0).toLocaleString()}</Text>
              <Text style={styles.msgStatLabel}>ทั้งหมด</Text>
            </View>
            <View style={styles.msgStatItem}>
              <Text style={[styles.msgStatValue, { color: '#10b981' }]}>{(stats?.incomingMessages || 0).toLocaleString()}</Text>
              <Text style={styles.msgStatLabel}>ขาเข้า</Text>
            </View>
            <View style={styles.msgStatItem}>
              <Text style={[styles.msgStatValue, { color: '#6366f1' }]}>{(stats?.outgoingMessages || 0).toLocaleString()}</Text>
              <Text style={styles.msgStatLabel}>ขาออก</Text>
            </View>
          </View>
          {prevStats && (
            <Text style={styles.compareText}>
              เทียบเดือนก่อน: {(prevStats.totalMessages || 0).toLocaleString()} ข้อความ
            </Text>
          )}
        </View>

        {/* Channel breakdown */}
        {channels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>แยกตามช่องทาง</Text>
            {channels.map(([ch, count]) => {
              const prevCount = prevStats?.channels?.[ch] || 0;
              return (
                <View key={ch} style={styles.channelRow}>
                  <View style={styles.channelInfo}>
                    <View style={[styles.channelDot, {
                      backgroundColor: ch.startsWith('Line') ? '#10b981' : '#3b82f6',
                    }]} />
                    <Text style={styles.channelName}>{formatChannel(ch)}</Text>
                  </View>
                  <View style={styles.channelRight}>
                    <Text style={styles.channelCount}>{count.toLocaleString()}</Text>
                    {prevStats && diffBadge(count, prevCount)}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Month picker modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกเดือน</Text>
            {monthOptions.map((d) => {
              const isSelected = getMonthStr(d) === getMonthStr(selectedMonth);
              return (
                <TouchableOpacity
                  key={getMonthStr(d)}
                  style={[styles.monthOption, isSelected && styles.monthOptionActive]}
                  onPress={() => { setSelectedMonth(d); setShowMonthPicker(false); }}
                >
                  <Text style={[styles.monthOptionText, isSelected && styles.monthOptionTextActive]}>
                    {formatMonthLabel(d)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, color, diff }: { label: string; value: number; color: string; diff?: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <Text style={[cardStyles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={cardStyles.label}>{label}</Text>
      {diff}
    </View>
  );
}

const diffStyles = StyleSheet.create({
  badge: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  up: { color: '#10b981' },
  down: { color: '#ef4444' },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  value: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 13, color: '#64748b', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  // Month picker
  monthPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  monthBtn: { padding: 10 },
  monthBtnText: { fontSize: 14, color: '#6366f1', fontWeight: '700' },
  monthLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  monthLabelText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  monthDropdown: { fontSize: 12, color: '#94a3b8' },
  // Cards
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  // Section
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  // Message stats
  msgStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  msgStatItem: { alignItems: 'center' },
  msgStatValue: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  msgStatLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  compareText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  // Channel rows
  channelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  channelInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  channelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  channelName: { fontSize: 14, color: '#334155', fontWeight: '500' },
  channelRight: { alignItems: 'flex-end' },
  channelCount: { fontSize: 15, color: '#1e293b', fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40, maxHeight: '60%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', paddingHorizontal: 20, marginBottom: 8 },
  monthOption: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  monthOptionActive: { backgroundColor: '#eef2ff' },
  monthOptionText: { fontSize: 15, color: '#334155' },
  monthOptionTextActive: { color: '#6366f1', fontWeight: '700' },
});
