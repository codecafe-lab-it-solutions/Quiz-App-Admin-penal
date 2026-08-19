-- Additive-only: new denormalized columns that will replace the Course/
-- Section FK relations. Added nullable first so a backfill script can
-- populate them from the still-live relations before a later migration
-- drops the old columns/tables.

ALTER TABLE `quizzes`
  ADD COLUMN `course_code` VARCHAR(191) NULL,
  ADD COLUMN `course_name` VARCHAR(191) NULL,
  ADD COLUMN `section_names` TEXT NULL;

ALTER TABLE `attendance`
  ADD COLUMN `course_code` VARCHAR(191) NULL,
  ADD COLUMN `course_name` VARCHAR(191) NULL;
