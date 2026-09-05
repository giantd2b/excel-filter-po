import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useAuth } from '../contexts/AuthContext';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatThaiDate(date: Date): string {
  const d = date.getDate();
  const m = THAI_MONTHS[date.getMonth()];
  const y = (date.getFullYear() + 543) % 100;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y} ${hh}:${mm}`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert('ไม่รองรับ', 'ตรวจสอบอัปเดตไม่ได้ในโหมดพัฒนา');
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert('มีอัปเดตใหม่', 'ดาวน์โหลดเรียบร้อยแล้ว รีสตาร์ทแอปเพื่อใช้งานเวอร์ชันใหม่', [
          { text: 'ภายหลัง', style: 'cancel' },
          { text: 'รีสตาร์ทเลย', onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert('เป็นเวอร์ชันล่าสุดแล้ว', 'แอปของคุณอัปเดตล่าสุดแล้ว');
      }
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถตรวจสอบอัปเดตได้ กรุณาลองใหม่');
    }
    setCheckingUpdate(false);
  };

  const handleClearCache = () => {
    Alert.alert('ล้างแคช', 'ต้องการล้างแคชข้อความหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ล้างแคช',
        style: 'destructive',
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const chatKeys = keys.filter((k) => k.startsWith('chat_msgs_'));
            if (chatKeys.length > 0) await AsyncStorage.multiRemove(chatKeys);
            Alert.alert('สำเร็จ', 'ล้างแคชเรียบร้อยแล้ว');
          } catch {
            Alert.alert('ผิดพลาด', 'ไม่สามารถล้างแคชได้');
          }
        },
      },
    ]);
  };

  function handleLogout() {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ตั้งค่า</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile card (compact) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.displayName || 'Admin'}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>ผู้ดูแลระบบ</Text>
          </View>
        </View>

        {/* Management menu */}
        <Text style={styles.groupLabel}>จัดการ</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('QuickReplies')}>
            <Text style={styles.menuIcon}>⚡️</Text>
            <Text style={styles.menuLabel}>ข้อความด่วน</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Admins')}>
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuLabel}>ผู้ดูแลระบบ</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.groupLabel}>App Version</Text>
        <View style={styles.menuCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>เวอร์ชัน</Text>
            <Text style={styles.infoValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>OTA</Text>
            <Text style={styles.infoValue}>
              {Updates.updateId ? Updates.updateId.slice(0, 8) : 'ตัวติดตั้ง'}
            </Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>อัปเดตล่าสุด</Text>
            <Text style={styles.infoValue}>
              {Updates.createdAt ? formatThaiDate(Updates.createdAt) : '-'}
            </Text>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Channel</Text>
            <Text style={styles.infoValue}>{Updates.channel || (__DEV__ ? 'development' : '-')}</Text>
          </View>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.checkUpdateBtn}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.checkUpdateText}>ตรวจสอบอัปเดต</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Other actions */}
        <Text style={styles.groupLabel}>อื่นๆ</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuRow} onPress={handleClearCache}>
            <Text style={styles.menuIcon}>🧹</Text>
            <Text style={styles.menuLabel}>ล้างแคชข้อความ</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
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
  // Profile (compact horizontal)
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 13, color: '#64748b', marginTop: 2 },
  roleBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  // Groups
  groupLabel: {
    fontSize: 13, fontWeight: '700', color: '#94a3b8',
    marginTop: 16, marginBottom: 8, marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  menuChevron: { fontSize: 22, color: '#cbd5e1', fontWeight: '400' },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9' },
  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13,
  },
  infoLabel: { fontSize: 15, color: '#475569' },
  infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  checkUpdateBtn: { paddingVertical: 14, alignItems: 'center' },
  checkUpdateText: { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  // Logout
  logoutButton: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
});
