/**
 * Script: Find Thai phone numbers from customer chat history
 *
 * Scans all incoming messages in Firestore and extracts Thai phone numbers.
 * Saves found phone numbers to each user's profile document.
 *
 * Run with: node find-phone-numbers.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("./excel-filter-po-firebase-adminsdk-ab2ud-3d2d04b81b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { findThaiPhones, formatThaiPhone } = require("./phone-utils");

async function findPhoneNumbers() {
  console.log("Scanning chat history for Thai phone numbers...\n");

  const usersSnapshot = await db.collection("user").get();
  console.log(`Found ${usersSnapshot.docs.length} users to scan\n`);

  let foundCount = 0;
  let noPhoneCount = 0;
  let errorCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const displayName = userData.displayName || userId;

    try {
      // Collect phone numbers from all sources
      const allPhones = [];

      // 1. Scan messages subcollection (incoming only)
      const messagesSnapshot = await userDoc.ref
        .collection("messages")
        .where("type", "==", "incoming")
        .get();

      for (const msgDoc of messagesSnapshot.docs) {
        const msgData = msgDoc.data();
        const phones = findThaiPhones(msgData.text);
        allPhones.push(...phones);
      }

      // 2. Also scan the lastmessage array (older data)
      const lastMessages = userData.lastmessage || [];
      for (const msg of lastMessages) {
        const phones = findThaiPhones(msg.text);
        allPhones.push(...phones);
      }

      // Deduplicate
      const uniquePhones = [...new Set(allPhones)];

      if (uniquePhones.length > 0) {
        // Save the most recent (last found) phone number as primary
        const primaryPhone = uniquePhones[uniquePhones.length - 1];

        await userDoc.ref.update({
          phoneNumber: formatThaiPhone(primaryPhone),
          phoneNumbers: uniquePhones.map(formatThaiPhone),
        });

        foundCount++;
        console.log(
          `[FOUND] ${displayName} -> ${uniquePhones.map(formatThaiPhone).join(", ")}`
        );
      } else {
        noPhoneCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`[ERROR] ${displayName} - ${error.message}`);
    }
  }

  console.log("\n--- Scan Complete ---");
  console.log(`Found phone numbers: ${foundCount} users`);
  console.log(`No phone number: ${noPhoneCount} users`);
  console.log(`Errors: ${errorCount}`);
}

// Run
findPhoneNumbers()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Scan failed:", error);
    process.exit(1);
  });
