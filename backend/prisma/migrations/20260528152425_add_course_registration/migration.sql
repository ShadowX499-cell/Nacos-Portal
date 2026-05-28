-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateTable
CREATE TABLE "course_registrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session" VARCHAR(20) NOT NULL,
    "semester" "Semester" NOT NULL,
    "file_url" VARCHAR(500),
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "review_note" VARCHAR(500),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "course_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_registrations_user_id_session_semester_key" ON "course_registrations"("user_id", "session", "semester");

-- AddForeignKey
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
