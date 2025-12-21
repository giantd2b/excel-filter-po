import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Calculate timestamp for X days ago
    const daysAgo = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get users who joined within the specified time period
    const usersSnapshot = await adminDb
      .collection("user")
      .where("timestamp", ">=", daysAgo)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      const messageCount = data.lastmessage?.length || 0;

      return {
        id: doc.id,
        oderId: data.userId || doc.id,
        displayName: data.displayName || data.first_name || "ไม่ระบุชื่อ",
        pictureUrl: data.pictureUrl || data.profile_pic || "",
        channel: data.channel || "",
        timestamp: data.timestamp || 0,
        lastmessagetime: data.lastmessagetime || 0,
        messageCount,
        isFirstTime: messageCount <= 1,
        firstMessage: data.lastmessage?.[0]?.text || "",
      };
    });

    return NextResponse.json({
      users,
      total: users.length,
      days,
    });
  } catch (error) {
    console.error("Error fetching new users:", error);
    return NextResponse.json(
      { error: "Failed to fetch new users" },
      { status: 500 }
    );
  }
}
