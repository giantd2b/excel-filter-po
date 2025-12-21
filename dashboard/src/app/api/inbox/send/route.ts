import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getChannelType, LINE_CHANNELS, FB_CHANNELS } from "@/types/inbox";

export const dynamic = "force-dynamic";

// LINE Access Tokens (mapped by destination ID)
const LINE_ACCESS_TOKENS: Record<string, string> = {
  U2d0595a5f7582621a650a46e99972109:
    "R3eE8sfUlkLr1HhYZJT7+iOBa4voDFBM2+uFFQCmEieS0ZuYgyEAZI19nP8CDFhzOOJh1VczKwJcMEgCdEBO6tN1EsSzTXkHdDMbgtX8H+eTgmLnYXu8VEdtGZBMyP11pyD8cFy4f4OceoL3e5yDrwdB04t89/1O/w1cDnyilFU=", // IRIS
  Uf18fee4c17bb410a565889f27015ace0:
    "8VTKu+/rmw02eWpgHpBNnzMMFqHDo41rc7HZfgbGhlVwfPWbk8RYVGuMyGCa/2LtoLxNfDV/ynu8NpqSA1scFMWg3hIjRNutHKH/EzlP4xeae6/YY78pXIbNUR4A92COzJBu8eZ6IeHSDc4zhwJnkgdB04t89/1O/w1cDnyilFU=", // เติมบุญ
  U08f3963a8a32d32cadb457dde35dc897:
    "s8WPqMEgXCmmlpUJejk3lJP2xp7zVVngk0cJw6ibs49p7ZmHo9W7zv91mNjF15cmk+nbRXq8FoKhlbLCvIOgBmL6GXbfGSUzhpDPzIVp3WJHHXpJTlcdyxar7aziurCzpIgCQrxW6975HF/eabW4HwdB04t89/1O/w1cDnyilFU=", // ทดสอบระบบ
  U55912d0c8784e0453127fe2ae2a7723e:
    "u+r28TJi8siieZzOk/fDeG0+u7TpP1byi/KAVADS7Bxjjo5FSya8StwKuaJAqyKClxOclWCVh/txdVIHbHuEWjOrjFx80XcGSaCn3X6pwWo0JV84BIAUVxUSkTY/KEqZZv/OFttjh+PmtBkJS2nx2AdB04t89/1O/w1cDnyilFU=", // Chon
  U85b0000da2c00ce71e42c98dad76b2a9:
    "OOW70D2Tw4P0hB/WbTAkVMKsrIbIpnfDK34IkboeqVm7iyynXsJwCaA0dKH/vX3B0IEj4lR8ZSsrOp6A5to3axLZws7Tv2QNV9y62/38FQzE4PVgaH2pPSCNbLLO0S4iFFJZA907GDBS2GO5x4Jd1QdB04t89/1O/w1cDnyilFU=", // โต๊ะจีน
};

// Facebook Page Tokens (mapped by page ID)
const FB_PAGE_TOKENS: Record<string, string> = {
  // These need to be filled with actual page access tokens
  "342502096352138": process.env.FB_IRIS_TOKEN || "",
  "100433364819860": process.env.FB_IRIS_RAYONG_TOKEN || "",
  "2323861754514969": process.env.FB_TERMBOON_TOKEN || "",
  "1179375335569460": process.env.FB_CHON_TOKEN || "",
  "100315376073691": process.env.FB_TOHJEEN_TOKEN || "",
  "111545563829281": process.env.FB_TEST_TOKEN || "",
  "2205446836437741": process.env.FB_TEST2_TOKEN || "",
};

async function sendLineMessage(
  userId: string,
  text: string,
  channel: string
): Promise<{ success: boolean; error?: string }> {
  const channelConfig = LINE_CHANNELS[channel];
  if (!channelConfig?.destinationId) {
    return { success: false, error: "Invalid LINE channel" };
  }

  const accessToken = LINE_ACCESS_TOKENS[channelConfig.destinationId];
  if (!accessToken) {
    return { success: false, error: "LINE access token not found" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `LINE API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendFacebookMessage(
  oduserId: string,
  text: string,
  channel: string
): Promise<{ success: boolean; error?: string }> {
  const channelConfig = FB_CHANNELS[channel];
  if (!channelConfig?.pageId) {
    return { success: false, error: "Invalid Facebook channel" };
  }

  const pageToken = FB_PAGE_TOKENS[channelConfig.pageId];
  if (!pageToken) {
    return {
      success: false,
      error: "Facebook page token not configured",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: oduserId },
          message: { text },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || `Facebook API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { oduserId, docId, text, channel, adminId } = body;

    if (!oduserId || !text || !channel || !docId) {
      return NextResponse.json(
        { error: "userId, docId, text, and channel are required" },
        { status: 400 }
      );
    }

    const channelType = getChannelType(channel);
    let sendResult: { success: boolean; error?: string };

    // Send message via appropriate API
    if (channelType === "line") {
      sendResult = await sendLineMessage(oduserId, text, channel);
    } else {
      sendResult = await sendFacebookMessage(oduserId, text, channel);
    }

    if (!sendResult.success) {
      return NextResponse.json(
        { error: "Failed to send message", details: sendResult.error },
        { status: 500 }
      );
    }

    // Save outgoing message to Firestore
    const messageId = `out_${Date.now()}`;
    const timestamp = Date.now();

    const userRef = adminDb.collection("user").doc(docId);
    await userRef.collection("messages").doc(messageId).set({
      id: messageId,
      text,
      type: "outgoing",
      sender: "admin",
      timestamp,
      status: "sent",
      adminId: adminId || null,
    });

    // Update last message preview (optional)
    await userRef.update({
      lastmessagetime: timestamp,
      lastMessagePreview: `[You] ${text.substring(0, 80)}`,
    });

    return NextResponse.json({
      success: true,
      messageId,
      timestamp,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send message", details: errorMessage },
      { status: 500 }
    );
  }
}
