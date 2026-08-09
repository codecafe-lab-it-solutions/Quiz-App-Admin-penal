-- Ties each academic session to the semester-cycle (sub_list code) active when it was created.
ALTER TABLE `academic_sessions`
  ADD COLUMN `sub_list_code` VARCHAR(191) NULL;
