import { PrismaClient, Program } from '@prisma/client';

/**
 * Generates a NACOS User ID with a random 5-digit suffix.
 * Format: NACOS/<PROGRAM>/<YEAR>/<5-digit-random>
 * Examples: NACOS/CSC/2024/47291, NACOS/ICT/2025/83104
 *
 * Retries up to 5 times on collision (userId has UNIQUE constraint).
 */
export async function generateUserId(
  prisma: PrismaClient,
  program: Program,
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  const prefix = `NACOS/${program}/${currentYear}/`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = String(Math.floor(Math.random() * 90000) + 10000);
    const candidate = `${prefix}${suffix}`;
    const existing = await prisma.user.findUnique({ where: { userId: candidate } });
    if (!existing) return candidate;
  }

  throw new Error('ID_GENERATION_FAILED: Could not generate unique user ID after 5 attempts');
}

/** Derive the intake year from a User ID string. */
export function parseUserIdYear(userId: string): number | null {
  const parts = userId.split('/');
  if (parts.length !== 4) return null;
  const year = parseInt(parts[2], 10);
  return isNaN(year) ? null : year;
}
