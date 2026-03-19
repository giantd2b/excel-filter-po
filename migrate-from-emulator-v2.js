/**
 * Migrate ALL messages from Firestore Emulator to Railway PostgreSQL.
 * Reads from emulator (localhost:8080) — much faster than production API.
 * Only imports messages that don't exist yet (skipDuplicates).
 *
 * Run: FIRESTORE_EMULATOR_HOST=localhost:8080 node migrate-from-emulator-v2.js
 */
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'excel-filter-po' });
const firestore = admin.firestore();

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway' },
  },
});

async function migrate() {
  console.log('=== Migrate from Emulator to Railway (v2) ===\n');

  // Build customer mapping: firestoreUserId + channel -> PostgreSQL customerId
  const customers = await prisma.customer.findMany({
    select: { id: true, platformUserId: true, channel: true },
  });

  // Map by platformUserId (old Firestore ID)
  // Priority: exact match with channel suffix, fallback to plain ID
  const customerByPlatformId = new Map();
  for (const c of customers) {
    // Store all entries for this platformUserId
    if (!customerByPlatformId.has(c.platformUserId)) {
      customerByPlatformId.set(c.platformUserId, []);
    }
    customerByPlatformId.get(c.platformUserId).push(c);
  }

  console.log(`Customers in Railway: ${customers.length}`);
  console.log(`Unique platform IDs: ${customerByPlatformId.size}\n`);

  // Also check which customers already have messages
  const customersWithMsgs = await prisma.$queryRaw`
    SELECT DISTINCT customer_id FROM messages
  `;
  const hasMessages = new Set(customersWithMsgs.map(r => r.customer_id));
  console.log(`Customers already with messages: ${hasMessages.size}\n`);

  // Scan all users from emulator
  const BATCH = 500;
  let lastDoc = null;
  let totalUsers = 0;
  let totalMessages = 0;
  let skipped = 0;
  let alreadyHadMessages = 0;
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

      // Find matching customer in Railway
      const entries = customerByPlatformId.get(userId);
      if (!entries || entries.length === 0) {
        unmatchedUsers++;
        totalUsers++;
        continue;
      }

      // Find the entry matching this channel, or use first
      let customerId = entries.find(e => e.channel === channel)?.id || entries[0].id;

      // Skip if already has messages
      if (hasMessages.has(customerId)) {
        alreadyHadMessages++;
        totalUsers++;
        continue;
      }

      // Get messages from emulator
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
    console.log(`Users: ${totalUsers} | New msgs: ${totalMessages} | Skipped: ${skipped} | Already had: ${alreadyHadMessages} | Unmatched: ${unmatchedUsers}`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Users scanned: ${totalUsers}`);
  console.log(`Messages imported: ${totalMessages}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Already had messages: ${alreadyHadMessages}`);
  console.log(`Unmatched users: ${unmatchedUsers}`);

  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
