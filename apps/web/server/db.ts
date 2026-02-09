import { PrismaClient } from '@prisma/client';

// IMPORTANT: For Vercel serverless + Supabase PgBouncer, DATABASE_URL must include:
//   ?pgbouncer=true&connection_limit=1
// - pgbouncer=true: disables prepared statements (incompatible with PgBouncer transaction mode)
// - connection_limit=1: each serverless function instance opens at most 1 connection
// Set DIRECT_URL (without pgbouncer params) for prisma migrate/push commands.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
