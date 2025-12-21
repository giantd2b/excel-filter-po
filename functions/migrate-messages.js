/**
 * Migration Script: Copy lastmessage array to messages subcollection
 *
 * This script migrates existing messages from the lastmessage array field
 * to a proper messages subcollection for better querying and real-time updates.
 *
 * Run with: node migrate-messages.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("./excel-filter-po-firebase-adminsdk-ab2ud-958cc42223.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateMessages() {
  console.log("Starting message migration...\n");

  const usersSnapshot = await db.collection("user").get();
  console.log(`Found ${usersSnapshot.docs.length} users to process\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const lastMessages = userData.lastmessage || [];

    if (lastMessages.length === 0) {
      skippedCount++;
      continue;
    }

    try {
      const batch = db.batch();
      const messagesRef = userDoc.ref.collection("messages");

      // Check if already migrated
      const existingMessages = await messagesRef.limit(1).get();
      if (!existingMessages.empty) {
        console.log(`[SKIP] ${userId} - Already has messages subcollection`);
        skippedCount++;
        continue;
      }

      // Migrate each message to subcollection
      for (const msg of lastMessages) {
        const messageDoc = messagesRef.doc(msg.id || `msg_${msg.timesent}`);
        batch.set(messageDoc, {
          id: msg.id || `msg_${msg.timesent}`,
          text: msg.text || "",
          type: "incoming",
          sender: "user",
          timestamp: msg.timesent || Date.now(),
        });
      }

      // Update user document with new fields
      const lastMessage = lastMessages[lastMessages.length - 1];
      batch.update(userDoc.ref, {
        unreadCount: lastMessages.length,
        lastMessagePreview: lastMessage?.text?.substring(0, 100) || "",
      });

      await batch.commit();
      migratedCount++;
      console.log(`[OK] ${userId} - Migrated ${lastMessages.length} messages`);

    } catch (error) {
      errorCount++;
      console.error(`[ERROR] ${userId} - ${error.message}`);
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Run migration
migrateMessages()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
