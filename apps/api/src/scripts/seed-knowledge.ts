/**
 * Seed Knowledge Base entries from existing .ts files into the database.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-knowledge.ts
 *
 * This script parses the static knowledge base files and inserts entries
 * into the knowledge_entries table. Run once to populate initial data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface KBEntry {
  service: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string;
  sortOrder: number;
}

function parseKnowledgeText(service: string, text: string): KBEntry[] {
  const entries: KBEntry[] = [];
  const lines = text.split('\n');
  let currentCategory = 'ข้อมูลทั่วไป';
  let sortOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect category headers (## or ###)
    if (line.startsWith('### ')) {
      currentCategory = line.replace(/^###\s*/, '').trim();
      continue;
    }
    if (line.startsWith('## ')) {
      // Top-level header — use as category if it's not the service name itself
      const header = line.replace(/^##\s*/, '').trim();
      if (!header.includes(service.split('/')[0]) && !header.includes('IRIS') && !header.includes('Catering')) {
        currentCategory = header;
      }
      continue;
    }

    // Table rows
    if (line.startsWith('|') && !line.includes('---')) {
      // Combine table header + row as a single entry
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !cells[0].includes('รายการ') && !cells[0].includes('จำนวนแขก') && !cells[0].includes('แพคเกจ')) {
        entries.push({
          service,
          category: currentCategory,
          question: cells[0],
          answer: cells.slice(1).join(' | '),
          sortOrder: sortOrder++,
        });
      }
      continue;
    }

    // Bullet points
    if (line.startsWith('- ')) {
      const content = line.replace(/^-\s*/, '');
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0 && colonIndex < 60) {
        entries.push({
          service,
          category: currentCategory,
          question: content.substring(0, colonIndex).trim(),
          answer: content.substring(colonIndex + 1).trim(),
          sortOrder: sortOrder++,
        });
      } else if (content.includes('→')) {
        const [q, a] = content.split('→').map(s => s.trim());
        entries.push({
          service,
          category: currentCategory,
          question: q,
          answer: a,
          sortOrder: sortOrder++,
        });
      } else {
        entries.push({
          service,
          category: currentCategory,
          question: content,
          answer: content,
          sortOrder: sortOrder++,
        });
      }
      continue;
    }

    // Lines starting with "จาน" (dish items for Chinese table)
    if (line.startsWith('จาน ')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        entries.push({
          service,
          category: currentCategory,
          question: line.substring(0, colonIndex).trim(),
          answer: line.substring(colonIndex + 1).trim(),
          sortOrder: sortOrder++,
        });
      }
      continue;
    }

    // Lines with * (notes)
    if (line.startsWith('*') && line.endsWith('*')) {
      entries.push({
        service,
        category: currentCategory,
        question: 'หมายเหตุ',
        answer: line.replace(/\*/g, '').trim(),
        sortOrder: sortOrder++,
      });
      continue;
    }

    // Numbered items
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s*/, '');
      entries.push({
        service,
        category: currentCategory,
        question: content,
        answer: content,
        sortOrder: sortOrder++,
      });
    }
  }

  return entries;
}

async function main() {
  console.log('Seeding knowledge base entries...');

  // Check if entries already exist
  const existingCount = await prisma.knowledgeEntry.count();
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing entries. Skipping seed.`);
    console.log('To re-seed, first delete all entries: DELETE FROM knowledge_entries;');
    return;
  }

  // Import the static KB files
  const { KNOWLEDGE_BASE } = await import('../data/kb-temboon-merit');
  const { KB_THAI_BUFFET } = await import('../data/kb-thai-buffet');
  const { KB_CHINESE_TABLE } = await import('../data/kb-chinese-table');
  const { KB_COCKTAIL_CANAPE } = await import('../data/kb-cocktail-canape');
  const { KB_WEDDING } = await import('../data/kb-wedding');

  const allEntries: KBEntry[] = [
    ...parseKnowledgeText('งานบุญ/พิธีสงฆ์', KNOWLEDGE_BASE),
    ...parseKnowledgeText('อาหารไทยบุฟเฟต์', KB_THAI_BUFFET),
    ...parseKnowledgeText('โต๊ะจีน', KB_CHINESE_TABLE),
    ...parseKnowledgeText('Cocktail/Canapé', KB_COCKTAIL_CANAPE),
    ...parseKnowledgeText('งานแต่งงาน', KB_WEDDING),
  ];

  console.log(`Parsed ${allEntries.length} entries total:`);
  const serviceCounts: Record<string, number> = {};
  for (const e of allEntries) {
    serviceCounts[e.service] = (serviceCounts[e.service] || 0) + 1;
  }
  for (const [svc, count] of Object.entries(serviceCounts)) {
    console.log(`  ${svc}: ${count} entries`);
  }

  // Insert all
  const result = await prisma.knowledgeEntry.createMany({
    data: allEntries.map((e) => ({
      service: e.service,
      category: e.category,
      question: e.question,
      answer: e.answer,
      keywords: e.keywords || null,
      sortOrder: e.sortOrder,
    })),
  });

  console.log(`Inserted ${result.count} knowledge entries.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
