/**
 * Migrate LINE messages from Production Firestore to Railway PostgreSQL.
 * Runs locally (not Docker) to avoid memory issues.
 * Only migrates users that have 0 messages in Railway.
 *
 * Run: node migrate-production.js
 */
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

const sa = require('./apps/api/service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const firestore = admin.firestore();

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway' },
  },
});

async function migrate() {
  console.log('=== Migrate LINE Messages from Production Firestore ===\n');

  // Get customers that have 0 messages
  const customersWithoutMsgs = await prisma.$queryRaw`
    SELECT c.id, c.platform_user_id, c.channel
    FROM customers c
    LEFT JOIN messages m ON m.customer_id = c.id
    WHERE m.id IS NULL
  `;

  console.log(`Customers without messages: ${customersWithoutMsgs.length}\n`);

  let totalMessages = 0;
  let skipped = 0;
  let processed = 0;
  let empty = 0;

  for (const customer of customersWithoutMsgs) {
    const firestoreUserId = customer.platform_user_id;
    const customerId = customer.id;

    // Get messages from Firestore
    let msgLast = null;
    let userMsgCount = 0;

    while (true) {
      let query = firestore
        .collection('user').doc(firestoreUserId).collection('messages')
        .orderBy('__name__').limit(500);
      if (msgLast) query = query.startAfter(msgLast);

      const snap = await query.get();
      if (snap.empty) break;

      const messages = snap.docs.map(doc => {
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
        userMsgCount += result.count;
        skipped += messages.length - result.count;
      } catch (e) {
        for (const msg of messages) {
          try {
            await prisma.message.create({ data: msg });
            totalMessages++;
            userMsgCount++;
          } catch { skipped++; }
        }
      }

      msgLast = snap.docs[snap.docs.length - 1];
    }

    if (userMsgCount === 0) empty++;

    processed++;
    if (processed % 200 === 0 || processed === customersWithoutMsgs.length) {
      console.log(`Progress: ${processed}/${customersWithoutMsgs.length} | Messages: ${totalMessages} | Skipped: ${skipped} | Empty: ${empty}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Messages imported: ${totalMessages}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Users with no messages: ${empty}`);

  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
