import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

// Lazy-load expo-notifications to avoid crash in Expo Go
let Notifications: any = null;
let Device: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // expo-notifications not available (Expo Go)
}

export function useNotifications(onNotificationTap?: (data: any) => void) {
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!Notifications) return;

    registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      onNotificationTap?.(data);
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [onNotificationTap]);
}

async function registerForPushNotifications() {
  if (!Notifications || !Device || !Device.isDevice) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'excel-filter-po',
    });

    await api.post('/admins/push-token', {
      token: tokenData.data,
      platform: Platform.OS,
    }).catch(() => {});

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'ข้อความใหม่',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
  } catch (err) {
    console.log('[Notifications] Registration error:', err);
  }
}
