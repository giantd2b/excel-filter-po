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
    const limit = parseInt(searchParams.get("limit") || "20");
    const lastId = searchParams.get("lastId");

    let query = adminDb
      .collection("user")
      .orderBy("lastmessagetime", "desc")
      .limit(limit);

    // Pagination: start after last document
    if (lastId) {
      const lastDoc = await adminDb.collection("user").doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const usersSnapshot = await query.get();

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId || doc.id,
      displayName: doc.data().displayName || doc.data().first_name || "ไม่ระบุชื่อ",
      pictureUrl: doc.data().pictureUrl || doc.data().profile_pic || "",
      channel: doc.data().channel || "",
      lastmessagetime: doc.data().lastmessagetime || 0,
      timestamp: doc.data().timestamp || 0,
    }));

    const hasMore = users.length === limit;
    const nextLastId = users.length > 0 ? users[users.length - 1].id : null;

    return NextResponse.json({
      users,
      hasMore,
      nextLastId
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch users", details: errorMessage },
      { status: 500 }
    );
  }
}
