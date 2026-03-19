/**
 * Step 2: Import messages from local JSON files to Railway PostgreSQL.
 *
 * Run: docker exec excel-filter-po-api-1 sh -c "DATABASE_URL='postgresql://...' npx ts-node src/scripts/import-messages-to-railway.ts"
 * Reads from: /app/data/messages/{userId}.json
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function importMessages() {
  const prisma = new PrismaClient();
  const dataDir = '/app/data/messages';

  console.log('=== Import Messages to Railway PostgreSQL ===\n');

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} user files\n`);

  // Get customer mapping from DB
  const customers = await prisma.customer.findMany({
    select: { id: true, platformUserId: true, channel: true },
  });
  const customerMap = new Map<string, string>(); // platformUserId -> customerId
  for (const c of customers) {
    customerMap.set(c.platformUserId, c.id);
    // Also map with channel suffix for multi-channel users
    customerMap.set(`${c.platformUserId}__${c.channel}`, c.id);
  }
  console.log(`Customer mapping: ${customerMap.size} entries\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let processedFiles = 0;
  let unmatchedUsers = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const data = JSON.parse(raw);
    const firestoreUserId = data.userId;
    const channel = data.channel || '';

    // Find matching customer in PostgreSQL
    let customerId = customerMap.get(`${firestoreUserId}__${channel}`)
      || customerMap.get(firestoreUserId);

    if (!customerId) {
      unmatchedUsers++;
      processedFiles++;
      continue;
    }

    const messages = data.messages || [];
    if (messages.length === 0) {
      processedFiles++;
      continue;
    }

    // Insert in batches of 200
    for (let i = 0; i < messages.length; i += 200) {
      const batch = messages.slice(i, i + 200).map((m: any) => ({
        id: m.id,
        customerId,
        text: m.text || null,
        type: m.type === 'outgoing' ? 'OUTGOING' as const : 'INCOMING' as const,
        sender: m.sender === 'admin' ? 'ADMIN' as const : 'USER' as const,
        timestamp: BigInt(m.timestamp || 0),
        status: m.status || null,
        adminId: m.adminId || null,
        adminName: m.adminName || null,
        mediaType: m.mediaType === 'image' ? 'IMAGE' as const : m.mediaType === 'video' ? 'VIDEO' as const : null,
        mediaUrl: m.mediaUrl || null,
        previewUrl: m.previewUrl || null,
      }));

      try {
        const result = await prisma.message.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalImported += result.count;
        totalSkipped += batch.length - result.count;
      } catch (e: any) {
        // Single insert fallback
        for (const msg of batch) {
          try {
            await prisma.message.create({ data: msg });
            totalImported++;
          } catch {
            totalSkipped++;
          }
        }
      }
    }

    processedFiles++;
    if (processedFiles % 500 === 0 || processedFiles === files.length) {
      console.log(`Files: ${processedFiles}/${files.length} | Imported: ${totalImported} | Skipped: ${totalSkipped} | Unmatched: ${unmatchedUsers}`);
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Files processed: ${processedFiles}`);
  console.log(`Messages imported: ${totalImported}`);
  console.log(`Skipped (duplicates): ${totalSkipped}`);
  console.log(`Unmatched users: ${unmatchedUsers}`);

  await prisma.$disconnect();
  process.exit(0);
}

importMessages().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
