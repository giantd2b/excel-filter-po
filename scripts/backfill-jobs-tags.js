/**
 * Backfill: Look up IRIS Jobs for active customers (last 3 months)
 * and auto-tag "ลูกค้าจองงานแล้ว" if matched.
 *
 * Run: node scripts/backfill-jobs-tags.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway' },
  },
});

const JOBS_API = 'https://iris-job.vercel.app/api/external/lookup';
const JOBS_KEY = 'iris-jobs-7cba15f1c6f5de3a3365554e6e36eb01fdd4f4b6184288045b709869312d9819';

async function backfill() {
  const fetch = (await import('node-fetch')).default;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Get active customers with phone numbers from last 3 months
  const customers = await prisma.customer.findMany({
    where: {
      phoneNumber: { not: null },
      lastMessageAt: { gte: threeMonthsAgo },
    },
    select: { id: true, displayName: true, phoneNumber: true, channel: true },
    orderBy: { lastMessageAt: 'desc' },
  });

  console.log(`Found ${customers.length} active customers with phone numbers (last 3 months)\n`);

  // Ensure tag exists
  const tag = await prisma.tag.upsert({
    where: { name: 'ลูกค้าจองงานแล้ว' },
    update: {},
    create: { name: 'ลูกค้าจองงานแล้ว', color: '#884929' },
  });

  let matched = 0;
  let notFound = 0;
  let alreadyTagged = 0;
  let errors = 0;
  let processed = 0;

  for (const customer of customers) {
    processed++;
    const cleanPhone = customer.phoneNumber.replace(/[-\s]/g, '');

    // Check if already tagged
    const existing = await prisma.customerTag.findUnique({
      where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
    });
    if (existing) {
      alreadyTagged++;
      continue;
    }

    try {
      const resp = await fetch(`${JOBS_API}?phone=${cleanPhone}`, {
        headers: { 'X-API-Key': JOBS_KEY },
        timeout: 5000,
      });
      const result = await resp.json();
      const jobs = result.data || [];

      if (jobs.length > 0) {
        // Tag customer
        await prisma.customerTag.upsert({
          where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
          update: {},
          create: { customerId: customer.id, tagId: tag.id },
        });
        matched++;
        console.log(`✅ ${customer.phoneNumber} | ${customer.displayName} | ${customer.channel} | ${jobs.length} job(s)`);
      } else {
        notFound++;
      }
    } catch {
      errors++;
    }

    if (processed % 50 === 0) {
      console.log(`\nProgress: ${processed}/${customers.length} | Matched: ${matched} | Not found: ${notFound} | Already tagged: ${alreadyTagged} | Errors: ${errors}\n`);
    }

    // Rate limit: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Matched & tagged: ${matched}`);
  console.log(`Already tagged: ${alreadyTagged}`);
  console.log(`Not found in Jobs: ${notFound}`);
  console.log(`Errors: ${errors}`);

  await prisma.$disconnect();
  process.exit(0);
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
