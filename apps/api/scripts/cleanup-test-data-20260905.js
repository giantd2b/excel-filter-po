// One-off cleanup of test bookings / booking links (2026-09-04/05). Fixed lists only.
// Run from apps/api with the prod DB URL:
//   DATABASE_URL=<DATABASE_PUBLIC_URL> NODE_PATH=node_modules node scripts/cleanup-test-data-20260905.js --dry-run|--apply
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const BOOKING_CODES = [
  'TB-260807-001', 'TB-260904-001', 'TB-260904-002', 'TB-260904-003', 'TB-260904-004',
  'TB-260905-001', 'TB-260905-002', 'TB-260905-003', 'TB-260905-004', 'TB-260905-005', 'TB-260905-006',
  'TB-260905-007', 'TB-260905-008', 'TB-260905-009', 'TB-260905-011',
];
const KEEP_BOOKINGS = ['TB-260904-005', 'TB-260904-006', 'TB-260905-010', 'TB-260905-012', 'TB-260905-013', 'TB-260905-014'];
const LINK_TOKENS = [
  '9um9xUMOtQdpg5teyU15uA', '1pRYx-ZJRe8rcutAuRHNig', '516Y4wZ7wSMNTRjMtdvGZg', // PoomK (LINE ทดสอบระบบ)
  'vbJ8SHcWUuwmdKZY9Dydiw', 'wO4pSl0Jfp5LjyHgjDOvwA', 'ME7ddkAAz6Cc1TSAKuqDVg', // Poom Kaew-on (FB)
  '5e3_fnoRx7qZh7ICMixsYg', '0hP8PQe7wFyS3JyMK9Db5g', // NICK test links
];

(async () => {
  for (const c of BOOKING_CODES) if (KEEP_BOOKINGS.includes(c)) throw new Error(`refusing: ${c} is in the keep list`);
  const bookings = await p.booking.findMany({ where: { code: { in: BOOKING_CODES } }, select: { id: true, code: true, customerName: true, quotationDocNo: true } });
  console.log(`bookings matched ${bookings.length}/${BOOKING_CODES.length}`);
  for (const b of bookings) console.log('  ', b.code, '|', b.customerName, '|', b.quotationDocNo || '-');
  const links = await p.bookingLink.findMany({ where: { token: { in: LINK_TOKENS } }, select: { id: true, token: true, customerName: true, channel: true, _count: { select: { bookings: true } } } });
  console.log(`links matched ${links.length}/${LINK_TOKENS.length}`);
  for (const l of links) console.log('  ', l.token, '|', l.customerName, '|', l.channel, '| bookings', l._count.bookings);
  // every booking attached to a link we delete must itself be in the delete list
  const linked = await p.booking.findMany({ where: { linkId: { in: links.map((l) => l.id) } }, select: { code: true } });
  const stray = linked.filter((b) => !BOOKING_CODES.includes(b.code));
  if (stray.length) throw new Error(`refusing: links still used by kept bookings ${stray.map((b) => b.code).join(', ')}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing deleted. Re-run with --apply.'); await p.$disconnect(); return; }
  const result = await p.$transaction(async (tx) => {
    const b = await tx.booking.deleteMany({ where: { id: { in: bookings.map((x) => x.id) } } });
    const l = await tx.bookingLink.deleteMany({ where: { id: { in: links.map((x) => x.id) } } });
    return { bookings: b.count, links: l.count };
  });
  console.log('\nDELETED', result);
  const left = await p.booking.findMany({ select: { code: true, customerName: true }, orderBy: { code: 'asc' } });
  console.log('remaining bookings:', left.map((b) => `${b.code} (${b.customerName})`).join(', '));
  const leftL = await p.bookingLink.findMany({ select: { customerName: true, createdByName: true }, orderBy: { createdAt: 'asc' } });
  console.log('remaining links:', leftL.map((l) => `${l.customerName}/${l.createdByName}`).join(', '));
  await p.$disconnect();
})().catch(async (e) => { console.error('ABORT:', e.message); await p.$disconnect(); process.exit(1); });
