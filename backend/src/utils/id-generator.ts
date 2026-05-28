import { PrismaClient, Program } from '@prisma/client';

/**
 * Auto-generates the next sequential NACOS User ID for a given program + year.
 *
 * Format: NACOS/<PROGRAM>/<YEAR>/<SEQUENCE padded to 3 digits>
 * Examples: NACOS/CSC/2024/001, NACOS/ICT/2024/042
 *
 * Uses a database query to find the highest existing sequence for the
 * (program, year) pair and increments it by 1. Race conditions are safe
 * because the `userId` column has a UNIQUE constraint — Prisma will throw
 * on collision and the caller can retry.
 */
export async function generateUserId(
  prisma: PrismaClient,
  program: Program,
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  const prefix = `NACOS/${program}/${currentYear}/`;

  // Find the highest sequence for this prefix
  const lastUser = await prisma.user.findFirst({
    where: { userId: { startsWith: prefix } },
    orderBy: { userId: 'desc' },
    select: { userId: true },
  });

  let nextSeq = 1;
  if (lastUser) {
    const parts = lastUser.userId.split('/');
    const lastSeq = parseInt(parts[3], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const seq = nextSeq.toString().padStart(3, '0');
  return `${prefix}${seq}`;
}

/** Derive the intake year from a User ID string. */
export function parseUserIdYear(userId: string): number | null {
  const parts = userId.split('/');
  if (parts.length !== 4) return null;
  const year = parseInt(parts[2], 10);
  return isNaN(year) ? null : year;
}
