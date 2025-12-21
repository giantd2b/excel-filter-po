import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getChannelType } from "@/types/inbox";

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
    const limit = parseInt(searchParams.get("limit") || "50");
    const channel = searchParams.get("channel"); // Filter by specific channel
    const channelType = searchParams.get("type"); // "line" | "facebook" | null for all
    const lastId = searchParams.get("lastId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    let query = adminDb
      .collection("user")
      .orderBy("lastmessagetime", "desc")
      .limit(limit);

    // Filter by specific channel
    if (channel) {
      query = query.where("channel", "==", channel);
    }
    // Filter by channel type (LINE or Facebook)
    else if (channelType === "line") {
      query = query
        .where("channel", ">=", "Line_")
        .where("channel", "<=", "Line_\uf8ff");
    } else if (channelType === "facebook") {
      query = query
        .where("channel", ">=", "FB_")
        .where("channel", "<=", "FB_\uf8ff");
    }

    // Pagination
    if (lastId) {
      const lastDoc = await adminDb.collection("user").doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const usersSnapshot = await query.get();

    let conversations = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        oduserId: data.userId || doc.id,
        displayName: data.displayName || data.first_name || "ไม่ระบุชื่อ",
        pictureUrl: data.pictureUrl || data.profile_pic || "",
        profile_pic: data.profile_pic || data.pictureUrl || "",
        channel: data.channel || "",
        channelType: getChannelType(data.channel || ""),
        timestamp: data.timestamp || 0,
        lastmessagetime: data.lastmessagetime || 0,
        unreadCount: data.unreadCount || 0,
        lastMessagePreview: data.lastMessagePreview || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
      };
    });

    // Filter unread only (client-side since Firestore doesn't support > with orderBy on different field)
    if (unreadOnly) {
      conversations = conversations.filter((c) => c.unreadCount > 0);
    }

    const hasMore = usersSnapshot.docs.length === limit;
    const nextLastId =
      conversations.length > 0
        ? conversations[conversations.length - 1].id
        : null;

    return NextResponse.json({
      conversations,
      hasMore,
      nextLastId,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch conversations", details: errorMessage },
      { status: 500 }
    );
  }
}
