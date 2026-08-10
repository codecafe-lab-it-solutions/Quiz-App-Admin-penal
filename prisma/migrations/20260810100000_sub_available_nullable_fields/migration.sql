-- The real isr_sub_available_tbl export confirms `sem`, `sub_list`, `sub_code`,
-- `fac_roll`, and `branch` are all nullable (`DEFAULT NULL` in the real
-- CREATE TABLE) - this app's schema wrongly carried them over as NOT NULL
-- from before the real export was available to check against. Real data
-- (quizsample_db.sql) has rows with a null fac_roll, which a NOT NULL
-- column here would reject outright.
ALTER TABLE `isr_sub_available_tbl`
  MODIFY COLUMN `sem` VARCHAR(191) NULL,
  MODIFY COLUMN `sub_list` VARCHAR(191) NULL DEFAULT 'c1',
  MODIFY COLUMN `sub_code` VARCHAR(191) NULL,
  MODIFY COLUMN `fac_roll` VARCHAR(191) NULL,
  MODIFY COLUMN `branch` VARCHAR(191) NULL;
