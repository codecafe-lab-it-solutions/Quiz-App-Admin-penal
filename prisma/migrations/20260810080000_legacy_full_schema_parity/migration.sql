-- Brings every isr_* table up to full column parity with the real legacy
-- university database export (quizsample_db.sql), so this app's schema is a
-- structural match regardless of which physical database DATABASE_URL points
-- at. Everything here is additive/idempotent — safe to run against a local
-- placeholder table (fills in the missing columns) or the real production
-- legacy tables (every guarded call becomes a no-op there, since those
-- columns already exist).

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

-- Renames p_old_column -> p_new_column only when p_old_column exists and
-- p_new_column doesn't yet — a no-op against a database that already has the
-- real column name (production), and the fix for a local placeholder table
-- that was created with a made-up surrogate key name before the real legacy
-- column name (`sr` / `avai_sr`) was confirmed.
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

-- ---------------------------------------------------------------------------
-- isr_curriculum_tbl / isr_sub_available_tbl: the local placeholder tables
-- used a made-up `id` surrogate key. The real tables' primary keys are `sr`
-- and `avai_sr` respectively — confirmed from the real export. Rename first,
-- so the Prisma field `id` (now @map()'d to the real column name) resolves.
-- ---------------------------------------------------------------------------

CALL `_rename_column_if_needed`('isr_curriculum_tbl', 'id', 'sr', 'INT NOT NULL AUTO_INCREMENT');
CALL `_rename_column_if_needed`('isr_sub_available_tbl', 'id', 'avai_sr', 'INT NOT NULL AUTO_INCREMENT');

-- ---------------------------------------------------------------------------
-- isr_login_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_login_tbl', 'user_pk_id', 'INT NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'user_mobile', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'ref_password', 'VARCHAR(40) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'centre_location', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'program_name', 'VARCHAR(10) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'batch', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'branch', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'user_permission', 'VARCHAR(250) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'health_id', 'VARCHAR(25) NULL');
CALL `_add_column_if_missing`('isr_login_tbl', 'login_flag', "VARCHAR(5) NULL DEFAULT 'Y'");
CALL `_add_column_if_missing`('isr_login_tbl', 'timestamp', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');

-- ---------------------------------------------------------------------------
-- isr_faculty_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_faculty_tbl', 'sr', 'INT NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'dob', 'DATE NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'password', 'VARCHAR(40) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'email', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'new_password', 'VARCHAR(50) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'request_status', 'INT NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'role', 'VARCHAR(250) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'feedback_view', "VARCHAR(10) NOT NULL DEFAULT 'N'");
CALL `_add_column_if_missing`('isr_faculty_tbl', 'invigilator_status', 'INT NULL DEFAULT 10');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'unavailable_datesinvi', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'date_of_joining', 'DATE NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'date_of_exit', 'DATE NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'pay_level', 'INT NOT NULL DEFAULT 0');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'pay_level_id', 'INT UNSIGNED NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'hometown_city', 'VARCHAR(120) NULL');
CALL `_add_column_if_missing`('isr_faculty_tbl', 'hometown_state', 'VARCHAR(80) NULL');

-- ---------------------------------------------------------------------------
-- isr_stu_data_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_stu_data_tbl', 'data_sr', 'INT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'unique_code', 'VARCHAR(32) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'stu_sr', 'INT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'email', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'joining_year', 'INT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'centre_location', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'local_address', 'VARCHAR(250) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_address', 'VARCHAR(250) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_phone', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'contact_person', 'VARCHAR(50) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'blood_group', 'VARCHAR(35) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'stu_hindiname', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'stu_gender', 'VARCHAR(11) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'nationality', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'personal_contactnumber', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'date_birth', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'aadhaar_card', 'VARCHAR(16) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'jac_registration_number', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'channel_admission', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'score_card', 'VARCHAR(2) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'award_letters', 'VARCHAR(2) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'category', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'pd', 'VARCHAR(2) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'km', 'VARCHAR(2) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'religion', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'last_schoolname', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'school_city', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'school_pincode', 'VARCHAR(8) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'school_state', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'school_board', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'percentagein_twelve', 'VARCHAR(10) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'house_number', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_landmark', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_area', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_city', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_pincode', 'VARCHAR(8) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_state', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'home_country', 'VARCHAR(60) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_name', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'fathername_hindi', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_occupation', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_companyname', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_designation', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_contactnumber', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'father_emailid', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_name', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_occupation', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_companyname', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_designation', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_contactnumber', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'mother_emailid', 'VARCHAR(100) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'annual_familyincome', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'emergency_phonenumber', 'VARCHAR(15) NULL');
-- Real column is NOT NULL with no default; added nullable here so this
-- app's own INSERTs (which don't collect it) don't start failing locally.
-- The real legacy table already has this column and already requires it.
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'emergency_name', 'VARCHAR(250) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'bank_name', 'VARCHAR(255) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'bank_ifsc', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'bank_accountnumber', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'last_update', 'DATETIME NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'permanent_address', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'correspondence_address', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'hostel_address', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'hostel_id', 'INT NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'room_number', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'bed_code', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'hostel_assign_date', 'DATE NULL');
CALL `_add_column_if_missing`('isr_stu_data_tbl', 'hostel_validity_date', 'DATE NULL');

-- ---------------------------------------------------------------------------
-- isr_stu_main_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_stu_main_tbl', 'sr', 'INT NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'dob', 'VARCHAR(15) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'password', 'VARCHAR(40) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'phd_category', 'VARCHAR(35) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'fee_OK', "CHAR(1) NULL DEFAULT 'Y'");
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'cgpa_OK', "CHAR(1) NULL DEFAULT 'Y'");
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'hostel_status', "VARCHAR(1) NOT NULL DEFAULT 'N'");
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'late_upto', 'INT NULL DEFAULT 0');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'present_status', "CHAR(1) NULL DEFAULT 'N'");
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'present_remark', 'TEXT NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'new_password', 'VARCHAR(50) NULL');
CALL `_add_column_if_missing`('isr_stu_main_tbl', 'request_status', 'INT NULL');

-- sem_now was created locally as VARCHAR (before the real legacy type was
-- confirmed as INT). All existing local rows are already numeric, so this
-- is a safe in-place type fix; it's a no-op against the real legacy table,
-- which is already INT.
ALTER TABLE `isr_stu_main_tbl` MODIFY COLUMN `sem_now` INT NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- isr_sub_available_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_sub_available_tbl', 'b1_sem', 'INT NULL');
CALL `_add_column_if_missing`('isr_sub_available_tbl', 'sem_list', 'VARCHAR(20) NULL');
CALL `_add_column_if_missing`('isr_sub_available_tbl', 'slot', 'VARCHAR(10) NULL');
CALL `_add_column_if_missing`('isr_sub_available_tbl', 'fac_order', 'INT NOT NULL DEFAULT 1');

-- ---------------------------------------------------------------------------
-- isr_curriculum_tbl
-- ---------------------------------------------------------------------------

CALL `_add_column_if_missing`('isr_curriculum_tbl', 'sp', 'VARCHAR(10) NULL');
CALL `_add_column_if_missing`('isr_curriculum_tbl', 'dept_core', 'VARCHAR(35) NULL');
CALL `_add_column_if_missing`('isr_curriculum_tbl', 'dept_elec', 'VARCHAR(35) NULL');
CALL `_add_column_if_missing`('isr_curriculum_tbl', 'elec_num', 'VARCHAR(10) NULL');
CALL `_add_column_if_missing`('isr_curriculum_tbl', 'open_elec', 'VARCHAR(35) NULL');
CALL `_add_column_if_missing`('isr_curriculum_tbl', 'dept_minor', 'VARCHAR(35) NULL');

DROP PROCEDURE IF EXISTS `_add_column_if_missing`;
DROP PROCEDURE IF EXISTS `_rename_column_if_needed`;
