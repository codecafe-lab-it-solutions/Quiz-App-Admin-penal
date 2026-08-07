-- Additive-only changes against the legacy isr_* tables. These tables are
-- owned by the external university system in production and are confirmed
-- to already have most of these columns there - vanilla MySQL has no
-- `ADD COLUMN IF NOT EXISTS` (that's MariaDB-only), so this uses a throwaway
-- procedure that checks INFORMATION_SCHEMA.COLUMNS first, making it safe to
-- run against both a fresh local placeholder table and the real legacy DB.

DROP PROCEDURE IF EXISTS `_add_column_if_missing`;

CREATE PROCEDURE `_add_column_if_missing`(
  IN p_table VARCHAR(191),
  IN p_column VARCHAR(191),
  IN p_definition VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

CALL `_add_column_if_missing`('isr_login_tbl', 'status', 'INTEGER NOT NULL DEFAULT 1');

CALL `_add_column_if_missing`('isr_faculty_tbl', 'dept', 'VARCHAR(191) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'emp_code', 'VARCHAR(191) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'fac_status', 'VARCHAR(191) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'address', 'TEXT NULL');

CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mobile', 'VARCHAR(191) NULL');

CALL `_add_column_if_missing`('isr_stu_main_tbl', 'reg_status', 'VARCHAR(191) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'attn_ok', 'VARCHAR(191) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'stu_status', 'VARCHAR(191) NULL');

DROP PROCEDURE IF EXISTS `_add_column_if_missing`;

-- CreateTable: isr_curriculum_tbl (read-only legacy course catalog)
CREATE TABLE IF NOT EXISTS `isr_curriculum_tbl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sub_list` VARCHAR(191) NOT NULL,
    `bsms_branch` VARCHAR(191) NOT NULL,
    `bsms_code` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `l` INTEGER NOT NULL DEFAULT 0,
    `t` INTEGER NOT NULL DEFAULT 0,
    `p` INTEGER NOT NULL DEFAULT 0,
    `bsms_credit` INTEGER NOT NULL DEFAULT 0,
    `sem` VARCHAR(191) NULL,

    INDEX `isr_curriculum_tbl_bsms_code_idx`(`bsms_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
