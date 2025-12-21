"use client";

import { useState, useEffect, useCallback } from "react";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied" as NotificationPermission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied" as NotificationPermission;
    }
  }, []);

  const showNotification = useCallback(
    async (options: NotificationOptions) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      // Request permission if not granted
      let currentPermission = permission;
      if (currentPermission === "default") {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== "granted") {
        return;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/icon-192.png",
          tag: options.tag,
          requireInteraction: false,
        });

        if (options.onClick) {
          notification.onclick = () => {
            window.focus();
            notification.close();
            options.onClick?.();
          };
        }

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [permission, requestPermission]
  );

  const updateDocumentTitle = useCallback((unreadCount: number) => {
    const baseTitle = "Inbox - Dashboard";
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
    updateDocumentTitle,
    isSupported: typeof window !== "undefined" && "Notification" in window,
  };
}
