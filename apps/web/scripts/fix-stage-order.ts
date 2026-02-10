/**
 * One-time script to fix stage ordering in production.
 * The E2E test previously swapped MRF with Supplier Assignment.
 *
 * Usage:
 *   npx tsx apps/web/scripts/fix-stage-order.ts
 *
 * Requires DATABASE_URL (or DIRECT_URL) in .env
 */

import { PrismaClient } from '@prisma/client';

const CORRECT_ORDER: { name: string; orderIndex: number }[] = [
  { name: 'MRF', orderIndex: 0 },
  { name: 'Supplier Assignment', orderIndex: 1 },
  { name: 'Requisition', orderIndex: 2 },
  { name: 'Order', orderIndex: 3 },
  { name: 'Contract', orderIndex: 3 },
  { name: 'Inventory', orderIndex: 4 },
  { name: 'Certificate', orderIndex: 4 },
  { name: 'Done', orderIndex: 5 },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Fetching current stages...');
    const stages = await prisma.stage.findMany({ orderBy: { orderIndex: 'asc' } });

    console.log('Current order:');
    for (const s of stages) {
      console.log(`  [${s.orderIndex}] ${s.name} (${s.appliesTo})`);
    }

    console.log('\nFixing order...');
    for (const fix of CORRECT_ORDER) {
      const stage = stages.find((s) => s.name === fix.name);
      if (!stage) {
        console.log(`  SKIP: "${fix.name}" not found`);
        continue;
      }
      if (stage.orderIndex === fix.orderIndex) {
        console.log(`  OK: "${fix.name}" already at orderIndex ${fix.orderIndex}`);
        continue;
      }
      await prisma.stage.update({
        where: { id: stage.id },
        data: { orderIndex: fix.orderIndex },
      });
      console.log(`  FIXED: "${fix.name}" ${stage.orderIndex} → ${fix.orderIndex}`);
    }

    console.log('\nVerifying...');
    const updated = await prisma.stage.findMany({ orderBy: { orderIndex: 'asc' } });
    for (const s of updated) {
      console.log(`  [${s.orderIndex}] ${s.name} (${s.appliesTo})`);
    }

    console.log('\nDone!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
