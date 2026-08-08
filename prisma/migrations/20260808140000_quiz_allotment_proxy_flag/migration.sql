-- Lets a faculty/admin flag a student's live attempt as a proxy (someone
-- else appears to be taking it). This is app-owned data, so a plain ALTER
-- is safe here.

ALTER TABLE `quiz_allotments`
  ADD COLUMN `is_proxy` BOOLEAN NOT NULL DEFAULT false;
