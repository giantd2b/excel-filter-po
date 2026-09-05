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
import api from '../services/api';

interface ReplyTemplate {
  id: string;
  title: string;
  text: string;
  category?: string;
}

export default function QuickRepliesScreen() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newText.trim()) {
      Alert.alert('กรุณากรอกข้อมูล', 'ต้องระบุชื่อและข้อความ');
      return;
    }
    setSaving(true);
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
      setShowAddForm(false);
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มข้อความด่วนได้');
    }
    setSaving(false);
  };

  const handleDelete = (id: string, title: string) => {
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
    setSaving(true);
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
    setSaving(false);
  };

  const grouped = templates.reduce<Record<string, ReplyTemplate[]>>((acc, t) => {
    const cat = t.category || 'ทั่วไป';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addBtnText}>{showAddForm ? '✕ ปิด' : '+ เพิ่มข้อความด่วน'}</Text>
        </TouchableOpacity>

        {showAddForm && (
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
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>บันทึก</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {loading && !refreshing ? (
          <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 24 }} />
        ) : templates.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีข้อความด่วน</Text>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <View key={category} style={styles.categoryCard}>
              <Text style={styles.categoryLabel}>{category}</Text>
              {items.map((t) =>
                editingId === t.id ? (
                  <View key={t.id} style={styles.addForm}>
                    <TextInput style={styles.formInput} value={editTitle} onChangeText={setEditTitle} placeholder="ชื่อ" placeholderTextColor="#94a3b8" />
                    <TextInput style={[styles.formInput, styles.formTextarea]} value={editText} onChangeText={setEditText} placeholder="ข้อความ" placeholderTextColor="#94a3b8" multiline />
                    <TextInput style={styles.formInput} value={editCategory} onChangeText={setEditCategory} placeholder="หมวดหมู่" placeholderTextColor="#94a3b8" />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.saveBtn, { flex: 1 }, saving && styles.saveBtnDisabled]} onPress={handleSaveEdit} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>บันทึก</Text>}
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
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(t.id, t.title)}>
                      <Text style={styles.deleteBtnText}>ลบ</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  addBtn: {
    backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginBottom: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addForm: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  formInput: {
    backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0',
  },
  formTextarea: { minHeight: 60, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#c7d2fe' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  categoryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 4,
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
});
