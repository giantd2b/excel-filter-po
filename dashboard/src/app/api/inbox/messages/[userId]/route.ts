import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const before = searchParams.get("before"); // timestamp for pagination

    // Get user info first
    const userDoc = await adminDb.collection("user").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get messages from subcollection
    let query = adminDb
      .collection("user")
      .doc(userId)
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (before) {
      query = query.where("timestamp", "<", parseInt(before));
    }

    const messagesSnapshot = await query.get();

    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text || "",
        type: data.type || "incoming",
        sender: data.sender || "user",
        timestamp: data.timestamp || 0,
        status: data.status,
        adminId: data.adminId,
      };
    });

    // Reverse to get chronological order
    messages.reverse();

    const hasMore = messagesSnapshot.docs.length === limit;

    return NextResponse.json({
      user: {
        id: userDoc.id,
        oduserId: userData?.userId || userDoc.id,
        displayName:
          userData?.displayName || userData?.first_name || "ไม่ระบุชื่อ",
        pictureUrl: userData?.pictureUrl || userData?.profile_pic || "",
        channel: userData?.channel || "",
        unreadCount: userData?.unreadCount || 0,
      },
      messages,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch messages", details: errorMessage },
      { status: 500 }
    );
  }
}
