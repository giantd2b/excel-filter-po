import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

export default function CustomerInfoScreen({ route }: any) {
  const { docId, displayName, pictureUrl, channel, channelType } = route.params;
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');

  // Notes
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Tags
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Jobs & Quotations
  const [jobs, setJobs] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/users/${docId}/details`),
      api.get(`/users/${docId}/notes`).catch(() => ({ data: [] })),
      api.get(`/users/${docId}/jobs`).catch(() => ({ data: { jobs: [] } })),
      api.get(`/users/${docId}/quotations`).catch(() => ({ data: { data: [] } })),
    ]).then(([detailsRes, notesRes, jobsRes, quotesRes]) => {
      if (cancelled) return;
      setDetails(detailsRes.data);
      setNicknameValue(detailsRes.data?.nickname || '');
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setJobs(jobsRes.data?.jobs || []);
      setQuotations(quotesRes.data?.data || []);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [docId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await api.post(`/users/${docId}/notes`, { text: newNote.trim() });
      setNotes((prev) => [data, ...prev]);
      setNewNote('');
    } catch { Alert.alert('ผิดพลาด'); }
    setAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert('ลบบันทึก', 'ต้องการลบบันทึกนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        await api.delete(`/users/notes/${noteId}`).catch(() => {});
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }},
    ]);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      await api.post(`/users/${docId}/tags`, { name: newTag.trim() });
      const { data } = await api.get(`/users/${docId}/details`);
      setDetails(data);
      setNewTag('');
      setShowTagInput(false);
    } catch { Alert.alert('ผิดพลาด'); }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.delete(`/users/${docId}/tags/${tagId}`);
      setDetails((prev: any) => ({
        ...prev,
        tags: prev.tags.filter((t: any) => t.tag?.id !== tagId && t.id !== tagId),
      }));
    } catch {}
  };

  const saveNickname = async () => {
    try {
      await api.post(`/users/${docId}/nickname`, {
        nickname: nicknameValue.trim() || null,
      });
      setDetails((prev: any) => ({ ...prev, nickname: nicknameValue.trim() || null }));
      setEditingNickname(false);
      Alert.alert('สำเร็จ', 'บันทึกชื่อเรียกแล้ว');
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกได้');
    }
  };

  const isLine = channelType === 'line';
  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const customer = details || {};
  const tags = customer.tags?.map((ct: any) => ct.tag) || [];
  const orders = customer.orders || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        {pictureUrl ? (
          <Image source={{ uri: pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{customer.nickname || displayName || 'ไม่ทราบชื่อ'}</Text>
        {customer.nickname && (
          <Text style={styles.platformNameLabel}>({customer.displayName})</Text>
        )}

        {/* Nickname edit */}
        {editingNickname ? (
          <View style={styles.nicknameEditRow}>
            <TextInput
              style={styles.nicknameInput}
              value={nicknameValue}
              onChangeText={setNicknameValue}
              placeholder="ตั้งชื่อเรียก..."
              placeholderTextColor="#94a3b8"
              autoFocus
            />
            <TouchableOpacity style={styles.nicknameSaveBtn} onPress={saveNickname}>
              <Text style={styles.nicknameSaveBtnText}>บันทึก</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingNickname(false)}>
              <Text style={styles.nicknameCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nicknameEditBtn} onPress={() => setEditingNickname(true)}>
            <Text style={styles.nicknameEditBtnText}>
              {customer.nickname ? 'แก้ไขชื่อเรียก' : 'ตั้งชื่อเรียก'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.channelRow}>
          <View style={[styles.channelDot, { backgroundColor: isLine ? '#10b981' : '#3b82f6' }]} />
          <Text style={styles.channelText}>
            {channel?.replace('Line_', 'LINE ').replace('FB_', 'FB ').replace('fb_', 'FB ')}
          </Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: customer.status === 'RESOLVED' ? '#dcfce7' : customer.status === 'FOLLOW_UP' ? '#fef3c7' : '#e0e7ff',
        }]}>
          <Text style={[styles.statusText, {
            color: customer.status === 'RESOLVED' ? '#166534' : customer.status === 'FOLLOW_UP' ? '#92400e' : '#3730a3',
          }]}>
            {customer.status === 'RESOLVED' ? 'เสร็จสิ้น' : customer.status === 'FOLLOW_UP' ? 'ติดตาม' : 'เปิด'}
          </Text>
        </View>
      </View>

      {/* Info section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ข้อมูลลูกค้า</Text>
        <InfoRow label="เบอร์โทร" value={customer.phoneNumber || '-'} />
        <InfoRow label="สถานะข้อความ" value={customer.statusMessage || '-'} />
        <InfoRow label="เข้ามาครั้งแรก" value={formatDate(customer.firstContactAt)} />
        <InfoRow label="ข้อความล่าสุด" value={formatDate(customer.lastMessageAt)} />
        {customer.assignedToName && (
          <InfoRow label="มอบหมายให้" value={customer.assignedToName} />
        )}
      </View>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>แท็ก</Text>
          <View style={styles.tagsContainer}>
            {tags.map((tag: any) => (
              <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color + '20' }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>บันทึก ({notes.length})</Text>
          {notes.map((note: any) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteText}>{note.content}</Text>
              <Text style={styles.noteDate}>
                {formatDate(note.createdAt)} {note.adminName && `โดย ${note.adminName}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ออเดอร์ ({orders.length})</Text>
          {orders.slice(0, 10).map((order: any) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderRef}>#{order.orderNumber || order.refNumber || order.id.substring(0, 8)}</Text>
                <View style={[styles.orderStatusBadge, {
                  backgroundColor: order.status === 'COMPLETED' ? '#dcfce7' : order.status === 'CANCELLED' ? '#fef2f2' : '#fef3c7',
                }]}>
                  <Text style={[styles.orderStatusText, {
                    color: order.status === 'COMPLETED' ? '#166534' : order.status === 'CANCELLED' ? '#991b1b' : '#92400e',
                  }]}>
                    {order.status === 'COMPLETED' ? 'สำเร็จ' : order.status === 'CANCELLED' ? 'ยกเลิก' : order.status === 'PENDING' ? 'รอดำเนินการ' : order.status || '-'}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderAmount}>
                {order.totalAmount ? `฿${Number(order.totalAmount).toLocaleString()}` : '-'}
              </Text>
              {/* Order items */}
              {order.items?.length > 0 && (
                <View style={styles.orderItems}>
                  {order.items.map((item: any, idx: number) => (
                    <Text key={idx} style={styles.orderItemText}>
                      • {item.name || item.productName} x{item.quantity} {item.price ? `฿${Number(item.price).toLocaleString()}` : ''}
                    </Text>
                  ))}
                </View>
              )}
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Payments */}
      {customer.payments?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>การชำระเงิน ({customer.payments.length})</Text>
          {customer.payments.slice(0, 10).map((payment: any) => (
            <View key={payment.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderRef}>
                  {payment.method === 'TRANSFER' ? '💳 โอนเงิน' : payment.method || 'ชำระเงิน'}
                </Text>
                <Text style={[styles.orderAmount, { color: payment.status === 'CONFIRMED' ? '#166534' : '#1e293b' }]}>
                  ฿{Number(payment.amount || 0).toLocaleString()}
                </Text>
              </View>
              {payment.slipUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(payment.slipUrl)}>
                  <Image source={{ uri: payment.slipUrl }} style={styles.slipImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              <Text style={styles.orderDate}>{formatDate(payment.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Tags */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>แท็ก</Text>
          <TouchableOpacity onPress={() => setShowTagInput(!showTagInput)}>
            <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '600' }}>{showTagInput ? '✕' : '+ เพิ่ม'}</Text>
          </TouchableOpacity>
        </View>
        {showTagInput && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TextInput
              style={[styles.nicknameInput, { flex: 1 }]}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="ชื่อแท็ก..."
              placeholderTextColor="#94a3b8"
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity style={styles.nicknameSaveBtn} onPress={handleAddTag}>
              <Text style={styles.nicknameSaveBtnText}>เพิ่ม</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.tagsContainer}>
          {tags.map((tag: any) => (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tag, { backgroundColor: (tag.color || '#6366f1') + '20' }]}
              onLongPress={() => Alert.alert('ลบแท็ก', `ลบ "${tag.name}"?`, [
                { text: 'ยกเลิก', style: 'cancel' },
                { text: 'ลบ', style: 'destructive', onPress: () => handleRemoveTag(tag.id) },
              ])}
            >
              <View style={[styles.tagDot, { backgroundColor: tag.color || '#6366f1' }]} />
              <Text style={[styles.tagText, { color: tag.color || '#6366f1' }]}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
          {tags.length === 0 && !showTagInput && <Text style={{ fontSize: 12, color: '#94a3b8' }}>ไม่มีแท็ก (กดค้างเพื่อลบ)</Text>}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>บันทึก ({notes.length})</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TextInput
            style={[styles.nicknameInput, { flex: 1 }]}
            value={newNote}
            onChangeText={setNewNote}
            placeholder="เพิ่มบันทึก..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.nicknameSaveBtn, addingNote && { opacity: 0.5 }]}
            onPress={handleAddNote}
            disabled={addingNote}
          >
            <Text style={styles.nicknameSaveBtnText}>บันทึก</Text>
          </TouchableOpacity>
        </View>
        {notes.map((note: any) => (
          <TouchableOpacity
            key={note.id}
            style={styles.noteCard}
            onLongPress={() => handleDeleteNote(note.id)}
          >
            <Text style={styles.noteText}>{note.text || note.content}</Text>
            <Text style={styles.noteDate}>
              {formatDate(note.createdAt)} {note.adminName || note.authorName ? `โดย ${note.adminName || note.authorName}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* IRIS Jobs */}
      {jobs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>งานที่จอง ({jobs.length})</Text>
          {jobs.map((job: any, idx: number) => (
            <View key={job.id || idx} style={styles.orderCard}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>
                {job.job || job.detail || 'งานจัดเลี้ยง'}
              </Text>
              {job.due && <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '600', marginTop: 4 }}>📅 {job.due}</Text>}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                {job.revenue && <Text style={{ fontSize: 11, color: '#64748b' }}>฿{Number(job.revenue).toLocaleString()}</Text>}
                {job.guest && <Text style={{ fontSize: 11, color: '#64748b' }}>👥 {job.guest} ท่าน</Text>}
                {job.city && <Text style={{ fontSize: 11, color: '#94a3b8' }}>📍 {job.city}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* FlowAccount Quotations */}
      {quotations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ใบเสนอราคา ({quotations.length})</Text>
          {quotations.map((q: any) => (
            <TouchableOpacity
              key={q.docNo}
              style={styles.orderCard}
              onPress={() => { if (q.editUrl) Linking.openURL(q.editUrl); }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#d97706' }}>{q.docNo}</Text>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                  backgroundColor: q.status === 'อนุมัติ' || q.status === 'ดำเนินการแล้ว' ? '#dcfce7'
                    : q.status === 'ไม่อนุมัติ' ? '#fef2f2' : '#fef3c7',
                }}>
                  <Text style={{
                    fontSize: 9, fontWeight: '700',
                    color: q.status === 'อนุมัติ' || q.status === 'ดำเนินการแล้ว' ? '#166534'
                      : q.status === 'ไม่อนุมัติ' ? '#991b1b' : '#92400e',
                  }}>{q.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{q.project || q.customer}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>{q.date}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>฿{Number(q.grandTotal || 0).toLocaleString()}</Text>
              </View>
              {q.salesName && <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>👤 {q.salesName}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#64748b' },
  name: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  platformNameLabel: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 4 },
  nicknameEditBtn: { marginBottom: 8 },
  nicknameEditBtnText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  nicknameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 20 },
  nicknameInput: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: '#1e293b',
  },
  nicknameSaveBtn: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  nicknameSaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  nicknameCancelText: { color: '#94a3b8', fontSize: 13 },
  channelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  channelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  channelText: { fontSize: 13, color: '#64748b' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: { fontSize: 13, color: '#94a3b8' },
  infoValue: { fontSize: 13, color: '#334155', fontWeight: '500' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  tagText: { fontSize: 12, fontWeight: '600' },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  noteDate: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  orderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  orderItems: { marginTop: 6 },
  orderItemText: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  orderDate: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  slipImage: { width: '100%', height: 150, borderRadius: 8, marginTop: 8 },
});
