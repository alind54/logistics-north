import { PrismaClient, AppliesTo, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Stages per WORKFLOWS.md:
// Order path: MRF → Supplier Assignment → Requisition → Order → Inventory → Done
// Contract path: MRF → Supplier Assignment → Requisition → Contract → Certificate → Done

interface StageDef {
  name: string;
  orderIndex: number;
  appliesTo: AppliesTo;
}

const STAGES: StageDef[] = [
  // Shared stages (BOTH)
  { name: 'MRF', orderIndex: 0, appliesTo: 'BOTH' },
  { name: 'Supplier Assignment', orderIndex: 1, appliesTo: 'BOTH' },
  { name: 'Requisition', orderIndex: 2, appliesTo: 'BOTH' },

  // Order-specific stages
  { name: 'Order', orderIndex: 3, appliesTo: 'ORDER' },
  { name: 'Inventory', orderIndex: 4, appliesTo: 'ORDER' },

  // Contract-specific stages
  { name: 'Contract', orderIndex: 3, appliesTo: 'CONTRACT' },
  { name: 'Certificate', orderIndex: 4, appliesTo: 'CONTRACT' },

  // Done stage (shared)
  { name: 'Done', orderIndex: 5, appliesTo: 'BOTH' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create stages
  console.log('Creating stages...');
  const stageMap = new Map<string, string>();

  for (const stage of STAGES) {
    const created = await prisma.stage.upsert({
      where: {
        id: `seed-stage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        name: stage.name,
        orderIndex: stage.orderIndex,
        appliesTo: stage.appliesTo,
      },
      create: {
        id: `seed-stage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: stage.name,
        orderIndex: stage.orderIndex,
        appliesTo: stage.appliesTo,
      },
    });
    stageMap.set(stage.name, created.id);
    console.log(`  ✓ Stage: ${stage.name} (${stage.appliesTo})`);
  }

  // Create transitions for ORDER flow
  console.log('\nCreating ORDER flow transitions...');
  const orderTransitions: [string, string][] = [
    ['MRF', 'Supplier Assignment'],
    ['Supplier Assignment', 'Requisition'],
    ['Requisition', 'Order'],
    ['Order', 'Inventory'],
    ['Inventory', 'Done'],
  ];

  for (const [from, to] of orderTransitions) {
    const fromId = stageMap.get(from);
    const toId = stageMap.get(to);
    if (fromId && toId) {
      await prisma.transition.upsert({
        where: {
          fromStageId_toStageId_appliesTo: {
            fromStageId: fromId,
            toStageId: toId,
            appliesTo: 'ORDER',
          },
        },
        update: {},
        create: {
          fromStageId: fromId,
          toStageId: toId,
          appliesTo: 'ORDER',
        },
      });
      console.log(`  ✓ ${from} → ${to}`);
    }
  }

  // Create transitions for CONTRACT flow
  console.log('\nCreating CONTRACT flow transitions...');
  const contractTransitions: [string, string][] = [
    ['MRF', 'Supplier Assignment'],
    ['Supplier Assignment', 'Requisition'],
    ['Requisition', 'Contract'],
    ['Contract', 'Certificate'],
    ['Certificate', 'Done'],
  ];

  for (const [from, to] of contractTransitions) {
    const fromId = stageMap.get(from);
    const toId = stageMap.get(to);
    if (fromId && toId) {
      await prisma.transition.upsert({
        where: {
          fromStageId_toStageId_appliesTo: {
            fromStageId: fromId,
            toStageId: toId,
            appliesTo: 'CONTRACT',
          },
        },
        update: {},
        create: {
          fromStageId: fromId,
          toStageId: toId,
          appliesTo: 'CONTRACT',
        },
      });
      console.log(`  ✓ ${from} → ${to}`);
    }
  }

  // Create default admin user (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('\nCreating default admin user...');
    const pepper = process.env.PASSWORD_PEPPER || 'dev-pepper-change-me';
    const passwordHash = await bcrypt.hash('AdminPassword123!' + pepper, 12);

    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log('  ✓ Admin user created: admin@example.com / AdminPassword123!');
  }

  // Create some default tags
  console.log('\nCreating default tags...');
  const defaultTags = [
    { name: 'Urgent', color: '#EF4444' },
    { name: 'Pending Approval', color: '#F59E0B' },
    { name: 'On Hold', color: '#6B7280' },
    { name: 'In Review', color: '#3B82F6' },
  ];

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color },
      create: tag,
    });
    console.log(`  ✓ Tag: ${tag.name}`);
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
