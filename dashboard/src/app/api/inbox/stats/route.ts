import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { LINE_CHANNELS, FB_CHANNELS } from "@/types/inbox";

export const dynamic = "force-dynamic";

interface ChannelStats {
  id: string;
  name: string;
  type: "line" | "facebook";
  unreadCount: number;
  totalConversations: number;
}

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    // Get all users with unread messages
    const usersSnapshot = await adminDb
      .collection("user")
      .where("unreadCount", ">", 0)
      .get();

    // Calculate stats per channel
    const channelStats: Record<string, { unread: number; total: number }> = {};

    // Initialize all channels with 0
    Object.keys(LINE_CHANNELS).forEach((key) => {
      channelStats[key] = { unread: 0, total: 0 };
    });
    Object.keys(FB_CHANNELS).forEach((key) => {
      channelStats[key] = { unread: 0, total: 0 };
    });

    // Count unread per channel
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const channel = data.channel || "";
      if (channelStats[channel]) {
        channelStats[channel].unread += data.unreadCount || 0;
        channelStats[channel].total += 1;
      }
    });

    // Build response
    const lineChannels: ChannelStats[] = Object.entries(LINE_CHANNELS).map(
      ([id, config]) => ({
        id,
        name: config.name,
        type: "line" as const,
        unreadCount: channelStats[id]?.unread || 0,
        totalConversations: channelStats[id]?.total || 0,
      })
    );

    const fbChannels: ChannelStats[] = Object.entries(FB_CHANNELS).map(
      ([id, config]) => ({
        id,
        name: config.name,
        type: "facebook" as const,
        unreadCount: channelStats[id]?.unread || 0,
        totalConversations: channelStats[id]?.total || 0,
      })
    );

    // Total stats
    const totalUnread = [...lineChannels, ...fbChannels].reduce(
      (sum, ch) => sum + ch.unreadCount,
      0
    );
    const totalLineUnread = lineChannels.reduce(
      (sum, ch) => sum + ch.unreadCount,
      0
    );
    const totalFbUnread = fbChannels.reduce(
      (sum, ch) => sum + ch.unreadCount,
      0
    );

    return NextResponse.json({
      totalUnread,
      line: {
        totalUnread: totalLineUnread,
        channels: lineChannels,
      },
      facebook: {
        totalUnread: totalFbUnread,
        channels: fbChannels,
      },
    });
  } catch (error) {
    console.error("Error fetching inbox stats:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch inbox stats", details: errorMessage },
      { status: 500 }
    );
  }
}
