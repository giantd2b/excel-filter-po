import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Platform } from 'react-native';
import type { MeritBooking } from '../../services/bookings';
import {
  NEXT_STATUS,
  addressLine,
  foodLine,
  formatBaht,
  formatDateTime,
  isGroundFloor,
  statusLabel,
  statusStyle,
  tentAdvice,
} from './bookingHelpers';

interface Props {
  booking: MeritBooking;
  busy?: boolean;
  copied?: boolean;
  onAdvance: (b: MeritBooking) => void;
  onDelete: (b: MeritBooking) => void;
  onCreateQuote: (b: MeritBooking) => void;
  onCopyPublicLink: (b: MeritBooking) => void;
  onSendQuoteToChat?: (b: MeritBooking) => void;
}

export default function BookingCard({
  booking: b,
  busy,
  copied,
  onAdvance,
  onDelete,
  onCreateQuote,
  onCopyPublicLink,
  onSendQuoteToChat,
}: Props) {
  const st = statusStyle(b.status);
  const tent = tentAdvice(b);
  const hasTent = (b.addons || []).includes('tent');
  const chatLink = b.source === 'chat_link';
  const groundFloor = isGroundFloor(b.floor);
  const next = NEXT_STATUS[b.status || ''] || 'NEW';

  return (
    <View style={[styles.card, busy && { opacity: 0.6 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{b.billingName || b.customerName || '-'}</Text>
          {b.billingName ? (
            <Text style={styles.sub}>ผู้ติดต่อ: {b.customerName}{b.taxId ? ` · เลขผู้เสียภาษี ${b.taxId}` : ''}</Text>
          ) : null}
          <View style={styles.codeRow}>
            <Text style={styles.code}>{b.code}</Text>
            {b.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${b.phone}`)}>
                <Text style={styles.phone}>📞 {b.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.fg }]}>{statusLabel(b.status)}</Text>
        </View>
      </View>

      {/* Attribution */}
      <View style={styles.rowWrap}>
        {b.customerId ? (
          <View style={[styles.tag, chatLink ? styles.tagViolet : styles.tagSlate]}>
            <Text style={[styles.tagText, chatLink ? { color: '#6d28d9' } : { color: '#475569' }]}>
              💬 {b.channel || 'แชต'} · {b.chatCustomerName || '-'}
              {b.salesName ? ` · เซลล์ ${b.salesName}` : ''}
              {!chatLink ? ' (จับคู่ด้วยเบอร์)' : ''}
            </Text>
          </View>
        ) : (
          <View style={[styles.tag, styles.tagSlate]}>
            <Text style={[styles.tagText, { color: '#64748b' }]}>เว็บ · ไม่พบในแชต</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.pkg}>
          {b.packageName || b.packageId || '-'} · พระ {b.monks ?? '-'} รูป · {foodLine(b)}
        </Text>
        {b.depositAmount != null ? (
          <View style={styles.rowWrap}>
            <View style={[styles.tag, styles.tagAmber]}>
              <Text style={[styles.tagText, { color: '#b45309' }]}>
                มัดจำ {Number(b.depositAmount).toLocaleString('th-TH')} บาท{b.depositManual ? ' · ระบุเอง' : ''}
              </Text>
            </View>
          </View>
        ) : null}
        {typeof b.wantVat === 'boolean' ? (
          <View style={styles.rowWrap}>
            <View style={[styles.tag, b.wantVat ? styles.tagBlue : styles.tagSlate]}>
              <Text style={[styles.tagText, b.wantVat ? { color: '#1d4ed8', fontWeight: '700' } : { color: '#475569' }]}>
                {b.wantVat
                  ? `รับ VAT 7% · รวม ${Math.round(Number(b.estimatedTotal ?? 0) * 1.07).toLocaleString('th-TH')} บาท`
                  : 'ไม่รับ VAT'}
              </Text>
            </View>
          </View>
        ) : null}
        {b.floor ? (
          <View style={styles.rowWrap}>
            <View style={[styles.tag, groundFloor ? styles.tagSlate : styles.tagAmber]}>
              <Text style={[styles.tagText, groundFloor ? { color: '#475569' } : { color: '#b45309', fontWeight: '700' }]}>
                จัดงาน{b.floor}{groundFloor ? '' : ' · ตรวจสอบราคา'}
              </Text>
            </View>
          </View>
        ) : null}
        {b.customerAddress ? (
          <Text style={styles.muted}>ที่อยู่ออกใบเสนอราคา: {b.customerAddress}</Text>
        ) : null}
        {tent ? (
          <View style={[styles.advice, hasTent ? styles.adviceGreen : styles.adviceAmber]}>
            <Text style={[styles.adviceText, hasTent ? { color: '#047857' } : { color: '#b45309' }]}>
              {hasTent
                ? `เลือกเต้นท์ใหญ่เพิ่ม 1 หลังแล้ว (${tent})`
                : `แนะนำเพิ่มเต้นท์ใหญ่ 5x12 อีก 1 หลัง: ${tent} — ลูกค้ายังไม่ได้เลือก`}
            </Text>
          </View>
        ) : null}
        <Text style={styles.line}>📅 {b.eventDate || '-'} · {b.timeSlot || '-'} · {b.occasion || '-'}</Text>
        <Text style={styles.line} numberOfLines={2}>📍 {addressLine(b)}</Text>
        {b.selfTransport ? <Text style={styles.green}>นิมนต์รับ-ส่งพระเอง (ลด 1,000)</Text> : null}
        {b.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.muted}>หมายเหตุ: {b.note}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.total}>{formatBaht(b.estimatedTotal)}</Text>
          {b.travelFee ? (
            <Text style={styles.travel}>รวมค่าเดินทาง {b.travelArea || ''} {formatBaht(b.travelFee)}</Text>
          ) : null}
          <Text style={styles.created}>จองเมื่อ {formatDateTime(b.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {b.quotationUrl ? (
          <TouchableOpacity style={[styles.pill, styles.pillGreen]} onPress={() => Linking.openURL(b.quotationUrl!)}>
            <Text style={[styles.pillText, { color: '#047857' }]}>📄 {b.quotationDocNo || 'ใบเสนอราคา'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.pill, styles.pillPrimaryOutline]} onPress={() => onCreateQuote(b)} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color="#6366f1" /> : <Text style={[styles.pillText, { color: '#4f46e5' }]}>📄 ใบเสนอราคา</Text>}
          </TouchableOpacity>
        )}
        {b.quotationPublicUrl ? (
          <TouchableOpacity style={[styles.pill, styles.pillOutline]} onPress={() => onCopyPublicLink(b)}>
            <Text style={[styles.pillText, { color: copied ? '#059669' : '#475569' }]}>
              {copied ? '✓ คัดลอกแล้ว' : '🔗 ลิงก์ลูกค้า'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {b.quotationPublicUrl && b.customerId && onSendQuoteToChat ? (
          <TouchableOpacity
            style={[
              styles.pill,
              b.quotationSendStatus === 'sent' ? styles.pillGreen : b.quotationSendStatus === 'failed' ? styles.pillRed : styles.pillViolet,
            ]}
            onPress={() => onSendQuoteToChat(b)}
            disabled={busy}
          >
            <Text
              style={[
                styles.pillText,
                { color: b.quotationSendStatus === 'sent' ? '#047857' : b.quotationSendStatus === 'failed' ? '#dc2626' : '#6d28d9' },
              ]}
            >
              {b.quotationSendStatus === 'sent'
                ? '✓ ส่งในแชตแล้ว'
                : b.quotationSendStatus === 'failed'
                  ? 'ส่งไม่สำเร็จ · ลองใหม่'
                  : b.quotationSendStatus === 'sending'
                    ? 'กำลังส่ง…'
                    : '📨 ส่งลิงก์ในแชต'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.pill, styles.pillPrimary]} onPress={() => onAdvance(b)} disabled={busy}>
          <Text style={[styles.pillText, { color: '#fff' }]}>→ {statusLabel(next)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pill, styles.pillOutline]} onPress={() => onDelete(b)} disabled={busy}>
          <Text style={[styles.pillText, { color: '#94a3b8' }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  code: { fontSize: 12, color: '#64748b', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  phone: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagViolet: { backgroundColor: '#f5f3ff' },
  tagSlate: { backgroundColor: '#f1f5f9' },
  tagAmber: { backgroundColor: '#fffbeb' },
  tagBlue: { backgroundColor: '#eff6ff' },
  tagText: { fontSize: 11 },
  body: { marginTop: 10, gap: 5 },
  pkg: { fontSize: 13, fontWeight: '600', color: '#334155' },
  line: { fontSize: 13, color: '#475569' },
  muted: { fontSize: 12, color: '#64748b' },
  green: { fontSize: 12, color: '#059669' },
  advice: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  adviceGreen: { backgroundColor: '#ecfdf5' },
  adviceAmber: { backgroundColor: '#fffbeb' },
  adviceText: { fontSize: 12 },
  noteBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  total: { fontSize: 16, fontWeight: '800', color: '#4f46e5' },
  travel: { fontSize: 11, color: '#b45309', marginTop: 2 },
  created: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: 'center',
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  pillPrimary: { backgroundColor: '#6366f1' },
  pillPrimaryOutline: { borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#fff' },
  pillOutline: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pillGreen: { backgroundColor: '#ecfdf5' },
  pillViolet: { backgroundColor: '#f5f3ff' },
  pillRed: { backgroundColor: '#fef2f2' },
});
