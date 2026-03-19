import { useEffect } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

export function useNotifications() {
  useEffect(() => {
    // Delay to avoid interfering with app startup
    const timer = setTimeout(() => {
      registerForPushNotifications().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
}

async function registerForPushNotifications() {
  let Notifications: any;
  let Device: any;

  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch {
    return; // Not available
  }

  if (!Device?.isDevice) return;

  try {
    // Set notification handler
    Notifications.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'f8544eb2-b640-4c48-b1b8-78d792b8d7a5',
    });

    await api.post('/admins/push-token', {
      token: tokenData.data,
      platform: Platform.OS,
    }).catch(() => {});

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync?.('messages', {
        name: 'ข้อความใหม่',
        importance: 4, // HIGH
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
  } catch (err) {
    console.log('[Notifications] Error:', err);
  }
}
