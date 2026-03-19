import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ReplyTemplate {
  id: string;
  title: string;
  text: string;
  category?: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuth();

  // Quick replies
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Admins
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setTemplatesLoading(true);
    setAdminsLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/templates'),
        api.get('/admins').catch(() => ({ data: [] })),
      ]);
      setTemplates(Array.isArray(tRes.data) ? tRes.data : []);
      setAdmins(Array.isArray(aRes.data) ? aRes.data : []);
    } catch {}
    setTemplatesLoading(false);
    setAdminsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAddTemplate = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      Alert.alert('กรุณากรอกข้อมูล', 'ต้องระบุชื่อและข้อความ');
      return;
    }
    setSavingTemplate(true);
    try {
      const { data } = await api.post('/templates', {
        title: newTitle.trim(),
        text: newText.trim(),
        category: newCategory.trim() || undefined,
      });
      setTemplates((prev) => [...prev, data]);
      setNewTitle('');
      setNewText('');
      setNewCategory('');
      setShowAddTemplate(false);
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มข้อความด่วนได้');
    }
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    Alert.alert('ลบข้อความด่วน', `ต้องการลบ "${title}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/templates/${id}`);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } catch {
            Alert.alert('ผิดพลาด');
          }
        },
      },
    ]);
  };

  const startEdit = (t: ReplyTemplate) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditText(t.text);
    setEditCategory(t.category || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editText.trim()) return;
    setSavingTemplate(true);
    try {
      await api.put(`/templates/${editingId}`, {
        title: editTitle.trim(),
        text: editText.trim(),
        category: editCategory.trim() || undefined,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, title: editTitle.trim(), text: editText.trim(), category: editCategory.trim() || undefined }
            : t
        )
      );
      setEditingId(null);
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถแก้ไขได้');
    }
    setSavingTemplate(false);
  };

  function handleLogout() {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: () => logout() },
    ]);
  }

  // Group templates by category
  const grouped = templates.reduce<Record<string, ReplyTemplate[]>>((acc, t) => {
    const cat = t.category || 'ทั่วไป';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ตั้งค่า</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'Admin'}</Text>
          <Text style={styles.email}>{user?.email || '-'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>ผู้ดูแลระบบ</Text>
          </View>
        </View>

        {/* Quick Replies Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ข้อความด่วน</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddTemplate(!showAddTemplate)}
            >
              <Text style={styles.addBtnText}>{showAddTemplate ? '✕' : '+ เพิ่ม'}</Text>
            </TouchableOpacity>
          </View>

          {/* Add form */}
          {showAddTemplate && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.formInput}
                placeholder="ชื่อ (เช่น ทักทาย)"
                placeholderTextColor="#94a3b8"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="ข้อความ (เช่น สวัสดีค่ะ มีอะไรให้ช่วยคะ?)"
                placeholderTextColor="#94a3b8"
                value={newText}
                onChangeText={setNewText}
                multiline
              />
              <TextInput
                style={styles.formInput}
                placeholder="หมวดหมู่ (ไม่บังคับ)"
                placeholderTextColor="#94a3b8"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <TouchableOpacity
                style={[styles.saveBtn, savingTemplate && styles.saveBtnDisabled]}
                onPress={handleAddTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>บันทึก</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Templates list */}
          {templatesLoading ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 16 }} />
          ) : templates.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีข้อความด่วน</Text>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <Text style={styles.categoryLabel}>{category}</Text>
                {items.map((t) => (
                  editingId === t.id ? (
                    <View key={t.id} style={styles.addForm}>
                      <TextInput style={styles.formInput} value={editTitle} onChangeText={setEditTitle} placeholder="ชื่อ" placeholderTextColor="#94a3b8" />
                      <TextInput style={[styles.formInput, styles.formTextarea]} value={editText} onChangeText={setEditText} placeholder="ข้อความ" placeholderTextColor="#94a3b8" multiline />
                      <TextInput style={styles.formInput} value={editCategory} onChangeText={setEditCategory} placeholder="หมวดหมู่" placeholderTextColor="#94a3b8" />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.saveBtn, { flex: 1 }, savingTemplate && styles.saveBtnDisabled]} onPress={handleSaveEdit} disabled={savingTemplate}>
                          {savingTemplate ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>บันทึก</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#e2e8f0' }]} onPress={() => setEditingId(null)}>
                          <Text style={[styles.saveBtnText, { color: '#64748b' }]}>ยกเลิก</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View key={t.id} style={styles.templateItem}>
                      <TouchableOpacity style={styles.templateContent} onPress={() => startEdit(t)}>
                        <Text style={styles.templateTitle}>{t.title}</Text>
                        <Text style={styles.templateText} numberOfLines={2}>{t.text}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTemplate(t.id, t.title)}>
                        <Text style={styles.deleteBtnText}>ลบ</Text>
                      </TouchableOpacity>
                    </View>
                  )
                ))}
              </View>
            ))
          )}
        </View>

        {/* Admin list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ผู้ดูแลระบบ</Text>
          {adminsLoading ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 16 }} />
          ) : admins.length === 0 ? (
            <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
          ) : (
            admins.map((admin) => (
              <View key={admin.uid || admin.id} style={styles.adminItem}>
                <View style={styles.adminAvatar}>
                  <Text style={styles.adminAvatarText}>
                    {(admin.displayName || admin.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.adminInfo}>
                  <Text style={styles.adminName}>{admin.displayName || '-'}</Text>
                  <Text style={styles.adminEmail}>{admin.email}</Text>
                </View>
                <View style={[styles.adminRoleBadge, {
                  backgroundColor: admin.role === 'SUPER_ADMIN' ? '#fef3c7' : '#eef2ff',
                }]}>
                  <Text style={[styles.adminRoleText, {
                    color: admin.role === 'SUPER_ADMIN' ? '#92400e' : '#6366f1',
                  }]}>
                    {admin.role === 'SUPER_ADMIN' ? 'Super' : 'Admin'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ความปลอดภัย</Text>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => {
              if (biometricEnabled) {
                Alert.alert('ปิด Face ID', 'ต้องการปิดการเข้าสู่ระบบด้วย Face ID หรือไม่?', [
                  { text: 'ยกเลิก', style: 'cancel' },
                  { text: 'ปิด', style: 'destructive', onPress: disableBiometric },
                ]);
              } else {
                enableBiometric();
              }
            }}
          >
            <Text style={styles.infoLabel}>Face ID / Touch ID</Text>
            <Text style={[styles.infoValue, { color: biometricEnabled ? '#10b981' : '#94a3b8' }]}>
              {biometricEnabled ? 'เปิด' : 'ปิด'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เกี่ยวกับแอป</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>เวอร์ชัน</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>แอปพลิเคชัน</Text>
            <Text style={styles.infoValue}>IRIS CRM</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  roleBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
  },
  addBtn: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  // Add form
  addForm: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  formInput: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0',
  },
  formTextarea: { minHeight: 60, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#c7d2fe' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Templates list
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  categoryLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8, marginBottom: 4,
  },
  templateItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  templateContent: { flex: 1 },
  templateTitle: { fontSize: 14, fontWeight: '600', color: '#334155' },
  templateText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  // Admins
  adminItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  adminAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  adminAvatarText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  adminInfo: { flex: 1 },
  adminName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  adminEmail: { fontSize: 12, color: '#94a3b8' },
  adminRoleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  adminRoleText: { fontSize: 10, fontWeight: '700' },
  // Info
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  infoLabel: { fontSize: 15, color: '#475569' },
  infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  // Logout
  logoutButton: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
});
