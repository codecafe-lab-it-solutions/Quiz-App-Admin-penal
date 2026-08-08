-- Adds quiz-level geolocation requirement support and soft-delete tracking.
ALTER TABLE `quizzes`
  ADD COLUMN `require_location` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `deleted_at` DATETIME NULL;
