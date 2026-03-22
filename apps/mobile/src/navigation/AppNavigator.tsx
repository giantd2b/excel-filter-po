import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import api from '../services/api';
import { getSocket } from '../services/socket';

import LoginScreen from '../screens/LoginScreen';
import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SlipReportScreen from '../screens/SlipReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CustomerInfoScreen from '../screens/CustomerInfoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackHeaderStyle = {
  headerStyle: { backgroundColor: '#fff' } as const,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700' as const, color: '#1e293b' },
  headerTintColor: '#6366f1',
};

function InboxBadge() {
  const [unread, setUnread] = useState(0);

  // Fetch once on mount, then listen via WebSocket
  useEffect(() => {
    api.get('/inbox/stats')
      .then(({ data }) => setUnread(data.totalUnread || 0))
      .catch(() => {});

    const socket = getSocket();
    const handleUnread = (data: any) => {
      if (data?.totalUnread !== undefined) {
        setUnread(data.totalUnread);
      }
    };
    socket?.on('unread:update', handleUnread);
    return () => { socket?.off('unread:update', handleUnread); };
  }, []);

  if (unread <= 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: -4,
        right: -10,
        backgroundColor: '#dc2626',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
        {unread > 99 ? '99+' : unread}
      </Text>
    </View>
  );
}

function HomeTabs() {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<any>();

  // Register notifications + handle tap to navigate to chat
  useNotifications((data) => {
    if (data?.docId) {
      try {
        rootNavigation.navigate('Chat', {
          userId: data.oduserId || '',
          docId: data.docId,
          displayName: data.displayName || '',
          pictureUrl: data.pictureUrl || '',
          channel: data.channel || '',
          channelType: data.channelType || 'line',
        });
      } catch {}
    }
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
          height: 56 + (insets.bottom || 8),
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          title: 'กล่องข้อความ',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Text style={{ fontSize: size, color }}>💬</Text>
              <InboxBadge />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          lazy: true,
          title: 'แดชบอร์ด',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="SlipReport"
        component={SlipReportScreen}
        options={{
          lazy: true,
          title: 'สลิป',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧾</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          lazy: true,
          title: 'ตั้งค่า',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={HomeTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              ...stackHeaderStyle,
              headerShown: true,
              headerTitle: 'แชท',
            }}
          />
          <Stack.Screen
            name="CustomerInfo"
            component={CustomerInfoScreen}
            options={{
              ...stackHeaderStyle,
              headerShown: true,
              headerTitle: 'ข้อมูลลูกค้า',
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
