import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown database error';
    console.warn(
      `[Database Warning] PostgreSQL connection failed (${reason}). Start PostgreSQL via "npm run db:up" and apply schema via "npm run db:push".`,
    );
    return false;
  }
}

