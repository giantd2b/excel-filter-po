import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

interface Slip {
  id: string;
  customer_name?: string;
  link: string;
  bank_name?: string;
  amount?: number;
  date_time?: string;
  sender_name?: string;
  receiver_name?: string;
  reference_number?: string;
  detected_at: any;
}

export default function SlipReportScreen() {
  const insets = useSafeAreaInsets();
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const formatDisplayDate = (d: Date) =>
    d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const fetchSlips = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/slips?date=${formatDateStr(date)}`);
      setSlips(data?.slips || []);
    } catch {
      setSlips([]);
    }
    setLoading(false);
  }, []);

  // Fetch on mount
  React.useEffect(() => { fetchSlips(selectedDate); }, []);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    fetchSlips(newDate);
  };

  const totalAmount = slips.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>รายงานสลิป</Text>
      </View>

      {/* Date picker */}
      <View style={styles.datePicker}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
          <Text style={styles.dateBtnText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(1)}>
          <Text style={styles.dateBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{slips.length}</Text>
          <Text style={styles.summaryLabel}>รายการ</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>฿{totalAmount.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>ยอดรวม</Text>
        </View>
      </View>

      {/* Slips list */}
      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={slips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ไม่มีสลิปในวันนี้</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.slipCard}
              onPress={() => { if (item.link) Linking.openURL(item.link); }}
            >
              {item.link && (
                <Image source={{ uri: item.link }} style={styles.slipImage} contentFit="cover" cachePolicy="disk" />
              )}
              <View style={styles.slipInfo}>
                <Text style={styles.slipAmount}>
                  ฿{(item.amount || 0).toLocaleString()}
                </Text>
                {item.bank_name && <Text style={styles.slipDetail}>{item.bank_name}</Text>}
                {item.sender_name && <Text style={styles.slipDetail}>จาก: {item.sender_name}</Text>}
                {item.receiver_name && <Text style={styles.slipDetail}>ถึง: {item.receiver_name}</Text>}
                {item.customer_name && <Text style={styles.slipDetail}>ลูกค้า: {item.customer_name}</Text>}
                {item.date_time && <Text style={styles.slipTime}>{item.date_time}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 12, gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  dateBtn: { padding: 8 },
  dateBtnText: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
  dateText: { fontSize: 16, fontWeight: '600', color: '#1e293b', minWidth: 140, textAlign: 'center' },
  summary: {
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16,
    marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  summaryLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#e2e8f0' },
  listContent: { padding: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 40 },
  slipCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  slipImage: { width: 80, height: 100 },
  slipInfo: { flex: 1, padding: 12 },
  slipAmount: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  slipDetail: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  slipTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
});
