import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  attachQuotationToCustomer,
  searchFaQuotations,
  faStatusLabel,
  faStatusStyle,
  SEARCH_ORIGIN_LABEL,
  type FaSearchHit,
} from '../../services/quotations';
import { apiErrorMessage } from '../../services/bookings';

interface Props {
  visible: boolean;
  customer: { id: string; displayName: string };
  onClose: () => void;
  /** called after a document was attached (the parent reloads its list) */
  onAttached: (docNo: string) => void;
}

/**
 * "ผูกใบที่มีอยู่": find a document an admin made by hand in IRIS Quotation and attribute it to
 * this chat customer, so it shows up in the customer screen like chat-created ones.
 * Mirrors dashboard/src/components/inbox/AttachQuotationModal.tsx.
 */
export default function AttachQuotationModal({ visible, customer, onClose, onAttached }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<FaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setHits([]);
    setError(null);
  }, [visible, customer.id]);

  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    let cancelled = false;
    setSearching(true);
    setError(null);
    const t = setTimeout(() => {
      searchFaQuotations(q)
        .then((res) => { if (!cancelled) setHits(res); })
        .catch((e: any) => { if (!cancelled) setError(apiErrorMessage(e, 'ค้นหาไม่สำเร็จ')); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [visible, query]);

  const doAttach = async (hit: FaSearchHit) => {
    setBusy(hit.docNo);
    setError(null);
    try {
      await attachQuotationToCustomer(hit.docNo, customer.id);
      onAttached(hit.docNo);
    } catch (e: any) {
      const msg = apiErrorMessage(e, 'ผูกไม่สำเร็จ');
      setError(msg);
      Alert.alert('ผูกไม่สำเร็จ', msg);
    } finally {
      setBusy(null);
    }
  };

  const attach = (hit: FaSearchHit) => {
    if (hit.crmCustomerId && hit.crmCustomerId !== customer.id) {
      Alert.alert(
        'ใบนี้ผูกกับลูกค้าอื่นอยู่',
        `${hit.docNo} ผูกกับ "${hit.crmChatName || 'ลูกค้าอื่น'}" อยู่แล้ว ต้องการย้ายมาผูกกับ ${customer.displayName} แทน?`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ย้ายมาผูกที่นี่', style: 'destructive', onPress: () => doAttach(hit) },
        ],
      );
      return;
    }
    doAttach(hit);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>🔗 ผูกใบเสนอราคากับ {customer.displayName}</Text>
            <Text style={styles.subtitle}>
              ค้นใบที่สร้างเองใน IRIS Quotation ด้วยเลขที่ ชื่อลูกค้า ชื่องาน หรือเบอร์โทร แล้วผูกกับแชตนี้เพื่อติดตามสถานะจาก CRM
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="เช่น QT2026090045 หรือ ชื่อลูกค้า"
            placeholderTextColor="#94a3b8"
            autoFocus
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {searching ? (
              <ActivityIndicator color="#d97706" style={{ marginTop: 24 }} />
            ) : hits.length === 0 ? (
              <Text style={styles.empty}>
                {query.trim().length < 2 ? 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา' : 'ไม่พบใบเสนอราคา'}
              </Text>
            ) : (
              hits.map((h) => {
                const attachedHere = h.crmCustomerId === customer.id;
                const st = faStatusStyle(h.status);
                return (
                  <View key={h.docNo} style={styles.hit}>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={styles.rowWrap}>
                        <TouchableOpacity onPress={() => h.editUrl && Linking.openURL(h.editUrl).catch(() => {})}>
                          <Text style={styles.docNo}>{h.docNo} ↗</Text>
                        </TouchableOpacity>
                        <View style={[styles.badge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.badgeText, { color: st.fg }]}>{faStatusLabel(h.status)}</Text>
                        </View>
                        <Text style={styles.originText}>{SEARCH_ORIGIN_LABEL[h.origin || ''] || h.origin || ''}</Text>
                      </View>
                      <Text style={styles.hitLine} numberOfLines={1}>{h.customer}{h.project ? ` · ${h.project}` : ''}</Text>
                      <Text style={styles.hitMeta}>
                        {h.date} · ฿{Number(h.grandTotal || 0).toLocaleString('th-TH')}{h.salesName ? ` · ${h.salesName}` : ''}
                        {h.crmCustomerId && !attachedHere ? ` · ผูกกับ ${h.crmChatName || 'ลูกค้าอื่น'} อยู่` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.attachBtn, (busy === h.docNo || attachedHere) && { opacity: 0.5 }]}
                      onPress={() => attach(h)}
                      disabled={busy === h.docNo || attachedHere}
                    >
                      {busy === h.docNo ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.attachBtnText}>{attachedHere ? 'ผูกแล้ว' : 'ผูก'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>ปิด</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 16 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: '#94a3b8' },
  body: { flex: 1, padding: 18, gap: 10 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  errorText: { fontSize: 12, color: '#dc2626' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 24 },
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 12,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  docNo: { fontSize: 13, fontWeight: '700', color: '#d97706' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  originText: { fontSize: 10, color: '#94a3b8' },
  hitLine: { fontSize: 12, color: '#475569' },
  hitMeta: { fontSize: 11, color: '#94a3b8' },
  attachBtn: { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 56, alignItems: 'center' },
  attachBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ghostBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  ghostBtnText: { fontSize: 14, color: '#475569', fontWeight: '600' },
});
