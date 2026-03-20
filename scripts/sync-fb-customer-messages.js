/**
 * Sync BOTH customer messages AND admin replies from Facebook Conversations API.
 * Fills in missing customer messages that weren't captured before webhook switch.
 *
 * Usage:
 *   node scripts/sync-fb-customer-messages.js              # First 1000 active customers
 *   node scripts/sync-fb-customer-messages.js --offset 1000 # Next 1000
 *   node scripts/sync-fb-customer-messages.js --all         # All customers (slow)
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway' },
  },
});

const FB_PAGES = [
  { pageId: '342502096352138', channel: 'FB_IRIS', tokenEnvKey: 'FB_IRIS_TOKEN', token: process.env.FB_IRIS_TOKEN },
  { pageId: '100433364819860', channel: 'FB_IRIS_RAYONG', tokenEnvKey: 'FB_IRIS_RAYONG_TOKEN', token: process.env.FB_IRIS_RAYONG_TOKEN },
  { pageId: '2323861754514969', channel: 'FB_เติมบุญ', tokenEnvKey: 'FB_TERMBOON_TOKEN', token: process.env.FB_TERMBOON_TOKEN },
  { pageId: '1179375335569460', channel: 'FB_ชล', tokenEnvKey: 'FB_CHON_TOKEN', token: process.env.FB_CHON_TOKEN },
  { pageId: '100315376073691', channel: 'FB_โต๊ะจีน', tokenEnvKey: 'FB_TOHJEEN_TOKEN', token: process.env.FB_TOHJEEN_TOKEN },
  { pageId: '111545563829281', channel: 'FB_ทดสอบระบบ', tokenEnvKey: 'FB_TEST_TOKEN', token: process.env.FB_TEST_TOKEN },
];

// Load tokens from .env file
try {
  const fs = require('fs');
  const envContent = fs.readFileSync('./apps/api/.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
  FB_PAGES.forEach(p => { p.token = process.env[p.tokenEnvKey]; });
} catch {}

async function sync() {
  const fetch = (await import('node-fetch')).default;
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const offsetArg = args.find(a => a.startsWith('--offset'));
  const offset = offsetArg ? parseInt(args[args.indexOf(offsetArg) + 1] || '0') : 0;
  const limit = isAll ? 999999 : 1000;

  // Get active FB customers
  const customers = await prisma.customer.findMany({
    where: {
      channelType: 'FACEBOOK',
      lastMessageAt: { not: null },
    },
    orderBy: { lastMessageAt: 'desc' },
    skip: offset,
    take: limit,
    select: { id: true, platformUserId: true, channel: true, displayName: true },
  });

  console.log(`=== FB Customer Messages Sync ===`);
  console.log(`Customers: ${customers.length} (offset: ${offset}, limit: ${limit})\n`);

  let totalNew = 0;
  let totalSkipped = 0;
  let processed = 0;
  let errors = 0;

  for (const customer of customers) {
    const page = FB_PAGES.find(p => p.channel === customer.channel);
    if (!page || !page.token) {
      processed++;
      continue;
    }

    try {
      // Find conversation for this customer
      const convResp = await fetch(
        `https://graph.facebook.com/v18.0/${page.pageId}/conversations?user_id=${customer.platformUserId}&fields=id&access_token=${page.token}`,
      );
      const convData = await convResp.json();
      const convId = convData.data?.[0]?.id;

      if (!convId) {
        processed++;
        continue;
      }

      // Get ALL messages in conversation (both directions)
      let msgUrl = `https://graph.facebook.com/v18.0/${convId}/messages?fields=message,from,created_time,attachments&limit=50&access_token=${page.token}`;
      let customerNewMsgs = 0;

      while (msgUrl) {
        const msgResp = await fetch(msgUrl);
        const msgData = await msgResp.json();
        const messages = msgData.data || [];

        for (const msg of messages) {
          const isFromPage = msg.from?.id === page.pageId;
          const messageId = isFromPage ? `fb_sync_${msg.id}` : `fb_cust_${msg.id}`;
          const timestamp = new Date(msg.created_time).getTime();

          // Skip if exists
          const exists = await prisma.message.findFirst({
            where: {
              OR: [{ id: messageId }, { id: msg.id }],
            },
          });
          if (exists) {
            totalSkipped++;
            continue;
          }

          // Check by text + timestamp to avoid duplicates
          const text = msg.message || null;
          if (text) {
            const dup = await prisma.message.findFirst({
              where: {
                customerId: customer.id,
                text,
                type: isFromPage ? 'OUTGOING' : 'INCOMING',
                timestamp: { gte: BigInt(timestamp - 5000), lte: BigInt(timestamp + 5000) },
              },
            });
            if (dup) {
              totalSkipped++;
              continue;
            }
          }

          // Determine content
          let mediaType = null;
          let mediaUrl = null;

          const attachments = msg.attachments?.data || [];
          if (attachments.length > 0) {
            const att = attachments[0];
            if (att.type === 'image' || att.mime_type?.startsWith('image/')) {
              mediaType = 'IMAGE';
              mediaUrl = att.image_data?.url || null;
            } else if (att.type === 'video' || att.mime_type?.startsWith('video/')) {
              mediaType = 'VIDEO';
              mediaUrl = att.video_data?.url || null;
            }
          }

          const msgText = text || (mediaType === 'IMAGE' ? '[รูปภาพ]' : mediaType === 'VIDEO' ? '[วิดีโอ]' : '[ข้อความ]');

          try {
            await prisma.message.create({
              data: {
                id: messageId,
                customerId: customer.id,
                text: msgText,
                type: isFromPage ? 'OUTGOING' : 'INCOMING',
                sender: isFromPage ? 'ADMIN' : 'USER',
                timestamp: BigInt(timestamp),
                status: isFromPage ? 'sent' : null,
                adminName: isFromPage ? 'Business Suite' : null,
                mediaType,
                mediaUrl,
              },
            });
            totalNew++;
            if (!isFromPage) customerNewMsgs++;
          } catch {
            totalSkipped++;
          }
        }

        // Next page — only go 3 pages deep per customer to keep it fast
        msgUrl = msgData.paging?.next || null;
      }

      if (customerNewMsgs > 0) {
        console.log(`✅ ${customer.displayName} | ${customer.channel} | +${customerNewMsgs} customer msgs`);
      }
    } catch (err) {
      errors++;
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`\nProgress: ${processed}/${customers.length} | New: ${totalNew} | Skipped: ${totalSkipped} | Errors: ${errors}\n`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed}`);
  console.log(`New messages: ${totalNew}`);
  console.log(`Skipped (existing): ${totalSkipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nTo continue: node scripts/sync-fb-customer-messages.js --offset ${offset + limit}`);

  await prisma.$disconnect();
  process.exit(0);
}

sync().catch(e => { console.error(e); process.exit(1); });
