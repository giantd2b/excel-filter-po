/**
 * Migrate messages from Firestore to Railway PostgreSQL.
 * Runs in batches to avoid memory issues.
 *
 * Run: railway run -- npx ts-node src/scripts/migrate-messages.ts
 */
import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

async function migrate() {
  if (admin.apps.length === 0) {
    // Use base64 env var for Railway
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
      const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  const firestore = admin.firestore();
  const prisma = new PrismaClient();

  console.log('=== Message Migration: Firestore → PostgreSQL ===\n');

  // Get all customers from PostgreSQL
  const customers = await prisma.customer.findMany({
    select: { id: true, platformUserId: true, channel: true },
  });
  console.log(`Total customers: ${customers.length}`);

  // Deduplicate by platformUserId (same Firestore doc for multiple channels)
  const platformMap = new Map<string, { customerId: string; channel: string }[]>();
  for (const c of customers) {
    const list = platformMap.get(c.platformUserId) || [];
    list.push({ customerId: c.id, channel: c.channel });
    platformMap.set(c.platformUserId, list);
  }
  console.log(`Unique Firestore users to scan: ${platformMap.size}\n`);

  let totalMessages = 0;
  let skipped = 0;
  let processed = 0;
  const BATCH = 500;

  for (const [firestoreUserId, customerEntries] of platformMap) {
    // Only use the first customer entry for message assignment
    // (messages belong to the channel the customer is in)
    const customerId = customerEntries[0].customerId;

    let lastDoc: any = null;

    while (true) {
      let query = firestore
        .collection('user')
        .doc(firestoreUserId)
        .collection('messages')
        .orderBy('__name__')
        .limit(BATCH);

      if (lastDoc) query = query.startAfter(lastDoc);

      const snapshot = await query.get();
      if (snapshot.empty) break;

      const messages: any[] = [];
      for (const doc of snapshot.docs) {
        const m = doc.data();
        messages.push({
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
        });
      }

      try {
        const result = await prisma.message.createMany({
          data: messages,
          skipDuplicates: true,
        });
        totalMessages += result.count;
        skipped += messages.length - result.count;
      } catch (e: any) {
        // Fallback: one by one
        for (const msg of messages) {
          try {
            await prisma.message.create({ data: msg });
            totalMessages++;
          } catch {
            skipped++;
          }
        }
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    processed++;
    if (processed % 500 === 0 || processed === platformMap.size) {
      console.log(`Progress: ${processed}/${platformMap.size} users | ${totalMessages} messages | ${skipped} skipped`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Messages migrated: ${totalMessages}`);
  console.log(`Skipped (duplicates): ${skipped}`);

  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
