-- Reworks Section into the connecting hub between courses, students, and
-- faculty: it moves from a single-course/single-session row to a many-to-many
-- with Course (so one section can span multiple courses/batches, e.g. a
-- merged CS+IT+Mechanical section), and gains its own membership tables for
-- students/faculty (auto-synced from legacy rosters, but manually
-- overridable — see src/lib/section-sync.ts). Session is decoupled from
-- Section entirely and moves onto Quiz instead, since quizzes now map to an
-- upcoming session independently of which section(s) they're given to.
--
-- Existing rows: every current 1:1 Section->Course row is backfilled into
-- the new section_courses join table, and every current quiz.section_id is
-- backfilled into quiz_sections, before the old scalar columns are dropped.

-- CreateTable
CREATE TABLE `section_courses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `section_courses_section_id_course_id_key`(`section_id`, `course_id`),
    INDEX `section_courses_course_id_idx`(`course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `section_students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section_id` INTEGER NOT NULL,
    `student_roll` VARCHAR(191) NOT NULL,
    `source` ENUM('auto', 'manual_added', 'manual_removed') NOT NULL DEFAULT 'auto',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `section_students_section_id_student_roll_key`(`section_id`, `student_roll`),
    INDEX `section_students_student_roll_idx`(`student_roll`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `section_faculty` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section_id` INTEGER NOT NULL,
    `faculty_roll` VARCHAR(191) NOT NULL,
    `source` ENUM('auto', 'manual_added', 'manual_removed') NOT NULL DEFAULT 'auto',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `section_faculty_section_id_faculty_roll_key`(`section_id`, `faculty_roll`),
    INDEX `section_faculty_faculty_roll_idx`(`faculty_roll`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_sections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quiz_id` INTEGER NOT NULL,
    `section_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `quiz_sections_quiz_id_section_id_key`(`quiz_id`, `section_id`),
    INDEX `quiz_sections_section_id_idx`(`section_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill: one row per existing Section -> its single Course.
INSERT INTO `section_courses` (`section_id`, `course_id`)
SELECT `id`, `course_id` FROM `sections`;

-- Backfill: one row per existing Quiz -> its single Section (if any).
INSERT INTO `quiz_sections` (`quiz_id`, `section_id`)
SELECT `id`, `section_id` FROM `quizzes` WHERE `section_id` IS NOT NULL;

-- AlterTable: quizzes — drop the old single-section FK, add an independent
-- optional session FK.
ALTER TABLE `quizzes` DROP FOREIGN KEY `quizzes_section_id_fkey`;
DROP INDEX `quizzes_section_id_idx` ON `quizzes`;
ALTER TABLE `quizzes`
  DROP COLUMN `section_id`,
  ADD COLUMN `session_id` INTEGER NULL;
CREATE INDEX `quizzes_session_id_idx` ON `quizzes`(`session_id`);
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: sections — drop the old course/session FKs and columns now
-- that section_courses carries the (many-to-many) course link and session
-- has moved to Quiz.
ALTER TABLE `sections` DROP FOREIGN KEY `sections_course_id_fkey`;
ALTER TABLE `sections` DROP FOREIGN KEY `sections_session_id_fkey`;
DROP INDEX `sections_course_id_idx` ON `sections`;
DROP INDEX `sections_session_id_idx` ON `sections`;
ALTER TABLE `sections`
  DROP COLUMN `course_id`,
  DROP COLUMN `session_id`;

-- AddForeignKey
ALTER TABLE `section_courses` ADD CONSTRAINT `section_courses_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `section_courses` ADD CONSTRAINT `section_courses_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `section_students` ADD CONSTRAINT `section_students_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `section_faculty` ADD CONSTRAINT `section_faculty_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_sections` ADD CONSTRAINT `quiz_sections_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `quiz_sections` ADD CONSTRAINT `quiz_sections_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
