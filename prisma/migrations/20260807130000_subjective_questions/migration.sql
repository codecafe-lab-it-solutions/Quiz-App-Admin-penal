-- Adds a third question type (subjective/open-ended, manually graded) to the
-- app-owned quiz domain. These tables are owned by this app (not the legacy
-- isr_* tables), so a plain ALTER is safe here.

-- AlterTable: questions
ALTER TABLE `questions`
  MODIFY COLUMN `question_type` ENUM('mcq', 'formula', 'subjective') NOT NULL,
  ADD COLUMN `reference_answer` TEXT NULL;

-- AlterTable: student_answers
ALTER TABLE `student_answers`
  ADD COLUMN `written_answer` TEXT NULL,
  ADD COLUMN `manually_graded` BOOLEAN NOT NULL DEFAULT false;
