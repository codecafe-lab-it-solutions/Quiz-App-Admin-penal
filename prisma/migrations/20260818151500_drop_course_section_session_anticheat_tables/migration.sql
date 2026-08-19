-- Drops Section/SectionCourse/SectionFaculty/SectionStudent/QuizSection,
-- Course/Department, AcademicSession, and AntiCheatEvent - all replaced by
-- either live lookups against the legacy isr_* tables, or (for Quiz's course
-- and section info) the course_code/course_name/section_names columns added
-- in the prior migration and already backfilled by
-- scripts/backfill-course-section-denorm.ts.

-- Join/child tables first (FK-dependent on sections/quizzes/quiz_attempts).
DROP TABLE `quiz_sections`;
DROP TABLE `section_courses`;
DROP TABLE `section_faculty`;
DROP TABLE `section_students`;
DROP TABLE `sections`;
DROP TABLE `anti_cheat_events`;

-- quizzes: drop the old course_id/session_id FKs + their indexes, drop the
-- columns, then require the new denormalized columns (already backfilled).
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_course_id_fkey`;
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_session_id_fkey`;
ALTER TABLE `quizzes` DROP INDEX `quizzes_course_id_idx`;
ALTER TABLE `quizzes` DROP INDEX `quizzes_session_id_idx`;
ALTER TABLE `quizzes` DROP COLUMN `course_id`;
ALTER TABLE `quizzes` DROP COLUMN `session_id`;
ALTER TABLE `quizzes`
  MODIFY COLUMN `course_code` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `course_name` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `section_names` TEXT NOT NULL;
CREATE INDEX `quizzes_course_code_idx` ON `quizzes`(`course_code`);

-- attendance: same pattern for course_id.
ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_course_id_fkey`;
ALTER TABLE `attendance` DROP INDEX `attendance_course_id_idx`;
ALTER TABLE `attendance` DROP COLUMN `course_id`;
ALTER TABLE `attendance`
  MODIFY COLUMN `course_code` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `course_name` VARCHAR(191) NOT NULL;
CREATE INDEX `attendance_course_code_idx` ON `attendance`(`course_code`);

-- Now safe to drop: nothing references these anymore.
DROP TABLE `academic_sessions`;
DROP TABLE `courses`;
DROP TABLE `departments`;
