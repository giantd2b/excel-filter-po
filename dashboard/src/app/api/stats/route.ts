import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const usersSnapshot = await adminDb.collection("user").get();

    let totalUsers = 0;
    let lineUsers = 0;
    let fbUsers = 0;
    const channelStats: { [key: string]: number } = {};

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalUsers++;

      const channel = data.channel || "Unknown";

      if (channel.startsWith("Line")) {
        lineUsers++;
      } else if (channel.startsWith("FB")) {
        fbUsers++;
      }

      channelStats[channel] = (channelStats[channel] || 0) + 1;
    });

    return NextResponse.json({
      totalUsers,
      lineUsers,
      fbUsers,
      channelStats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
