/**
 * Step 1: Export all messages from Firestore to local JSON files.
 * Each file = 1 user's messages.
 *
 * Run: docker exec excel-filter-po-api-1 npx ts-node src/scripts/export-firestore-messages.ts
 * Output: /app/data/messages/{userId}.json
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function exportMessages() {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const firestore = admin.firestore();

  const outputDir = '/app/data/messages';
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('=== Export Firestore Messages to Local Files ===\n');

  // Get all users
  const BATCH = 500;
  let lastDoc: any = null;
  let totalUsers = 0;
  let totalMessages = 0;
  let usersWithMessages = 0;

  while (true) {
    let query = firestore.collection('user').orderBy('__name__').limit(BATCH);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      totalUsers++;

      // Get all messages for this user
      const messages: any[] = [];
      let msgLast: any = null;

      while (true) {
        let msgQuery = firestore
          .collection('user')
          .doc(userId)
          .collection('messages')
          .orderBy('__name__')
          .limit(500);
        if (msgLast) msgQuery = msgQuery.startAfter(msgLast);

        const msgSnap = await msgQuery.get();
        if (msgSnap.empty) break;

        for (const msgDoc of msgSnap.docs) {
          const m = msgDoc.data();
          messages.push({
            id: msgDoc.id,
            text: m.text || null,
            type: m.type || 'incoming',
            sender: m.sender || 'user',
            timestamp: m.timestamp || 0,
            status: m.status || null,
            adminId: m.adminId || null,
            adminName: m.adminName || null,
            mediaType: m.mediaType || null,
            mediaUrl: m.mediaUrl || null,
            previewUrl: m.previewUrl || null,
          });
        }

        msgLast = msgSnap.docs[msgSnap.docs.length - 1];
      }

      if (messages.length > 0) {
        // Save to file
        const fileData = {
          userId,
          channel: userData.channel || '',
          displayName: userData.displayName || userData.first_name || '',
          messageCount: messages.length,
          messages,
        };

        fs.writeFileSync(
          path.join(outputDir, `${userId}.json`),
          JSON.stringify(fileData)
        );

        usersWithMessages++;
        totalMessages += messages.length;
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Scanned ${totalUsers} users | ${usersWithMessages} with messages | ${totalMessages} total messages`);
  }

  console.log(`\n=== Export Complete ===`);
  console.log(`Users scanned: ${totalUsers}`);
  console.log(`Users with messages: ${usersWithMessages}`);
  console.log(`Total messages: ${totalMessages}`);
  console.log(`Files saved to: ${outputDir}/`);

  process.exit(0);
}

exportMessages().catch((e) => {
  console.error('Export failed:', e);
  process.exit(1);
});
