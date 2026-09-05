import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../services/api';

export default function AdminsScreen() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admins');
      setAdmins(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdmins();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 24 }} />
        ) : admins.length === 0 ? (
          <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
        ) : (
          <View style={styles.card}>
            {admins.map((admin) => (
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
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
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
});
