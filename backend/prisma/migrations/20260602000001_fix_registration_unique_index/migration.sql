-- Drop the old unique index (was created with CREATE UNIQUE INDEX, not ADD CONSTRAINT)
-- This allows the same session/semester to have both a course_form and a school_fee_receipt
DROP INDEX IF EXISTS "course_registrations_user_id_session_semester_key";
