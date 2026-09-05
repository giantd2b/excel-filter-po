import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listBookings,
  updateBookingStatus,
  deleteBooking,
  createBookingQuotation,
  sendBookingQuotationToChat,
  apiErrorMessage,
  type MeritBooking,
} from '../services/bookings';
import BookingCard from '../components/booking/BookingCard';
import { NEXT_STATUS, STATUSES, STATUS_LABELS } from '../components/booking/bookingHelpers';

const SOURCES = [
  { key: 'ALL', label: 'ทุกช่องทาง' },
  { key: 'chat_link', label: 'จากลิงก์แชต' },
  { key: 'web', label: 'เว็บ' },
];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<MeritBooking[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchData = useCallback(async (isRefresh = false) => {
    const seq = ++requestSeq.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await listBookings({ status: filter, source, q: debouncedQuery });
      if (seq !== requestSeq.current) return; // a newer request has superseded this one
      setBookings(res.bookings);
      setStatusCounts(res.statusCounts);
      setTotal(res.total);
    } catch (err: any) {
      if (seq === requestSeq.current) Alert.alert('โหลดข้อมูลไม่สำเร็จ', apiErrorMessage(err));
    } finally {
      if (seq === requestSeq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [filter, source, debouncedQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const patch = (id: string, changes: Partial<MeritBooking>) =>
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));

  const advance = async (b: MeritBooking) => {
    const from = b.status || '';
    const to = NEXT_STATUS[from] || 'NEW';
    setBusyId(b.id);
    try {
      const updated = await updateBookingStatus(b.id, to);
      const newStatus = updated?.status || to;
      patch(b.id, { status: newStatus });
      setStatusCounts((c) => ({
        ...c,
        [from]: Math.max(0, (c[from] || 0) - 1),
        [newStatus]: (c[newStatus] || 0) + 1,
      }));
    } catch (err: any) {
      Alert.alert('เปลี่ยนสถานะไม่สำเร็จ', apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = (b: MeritBooking) => {
    Alert.alert('ลบรายการจอง', `ลบ ${b.code || ''} ของ ${b.customerName || ''}?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          setBusyId(b.id);
          try {
            await deleteBooking(b.id);
            setBookings((prev) => prev.filter((x) => x.id !== b.id));
            setTotal((t) => Math.max(0, t - 1));
            if (b.status) setStatusCounts((c) => ({ ...c, [b.status!]: Math.max(0, (c[b.status!] || 0) - 1) }));
          } catch (err: any) {
            Alert.alert('ลบไม่สำเร็จ', apiErrorMessage(err));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const createQuote = async (b: MeritBooking) => {
    setBusyId(b.id);
    try {
      const res = await createBookingQuotation(b.id);
      patch(b.id, {
        quotationDocNo: res.docNo ?? res.booking?.quotationDocNo ?? b.quotationDocNo,
        quotationUrl: res.quotationUrl ?? res.booking?.quotationUrl ?? b.quotationUrl,
        quotationPublicUrl: res.publicUrl ?? res.booking?.quotationPublicUrl ?? b.quotationPublicUrl,
        quotationCreatedAt: res.booking?.quotationCreatedAt ?? new Date().toISOString(),
        quotationSendStatus: res.booking?.quotationSendStatus ?? b.quotationSendStatus,
      });
      if (res.warnings?.length) {
        Alert.alert('สร้างใบเสนอราคาแล้ว (มีข้อควรตรวจสอบ)', res.warnings.join('\n'));
      }
      if (res.quotationUrl) Linking.openURL(res.quotationUrl).catch(() => {});
    } catch (err: any) {
      Alert.alert('สร้างใบเสนอราคาไม่สำเร็จ', `${b.code || ''}: ${apiErrorMessage(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const copyPublicLink = async (b: MeritBooking) => {
    if (!b.quotationPublicUrl) return;
    try { await Clipboard.setStringAsync(b.quotationPublicUrl); } catch { /* clipboard unavailable */ }
    setCopiedId(b.id);
    setTimeout(() => setCopiedId((c) => (c === b.id ? null : c)), 2000);
  };

  const sendQuoteToChat = async (b: MeritBooking) => {
    setBusyId(b.id);
    patch(b.id, { quotationSendStatus: 'sending' });
    try {
      await sendBookingQuotationToChat(b.id);
      // delivery is asynchronous — refresh shortly so the status chip catches up
      setTimeout(() => fetchData(true), 2500);
    } catch (err: any) {
      patch(b.id, { quotationSendStatus: 'failed' });
      Alert.alert('ส่งลิงก์ในแชตไม่สำเร็จ', `${b.code || ''}: ${apiErrorMessage(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: 'ALL', label: `ทั้งหมด (${total})` },
    ...STATUSES.map((s) => ({ key: s, label: `${STATUS_LABELS[s]} (${statusCounts[s] || 0})` })),
  ];

  const header = (
    <View style={styles.header}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="ค้นหา รหัส / ชื่อ / เบอร์ / เลขใบเสนอราคา"
        placeholderTextColor="#94a3b8"
        clearButtonMode="while-editing"
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={styles.pillRow}>
        {SOURCES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sourcePill, source === s.key && styles.sourcePillActive]}
            onPress={() => setSource(s.key)}
          >
            <Text style={[styles.sourcePillText, source === s.key && styles.sourcePillTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Tab screen: the tab navigator hides headers, so draw our own (same as the other tabs) */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>จองงานบุญ</Text>
        <Text style={styles.screenCount}>{total} รายการ</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#6366f1" />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 48 }} />
          ) : (
            <Text style={styles.empty}>ยังไม่มีรายการจองในหมวดนี้</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <BookingCard
              booking={item}
              busy={busyId === item.id}
              copied={copiedId === item.id}
              onAdvance={advance}
              onDelete={remove}
              onCreateQuote={createQuote}
              onCopyPublicLink={copyPublicLink}
              onSendQuoteToChat={sendQuoteToChat}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  screenCount: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  header: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  pillRow: { flexDirection: 'row', gap: 6 },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sourcePillActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  sourcePillText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  sourcePillTextActive: { color: '#4f46e5', fontWeight: '700' },
  tabsRow: { gap: 6, paddingRight: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  cardWrap: { paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 14 },
});
