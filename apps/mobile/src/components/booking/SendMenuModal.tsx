import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBookingMenuPreview,
  getBookingPricing,
  sendBookingMenuToChat,
  apiErrorMessage,
  type MenuPartChoice,
  type MenuPreview,
  type PricingPackage,
} from '../../services/bookings';
import { Chips, Field } from './FormBits';

/** Fallback when /bookings/pricing is unreachable (mirrors apps/api/src/modules/bookings/menu-assets.ts). */
const FALLBACK_MENU_PACKAGES: PricingPackage[] = [
  { id: 'buffet-standard', name: 'บุฟเฟต์ เริ่มต้น', kind: 'catering', line: 'buffet', menuParts: ['buffet'] },
  { id: 'buffet-premium', name: 'บุฟเฟต์ พรีเมียม', kind: 'catering', line: 'buffet', menuParts: ['buffet'] },
  { id: 'chinese-2000', name: 'โต๊ะจีน 2,000', kind: 'catering', line: 'chinese', menuParts: ['table'] },
  { id: 'chinese-2300', name: 'โต๊ะจีน 2,300', kind: 'catering', line: 'chinese', menuParts: ['table'] },
  { id: 'chinese-2600', name: 'โต๊ะจีน 2,600', kind: 'catering', line: 'chinese', menuParts: ['table'] },
  { id: 'full', name: 'ครบวงจร', kind: 'full', line: 'merit', menuParts: ['buffet', 'table'] },
  { id: 'full-plus', name: 'ครบวงจร พลัส', kind: 'full', line: 'merit', menuParts: ['buffet', 'table'] },
  { id: 'prime', name: 'PRIME ครบวงจร', kind: 'full', line: 'merit', menuParts: ['buffet', 'table'] },
];
const LINE_OPTIONS = [
  { value: 'buffet', label: 'บุฟเฟต์อาหารไทย' },
  { value: 'chinese', label: 'โต๊ะจีน' },
  { value: 'merit', label: 'งานบุญ (เลี้ยงแขก)' },
];
const PART_OPTIONS: { value: MenuPartChoice; label: string }[] = [
  { value: 'all', label: 'ทั้งสองแบบ' },
  { value: 'buffet', label: 'บุฟเฟต์' },
  { value: 'table', label: 'โต๊ะจีน' },
];

interface Props {
  visible: boolean;
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  /** package to start on (e.g. the customer's latest booking) */
  defaultPackageId?: string | null;
  onClose: () => void;
  /** called after the menu was pushed, so the host can refresh the message list */
  onSent?: () => void;
}

/**
 * "ส่งเมนู": push a package's menu posters into the customer's chat as images, then a caption with
 * the price line and the storefront link. The API fans the images out (one message per poster).
 * Mirrors dashboard/src/components/inbox/SendMenuModal.tsx.
 */
export default function SendMenuModal({ visible, customer, defaultPackageId, onClose, onSent }: Props) {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PricingPackage[]>(FALLBACK_MENU_PACKAGES);
  const [packageId, setPackageId] = useState('buffet-premium');
  const [part, setPart] = useState<MenuPartChoice>('all');
  const [withLink, setWithLink] = useState(true);
  const [preview, setPreview] = useState<MenuPreview | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withMenu = packages.filter((p) => (p.menuParts?.length ?? 0) > 0);
  const pkg = withMenu.find((p) => p.id === packageId);
  const line = String(pkg?.line || 'buffet');
  const parts = pkg?.menuParts || [];
  const isFacebook = /facebook|fb|messenger/i.test(customer.channel);

  // reset per open, start on the customer's package when known
  useEffect(() => {
    if (!visible) return;
    setPart('all');
    setWithLink(true);
    setError(null);
    const start = defaultPackageId && withMenu.some((p) => p.id === defaultPackageId) ? defaultPackageId : 'buffet-premium';
    setPackageId(start);
    getBookingPricing()
      .then((res) => {
        const list = (res.packages || []).filter((p) => (p.menuParts?.length ?? 0) > 0);
        if (list.length) setPackages(list);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (parts.length === 1 && part !== 'all') setPart('all');
  }, [parts.length, part]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookingMenuPreview(packageId, part, withLink)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        setText(res.text);
      })
      .catch((e) => !cancelled && setError(apiErrorMessage(e, 'โหลดเมนูไม่สำเร็จ')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [visible, packageId, part, withLink]);

  const send = async () => {
    if (!preview) return;
    setSending(true);
    setError(null);
    try {
      await sendBookingMenuToChat({ customerId: customer.id, packageId, part, withLink, text: text.trim() || undefined });
      onSent?.();
      onClose();
    } catch (e) {
      const msg = apiErrorMessage(e, 'ส่งเมนูไม่สำเร็จ');
      setError(msg);
      Alert.alert('ส่งไม่สำเร็จ', msg);
    } finally {
      setSending(false);
    }
  };

  const total = (preview?.images.length ?? 0) + 1;
  const linePkgs = withMenu.filter((p) => String(p.line || 'merit') === line);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>🍽️ ส่งเมนูอาหารให้ {customer.displayName}</Text>
            <Text style={styles.subtitle}>ส่งรูปเมนูทุกหน้าเข้าแชต แล้วตามด้วยข้อความราคาและลิงก์หน้าแพ็กเกจ</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label="ประเภท">
            <Chips
              options={LINE_OPTIONS.filter((o) => withMenu.some((p) => String(p.line || 'merit') === o.value))}
              value={line}
              onChange={(v) => {
                const first = withMenu.find((p) => String(p.line || 'merit') === v);
                if (first) setPackageId(first.id);
              }}
            />
          </Field>

          <Field label="แพ็กเกจ">
            <Chips options={linePkgs.map((p) => ({ value: p.id, label: p.name }))} value={packageId} onChange={setPackageId} compact />
          </Field>

          {parts.length > 1 ? (
            <Field label="เมนูที่จะส่ง">
              <Chips options={PART_OPTIONS} value={part} onChange={(v) => setPart(v as MenuPartChoice)} />
            </Field>
          ) : null}

          <Field label={`รูปที่จะส่ง${preview ? ` (${preview.images.length} รูป)` : ''}`}>
            {loading ? <ActivityIndicator color="#94a3b8" style={{ alignSelf: 'flex-start' }} /> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(preview?.images || []).map((src, i) => (
                <TouchableOpacity key={src} onPress={() => Linking.openURL(src).catch(() => {})}>
                  <Image source={{ uri: src }} style={styles.thumb} />
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>{i + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label="ข้อความท้ายรูป">
            <TextInput
              style={[styles.input, { minHeight: 120 }]}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              placeholderTextColor="#94a3b8"
            />
          </Field>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>แนบลิงก์หน้าแพ็กเกจ</Text>
              {preview?.detailUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(preview.detailUrl).catch(() => {})}>
                  <Text style={styles.linkText} numberOfLines={1}>{preview.detailUrl}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Switch
              value={withLink}
              onValueChange={setWithLink}
              trackColor={{ true: '#a7f3d0', false: '#e2e8f0' }}
              thumbColor={withLink ? '#059669' : '#fff'}
            />
          </View>

          {isFacebook ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>Facebook ส่งได้เฉพาะแชตที่ลูกค้าทักเข้ามาภายใน 24 ชั่วโมง หากเกินกำหนดข้อความจะขึ้นสถานะส่งไม่สำเร็จ</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>ปิด</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1 }, (!preview || loading || sending || !preview.images.length) && styles.disabled]}
            onPress={send}
            disabled={!preview || loading || sending || !preview.images.length}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>📨 ส่งเข้าแชต ({total} ข้อความ)</Text>}
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
    gap: 12,
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
  body: { padding: 18, paddingBottom: 24, gap: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 19,
    textAlignVertical: 'top',
  },
  thumb: { width: 72, height: 100, borderRadius: 10, backgroundColor: '#e2e8f0' },
  thumbBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },
  linkText: { fontSize: 11, color: '#059669', marginTop: 2 },
  warnBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10 },
  warnText: { fontSize: 11, color: '#b45309', lineHeight: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, color: '#dc2626' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ghostBtn: { paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  ghostBtnText: { fontSize: 14, color: '#475569', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
