/**
 * One-off: fully merge duplicate customers (old-format id vs composite id).
 * Moves messages/notes/tags/orders/payments/slips, preserves earliest
 * firstContactAt, merges phones/nickname, then deletes the old row.
 * Writes merged pairs to merge-pairs.json for downstream reference updates.
 *
 * DB URL is read from scripts/merge-duplicates.js (existing repo tooling).
 */
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const legacy = readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'merge-duplicates.js'), 'utf8');
const url = legacy.match(/postgresql:\/\/[^\s'"]+/)?.[0];
if (!url) throw new Error('DB url not found in legacy script');

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const dupes = await prisma.$queryRaw`
    SELECT c1.id as old_id, c2.id as new_id, c1.display_name
    FROM customers c1
    JOIN customers c2 ON c1.platform_user_id = c2.platform_user_id
      AND c1.channel = c2.channel AND c1.id < c2.id
  `;
  console.log(`dupe pairs: ${dupes.length}`);

  const pairs = [];
  let merged = 0;
  const failures = [];

  for (const d of dupes) {
    try {
      await prisma.message.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });
      await prisma.note.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });

      const newTags = await prisma.customerTag.findMany({ where: { customerId: d.new_id }, select: { tagId: true } });
      const newTagIds = newTags.map((t) => t.tagId);
      if (newTagIds.length > 0) {
        await prisma.customerTag.deleteMany({ where: { customerId: d.old_id, tagId: { in: newTagIds } } });
      }
      await prisma.customerTag.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });
      await prisma.order.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });
      await prisma.payment.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });
      await prisma.slip.updateMany({ where: { customerId: d.old_id }, data: { customerId: d.new_id } });

      const [oldC, newC] = await Promise.all([
        prisma.customer.findUnique({ where: { id: d.old_id } }),
        prisma.customer.findUnique({ where: { id: d.new_id } }),
      ]);
      if (oldC && newC) {
        const keepFirstContact =
          oldC.firstContactAt && oldC.firstContactAt < newC.firstContactAt ? oldC.firstContactAt : newC.firstContactAt;
        const mergedPhones = [...new Set([...(newC.additionalPhones ?? []), ...(oldC.additionalPhones ?? [])])];
        await prisma.customer.update({
          where: { id: d.new_id },
          data: {
            firstContactAt: keepFirstContact,
            phoneNumber: newC.phoneNumber ?? oldC.phoneNumber,
            phoneClean: newC.phoneClean ?? oldC.phoneClean,
            nickname: newC.nickname ?? oldC.nickname,
            additionalPhones: mergedPhones,
          },
        });
      }

      await prisma.customer.delete({ where: { id: d.old_id } });
      pairs.push({ old: d.old_id, new: d.new_id, name: d.display_name });
      merged++;
      if (merged % 25 === 0) console.log(`merged ${merged}/${dupes.length}...`);
    } catch (err) {
      failures.push({ old: d.old_id, new: d.new_id, error: err.message });
      console.error(`FAIL ${d.old_id}: ${err.message}`);
    }
  }

  writeFileSync(path.join(__dirname, 'merge-pairs.json'), JSON.stringify({ merged, failures, pairs }, null, 2));
  console.log(`done: merged=${merged}, failed=${failures.length} (pairs saved to merge-pairs.json)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
