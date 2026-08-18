-- Lets a faculty/admin exempt a specific student from a quiz's GPS/location
-- requirement (e.g. they have a valid reason not to be on-site). This is
-- app-owned data, so a plain ALTER is safe here.

ALTER TABLE `quiz_allotments`
  ADD COLUMN `bypass_location` BOOLEAN NOT NULL DEFAULT false;
