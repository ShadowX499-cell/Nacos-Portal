-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('course_form', 'school_fee_receipt');

-- Drop old unique constraint
ALTER TABLE "course_registrations" DROP CONSTRAINT IF EXISTS "course_registrations_user_id_session_semester_key";

-- Add type column with default
ALTER TABLE "course_registrations" ADD COLUMN "type" "RegistrationType" NOT NULL DEFAULT 'course_form';

-- Add new unique constraint including type
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_user_id_session_semester_type_key" UNIQUE ("user_id", "session", "semester", "type");
