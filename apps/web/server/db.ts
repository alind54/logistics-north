import { PrismaClient, Prisma } from '@prisma/client';

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

// ============================================================================
// Role-based DB access (defense-in-depth)
// ============================================================================
// Maps application roles to PostgreSQL roles created in prisma/sql/001-roles-and-rls.sql.
// Use withRole() to wrap queries in a transaction that assumes the appropriate DB role
// via SET LOCAL (transaction-scoped, PgBouncer transaction-mode safe).

const ROLE_MAP: Record<string, string> = {
  ADMIN: 'app_admin',
  MANAGER: 'app_manager',
  OPERATOR: 'app_logistics',
  VIEWER: 'app_logistics',
};

const VALID_ROLES = new Set(Object.values(ROLE_MAP));

export async function withRole<T>(
  userRole: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const dbRole = ROLE_MAP[userRole];
  if (!dbRole || !VALID_ROLES.has(dbRole)) {
    throw new Error('Unknown role');
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('role', ${dbRole}, true)`;
    return fn(tx);
  });
}
