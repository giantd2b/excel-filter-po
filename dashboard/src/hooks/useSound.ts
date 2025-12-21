"use client";

import { useCallback, useRef } from "react";

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio("/notification.mp3");
        audioRef.current.volume = 0.5;
      }

      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Browser may block autoplay, ignore the error
        console.log("Could not play notification sound:", err);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, []);

  return { playNotificationSound };
}
