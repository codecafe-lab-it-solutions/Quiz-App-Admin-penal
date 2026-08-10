-- Brings every registered isr_reg_<batch>_tbl (student <-> course registration,
-- one physical table per admission batch — see BatchTableRegistry) up to full
-- column parity with the real legacy export: reg_sr, b1_sem, sem, sub_list,
-- sub_code, stu_roll, grade, grade_flag, sub_flag, frozen, rs_flag, rs_ref.
--
-- These tables are dynamically named (no fixed table exists in schema.prisma
-- for them — see legacy-db.ts), so this loops over every table_name currently
-- listed in batch_table_registry rather than hardcoding names. Every step is
-- guarded/idempotent: a no-op against a real production isr_reg_<batch>_tbl
-- that already has this exact shape.

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

DROP PROCEDURE IF EXISTS `_rename_column_if_needed`;

CREATE PROCEDURE `_rename_column_if_needed`(
  IN p_table VARCHAR(191),
  IN p_old_column VARCHAR(191),
  IN p_new_column VARCHAR(191),
  IN p_definition VARCHAR(255)
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_old_column
  ) AND NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_new_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` CHANGE COLUMN `', p_old_column, '` `', p_new_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

DROP PROCEDURE IF EXISTS `_upgrade_reg_table`;

CREATE PROCEDURE `_upgrade_reg_table`(IN p_table VARCHAR(191))
BEGIN
  -- The local placeholder tables used a made-up `id` surrogate key; the real
  -- column is `reg_sr`. No-op if the table already uses `reg_sr` (production).
  CALL `_rename_column_if_needed`(p_table, 'id', 'reg_sr', 'INT NOT NULL AUTO_INCREMENT');

  CALL `_add_column_if_missing`(p_table, 'b1_sem', 'INT NULL');
  CALL `_add_column_if_missing`(p_table, 'sem', 'INT NULL');
  CALL `_add_column_if_missing`(p_table, 'grade', 'CHAR(2) NULL');
  CALL `_add_column_if_missing`(p_table, 'grade_flag', 'CHAR(1) NULL');
  CALL `_add_column_if_missing`(p_table, 'sub_flag', "CHAR(1) NULL DEFAULT 'Y'");
  CALL `_add_column_if_missing`(p_table, 'frozen', "CHAR(1) NULL DEFAULT 'N'");
  CALL `_add_column_if_missing`(p_table, 'rs_flag', "VARCHAR(5) NULL DEFAULT 'N'");
  CALL `_add_column_if_missing`(p_table, 'rs_ref', 'INT NULL DEFAULT 0');
END;

DROP PROCEDURE IF EXISTS `_upgrade_all_reg_tables`;

CREATE PROCEDURE `_upgrade_all_reg_tables`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_table VARCHAR(191);
  -- Same allow-list safety rule as legacy-db.ts's SAFE_TABLE_NAME: only ever
  -- touch a table name built from [a-zA-Z0-9_], and only if it actually exists.
  DECLARE cur CURSOR FOR
    SELECT DISTINCT table_name FROM batch_table_registry WHERE table_name REGEXP '^[a-zA-Z0-9_]+$';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batch_table_registry') THEN
    OPEN cur;
    read_loop: LOOP
      FETCH cur INTO v_table;
      IF done THEN
        LEAVE read_loop;
      END IF;
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = v_table) THEN
        CALL `_upgrade_reg_table`(v_table);
      END IF;
    END LOOP;
    CLOSE cur;
  END IF;
END;

CALL `_upgrade_all_reg_tables`();

DROP PROCEDURE IF EXISTS `_upgrade_all_reg_tables`;
DROP PROCEDURE IF EXISTS `_upgrade_reg_table`;
DROP PROCEDURE IF EXISTS `_add_column_if_missing`;
DROP PROCEDURE IF EXISTS `_rename_column_if_needed`;
