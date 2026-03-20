/**
 * Migrate messages from Firestore subcollections to PostgreSQL.
 * Run: node scripts/migrate-messages.js
 *
 * This script:
 * 1. Gets all customers from PostgreSQL
 * 2. For each customer, fetches messages from Firestore (user/{platformUserId}/messages)
 * 3. Inserts missing messages into PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const sa = require('../apps/api/service-account.json');

const RAILWAY_DB = 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway';
const BATCH_SIZE = 500;

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();
const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_DB } } });

let totalMigrated = 0;
let totalSkipped = 0;
let totalErrors = 0;

async function migrateCustomerMessages(customer) {
  const { id: customerId, platformUserId, displayName, channel } = customer;

  try {
    // Fetch messages from Firestore
    const msgSnap = await db.collection('user').doc(platformUserId).collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    if (msgSnap.empty) return;

    // Get existing message IDs in PostgreSQL
    const existingMsgs = await prisma.message.findMany({
      where: { customerId },
      select: { id: true },
    });
    const existingIds = new Set(existingMsgs.map(m => m.id));

    const newMessages = [];

    msgSnap.docs.forEach(doc => {
      if (existingIds.has(doc.id)) {
        totalSkipped++;
        return;
      }

      const d = doc.data();
      const timestamp = d.timestamp || d.timesent || 0;
      if (!timestamp) {
        totalSkipped++;
        return;
      }

      // Determine message type
      let type = 'INCOMING';
      let sender = 'USER';
      if (d.type === 'outgoing' || d.sender === 'admin') {
        type = 'OUTGOING';
        sender = 'ADMIN';
      }

      // Determine media type
      let mediaType = null;
      let mediaUrl = d.mediaUrl || d.imageUrl || null;
      let previewUrl = d.previewUrl || null;

      if (d.mediaType === 'image' || d.mediaType === 'IMAGE') mediaType = 'IMAGE';
      else if (d.mediaType === 'video' || d.mediaType === 'VIDEO') mediaType = 'VIDEO';
      else if (mediaUrl && (d.text || '').includes('[รูปภาพ]')) mediaType = 'IMAGE';
      else if (mediaUrl && (d.text || '').includes('[สติกเกอร์]')) mediaType = 'IMAGE';

      newMessages.push({
        id: doc.id,
        customerId,
        text: d.text || null,
        type,
        sender,
        timestamp: BigInt(timestamp),
        status: d.status || null,
        adminId: d.adminId || null,
        adminName: d.adminName || null,
        mediaType,
        mediaUrl,
        previewUrl,
      });
    });

    if (newMessages.length === 0) return;

    // Insert in batches
    for (let i = 0; i < newMessages.length; i += BATCH_SIZE) {
      const batch = newMessages.slice(i, i + BATCH_SIZE);
      await prisma.message.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    totalMigrated += newMessages.length;
    console.log(`  ✓ ${displayName} (${channel}): +${newMessages.length} messages (${existingIds.size} existed)`);
  } catch (err) {
    totalErrors++;
    console.error(`  ✗ ${displayName} (${customerId}): ${err.message}`);
  }
}

async function main() {
  console.log('Starting message migration from Firestore → PostgreSQL...\n');

  // Get all customers from PostgreSQL
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      platformUserId: true,
      displayName: true,
      channel: true,
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  console.log(`Found ${customers.length} customers to check.\n`);

  let processed = 0;
  for (const customer of customers) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`\n--- Progress: ${processed}/${customers.length} | Migrated: ${totalMigrated} | Skipped: ${totalSkipped} ---\n`);
    }
    await migrateCustomerMessages(customer);
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`  Customers processed: ${customers.length}`);
  console.log(`  Messages migrated:   ${totalMigrated}`);
  console.log(`  Messages skipped:    ${totalSkipped} (already existed)`);
  console.log(`  Errors:              ${totalErrors}`);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
