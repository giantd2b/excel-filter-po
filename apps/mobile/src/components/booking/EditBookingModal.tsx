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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateBooking, apiErrorMessage, type MeritBooking, type UpdateBookingPatch } from '../../services/bookings';
import { AreaPicker, Chips, Field, ThaiDatePicker, formStyles, type Area } from './FormBits';
import { fmtThaiDate } from './bookingHelpers';

const TIME_SLOTS = ['เช้า 07.00-07.30 น.', 'เพล 10.00-10.30 น.'];
const FLOORS = ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4 ขึ้นไป'];

interface Props {
  visible: boolean;
  booking: MeritBooking | null;
  onClose: () => void;
  onSaved: (b: MeritBooking, warnings: string[]) => void;
}

const withCurrent = (current: string | undefined, list: string[]) =>
  [current || '', ...list].filter((v, i, a) => v && a.indexOf(v) === i).map((v) => ({ value: v, label: v }));

function patchFrom(b: MeritBooking): UpdateBookingPatch {
  return {
    customerName: b.customerName || '',
    phone: b.phone || '',
    occasion: b.occasion || '',
    eventDate: b.eventDate || '',
    timeSlot: b.timeSlot || '',
    venue: b.venue || '',
    tambon: b.tambon || '',
    amphoe: b.amphoe || '',
    province: b.province || '',
    zip: b.zip || '',
    floor: b.floor || 'ชั้น 1',
    billingName: b.billingName || '',
    taxId: b.taxId || '',
    billingLine: b.billingLine || '',
    billingTambon: b.billingTambon || '',
    billingAmphoe: b.billingAmphoe || '',
    billingProvince: b.billingProvince || '',
    billingZip: b.billingZip || '',
    wantVat: b.wantVat ?? undefined,
    note: b.note || '',
  };
}

/**
 * Correct a booking's contact / date / venue / billing details. The API re-derives travel fee +
 * estimate and pushes date, time, address and phone into the linked quotation while it is still open.
 * Mirrors dashboard/src/components/EditBookingModal.tsx.
 */
export default function EditBookingModal({ visible, booking: b, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [f, setF] = useState<UpdateBookingPatch>({});
  const [sameBilling, setSameBilling] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !b) return;
    setF(patchFrom(b));
    setSameBilling(!(b.billingTambon && b.billingTambon !== b.tambon));
    setError(null);
  }, [visible, b?.id]);

  const set = <K extends keyof UpdateBookingPatch>(k: K, v: UpdateBookingPatch[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!b) return;
    setSaving(true);
    setError(null);
    try {
      const patch: UpdateBookingPatch = { ...f };
      if (sameBilling) {
        patch.billingLine = f.venue; patch.billingTambon = f.tambon; patch.billingAmphoe = f.amphoe; patch.billingProvince = f.province; patch.billingZip = f.zip;
      }
      const res = await updateBooking(b.id, patch);
      onSaved({ ...b, ...res.booking }, res.warnings);
    } catch (e: any) {
      const msg = apiErrorMessage(e, 'บันทึกไม่สำเร็จ');
      setError(msg);
      Alert.alert('บันทึกไม่สำเร็จ', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!b) return null;

  const venueArea: Area = { tambon: f.tambon || '', amphoe: f.amphoe || '', province: f.province || '', zip: f.zip || '' };
  const billingArea: Area = { tambon: f.billingTambon || '', amphoe: f.billingAmphoe || '', province: f.billingProvince || '', zip: f.billingZip || '' };
  const vatValue = f.wantVat === true ? 'yes' : f.wantVat === false ? 'no' : '';

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
            <Text style={styles.title}>✏️ แก้ไขการจอง {b.code}</Text>
            <Text style={styles.subtitle}>
              {b.packageName} · แพ็กเกจและจำนวนแขกเปลี่ยนไม่ได้ที่นี่ (สร้างการจองใหม่แทน) · วันงาน ที่อยู่ เบอร์ จะอัปเดตลงใบเสนอราคา {b.quotationDocNo || ''} ให้ถ้าใบยังไม่อนุมัติ
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label="ชื่อผู้ติดต่อ">
            <TextInput style={formStyles.input} value={f.customerName || ''} onChangeText={(v) => set('customerName', v)} />
          </Field>
          <Field label="เบอร์โทร">
            <TextInput style={formStyles.input} value={f.phone || ''} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
          </Field>
          <Field label="ประเภทงาน">
            <TextInput style={formStyles.input} value={f.occasion || ''} onChangeText={(v) => set('occasion', v)} />
          </Field>
          <Field label="ช่วงเวลา">
            <Chips options={withCurrent(f.timeSlot, TIME_SLOTS)} value={f.timeSlot || ''} onChange={(v) => set('timeSlot', v)} />
          </Field>
          <Field label="วันที่จัดงาน">
            <ThaiDatePicker value={f.eventDate || ''} onChange={(v) => set('eventDate', v)} />
            {f.eventDate ? <Text style={styles.datePreview}>วันที่เลือก: {fmtThaiDate(f.eventDate)}</Text> : null}
          </Field>
          <Field label="ชั้นที่จัดงาน">
            <Chips options={withCurrent(f.floor, FLOORS)} value={f.floor || ''} onChange={(v) => set('floor', v)} />
          </Field>

          <View style={[styles.box, styles.boxAmber]}>
            <Text style={[styles.boxTitle, { color: '#92400e' }]}>สถานที่จัดงาน (ใช้คิดค่าเดินทาง / พื้นที่บริการ)</Text>
            <Field label="บ้านเลขที่ / หมู่ / ถนน / ชื่อสถานที่">
              <TextInput style={formStyles.input} value={f.venue || ''} onChangeText={(v) => set('venue', v)} />
            </Field>
            <AreaPicker value={venueArea} onPick={(a) => setF((x) => ({ ...x, tambon: a.tambon, amphoe: a.amphoe, province: a.province, zip: a.zip }))} />
          </View>

          <View style={styles.box}>
            <View style={formStyles.switchRow}>
              <Text style={styles.boxTitle}>ที่อยู่ออกใบเสนอราคา</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: '#475569' }}>เดียวกับสถานที่จัดงาน</Text>
                <Switch value={sameBilling} onValueChange={setSameBilling} trackColor={{ true: '#a5b4fc', false: '#e2e8f0' }} thumbColor={sameBilling ? '#6366f1' : '#fff'} />
              </View>
            </View>
            <Field label="ออกในนาม (เว้นว่าง = ชื่อผู้ติดต่อ)">
              <TextInput style={formStyles.input} value={f.billingName || ''} onChangeText={(v) => set('billingName', v)} />
            </Field>
            <Field label="เลขผู้เสียภาษี (13 หลัก)">
              <TextInput style={formStyles.input} value={f.taxId || ''} onChangeText={(v) => set('taxId', v)} keyboardType="number-pad" maxLength={20} />
            </Field>
            {!sameBilling ? (
              <>
                <Field label="บ้านเลขที่ / หมู่ / ถนน">
                  <TextInput style={formStyles.input} value={f.billingLine || ''} onChangeText={(v) => set('billingLine', v)} />
                </Field>
                <AreaPicker value={billingArea} onPick={(a) => setF((x) => ({ ...x, billingTambon: a.tambon, billingAmphoe: a.amphoe, billingProvince: a.province, billingZip: a.zip }))} />
              </>
            ) : null}
          </View>

          <Field label="ใบกำกับภาษี (VAT 7%)">
            <Chips
              options={[{ value: '', label: 'ไม่ได้ระบุ' }, { value: 'yes', label: 'ต้องการ' }, { value: 'no', label: 'ไม่ต้องการ' }]}
              value={vatValue}
              onChange={(v) => set('wantVat', v === '' ? undefined : v === 'yes')}
            />
          </Field>
          <Field label="หมายเหตุ">
            <TextInput style={[formStyles.input, { minHeight: 64 }]} value={f.note || ''} onChangeText={(v) => set('note', v)} multiline maxLength={1000} />
          </Field>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>ยกเลิก</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>💾 บันทึก</Text>}
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
  body: { padding: 18, paddingBottom: 24, gap: 14 },
  datePreview: { fontSize: 12, fontWeight: '700', color: '#6d28d9', marginTop: 4 },
  box: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 10 },
  boxAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  boxTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
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
  primaryBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
