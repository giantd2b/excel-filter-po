/**
 * Migration Script: อัพเดตรูปโปรไฟล์ LINE users เก่าที่ยังไม่มีรูปใน Firebase Storage
 *
 * วิธีใช้: node migrate-profile-pics.js
 */

const admin = require("firebase-admin");
const axios = require("axios");
const os = require("os");
const fs = require("fs");
const Path = require("path");
const UUID = require("uuid-v4");

// Initialize Firebase Admin
const serviceAccount = require("./excel-filter-po-firebase-adminsdk-ab2ud-48647f8e6f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "excel-filter-po.appspot.com"
});

const firestore = admin.firestore();

// ดาวน์โหลดรูปและอัพโหลดไป Storage
async function uploadProfilePic(imageUrl, userId) {
  const uuid = UUID();

  try {
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 30000
    });

    const filename = `${userId}.jpg`;
    const tempLocalFile = Path.join(os.tmpdir(), filename);
    fs.writeFileSync(tempLocalFile, response.data);

    const bucket = admin.storage().bucket();
    await bucket.upload(tempLocalFile, {
      destination: `photos/${userId}/${filename}`,
      metadata: {
        cacheControl: "no-cache",
        metadata: {
          firebaseStorageDownloadTokens: uuid,
        },
      },
    });

    fs.unlinkSync(tempLocalFile);

    const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o`;
    const suffix = `alt=media&token=${uuid}`;
    return `${prefix}/${encodeURIComponent(`photos/${userId}/${filename}`)}?${suffix}`;
  } catch (error) {
    console.error(`Error uploading for ${userId}:`, error.message);
    return null;
  }
}

async function migrate() {
  console.log("Starting migration...\n");

  // ดึง LINE users ทั้งหมดที่มี profile_pic แต่ยังไม่มีรูปใน Storage
  const snapshot = await firestore.collection("user")
    .where("channel", ">=", "Line")
    .where("channel", "<=", "Line\uf8ff")
    .get();

  console.log(`Found ${snapshot.docs.length} LINE users\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = doc.id;

    // ข้ามถ้ามีรูปใน Firebase Storage แล้ว
    if (data.pictureUrl && data.pictureUrl.includes("firebasestorage.googleapis.com")) {
      console.log(`[SKIP] ${data.displayName || userId} - already has Storage URL`);
      skipped++;
      continue;
    }

    // หา URL รูปโปรไฟล์จาก LINE
    const lineProfileUrl = data.profile_pic || data.pictureUrl;

    if (!lineProfileUrl || !lineProfileUrl.includes("line-scdn.net")) {
      console.log(`[SKIP] ${data.displayName || userId} - no LINE profile URL`);
      skipped++;
      continue;
    }

    console.log(`[PROCESSING] ${data.displayName || userId}...`);

    // อัพโหลดรูปไป Storage
    const storageUrl = await uploadProfilePic(lineProfileUrl, userId);

    if (storageUrl) {
      // อัพเดต Firestore
      await firestore.doc(`user/${userId}`).update({
        pictureUrl: storageUrl,
        profile_pic: lineProfileUrl
      });
      console.log(`[SUCCESS] ${data.displayName || userId}`);
      updated++;
    } else {
      console.log(`[FAILED] ${data.displayName || userId}`);
      failed++;
    }

    // หน่วงเวลาเพื่อไม่ให้โดน rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n========== Migration Complete ==========");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log("=========================================");

  process.exit(0);
}

migrate().catch(console.error);
