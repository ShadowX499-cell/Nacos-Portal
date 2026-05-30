-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "positions" TEXT[] DEFAULT ARRAY[]::TEXT[];
