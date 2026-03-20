/**
 * Scan all customers and their messages to find and clean phone numbers.
 *
 * Sources (priority order):
 * 1. Existing phoneNumber field (formatted) → clean to digits
 * 2. Customer messages — scan text for Thai phone numbers
 *
 * Output: phoneClean field with digits only (e.g. "0912345678")
 *
 * Run: node scripts/clean-phone-numbers.js
 */

const { PrismaClient } = require('@prisma/client');

const RAILWAY_DB = 'postgresql://postgres:EjNdvNHMCoLumIqgZrJoYnLYGMtnGYBY@caboose.proxy.rlwy.net:37831/railway';
const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_DB } } });

const THAI_PHONE_REGEX = /(?<!\d)0[2-9][\d][\s.\-]?[\d]{3}[\s.\-]?[\d]{3,4}(?!\d)/g;

function cleanToDigits(raw) {
  return raw.replace(/[\s.\-()]/g, '');
}

function isValidThaiPhone(digits) {
  if (/^0[689]\d{8}$/.test(digits)) return true;  // mobile
  if (/^02\d{7}$/.test(digits)) return true;       // Bangkok landline
  if (/^0[3-7]\d{7}$/.test(digits)) return true;   // provincial landline
  return false;
}

function findPhonesInText(text) {
  if (!text) return [];
  const matches = text.match(THAI_PHONE_REGEX) || [];
  const phones = [];
  for (const raw of matches) {
    const digits = cleanToDigits(raw);
    if (isValidThaiPhone(digits)) {
      phones.push(digits);
    }
  }
  return [...new Set(phones)];
}

let updated = 0;
let scanned = 0;
let fromExisting = 0;
let fromMessages = 0;
let noPhone = 0;

async function processCustomer(customer) {
  scanned++;

  // Priority 1: Clean existing phoneNumber
  if (customer.phoneNumber) {
    const clean = cleanToDigits(customer.phoneNumber);
    if (isValidThaiPhone(clean)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phoneClean: clean },
      });
      updated++;
      fromExisting++;
      return;
    }
  }

  // Priority 2: Scan messages for phone numbers
  const messages = await prisma.message.findMany({
    where: { customerId: customer.id, type: 'INCOMING', sender: 'USER' },
    select: { text: true },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const allPhones = [];
  for (const msg of messages) {
    const found = findPhonesInText(msg.text);
    allPhones.push(...found);
  }

  if (allPhones.length > 0) {
    // Use most frequently mentioned phone
    const freq = {};
    allPhones.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
    const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];

    await prisma.customer.update({
      where: { id: customer.id },
      data: { phoneClean: best },
    });
    updated++;
    fromMessages++;
    if (!customer.phoneNumber) {
      // Also set the formatted version if no phone was set
      const formatted = best.length === 10
        ? `${best.slice(0, 3)}-${best.slice(3, 6)}-${best.slice(6)}`
        : best.length === 9
        ? `${best.slice(0, 2)}-${best.slice(2, 5)}-${best.slice(5)}`
        : best;
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phoneNumber: formatted },
      });
    }
    return;
  }

  noPhone++;
}

async function main() {
  console.log('Scanning customers for phone numbers...\n');

  const customers = await prisma.customer.findMany({
    select: { id: true, displayName: true, phoneNumber: true },
    orderBy: { lastMessageAt: 'desc' },
  });

  console.log(`Total customers: ${customers.length}\n`);

  for (let i = 0; i < customers.length; i++) {
    if ((i + 1) % 500 === 0) {
      console.log(`Progress: ${i + 1}/${customers.length} | Updated: ${updated} | From existing: ${fromExisting} | From messages: ${fromMessages}`);
    }
    await processCustomer(customers[i]);
  }

  console.log('\n========================================');
  console.log('Phone number cleanup complete!');
  console.log(`  Customers scanned:     ${scanned}`);
  console.log(`  Phone numbers set:     ${updated}`);
  console.log(`    From existing field: ${fromExisting}`);
  console.log(`    From chat messages:  ${fromMessages}`);
  console.log(`  No phone found:       ${noPhone}`);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
