-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('active', 'carryover', 'graduated', 'suspended');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "home_address" VARCHAR(300),
ADD COLUMN     "lga" VARCHAR(100),
ADD COLUMN     "profile_photo_url" VARCHAR(500),
ADD COLUMN     "state_of_origin" VARCHAR(50),
ADD COLUMN     "student_status" "StudentStatus" NOT NULL DEFAULT 'active';
