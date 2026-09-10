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
  sendBookingMenuToChat,
  cleanPreset,
  apiErrorMessage,
  type BookingEstimate,
  type BookingLink,
  type BookingPreset,
  type MonkOption,
  type MonkTransportOption,
  type PricingAddon,
  type PricingPackage,
} from '../../services/bookings';
import {
  DEFAULT_PRESET,
  DISH_COUNTS,
  FALLBACK_ADDONS,
  FALLBACK_MONK_OPTIONS,
  FALLBACK_MONK_TRANSPORT,
  FALLBACK_PACKAGES,
  LINES,
  buildLinkChatText,
  fmtThaiDate,
  monkArrangementOf,
  normalizePresetFor,
  occasionsFor,
  smallOrderFor,
  timeSlotsFor,
} from './bookingHelpers';
import { Chips, Field, ThaiDatePicker } from './FormBits';

interface Props {
  visible: boolean;
  customer: { id: string; oduserId?: string; channel: string; displayName: string };
  onClose: () => void;
  /** When given (ChatScreen), the message is sent through the host's own send path. */
  onSend?: (text: string) => void;
  onSent?: () => void;
}

type Mode = 'preset' | 'free';

/** the three things sales can offer — picking one filters the package list and every field below (mirrors dashboard) */
const LINE_CHOICES: { line: string; icon: string; label: string; hint: string }[] = [
  { line: 'merit', icon: '🙏', label: 'พิธีสงฆ์ / งานบุญ', hint: 'นิมนต์พระ + เลี้ยงแขก (หรือไม่มีแขก)' },
  { line: 'buffet', icon: '🍛', label: 'บุฟเฟต์อย่างเดียว', hint: 'อาหารไทยต่อท่าน ไม่มีพิธี' },
  { line: 'chinese', icon: '🥢', label: 'โต๊ะจีนอย่างเดียว', hint: 'ต่อโต๊ะ 8 ท่าน ไม่มีพิธี' },
];
/** package the form jumps to when sales switches line */
const LINE_FIRST: Record<string, string> = { merit: 'full', buffet: 'buffet-standard', chinese: 'chinese-2300' };
/** chip value that reveals the free-text occasion input */
const CUSTOM_OCCASION = '__custom__';

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
  const [monkOptions, setMonkOptions] = useState<MonkOption[]>(FALLBACK_MONK_OPTIONS);
  const [monkTransport, setMonkTransport] = useState<MonkTransportOption[]>(FALLBACK_MONK_TRANSPORT);
  const [travelFees, setTravelFees] = useState<Record<string, number>>({});
  const [preset, setPreset] = useState<BookingPreset>(DEFAULT_PRESET);
  const [estimate, setEstimate] = useState<BookingEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [freePackageId, setFreePackageId] = useState('');
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [depositText, setDepositText] = useState('');
  // also push the package menu posters before the link text (packages with a menu only)
  const [attachMenu, setAttachMenu] = useState(false);

  const pkg = packages.find((p) => p.id === preset.packageId);
  const hasFood = pkg?.kind === 'full';
  const isCatering = pkg?.kind === 'catering';
  const line = pkg?.line || 'merit';
  const includedAddons = pkg?.includedAddons || [];
  // stand-alone โต๊ะจีน under 15 tables: +200 บาท/โต๊ะ (the API adds it to the estimate and the quotation)
  const smallOrderRule = isCatering && pkg?.unit === 'table' ? pkg?.smallOrder || null : null;
  const smallOrder = smallOrderFor(pkg, preset.tables);
  const linePackages = packages.filter((p) => (p.line || 'merit') === line);
  // an occasion typed by hand (not in the list) keeps the free-text input open
  const occasionIsCustom = !occasionsFor(line).includes(preset.occasion || '');
  const switchLine = (l: string) => {
    if (l === line) return;
    const first = packages.find((p) => p.id === LINE_FIRST[l]) || packages.find((p) => (p.line || 'merit') === l);
    if (first) set('packageId', first.id);
  };
  // the package whose menu would be attached: the preset package, or the fixed package in free mode
  const menuPkg = mode === 'preset' ? pkg : packages.find((p) => p.id === freePackageId);
  const menuParts = menuPkg?.menuParts || [];
  const menuPart: 'buffet' | 'table' | 'all' =
    menuParts.length > 1 ? (mode === 'preset' ? (preset.foodMode === 'table' ? 'table' : 'buffet') : 'all') : 'all';
  const menuPartLabel = menuPart === 'table' ? 'โต๊ะจีน' : menuPart === 'buffet' ? 'บุฟเฟต์' : 'บุฟเฟต์ + โต๊ะจีน';
  // add-ons the selected package can be sold with (its line's, minus the ones it already includes)
  const lineAddons = addons.filter((a) => (!a.lines || a.lines.includes(line)) && !includedAddons.includes(a.id));
  // keep the preset consistent with the package (PRIME's drape, other lines' add-ons, no monks for catering …)
  useEffect(() => {
    setPreset((p) => normalizePresetFor(p, pkg, addons));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.packageId, packages, addons]);

  // Reset per open so a previous customer's link never leaks into the next one
  useEffect(() => {
    if (!visible) return;
    setMode('preset');
    setPreset(DEFAULT_PRESET);
    setDepositText('');
    setFreePackageId('');
    setAttachMenu(false);
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
        if (d.monkOptions?.length) setMonkOptions(d.monkOptions);
        if (d.monkTransportOptions?.length) setMonkTransport(d.monkTransportOptions);
        if (d.travelFees) setTravelFees(d.travelFees);
      })
      .catch(() => {});
  }, [visible]);

  // live price while sales configures the preset
  useEffect(() => {
    if (!visible || mode !== 'preset') return;
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      estimateBooking(cleanPreset(preset, pkg))
        .then((e) => { if (!cancelled) { setEstimate(e); setEstimateError(null); } })
        .catch((e: any) => { if (!cancelled) { setEstimate(null); setEstimateError(apiErrorMessage(e, 'คำนวณราคาไม่สำเร็จ')); } })
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
      setLink(await createBookingLink(customer.id, { preset: cleanPreset(preset, pkg) }));
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
    const text = buildLinkChatText(link, mode, pkg);
    setSending(true);
    setError(null);
    try {
      // the menu posters go first so the link lands last in the chat
      if (attachMenu && menuPkg && menuParts.length) {
        await sendBookingMenuToChat({ customerId: customer.id, packageId: menuPkg.id, part: menuPart, withLink: false });
      }
    } catch (e: any) {
      setSending(false);
      const msg = apiErrorMessage(e, 'ส่งรูปเมนูไม่สำเร็จ');
      setError(msg);
      Alert.alert('ส่งไม่สำเร็จ', msg);
      return;
    }
    if (onSend) {
      onSend(text);
      setSending(false);
      setSent(true);
      onSent?.();
      onClose();
      return;
    }
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

  // merit: buffet/table by foodMode (min 20 guests / 8 tables); catering: by the package unit and its minimum
  const perTable = isCatering ? pkg?.unit === 'table' : preset.foodMode === 'table';
  const numberField = perTable ? 'tables' : 'guests';
  const numberValue = perTable ? preset.tables : preset.guests;
  const numberStep = perTable ? 1 : isCatering ? 10 : 5;
  const numberMin = isCatering ? pkg?.minCount ?? 1 : perTable ? 8 : 20;
  const vatValue = preset.wantVat === true ? 'yes' : preset.wantVat === false ? 'no' : '';
  const shownTotal = estimate ? (preset.wantVat ? estimate.grandTotal : estimate.total) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.root} behavior="padding">
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
                options={[
                  { value: '', label: 'ให้ลูกค้าเลือกเอง' },
                  ...LINES.flatMap((l) => packages.filter((p) => (p.line || 'merit') === l.id).map((p) => ({ value: p.id, label: p.name }))),
                ]}
                value={freePackageId}
                onChange={setFreePackageId}
              />
            </Field>
          ) : (
            <>
              {/* 1. which line — the package list and every field below follow it */}
              <Field label="รูปแบบงานที่จะเสนอให้ลูกค้า">
                <View style={styles.lineRow}>
                  {LINE_CHOICES.map((c) => {
                    const active = line === c.line;
                    return (
                      <TouchableOpacity key={c.line} style={[styles.lineCard, active && styles.lineCardActive]} onPress={() => switchLine(c.line)}>
                        <Text style={[styles.lineCardTitle, active && styles.lineCardTitleActive]}>{c.icon} {c.label}</Text>
                        <Text style={styles.lineCardHint}>{c.hint}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              <Field label={`แพ็กเกจ · ${LINES.find((l) => l.id === line)?.label || ''}`}>
                <Chips
                  options={linePackages.map((p) => ({ value: p.id, label: p.name }))}
                  value={preset.packageId}
                  onChange={(v) => set('packageId', v)}
                />
              </Field>

              {isCatering && pkg?.unit === 'guest' ? (
                <Field label="จำนวนอาหารคาว">
                  <Chips
                    options={DISH_COUNTS.map((n) => ({ value: String(n), label: `${n} อย่าง` }))}
                    value={String(preset.dishCount ?? 6)}
                    onChange={(v) => set('dishCount', parseInt(v, 10))}
                  />
                </Field>
              ) : null}

              {isCatering ? (
                <Field label={perTable ? `จำนวนโต๊ะ (ขั้นต่ำ ${numberMin} · โต๊ะละ 8 ท่าน)` : `จำนวนแขก (ท่าน, ขั้นต่ำ ${numberMin})`}>
                  <View style={styles.stepRow}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => set(numberField, Math.max(numberMin, numberValue - numberStep))}>
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
                  {smallOrderRule ? (
                    <View style={[styles.noticeBox, smallOrder ? styles.noticeBoxHot : null]}>
                      <Text style={[styles.noticeTitle, smallOrder ? styles.noticeTitleHot : null]}>
                        ⚠️ {smallOrder
                          ? `จัด ${preset.tables} โต๊ะ (ต่ำกว่า ${smallOrder.below} โต๊ะ) มีค่าบริการจัดเลี้ยงเพิ่ม +${smallOrder.total.toLocaleString('th-TH')} บาท`
                          : 'หมายเหตุสำคัญ'}
                      </Text>
                      <Text style={styles.noticeText}>
                        รับจัดขั้นต่ำ {pkg?.minCount ?? 10} โต๊ะ · จัดไม่ถึง {smallOrderRule.below} โต๊ะ คิดค่าบริการจัดเลี้ยงเพิ่มเติม {smallOrderRule.fee} บาท/โต๊ะ
                        {smallOrder ? ' (รวมในราคาประเมินและใบเสนอราคาแล้ว — แจ้งลูกค้าให้ชัดเจน)' : ''}
                      </Text>
                    </View>
                  ) : null}
                </Field>
              ) : null}

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

              {!isCatering ? (
                <>
                  <Field label="พระสงฆ์">
                    <Chips
                      options={monkOptions.map((o) => ({
                        value: String(o.monks),
                        label: o.discount > 0 ? `${o.monks} รูป (ลด ${o.discount.toLocaleString('th-TH')})` : `${o.monks} รูป`,
                      }))}
                      value={String(preset.monks)}
                      onChange={(v) => set('monks', parseInt(v, 10))}
                    />
                  </Field>

                  <Field label="นิมนต์ / รับ-ส่งพระ">
                    <Chips
                      options={monkTransport.map((o) => ({ value: o.id, label: o.label }))}
                      value={monkArrangementOf(preset)}
                      onChange={(v) => {
                        const o = monkTransport.find((x) => x.id === v);
                        if (o) setPreset((p) => ({ ...p, selfInvite: o.selfInvite, selfTransport: o.selfTransport }));
                      }}
                    />
                  </Field>
                </>
              ) : null}

              <View style={styles.sectionDivider} />

              <Field label="ประเภทงาน">
                <Chips
                  options={[...occasionsFor(line).map((o) => ({ value: o, label: o })), { value: CUSTOM_OCCASION, label: 'อื่น ๆ (ระบุเอง)' }]}
                  value={occasionIsCustom ? CUSTOM_OCCASION : preset.occasion || ''}
                  onChange={(v) => set('occasion', v === CUSTOM_OCCASION ? '' : v)}
                />
                {occasionIsCustom ? (
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={preset.occasion || ''}
                    onChangeText={(v) => set('occasion', v)}
                    placeholder={line === 'merit' ? 'เช่น ทำบุญครบรอบวันตาย' : 'เช่น งานเปิดตัวสินค้า'}
                    placeholderTextColor="#94a3b8"
                    autoFocus
                  />
                ) : null}
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

              <Field label={isCatering ? 'ช่วงเวลาเสิร์ฟ' : 'ช่วงเวลาพิธี'}>
                <Chips
                  options={timeSlotsFor(line).map((t) => ({ value: t.v, label: t.label }))}
                  value={preset.timeSlot || ''}
                  onChange={(v) => set('timeSlot', v)}
                />
              </Field>

              <Field label="ออปชั่นเสริม">
                <View style={styles.rowWrap}>
                  {lineAddons.length === 0 ? <Text style={styles.muted}>แพ็กเกจนี้ไม่มีออปชั่นเสริม</Text> : null}
                  {addons.filter((a) => !a.lines || a.lines.includes(line)).map((a) => {
                    const included = includedAddons.includes(a.id);
                    const on = !included && preset.addons.includes(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        disabled={included}
                        style={[styles.chip, on && styles.chipActive, included && styles.chipDisabled]}
                        onPress={() => set('addons', on ? preset.addons.filter((x) => x !== a.id) : [...preset.addons, a.id])}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextActive]}>
                          {a.label}
                          {included ? ' · รวมในแพ็กเกจแล้ว' : a.perUnit === 'table' ? ` · ${(a.price ?? 250).toLocaleString('th-TH')}/โต๊ะ` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              <Field label="อำเภอ/เขตของสถานที่จัดงาน (คิดค่าเดินทาง)">
                <Chips
                  compact
                  options={[
                    { value: '', label: 'ไม่มีค่าเดินทาง / ยังไม่ทราบ' },
                    ...Object.entries(travelFees)
                      .sort((a, b) => a[0].localeCompare(b[0], 'th'))
                      .map(([k, v]) => ({ value: k, label: `${k} · +${Number(v).toLocaleString('th-TH')}` })),
                  ]}
                  value={preset.amphoe || ''}
                  onChange={(v) => set('amphoe', v || undefined)}
                />
                <Text style={styles.fieldHint}>ราคาจริงคิดจากอำเภอที่ลูกค้าเลือกในฟอร์มเสมอ</Text>
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
                    <Text style={[styles.estimateHint, !estimating && estimateError ? styles.estimateError : null]}>
                      {estimating ? 'กำลังคำนวณราคาจาก IRIS Quotation…' : estimateError || 'คำนวณราคาไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วแก้ค่าอีกครั้ง'}
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

          {menuParts.length > 0 ? (
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { flex: 1 }]}>ส่งรูปเมนูอาหาร ({menuPartLabel}) ก่อนลิงก์จองด้วย</Text>
              <Switch
                value={attachMenu}
                onValueChange={setAttachMenu}
                trackColor={{ true: '#a7f3d0', false: '#e2e8f0' }}
                thumbColor={attachMenu ? '#059669' : '#fff'}
              />
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
  muted: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  estimateError: { fontSize: 12, color: '#b91c1c' },
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
  chipDisabled: { opacity: 0.45 },
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
  lineRow: { flexDirection: 'row', gap: 6 },
  lineCard: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 8, backgroundColor: '#fff', gap: 2 },
  lineCardActive: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
  lineCardTitle: { fontSize: 11, fontWeight: '700', color: '#334155' },
  lineCardTitleActive: { color: '#5b21b6' },
  lineCardHint: { fontSize: 9.5, color: '#64748b', lineHeight: 13 },
  sectionDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  noticeBox: { marginTop: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 10, padding: 10, gap: 2 },
  noticeBoxHot: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  noticeTitle: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  noticeTitleHot: { color: '#b91c1c' },
  noticeText: { fontSize: 11, color: '#334155', lineHeight: 16 },
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
