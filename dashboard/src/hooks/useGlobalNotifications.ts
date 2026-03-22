import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";

// Shared AudioContext — created once, reused across all notifications
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (browsers require user gesture)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.value = 0.3;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {}
}

/**
 * Global notification listener — runs on ALL pages, not just Inbox.
 * Plays sound + shows browser notification when new incoming message arrives.
 */
export function useGlobalNotifications() {
  const { user } = useAuth();
  const setupDone = useRef(false);

  useEffect(() => {
    if (!user || setupDone.current) return;
    setupDone.current = true;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    (async () => {
      try {
        const socket = await getSocket();

        socket.on("conversation:updated", (data: any) => {
          // Only notify for new incoming messages (unreadCount increased)
          if (!data.unreadCount || data.unreadCount <= 0) return;

          // Don't notify if the page is focused and on inbox
          if (document.hasFocus() && window.location.pathname.includes("/inbox")) return;

          const displayName = data.displayName || "ข้อความใหม่";
          const preview = data.lastMessagePreview || "ข้อความใหม่";

          // Play sound
          playSound();

          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(displayName, {
              body: preview,
              icon: data.pictureUrl || "/icon-192.png",
              tag: `msg-${data.id}`,
              silent: true, // We play our own sound
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = "/dashboard/inbox";
              notification.close();
            };

            setTimeout(() => notification.close(), 8000);
          }

          // Update title
          document.title = `🔔 ${displayName}: ${preview.substring(0, 30)}`;
          setTimeout(() => {
            document.title = "IRIS CRM";
          }, 5000);
        });
      } catch {
        // Socket not ready
      }
    })();

    return () => {
      setupDone.current = false;
    };
  }, [user]);
}
