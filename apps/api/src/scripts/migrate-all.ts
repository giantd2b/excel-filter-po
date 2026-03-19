/**
 * Full migration: Firestore → PostgreSQL
 * Migrates: customers (user collection) + messages (subcollection) + replyTemplates
 *
 * Run: docker exec iris-crm-api-1 npx ts-node src/scripts/migrate-all.ts
 */
import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

async function migrate() {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const firestore = admin.firestore();
  const prisma = new PrismaClient();

  console.log('=== Full Migration: Firestore → PostgreSQL ===\n');

  // ─── Phase 1: Migrate Customers ────────────────────────────────
  console.log('Phase 1: Migrating customers...');
  const BATCH = 500;
  let lastDoc: any = null;
  let totalCustomers = 0;
  let skippedCustomers = 0;

  while (true) {
    let query = firestore.collection('user').orderBy('__name__').limit(BATCH);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const d = doc.data();
      const channel = d.channel || '';
      const channelType = channel.startsWith('Line_') ? 'LINE' : 'FACEBOOK';
      const lastMsgTime = d.lastmessagetime ? new Date(d.lastmessagetime) : null;
      const firstContact = d.timestamp ? new Date(d.timestamp) : new Date();

      try {
        // Use composite ID: platformUserId__channel
        const customerId = channel ? `${doc.id}__${channel}` : doc.id;

        await prisma.customer.upsert({
          where: { id: customerId },
          update: {},
          create: {
            id: customerId,
            platformUserId: doc.id,
            displayName: d.displayName || d.first_name || 'ไม่ระบุชื่อ',
            firstName: d.first_name || null,
            lastName: d.last_name || null,
            pictureUrl: d.pictureUrl || d.profile_pic || null,
            profilePic: d.profile_pic || d.pictureUrl || null,
            channel,
            channelType: channelType as any,
            phoneNumber: d.phoneNumber || null,
            statusMessage: d.statusMessage || null,
            status: 'OPEN',
            unreadCount: d.unreadCount || 0,
            lastMessageAt: lastMsgTime,
            lastMessagePreview: d.lastMessagePreview || null,
            firstContactAt: firstContact,
            createdAt: firstContact,
          },
        });
        totalCustomers++;
      } catch (e: any) {
        skippedCustomers++;
        if (skippedCustomers <= 3) console.warn(`Skip customer ${doc.id}: ${e.message}`);
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`  Customers: ${totalCustomers} migrated, ${skippedCustomers} skipped`);
  }
  console.log(`✓ Customers done: ${totalCustomers} total\n`);

  // ─── Phase 2: Migrate Messages ─────────────────────────────────
  console.log('Phase 2: Migrating messages...');
  let totalMessages = 0;
  let skippedMessages = 0;
  let processedUsers = 0;

  // Get all customer IDs from PostgreSQL (need platformUserId for Firestore lookup)
  const customers = await prisma.customer.findMany({
    select: { id: true, platformUserId: true },
  });
  const totalUsers = customers.length;

  // Deduplicate by platformUserId to avoid querying same Firestore doc multiple times
  const seenPlatformIds = new Set<string>();

  for (const customer of customers) {
    // Use platformUserId for Firestore path
    const firestoreUserId = customer.platformUserId;
    if (seenPlatformIds.has(firestoreUserId)) {
      processedUsers++;
      continue;
    }
    seenPlatformIds.add(firestoreUserId);

    let msgLastDoc: any = null;

    while (true) {
      let msgQuery = firestore
        .collection('user')
        .doc(firestoreUserId)
        .collection('messages')
        .orderBy('__name__')
        .limit(BATCH);
      if (msgLastDoc) msgQuery = msgQuery.startAfter(msgLastDoc);

      const msgSnapshot = await msgQuery.get();
      if (msgSnapshot.empty) break;

      const messagesToCreate: any[] = [];

      for (const msgDoc of msgSnapshot.docs) {
        const m = msgDoc.data();
        messagesToCreate.push({
          id: msgDoc.id,
          customerId: customer.id,
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

      // Batch insert with skipDuplicates
      try {
        const result = await prisma.message.createMany({
          data: messagesToCreate,
          skipDuplicates: true,
        });
        totalMessages += result.count;
      } catch (e: any) {
        // Fallback: insert one by one
        for (const msg of messagesToCreate) {
          try {
            await prisma.message.upsert({
              where: { id: msg.id },
              update: {},
              create: msg,
            });
            totalMessages++;
          } catch {
            skippedMessages++;
          }
        }
      }

      msgLastDoc = msgSnapshot.docs[msgSnapshot.docs.length - 1];
    }

    processedUsers++;
    if (processedUsers % 500 === 0 || processedUsers === totalUsers) {
      console.log(`  Users: ${processedUsers}/${totalUsers}, Messages: ${totalMessages}, Skipped: ${skippedMessages}`);
    }
  }
  console.log(`✓ Messages done: ${totalMessages} total\n`);

  // ─── Phase 3: Migrate Reply Templates ──────────────────────────
  console.log('Phase 3: Migrating reply templates...');
  let totalTemplates = 0;

  const templatesSnap = await firestore.collection('replyTemplates').get();
  for (const doc of templatesSnap.docs) {
    const d = doc.data();
    try {
      await prisma.replyTemplate.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          title: d.title || '',
          text: d.text || '',
          category: d.category || null,
          sortOrder: d.order || 0,
        },
      });
      totalTemplates++;
    } catch {
      // skip
    }
  }
  console.log(`✓ Templates done: ${totalTemplates} total\n`);

  // ─── Phase 4: Link slips to customers ──────────────────────────
  console.log('Phase 4: Linking slips to customers...');
  const linkedSlips = await prisma.$executeRaw`
    UPDATE slips SET customer_id = c.id
    FROM customers c
    WHERE slips.customer_id = c.id
    AND EXISTS (SELECT 1 FROM customers WHERE id = slips.customer_id)
  `;
  console.log(`✓ Slips linked: ${linkedSlips}\n`);

  // ─── Summary ───────────────────────────────────────────────────
  console.log('=== Migration Complete ===');
  console.log(`Customers: ${totalCustomers}`);
  console.log(`Messages:  ${totalMessages}`);
  console.log(`Templates: ${totalTemplates}`);
  console.log(`Skipped:   ${skippedCustomers} customers, ${skippedMessages} messages`);

  await prisma.$disconnect();
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
