import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

export function useNotifications(onTap?: (data: any) => void) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const handledColdStartRef = useRef<string | null>(null);

  useEffect(() => {
    let subscription: any = null;

    const setup = async () => {
      let Notifications: any;
      let Device: any;

      try {
        Notifications = require('expo-notifications');
        Device = require('expo-device');
      } catch {
        return;
      }

      // Set foreground handler
      try {
        Notifications.setNotificationHandler?.({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch {}

      // Listen for notification taps
      try {
        subscription = Notifications.addNotificationResponseReceivedListener?.((response: any) => {
          const data = response?.notification?.request?.content?.data;
          if (data && onTapRef.current) {
            onTapRef.current(data);
          }
        });
      } catch {}

      // Cold start: the tap that launched the app from a killed state is not
      // delivered to the listener above — pick it up here (once per identifier).
      try {
        const last = await Notifications.getLastNotificationResponseAsync?.();
        const data = last?.notification?.request?.content?.data;
        const id = last?.notification?.request?.identifier;
        if (data?.docId && id && id !== handledColdStartRef.current) {
          handledColdStartRef.current = id;
          onTapRef.current?.(data);
        }
      } catch {}

      // Register push token
      if (!Device?.isDevice) return;

      try {
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
      } catch {}
    };

    // Delay setup
    const timer = setTimeout(() => setup().catch(() => {}), 2000);

    return () => {
      clearTimeout(timer);
      try { subscription?.remove?.(); } catch {}
    };
  }, []);
}
