const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

// LINE Access Tokens (mapped by channel name)
const LINE_ACCESS_TOKENS = {
  Line_IRIS:
    "R3eE8sfUlkLr1HhYZJT7+iOBa4voDFBM2+uFFQCmEieS0ZuYgyEAZI19nP8CDFhzOOJh1VczKwJcMEgCdEBO6tN1EsSzTXkHdDMbgtX8H+eTgmLnYXu8VEdtGZBMyP11pyD8cFy4f4OceoL3e5yDrwdB04t89/1O/w1cDnyilFU=",
  "Line_เติมบุญ":
    "8VTKu+/rmw02eWpgHpBNnzMMFqHDo41rc7HZfgbGhlVwfPWbk8RYVGuMyGCa/2LtoLxNfDV/ynu8NpqSA1scFMWg3hIjRNutHKH/EzlP4xeae6/YY78pXIbNUR4A92COzJBu8eZ6IeHSDc4zhwJnkgdB04t89/1O/w1cDnyilFU=",
  "Line_ทดสอบระบบ":
    "s8WPqMEgXCmmlpUJejk3lJP2xp7zVVngk0cJw6ibs49p7ZmHo9W7zv91mNjF15cmk+nbRXq8FoKhlbLCvIOgBmL6GXbfGSUzhpDPzIVp3WJHHXpJTlcdyxar7aziurCzpIgCQrxW6975HF/eabW4HwdB04t89/1O/w1cDnyilFU=",
  Line_Chon:
    "u+r28TJi8siieZzOk/fDeG0+u7TpP1byi/KAVADS7Bxjjo5FSya8StwKuaJAqyKClxOclWCVh/txdVIHbHuEWjOrjFx80XcGSaCn3X6pwWo0JV84BIAUVxUSkTY/KEqZZv/OFttjh+PmtBkJS2nx2AdB04t89/1O/w1cDnyilFU=",
  "Line_โต๊ะจีน":
    "OOW70D2Tw4P0hB/WbTAkVMKsrIbIpnfDK34IkboeqVm7iyynXsJwCaA0dKH/vX3B0IEj4lR8ZSsrOp6A5to3axLZws7Tv2QNV9y62/38FQzE4PVgaH2pPSCNbLLO0S4iFFJZA907GDBS2GO5x4Jd1QdB04t89/1O/w1cDnyilFU=",
};

// Facebook Page Tokens (to be configured)
const FB_PAGE_TOKENS = {
  FB_IRIS: process.env.FB_IRIS_TOKEN || "",
  FB_IRIS_RAYONG: process.env.FB_IRIS_RAYONG_TOKEN || "",
  "FB_เติมบุญ": process.env.FB_TERMBOON_TOKEN || "",
  "FB_ชล": process.env.FB_CHON_TOKEN || "",
  "FB_โต๊ะจีน": process.env.FB_TOHJEEN_TOKEN || "",
  "FB_ทดสอบระบบ": process.env.FB_TEST_TOKEN || "",
  "FB_ทดสอบระบบ2": process.env.FB_TEST2_TOKEN || "",
};

/**
 * Send message to LINE user
 */
async function sendLineMessage(userId, text, channel) {
  const accessToken = LINE_ACCESS_TOKENS[channel];
  if (!accessToken) {
    throw new Error(`LINE access token not found for channel: ${channel}`);
  }

  try {
    await axios({
      url: "https://api.line.me/v2/bot/message/push",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        to: userId,
        messages: [{ type: "text", text }],
      },
    });
    return { success: true };
  } catch (error) {
    console.error("LINE API error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || `LINE API error: ${error.message}`
    );
  }
}

/**
 * Send message to Facebook user
 */
async function sendFacebookMessage(userId, text, channel) {
  const pageToken = FB_PAGE_TOKENS[channel];
  if (!pageToken) {
    throw new Error(`Facebook page token not configured for channel: ${channel}`);
  }

  try {
    await axios({
      url: `https://graph.facebook.com/v18.0/me/messages`,
      method: "POST",
      params: { access_token: pageToken },
      data: {
        recipient: { id: userId },
        message: { text },
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Facebook API error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error?.message ||
        `Facebook API error: ${error.message}`
    );
  }
}

/**
 * Cloud Function: Send message to user (LINE or Facebook)
 *
 * Request body:
 * - oduserId: The user ID (LINE userId or Facebook PSID)
 * - docId: The Firestore document ID for the user
 * - text: The message text to send
 * - channel: The channel name (e.g., "Line_IRIS", "FB_IRIS")
 * - adminId: Optional admin ID who sent the message
 */
exports.sendMessage = functions.https.onCall(async (data, context) => {
  // Verify authentication (optional, can be enabled for security)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "User must be authenticated"
  //   );
  // }

  const { oduserId, docId, text, channel, adminId } = data;

  // Validate input
  if (!oduserId || !docId || !text || !channel) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: oduserId, docId, text, channel"
    );
  }

  const isLine = channel.startsWith("Line_");
  const isFacebook = channel.startsWith("FB_");

  if (!isLine && !isFacebook) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid channel format"
    );
  }

  try {
    // Send message to appropriate platform
    if (isLine) {
      await sendLineMessage(oduserId, text, channel);
    } else {
      await sendFacebookMessage(oduserId, text, channel);
    }

    // Save outgoing message to Firestore
    const messageId = `out_${Date.now()}`;
    const timestamp = Date.now();
    const firestore = admin.firestore();

    const userRef = firestore.collection("user").doc(docId);
    await userRef.collection("messages").doc(messageId).set({
      id: messageId,
      text,
      type: "outgoing",
      sender: "admin",
      timestamp,
      status: "sent",
      adminId: adminId || null,
    });

    // Update last message preview
    await userRef.update({
      lastmessagetime: timestamp,
      lastMessagePreview: `[You] ${text.substring(0, 80)}`,
    });

    console.log(`Message sent successfully to ${channel}:${oduserId}`);

    return {
      success: true,
      messageId,
      timestamp,
    };
  } catch (error) {
    console.error("Send message error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * HTTP endpoint version for external access
 */
exports.sendMessageHttp = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).send();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { oduserId, docId, text, channel, adminId } = req.body;

  // Validate input
  if (!oduserId || !docId || !text || !channel) {
    return res.status(400).json({
      error: "Missing required fields: oduserId, docId, text, channel",
    });
  }

  const isLine = channel.startsWith("Line_");
  const isFacebook = channel.startsWith("FB_");

  if (!isLine && !isFacebook) {
    return res.status(400).json({ error: "Invalid channel format" });
  }

  try {
    // Send message to appropriate platform
    if (isLine) {
      await sendLineMessage(oduserId, text, channel);
    } else {
      await sendFacebookMessage(oduserId, text, channel);
    }

    // Save outgoing message to Firestore
    const messageId = `out_${Date.now()}`;
    const timestamp = Date.now();
    const firestore = admin.firestore();

    const userRef = firestore.collection("user").doc(docId);
    await userRef.collection("messages").doc(messageId).set({
      id: messageId,
      text,
      type: "outgoing",
      sender: "admin",
      timestamp,
      status: "sent",
      adminId: adminId || null,
    });

    // Update last message preview
    await userRef.update({
      lastmessagetime: timestamp,
      lastMessagePreview: `[You] ${text.substring(0, 80)}`,
    });

    console.log(`Message sent successfully to ${channel}:${oduserId}`);

    return res.json({
      success: true,
      messageId,
      timestamp,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ error: error.message });
  }
});
