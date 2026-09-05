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
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBookingLink,
  estimateBooking,
  getBookingPricing,
  sendChatMessage,
  cleanPreset,
  apiErrorMessage,
  type BookingEstimate,
  type BookingLink,
  type BookingPreset,
  type PricingAddon,
  type PricingPackage,
} from '../../services/bookings';
import {
  DEFAULT_PRESET,
  FALLBACK_ADDONS,
  FALLBACK_PACKAGES,
  OCCASIONS,
  THAI_MONTHS,
  TIME_SLOTS,
  buildLinkChatText,
  daysInMonth,
  fmtThaiDate,
} from './bookingHelpers';

interface Props {
  visible: boolean;
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  onClose: () => void;
  /** When given (ChatScreen), the message is sent through the host's own send path. */
  onSend?: (text: string) => void;
  onSent?: () => void;
}

type Mode = 'preset' | 'free';

/**
 * "ลิงก์จอง": a unique /booking/?ref=<token> link for one chat customer.
 * preset = sales fixes the whole package (+ live price); free = customer picks in the wizard.
 * Mirrors dashboard/src/components/inbox/BookingLinkModal.tsx field-for-field.
 */
export default function BookingLinkModal({ visible, customer, onClose, onSend, onSent }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('preset');
  const [packages, setPackages] = useState<PricingPackage[]>(FALLBACK_PACKAGES);
  const [addons, setAddons] = useState<PricingAddon[]>(FALLBACK_ADDONS);
  const [preset, setPreset] = useState<BookingPreset>(DEFAULT_PRESET);
  const [estimate, setEstimate] = useState<BookingEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [freePackageId, setFreePackageId] = useState('');
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [depositText, setDepositText] = useState('');

  const pkg = packages.find((p) => p.id === preset.packageId);
  const hasFood = pkg?.kind === 'full';

  // Reset per open so a previous customer's link never leaks into the next one
  useEffect(() => {
    if (!visible) return;
    setMode('preset');
    setPreset(DEFAULT_PRESET);
    setDepositText('');
    setFreePackageId('');
    setLink(null);
    setError(null);
    setSent(false);
    setCopied(false);
  }, [visible, customer.id]);

  useEffect(() => {
    if (!visible) return;
    getBookingPricing()
      .then((d) => {
        if (d.packages.length) setPackages(d.packages);
        if (d.addons.length) setAddons(d.addons);
      })
      .catch(() => {});
  }, [visible]);

  // live price while sales configures the preset
  useEffect(() => {
    if (!visible || mode !== 'preset') return;
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      estimateBooking(cleanPreset(preset))
        .then((e) => { if (!cancelled) setEstimate(e); })
        .catch(() => { if (!cancelled) setEstimate(null); })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [visible, mode, preset]);

  // free mode: the stable per-customer link is fetched right away
  useEffect(() => {
    if (!visible || mode !== 'free') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSent(false);
    createBookingLink(customer.id, { packageId: freePackageId || undefined })
      .then((l) => { if (!cancelled) setLink(l); })
      .catch((e: any) => { if (!cancelled) setError(apiErrorMessage(e, 'สร้างลิงก์ไม่สำเร็จ')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, mode, customer.id, freePackageId]);

  const set = <K extends keyof BookingPreset>(k: K, v: BookingPreset[K]) => {
    setPreset((p) => ({ ...p, [k]: v }));
    setLink(null);
    setSent(false);
  };

  const setDeposit = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setDepositText(digits);
    set('depositAmount', digits === '' ? null : Math.max(0, parseInt(digits, 10) || 0));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setLink(null);
    setError(null);
    setSent(false);
  };

  const createPresetLink = async () => {
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      setLink(await createBookingLink(customer.id, { preset: cleanPreset(preset) }));
    } catch (e: any) {
      const msg = apiErrorMessage(e, 'สร้างลิงก์ไม่สำเร็จ');
      setError(msg);
      Alert.alert('สร้างลิงก์ไม่สำเร็จ', msg);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try { await Clipboard.setStringAsync(link.url); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendToChat = async () => {
    if (!link || !customer.oduserId) return;
    const text = buildLinkChatText(link, mode, hasFood);
    if (onSend) {
      onSend(text);
      setSent(true);
      onSent?.();
      onClose();
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendChatMessage({ oduserId: customer.oduserId, docId: customer.id, text, channel: customer.channel });
      setSent(true);
      onSent?.();
      Alert.alert('ส่งแล้ว', 'ส่งลิงก์จองในแชตเรียบร้อย');
    } catch (e: any) {
      const msg = apiErrorMessage(e, 'ส่งข้อความไม่สำเร็จ');
      setError(msg);
      Alert.alert('ส่งไม่สำเร็จ', msg);
    } finally {
      setSending(false);
    }
  };

  const numberField = preset.foodMode === 'table' ? 'tables' : 'guests';
  const numberValue = preset.foodMode === 'table' ? preset.tables : preset.guests;
  const numberStep = preset.foodMode === 'table' ? 1 : 5;
  const numberMin = preset.foodMode === 'table' ? 8 : 20;
  const vatValue = preset.wantVat === true ? 'yes' : preset.wantVat === false ? 'no' : '';
  const shownTotal = estimate ? (preset.wantVat ? estimate.grandTotal : estimate.total) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>🔗 ลิงก์จองสำหรับ {customer.displayName}</Text>
            <Text style={styles.subtitle}>
              การจองและใบเสนอราคาจากลิงก์นี้จะระบุว่ามาจากแชตนี้ ช่องทางไหน และเซลล์คนไหนเป็นคนส่ง
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mode switch */}
          <View style={styles.segment}>
            {([
              { key: 'preset', label: 'ตั้งแพ็กเกจให้ลูกค้า' },
              { key: 'free', label: 'ให้ลูกค้าเลือกเอง' },
            ] as { key: Mode; label: string }[]).map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.segmentItem, mode === m.key && styles.segmentItemActive]}
                onPress={() => switchMode(m.key)}
              >
                <Text style={[styles.segmentText, mode === m.key && styles.segmentTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'free' ? (
            <Field label="แพ็กเกจเริ่มต้น (ไม่บังคับ)">
              <Chips
                options={[{ value: '', label: 'ให้ลูกค้าเลือกเอง' }, ...packages.map((p) => ({ value: p.id, label: p.name }))]}
                value={freePackageId}
                onChange={setFreePackageId}
              />
            </Field>
          ) : (
            <>
              <Field label="ประเภทงาน">
                <Chips
                  options={OCCASIONS.map((o) => ({ value: o, label: o }))}
                  value={preset.occasion || ''}
                  onChange={(v) => set('occasion', v)}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={preset.occasion || ''}
                  onChangeText={(v) => set('occasion', v)}
                  placeholder="หรือพิมพ์เอง เช่น ทำบุญขึ้นบ้านใหม่"
                  placeholderTextColor="#94a3b8"
                />
              </Field>

              <Field label="วันที่จัดงาน (เว้นว่างให้ลูกค้าเลือก)">
                <ThaiDatePicker value={preset.eventDate || ''} onChange={(v) => set('eventDate', v)} />
                {preset.eventDate ? (
                  <View style={[styles.rowWrap, { alignItems: 'center', marginTop: 6 }]}>
                    <Text style={styles.datePreview}>วันที่เลือก: {fmtThaiDate(preset.eventDate)}</Text>
                    <TouchableOpacity style={styles.miniBtn} onPress={() => set('eventDate', '')}>
                      <Text style={[styles.miniBtnText, { color: '#dc2626' }]}>ล้างวันที่ (ให้ลูกค้าเลือก)</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Field>

              <Field label="ช่วงเวลาพิธี">
                <Chips
                  options={TIME_SLOTS.map((t) => ({ value: t.v, label: t.label }))}
                  value={preset.timeSlot || ''}
                  onChange={(v) => set('timeSlot', v)}
                />
              </Field>

              <Field label="แพ็กเกจ">
                <Chips
                  options={packages.map((p) => ({ value: p.id, label: p.name }))}
                  value={preset.packageId}
                  onChange={(v) => set('packageId', v)}
                />
              </Field>

              {hasFood ? (
                <>
                  <Field label="อาหารเลี้ยงแขก">
                    <Chips
                      options={[{ value: 'buffet', label: 'บุฟเฟต์' }, { value: 'table', label: 'โต๊ะจีน' }]}
                      value={preset.foodMode}
                      onChange={(v) => set('foodMode', v as 'buffet' | 'table')}
                    />
                  </Field>
                  <Field label={preset.foodMode === 'table' ? 'จำนวนโต๊ะ (อย่างน้อย 8)' : 'จำนวนแขก (ท่าน, อย่างน้อย 20)'}>
                    <View style={styles.stepRow}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => set(numberField, Math.max(numberMin, numberValue - numberStep))}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, styles.numberInput]}
                        keyboardType="number-pad"
                        value={String(numberValue)}
                        onChangeText={(v) => set(numberField, Math.max(0, parseInt(v || '0', 10) || 0))}
                        selectTextOnFocus
                      />
                      <TouchableOpacity style={styles.stepBtn} onPress={() => set(numberField, numberValue + numberStep)}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </Field>
                </>
              ) : null}

              <Field label="พระสงฆ์">
                <Chips
                  options={[{ value: '9', label: '9 รูป' }, { value: '5', label: '5 รูป (ลด 1,500)' }]}
                  value={String(preset.monks)}
                  onChange={(v) => set('monks', parseInt(v, 10))}
                />
              </Field>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>ลูกค้านิมนต์รับ-ส่งพระเอง</Text>
                <Switch
                  value={preset.selfTransport}
                  onValueChange={(v) => set('selfTransport', v)}
                  trackColor={{ true: '#a5b4fc', false: '#e2e8f0' }}
                  thumbColor={preset.selfTransport ? '#6366f1' : '#fff'}
                />
              </View>

              <Field label="ออปชั่นเสริม">
                <View style={styles.rowWrap}>
                  {addons.map((a) => {
                    const on = preset.addons.includes(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.chip, on && styles.chipActive]}
                        onPress={() => set('addons', on ? preset.addons.filter((x) => x !== a.id) : [...preset.addons, a.id])}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextActive]}>{a.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              <Field label="ใบกำกับภาษี (VAT 7%)">
                <Chips
                  options={[
                    { value: '', label: 'ให้ลูกค้าเลือกเอง' },
                    { value: 'yes', label: 'รับ VAT' },
                    { value: 'no', label: 'ไม่รับ VAT' },
                  ]}
                  value={vatValue}
                  onChange={(v) => set('wantVat', v === 'yes' ? true : v === 'no' ? false : null)}
                />
                <Text style={styles.fieldHint}>
                  {vatValue === 'yes'
                    ? 'ราคารวมภาษี 7% และออกใบกำกับภาษี'
                    : vatValue === 'no'
                      ? 'ราคาไม่รวมภาษี'
                      : 'ลูกค้าเลือกเองบนหน้าจอง'}
                </Text>
              </Field>

              <Field
                label={`ยอดมัดจำ (บาท) — เว้นว่าง = ตามกติกาค่าอาหาร${
                  estimate ? ` (${estimate.depositAmount.toLocaleString('th-TH')} บาท จากค่าอาหาร ${estimate.foodAmount.toLocaleString('th-TH')})` : ''
                }`}
              >
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={depositText}
                  onChangeText={setDeposit}
                  placeholder="ระบุเองเมื่อต้องการยอดต่างจากกติกา"
                  placeholderTextColor="#94a3b8"
                />
              </Field>

              <Field label="ข้อความถึงลูกค้า (แสดงบนหน้าจอง ไม่บังคับ)">
                <TextInput
                  style={[styles.input, { minHeight: 64 }]}
                  value={preset.note || ''}
                  onChangeText={(v) => set('note', v)}
                  placeholder="เช่น ราคานี้รวมเต้นท์ใหญ่ 1 หลังแล้วค่ะ"
                  placeholderTextColor="#94a3b8"
                  multiline
                  maxLength={500}
                />
              </Field>

              {/* Estimate */}
              <View style={styles.estimateBox}>
                {estimate ? (
                  <>
                    {estimate.rows.map((r, i) => (
                      <View key={`${r.k}-${i}`} style={styles.estimateRow}>
                        <Text style={styles.estimateKey}>{r.k}</Text>
                        <Text style={styles.estimateVal}>{r.v}</Text>
                      </View>
                    ))}
                    <View style={styles.estimateRow}>
                      <Text style={styles.estimateKey}>มัดจำเพื่อยืนยันคิว{estimate.depositManual ? ' (ระบุเอง)' : ''}</Text>
                      <Text style={[styles.estimateVal, { color: '#b45309', fontWeight: '700' }]}>
                        {estimate.depositAmount.toLocaleString('th-TH')} บาท
                      </Text>
                    </View>
                    <View style={styles.estimateTotalRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.estimateTotalLabel}>ราคาประเมิน</Text>
                        {estimating ? <ActivityIndicator size="small" color="#6366f1" /> : null}
                      </View>
                      <Text style={styles.estimateTotal}>
                        ฿{shownTotal.toLocaleString('th-TH')}{preset.wantVat ? ' รวม VAT' : ''}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {estimating ? <ActivityIndicator size="small" color="#94a3b8" /> : null}
                    <Text style={styles.estimateHint}>
                      {estimating ? 'กำลังคำนวณราคาจาก IRIS Quotation…' : 'คำนวณราคาไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วแก้ค่าอีกครั้ง'}
                    </Text>
                  </View>
                )}
              </View>

              {!link ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.violetBtn, (loading || !estimate) && styles.disabled]}
                  onPress={createPresetLink}
                  disabled={loading || !estimate}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>🔗 สร้างลิงก์จองด้วยแพ็กเกจนี้</Text>}
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* Link result */}
          {loading && mode === 'free' ? (
            <ActivityIndicator color="#94a3b8" style={{ marginVertical: 16 }} />
          ) : link ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkUrl} selectable numberOfLines={2}>{link.url}</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity style={styles.miniBtn} onPress={copy}>
                  <Text style={[styles.miniBtnText, copied && { color: '#059669' }]}>{copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => Linking.openURL(link.url).catch(() => {})}>
                  <Text style={styles.miniBtnText}>↗ เปิดดูหน้าจอง</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.linkMeta}>
                {[
                  link.channel ? `ช่องทาง: ${link.channel}` : null,
                  link.packageName
                    ? `แพ็กเกจ: ${link.packageName}${link.estimatedTotal != null ? ` · ฿${link.estimatedTotal.toLocaleString('th-TH')}` : ''}`
                    : null,
                  link.depositAmount != null ? `มัดจำ ฿${link.depositAmount.toLocaleString('th-TH')}` : null,
                  link.createdByName ? `สร้างโดย: ${link.createdByName}` : null,
                  `เปิดแล้ว ${link.openCount ?? 0} ครั้ง`,
                  `จองผ่านลิงก์นี้ ${link.bookingCount ?? 0} รายการ`,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>ปิด</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1 }, (!link || sending || sent || !customer.oduserId) && styles.disabled]}
            onPress={sendToChat}
            disabled={!link || sending || sent || !customer.oduserId}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{sent ? '✓ ส่งแล้ว' : '📨 ส่งในแชต'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Small building blocks ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chips({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.rowWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value || '__empty'}
            style={[styles.chip, compact && styles.chipCompact, on && styles.chipActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.chipText, on && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Day / month / year pickers that produce a plain "YYYY-MM-DD" string — the same
 * approach as the dashboard's ThaiDateSelect (a native date picker once produced a value
 * one day off from what sales tapped; explicit parts leave no room for timezone surprises).
 */
function ThaiDatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  const y = m ? Number(m[1]) : 0;
  const mo = m ? Number(m[2]) : 0;
  const d = m ? Number(m[3]) : 0;
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const maxDay = y && mo ? daysInMonth(y, mo) : 31;

  const emit = (ny: number, nmo: number, nd: number) => {
    if (!ny || !nmo || !nd) {
      onChange('');
      return;
    }
    const dd = Math.min(nd, daysInMonth(ny, nmo));
    onChange(`${ny}-${String(nmo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>ปี</Text>
        <Chips
          compact
          options={years.map((yy) => ({ value: String(yy), label: String(yy + 543) }))}
          value={y ? String(y) : ''}
          onChange={(v) => emit(Number(v), mo || new Date().getMonth() + 1, d || 1)}
        />
      </View>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>เดือน</Text>
        <Chips
          compact
          options={THAI_MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))}
          value={mo ? String(mo) : ''}
          onChange={(v) => emit(y || thisYear, Number(v), d || 1)}
        />
      </View>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>วัน</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => {
              const on = n === d;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, styles.chipCompact, styles.dayChip, on && styles.chipActive]}
                  onPress={() => emit(y || thisYear, mo || new Date().getMonth() + 1, n)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
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
  body: { padding: 18, paddingBottom: 24, gap: 14 },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 999, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  segmentTextActive: { color: '#1e293b' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  fieldHint: { fontSize: 11, color: '#94a3b8' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#1e293b',
  },
  numberInput: { flex: 1, textAlign: 'center', fontWeight: '700' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipCompact: { paddingHorizontal: 10, paddingVertical: 5 },
  dayChip: { minWidth: 36, alignItems: 'center' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  dateBlock: { gap: 4 },
  dateBlockLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  datePreview: { fontSize: 12, fontWeight: '700', color: '#6d28d9' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { fontSize: 16, color: '#4f46e5', fontWeight: '700' },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  miniBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },
  estimateBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, gap: 8 },
  estimateKey: { fontSize: 12, color: '#64748b', flex: 1 },
  estimateVal: { fontSize: 12, color: '#475569', fontVariant: ['tabular-nums'] },
  estimateTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  estimateTotalLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  estimateTotal: { fontSize: 16, fontWeight: '800', color: '#1e293b', fontVariant: ['tabular-nums'] },
  estimateHint: { fontSize: 12, color: '#94a3b8', flex: 1 },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  violetBtn: { backgroundColor: '#7c3aed' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  linkBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    padding: 12,
    gap: 8,
  },
  linkUrl: { fontSize: 12, color: '#334155', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  linkMeta: { fontSize: 11, color: '#64748b', lineHeight: 16 },
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
});
