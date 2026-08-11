-- App-added columns, NOT part of the real university dump - the real
-- isr_stu_main_tbl/isr_sub_available_tbl have no section concept at all.
-- These are denormalized copies of the section mapping that already lives
-- in section_students/section_faculty, kept in sync by application code
-- (see refreshStudentSectionColumn in src/lib/section-sync.ts and the
-- `section` write in createFacultyCourseMapping), and rewritten after every
-- legacy re-import since importRealLegacyData() truncates both tables from
-- the raw dump (which has neither column) on every reseed.
ALTER TABLE `isr_stu_main_tbl`
  ADD COLUMN `section` TEXT NULL;

ALTER TABLE `isr_sub_available_tbl`
  ADD COLUMN `section` VARCHAR(191) NULL;
