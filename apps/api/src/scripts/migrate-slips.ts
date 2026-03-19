/**
 * Migration script: Copy slip records from Firestore `link` collection to PostgreSQL `slips` table.
 * Run via: docker exec iris-crm-api-1 npx ts-node src/scripts/migrate-slips.ts
 */
import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

async function migrate() {
  // Init Firebase
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const firestore = admin.firestore();
  const prisma = new PrismaClient();

  console.log('Starting slip migration from Firestore to PostgreSQL...');

  const BATCH_SIZE = 500;
  let lastDoc: any = null;
  let totalMigrated = 0;
  let totalSkipped = 0;

  while (true) {
    let query = firestore
      .collection('link')
      .orderBy('__name__')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const slips: any[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const detectedAt = data.detected_at?.toDate?.() || new Date();

      slips.push({
        id: doc.id,
        imageUrl: data.link || '',
        customerId: data.userid || '',
        channel: data.channel || null,
        bankName: data.bank_name || null,
        amount: data.amount ? parseFloat(String(data.amount)) : null,
        dateTime: data.date_time || null,
        senderName: data.sender_name || null,
        receiverName: data.receiver_name || null,
        referenceNumber: data.reference_number || null,
        detectedAt,
        createdAt: detectedAt,
      });
    }

    // Upsert in batch (skip duplicates)
    for (const slip of slips) {
      try {
        await prisma.slip.upsert({
          where: { id: slip.id },
          update: {},
          create: slip,
        });
        totalMigrated++;
      } catch (e: any) {
        totalSkipped++;
        if (totalSkipped <= 5) {
          console.warn(`Skip ${slip.id}: ${e.message}`);
        }
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Migrated ${totalMigrated} slips so far... (skipped: ${totalSkipped})`);
  }

  console.log(`\nDone! Total migrated: ${totalMigrated}, skipped: ${totalSkipped}`);
  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
