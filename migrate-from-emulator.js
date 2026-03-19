/**
 * Read messages from Firestore Emulator (localhost:8080)
 * and import to Railway PostgreSQL.
 *
 * Run: FIRESTORE_EMULATOR_HOST=localhost:8080 node migrate-from-emulator.js
 */
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

// Connect to emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({ projectId: 'excel-filter-po' });
const firestore = admin.firestore();

const RAILWAY_DB_URL = 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway';
const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_DB_URL } } });

async function migrate() {
  console.log('=== Migrate from Firestore Emulator to Railway ===\n');

  // Get customer mapping from Railway
  const customers = await prisma.customer.findMany({
    select: { id: true, platformUserId: true, channel: true },
  });
  const customerMap = new Map();
  for (const c of customers) {
    customerMap.set(c.platformUserId, c.id);
    customerMap.set(`${c.platformUserId}__${c.channel}`, c.id);
  }
  console.log(`Customer mapping: ${customerMap.size} entries`);

  // Scan all users from emulator
  const BATCH = 500;
  let lastDoc = null;
  let totalUsers = 0;
  let totalMessages = 0;
  let skipped = 0;
  let unmatchedUsers = 0;

  while (true) {
    let query = firestore.collection('user').orderBy('__name__').limit(BATCH);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const channel = userData.channel || '';

      // Find matching customer
      let customerId = customerMap.get(`${userId}__${channel}`) || customerMap.get(userId);
      if (!customerId) {
        unmatchedUsers++;
        totalUsers++;
        continue;
      }

      // Get messages
      let msgLast = null;
      while (true) {
        let msgQuery = firestore
          .collection('user').doc(userId).collection('messages')
          .orderBy('__name__').limit(500);
        if (msgLast) msgQuery = msgQuery.startAfter(msgLast);

        const msgSnap = await msgQuery.get();
        if (msgSnap.empty) break;

        const messages = msgSnap.docs.map(doc => {
          const m = doc.data();
          return {
            id: doc.id,
            customerId,
            text: m.text || null,
            type: m.type === 'outgoing' ? 'OUTGOING' : 'INCOMING',
            sender: m.sender === 'admin' ? 'ADMIN' : 'USER',
            timestamp: BigInt(m.timestamp || 0),
            status: m.status || null,
            adminId: m.adminId || null,
            adminName: m.adminName || null,
            mediaType: m.mediaType === 'image' ? 'IMAGE' : m.mediaType === 'video' ? 'VIDEO' : null,
            mediaUrl: m.mediaUrl || null,
            previewUrl: m.previewUrl || null,
          };
        });

        try {
          const result = await prisma.message.createMany({
            data: messages,
            skipDuplicates: true,
          });
          totalMessages += result.count;
          skipped += messages.length - result.count;
        } catch (e) {
          for (const msg of messages) {
            try {
              await prisma.message.create({ data: msg });
              totalMessages++;
            } catch { skipped++; }
          }
        }

        msgLast = msgSnap.docs[msgSnap.docs.length - 1];
      }

      totalUsers++;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Users: ${totalUsers} | Messages: ${totalMessages} | Skipped: ${skipped} | Unmatched: ${unmatchedUsers}`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Users scanned: ${totalUsers}`);
  console.log(`Messages imported: ${totalMessages}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Unmatched users: ${unmatchedUsers}`);

  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
