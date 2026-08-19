-- Repairs any database where migration `20260818151500_drop_course_section_
-- session_anticheat_tables` failed partway through (MySQL error 1265,
-- "Data truncated for column 'course_code'"). That migration assumed a
-- one-off local backfill script had already populated
-- quizzes.course_code/course_name/section_names before making them
-- NOT NULL - that script was never part of the actual migration, so
-- `prisma migrate deploy` alone failed on any database that already had
-- quiz rows. By the time it failed, quizzes.course_id/session_id (and the
-- section_* / quiz_sections / anti_cheat_events tables) were already
-- dropped - unrecoverable from that point on.
--
-- Every step below is written to be a safe no-op on a database where the
-- original migration already ran to completion (this session's own dev
-- database, and any fresh install with zero pre-existing quiz rows never
-- hit the failure at all). Constraint/index names are looked up from
-- information_schema rather than hardcoded, since this needs to work
-- regardless of exactly what MySQL named them.

-- ---------------------------------------------------------------------
-- quizzes.course_code / course_name / section_names
-- ---------------------------------------------------------------------

SET @attendance_has_course_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'course_id'
);

-- Recover real course info where possible: any quiz that already has
-- attendance rows can have its course re-derived through
-- attendance.course_id (only meaningful while that column and the
-- `courses` table still exist - guarded above, since both are already
-- gone wherever this migration previously completed).
SET @sql := IF(@attendance_has_course_id > 0,
  'UPDATE `quizzes` q
   JOIN `attendance` a ON a.quiz_id = q.id
   JOIN `courses` c ON c.id = a.course_id
   SET q.course_code = c.code, q.course_name = c.name
   WHERE q.course_code IS NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Anything still unrecovered (a draft/scheduled quiz with no attendance
-- rows yet, or quizzes.course_id was already dropped with no attendance
-- to recover through) falls back to a placeholder - its original course
-- link was destroyed by the interrupted migration, not something this
-- repair can reconstruct.
UPDATE `quizzes` SET `course_code` = 'UNKNOWN' WHERE `course_code` IS NULL;
UPDATE `quizzes` SET `course_name` = 'Unknown Course' WHERE `course_name` IS NULL;
UPDATE `quizzes` SET `section_names` = '' WHERE `section_names` IS NULL;

ALTER TABLE `quizzes`
  MODIFY COLUMN `course_code` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `course_name` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `section_names` TEXT NOT NULL;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quizzes' AND INDEX_NAME = 'quizzes_course_code_idx'
);
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `quizzes_course_code_idx` ON `quizzes`(`course_code`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- attendance.course_id -> course_code / course_name
-- ---------------------------------------------------------------------
-- Unlike quizzes above, attendance.course_id and `courses` are still
-- intact wherever this block actually needs to run, so this is a real
-- backfill from live data, not a placeholder.

SET @sql := IF(@attendance_has_course_id > 0,
  'UPDATE `attendance` a JOIN `courses` c ON c.id = a.course_id
   SET a.course_code = c.code, a.course_name = c.name
   WHERE a.course_code IS NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Look up the real FK constraint name instead of assuming Prisma's
-- default naming convention held.
SET @fk_name := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'course_id'
    AND REFERENCED_TABLE_NAME = 'courses'
  LIMIT 1
);
SET @sql := IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE `attendance` DROP FOREIGN KEY `', @fk_name, '`'), 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Same for the index backing that column (a foreign key always has one).
SET @idx_name := (
  SELECT INDEX_NAME FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'course_id'
  LIMIT 1
);
SET @sql := IF(@idx_name IS NOT NULL, CONCAT('ALTER TABLE `attendance` DROP INDEX `', @idx_name, '`'), 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@attendance_has_course_id > 0, 'ALTER TABLE `attendance` DROP COLUMN `course_id`', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `attendance` SET `course_code` = 'UNKNOWN' WHERE `course_code` IS NULL;
UPDATE `attendance` SET `course_name` = 'Unknown Course' WHERE `course_name` IS NULL;

ALTER TABLE `attendance`
  MODIFY COLUMN `course_code` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `course_name` VARCHAR(191) NOT NULL;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND INDEX_NAME = 'attendance_course_code_idx'
);
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `attendance_course_code_idx` ON `attendance`(`course_code`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Tables the interrupted migration never reached
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `academic_sessions`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `departments`;
