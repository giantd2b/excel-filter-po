/**
 * Backfill nextJobDate for customers tagged "ลูกค้าจองงานแล้ว"
 * Run: npx ts-node scripts/backfill-job-dates.ts
 */
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const JOBS_API = 'https://iris-job.vercel.app/api/external/lookup';
const JOBS_KEY = process.env.IRIS_JOBS_API_KEY || 'iris-jobs-7cba15f1c6f5de3a3365554e6e36eb01fdd4f4b6184288045b709869312d9819';

async function main() {
  // Find customers with the booked tag who have a phone and no nextJobDate
  const customers = await prisma.customer.findMany({
    where: {
      phoneNumber: { not: null },
      nextJobDate: null,
      tags: {
        some: {
          tag: { name: 'ลูกค้าจองงานแล้ว' },
        },
      },
    },
    select: { id: true, phoneNumber: true, displayName: true },
  });

  console.log(`Found ${customers.length} customers to backfill`);

  let updated = 0;
  let failed = 0;

  for (const c of customers) {
    const phone = c.phoneNumber!.replace(/\D/g, '');
    if (phone.length < 9) continue;

    try {
      const resp = await axios.get(`${JOBS_API}?phone=${phone}`, {
        headers: { 'X-API-Key': JOBS_KEY },
        timeout: 5000,
      });

      const jobs = resp.data?.data || [];
      if (jobs.length === 0) continue;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingJobs = jobs
        .filter((j: any) => j.due && new Date(j.due) >= today)
        .sort((a: any, b: any) => new Date(a.due).getTime() - new Date(b.due).getTime());

      const nextJob = upcomingJobs[0] || jobs[0];
      if (nextJob?.due) {
        await prisma.customer.update({
          where: { id: c.id },
          data: {
            nextJobDate: new Date(nextJob.due),
            nextJobTitle: (nextJob.job || '').substring(0, 100),
          },
        });
        updated++;
        console.log(`✓ ${c.displayName} → ${nextJob.due} ${nextJob.job || ''}`);
      }
    } catch (err: any) {
      failed++;
      console.log(`✗ ${c.displayName}: ${err.message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch(console.error);
