/**
 * Merge duplicate customer records.
 * Old format: {platformUserId} (no __ separator)
 * New format: {platformUserId}__{channel}
 *
 * For each duplicate:
 * 1. Move messages from old → new (update customerId)
 * 2. Move notes from old → new
 * 3. Move tags from old → new
 * 4. Merge phone/nickname if new is empty
 * 5. Delete old record
 */

const { PrismaClient } = require('@prisma/client');
const RAILWAY_DB = 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway';
const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_DB } } });

let merged = 0;
let messagesMoved = 0;
let errors = 0;

async function main() {
  console.log('Finding duplicate customers...\n');

  const allCustomers = await prisma.customer.findMany({
    select: {
      id: true,
      platformUserId: true,
      channel: true,
      displayName: true,
      phoneNumber: true,
      phoneClean: true,
      nickname: true,
      _count: { select: { messages: true, notes: true, tags: true } },
    },
  });

  const oldFormat = allCustomers.filter(c => !c.id.includes('__'));
  const newFormatIds = new Set(allCustomers.filter(c => c.id.includes('__')).map(c => c.id));

  const duplicates = oldFormat.filter(c => {
    const newId = `${c.platformUserId}__${c.channel}`;
    return newFormatIds.has(newId);
  });

  console.log(`Found ${duplicates.length} duplicates to merge.\n`);

  for (const old of duplicates) {
    const newId = `${old.platformUserId}__${old.channel}`;

    try {
      // 1. Move messages
      const movedMsgs = await prisma.message.updateMany({
        where: { customerId: old.id },
        data: { customerId: newId },
      });
      messagesMoved += movedMsgs.count;

      // 2. Move notes
      await prisma.note.updateMany({
        where: { customerId: old.id },
        data: { customerId: newId },
      }).catch(() => {});

      // 3. Move tags (skip if already exists)
      const oldTags = await prisma.customerTag.findMany({
        where: { customerId: old.id },
      });
      for (const tag of oldTags) {
        await prisma.customerTag.upsert({
          where: { customerId_tagId: { customerId: newId, tagId: tag.tagId } },
          update: {},
          create: { customerId: newId, tagId: tag.tagId },
        }).catch(() => {});
      }
      await prisma.customerTag.deleteMany({ where: { customerId: old.id } }).catch(() => {});

      // 4. Merge phone/nickname if new record is missing them
      const newCustomer = await prisma.customer.findUnique({
        where: { id: newId },
        select: { phoneNumber: true, nickname: true },
      });

      const updateData = {};
      if (!newCustomer.phoneNumber && old.phoneNumber) updateData.phoneNumber = old.phoneNumber;
      if (!newCustomer.phoneClean && old.phoneClean) updateData.phoneClean = old.phoneClean;
      if (!newCustomer.nickname && old.nickname) updateData.nickname = old.nickname;

      if (Object.keys(updateData).length > 0) {
        await prisma.customer.update({ where: { id: newId }, data: updateData });
      }

      // 5. Delete old record
      await prisma.customer.delete({ where: { id: old.id } });

      merged++;
      console.log(`  ✓ ${old.displayName} (${old.channel}): moved ${movedMsgs.count} msgs, ${oldTags.length} tags`);
    } catch (err) {
      errors++;
      console.log(`  ✗ ${old.displayName} (${old.id}): ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Merge complete!');
  console.log(`  Merged: ${merged}`);
  console.log(`  Messages moved: ${messagesMoved}`);
  console.log(`  Errors: ${errors}`);
  console.log('========================================');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
