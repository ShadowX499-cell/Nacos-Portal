-- CreateEnum
CREATE TYPE "SuperAdminType" AS ENUM ('course_adviser', 'hod', 'result_exam_officer');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "super_admin_type" "SuperAdminType";
