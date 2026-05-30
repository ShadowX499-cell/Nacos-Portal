-- AlterTable
ALTER TABLE "student_grades" ADD COLUMN     "carried_from_session" VARCHAR(20),
ADD COLUMN     "is_carryover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolved_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "academic_transitions" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "from_session" VARCHAR(20) NOT NULL,
    "from_semester" "Semester" NOT NULL,
    "to_session" VARCHAR(20) NOT NULL,
    "to_semester" "Semester" NOT NULL,
    "students_advanced" INTEGER NOT NULL,
    "students_graduated" INTEGER NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_transitions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "academic_transitions" ADD CONSTRAINT "academic_transitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_transitions" ADD CONSTRAINT "academic_transitions_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
