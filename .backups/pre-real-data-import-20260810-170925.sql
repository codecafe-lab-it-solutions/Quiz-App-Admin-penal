mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: quiz_attendance
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('0246551a-f578-428b-8644-1c937e23de79','05e36d3fefe1932940fa7b0d105b0118b16b9e72bba2ec39e069bcf4259e5b64',NULL,'20260807120000_legacy_curriculum_and_profile_fields','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260807120000_legacy_curriculum_and_profile_fields\n\nDatabase error code: 1064\n\nDatabase error:\nYou have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'IF NOT EXISTS `status` INTEGER NOT NULL DEFAULT 1;\n\n-- AlterTable: isr_faculty_t\' at line 10\n\nPlease check the query number 1 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260807120000_legacy_curriculum_and_profile_fields\"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name=\"20260807120000_legacy_curriculum_and_profile_fields\"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226','2026-08-07 16:42:48.420','2026-08-07 16:41:26.975',0),('13582e23-ed13-401b-8a47-27a57b178a17','1d29782834595cde6b6c3ec4a6a09703a68af1f4c685191fae08288d97abbe00','2026-08-10 08:45:40.132','20260810080000_legacy_full_schema_parity',NULL,NULL,'2026-08-10 08:45:37.085',1),('3b3f8a4f-568b-4715-bf29-aab88a6eb42c','29f11d574bde6f137a0b14e7b34ad31ec65171cd6feaf3144c0f920fdcc177a0','2026-08-08 06:37:45.215','20260808120000_section_hub_redesign',NULL,NULL,'2026-08-08 06:37:44.197',1),('559e8240-a0c6-43c4-ab10-d0ad750a54de','a84b7ab8c98170e993eebee1a90fe4e8ae66440185131bd5e99a8643bfea6809','2026-08-10 08:54:20.545','20260810090000_legacy_reg_table_full_parity',NULL,NULL,'2026-08-10 08:54:20.111',1),('753cb6ab-2908-4032-a2f3-9d1868da4d5e','d4a2fb69560f0f9f80a6ad6f24150187471807ab22bf6dc1eb452a26fae76421','2026-08-08 07:51:08.694','20260808140000_quiz_allotment_proxy_flag',NULL,NULL,'2026-08-08 07:51:08.283',1),('889e019f-2499-4e57-8b44-a722de59545b','7d425147ce1ace7f8dce58ef6243768e8af03b0e60c1c44dc78d9ff06726f6da','2026-08-07 16:42:59.502','20260807120000_legacy_curriculum_and_profile_fields',NULL,NULL,'2026-08-07 16:42:59.257',1),('a5948c79-04c4-4fb8-9a01-9b019fd30029','1e2e6eab9018a837451e355940ffaefee8aec5a61938037d1874e57f8c9ec0b7','2026-08-07 17:16:23.012','20260807130000_subjective_questions',NULL,NULL,'2026-08-07 17:16:22.818',1),('d7bc343a-9804-4d45-bce2-34674d8eb131','851b34dfd50db4a709cc0bd339d7aa0bb4917ee0a864685a8542d84ce916005e','2026-08-05 04:41:34.022','20260805044028_init',NULL,NULL,'2026-08-05 04:41:30.108',1),('e9166e61-061e-4635-aac8-5dcf13c8174a','9ff49102477ccd9775a9ad00707e224d1fb0c34375315edf86c066aa4943f827','2026-08-09 17:20:18.032','20260809100000_academic_session_sub_list_code',NULL,NULL,'2026-08-09 17:20:17.990',1),('ed205183-fd74-4d35-a9eb-526ff655ba94','3cbe93bd374f4c5a7675bff88ff5ddfade45ff121f0d79cbc90273000996cade','2026-08-09 17:20:17.987','20260808150000_quiz_location_and_soft_delete_fields',NULL,NULL,'2026-08-09 17:20:17.706',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `academic_sessions`
--

DROP TABLE IF EXISTS `academic_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime(3) NOT NULL,
  `end_date` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `sub_list_code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_sessions`
--

LOCK TABLES `academic_sessions` WRITE;
/*!40000 ALTER TABLE `academic_sessions` DISABLE KEYS */;
INSERT INTO `academic_sessions` VALUES (1,'2025-26 Odd Semester','2025-07-01 00:00:00.000','2025-12-15 00:00:00.000','2026-08-05 04:43:22.680','2026-08-05 04:43:22.680',NULL);
/*!40000 ALTER TABLE `academic_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `refresh_token_hash` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'Super Admin','admin@example.com','$2a$10$TwobMaYJrnxafCM8I8qWJuPULihOHXSXq8NblZ4UvMqvxQ2YORNoC','super_admin','$2a$10$mVrxSDAj0oQ6yvQlBfqgW.w0qH6U4VTuMJKDZ6/4mkCxNGhohNZg6','2026-08-05 04:43:22.375','2026-08-05 09:12:34.590'),(2,'Ops Admin','ops.admin@example.com','$2a$10$99lSOgMfP/6z2lKC41W6VOL1hAn3pm/GqVnEXM/aUhAgqaKpSsFSm','admin','$2a$10$WtWkLdpxaLC7xeIe5GebteGn7AjwumhJyZ2u4LKuYodeFncztT.uy','2026-08-05 07:47:47.200','2026-08-10 10:53:09.061'),(6,'Registrar Admin','registrar.admin@example.com','$2a$10$V68qFieUQgINM/repm/yieLc3lt0vqtItXTHxoEGv5eBjLXtjie0e','admin',NULL,'2026-08-08 08:15:26.317','2026-08-08 08:15:26.317'),(7,'IT Support Admin','it.support@example.com','$2a$10$PS7rY0O250Kah8e.ZDAkNOdsb2wyP1QVk2QY9fQjE3hxNEeG5S.kW','admin',NULL,'2026-08-08 08:15:26.429','2026-08-08 08:15:26.429');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `anti_cheat_events`
--

DROP TABLE IF EXISTS `anti_cheat_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anti_cheat_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attempt_id` int NOT NULL,
  `event_type` enum('screen_switch','overlay_detected','background') COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `action_taken` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `anti_cheat_events_attempt_id_idx` (`attempt_id`),
  CONSTRAINT `anti_cheat_events_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `anti_cheat_events`
--

LOCK TABLES `anti_cheat_events` WRITE;
/*!40000 ALTER TABLE `anti_cheat_events` DISABLE KEYS */;
INSERT INTO `anti_cheat_events` VALUES (1,7,'screen_switch','2026-08-08 08:15:29.193','Warning shown to student');
/*!40000 ALTER TABLE `anti_cheat_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `date` date NOT NULL,
  `status` enum('present','absent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_student_roll_quiz_id_key` (`student_roll`,`quiz_id`),
  KEY `attendance_course_id_idx` (`course_id`),
  KEY `attendance_student_roll_idx` (`student_roll`),
  KEY `attendance_date_idx` (`date`),
  KEY `attendance_status_idx` (`status`),
  KEY `attendance_quiz_id_fkey` (`quiz_id`),
  CONSTRAINT `attendance_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (1,'STU2025001',1,1,'2025-09-15','present','2026-08-05 07:47:48.592','2026-08-05 07:47:48.592'),(2,'STU2025002',1,1,'2025-09-15','present','2026-08-05 07:47:48.639','2026-08-05 07:47:48.639'),(3,'STU2025003',1,1,'2025-09-15','absent','2026-08-05 07:47:48.655','2026-08-05 07:47:48.655'),(8,'STU2025003',2,9,'2026-08-10','present','2026-08-08 08:15:29.001','2026-08-10 08:54:43.737'),(9,'STU2024001',2,9,'2026-08-10','present','2026-08-08 08:15:29.117','2026-08-10 08:54:43.737'),(10,'STU2024002',2,9,'2026-08-10','absent','2026-08-08 08:15:29.140','2026-08-10 08:54:43.737'),(11,'STU2025001',5,10,'2026-08-10','present','2026-08-08 08:15:29.183','2026-08-10 08:54:43.756'),(12,'STU2025002',5,10,'2026-08-10','present','2026-08-08 08:15:29.233','2026-08-10 08:54:43.756'),(13,'STU2024003',5,10,'2026-08-10','absent','2026-08-08 08:15:29.248','2026-08-10 08:54:43.756'),(14,'STU2025004',3,11,'2026-08-10','present','2026-08-08 08:15:29.289','2026-08-10 08:54:43.772'),(15,'STU2025006',3,11,'2026-08-10','present','2026-08-08 08:15:29.316','2026-08-10 08:54:43.772'),(16,'STU2025007',3,11,'2026-08-10','absent','2026-08-08 08:15:29.335','2026-08-10 08:54:43.772'),(17,'STU2025009',6,12,'2026-08-10','present','2026-08-08 08:15:29.389','2026-08-10 08:54:43.787'),(18,'STU2025010',6,12,'2026-08-10','present','2026-08-08 08:15:29.420','2026-08-10 08:54:43.787'),(19,'STU2025005',4,13,'2026-08-10','present','2026-08-08 08:15:29.475','2026-08-10 08:54:43.799'),(20,'STU2025008',4,13,'2026-08-10','absent','2026-08-08 08:15:29.491','2026-08-10 08:54:43.799');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_table_registry`
--

DROP TABLE IF EXISTS `batch_table_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_table_registry` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_table_registry_batch_name_key` (`batch_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_table_registry`
--

LOCK TABLES `batch_table_registry` WRITE;
/*!40000 ALTER TABLE `batch_table_registry` DISABLE KEYS */;
INSERT INTO `batch_table_registry` VALUES (2,'2025','isr_reg_2025_tbl',1,'2026-08-05 07:47:48.369'),(3,'2024','isr_reg_2024_tbl',1,'2026-08-08 07:14:59.753');
/*!40000 ALTER TABLE `batch_table_registry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `buildings`
--

DROP TABLE IF EXISTS `buildings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `buildings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `radius_meters` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `buildings`
--

LOCK TABLES `buildings` WRITE;
/*!40000 ALTER TABLE `buildings` DISABLE KEYS */;
INSERT INTO `buildings` VALUES (1,'Main Academic Block',28.6139000,77.2090000,40,'2026-08-05 04:43:22.805','2026-08-05 04:43:22.805'),(2,'Engineering Block',28.6145000,77.2101000,50,'2026-08-05 04:43:22.815','2026-08-05 04:43:22.815');
/*!40000 ALTER TABLE `buildings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int NOT NULL,
  `credits` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `courses_code_key` (`code`),
  KEY `courses_department_id_idx` (`department_id`),
  CONSTRAINT `courses_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Data Structures','CS201',1,4,'2026-08-05 04:43:22.577','2026-08-05 04:43:22.577'),(2,'Database Systems','CS301',1,4,'2026-08-05 04:43:22.619','2026-08-05 04:43:22.619'),(3,'Digital Electronics','EC201',2,3,'2026-08-05 04:43:22.630','2026-08-05 04:43:22.630'),(4,'Thermodynamics','ME201',3,3,'2026-08-05 04:43:22.644','2026-08-05 04:43:22.644'),(5,'Computer Networks','CS302',1,3,'2026-08-08 07:14:56.676','2026-08-08 07:14:56.676'),(6,'Control Systems','EE201',4,3,'2026-08-08 07:14:56.700','2026-08-08 07:14:56.700');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_name_key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'Computer Science','2026-08-05 04:43:22.528','2026-08-05 04:43:22.528'),(2,'Electronics & Communication','2026-08-05 04:43:22.546','2026-08-05 04:43:22.546'),(3,'Mechanical Engineering','2026-08-05 04:43:22.561','2026-08-05 04:43:22.561'),(4,'Electrical Engineering','2026-08-08 07:14:56.606','2026-08-08 07:14:56.606');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `geofence_logs`
--

DROP TABLE IF EXISTS `geofence_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `geofence_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attempt_id` int DEFAULT NULL,
  `quiz_id` int NOT NULL,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `distance_meters` double NOT NULL,
  `is_within_range` tinyint(1) NOT NULL,
  `checked_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `geofence_logs_attempt_id_idx` (`attempt_id`),
  KEY `geofence_logs_quiz_id_idx` (`quiz_id`),
  KEY `geofence_logs_student_roll_idx` (`student_roll`),
  CONSTRAINT `geofence_logs_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `geofence_logs`
--

LOCK TABLES `geofence_logs` WRITE;
/*!40000 ALTER TABLE `geofence_logs` DISABLE KEYS */;
INSERT INTO `geofence_logs` VALUES (1,7,10,'STU2025001',28.6145000,77.2101000,12.4,1,'2026-08-08 08:15:29.201');
/*!40000 ALTER TABLE `geofence_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_curriculum_tbl`
--

DROP TABLE IF EXISTS `isr_curriculum_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_curriculum_tbl` (
  `sr` int NOT NULL AUTO_INCREMENT,
  `sub_list` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bsms_branch` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bsms_code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `l` int NOT NULL DEFAULT '0',
  `t` int NOT NULL DEFAULT '0',
  `p` int NOT NULL DEFAULT '0',
  `bsms_credit` int NOT NULL DEFAULT '0',
  `sem` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_core` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_elec` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `elec_num` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `open_elec` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_minor` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`sr`),
  KEY `isr_curriculum_tbl_bsms_code_idx` (`bsms_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_curriculum_tbl`
--

LOCK TABLES `isr_curriculum_tbl` WRITE;
/*!40000 ALTER TABLE `isr_curriculum_tbl` DISABLE KEYS */;
/*!40000 ALTER TABLE `isr_curriculum_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_faculty_tbl`
--

DROP TABLE IF EXISTS `isr_faculty_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_faculty_tbl` (
  `roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emp_code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fac_status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `sr` int DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `password` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_password` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_status` int DEFAULT NULL,
  `role` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feedback_view` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `invigilator_status` int DEFAULT '10',
  `unavailable_datesinvi` text COLLATE utf8mb4_unicode_ci,
  `date_of_joining` date DEFAULT NULL,
  `date_of_exit` date DEFAULT NULL,
  `pay_level` int NOT NULL DEFAULT '0',
  `pay_level_id` int unsigned DEFAULT NULL,
  `hometown_city` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hometown_state` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`roll`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_faculty_tbl`
--

LOCK TABLES `isr_faculty_tbl` WRITE;
/*!40000 ALTER TABLE `isr_faculty_tbl` DISABLE KEYS */;
INSERT INTO `isr_faculty_tbl` VALUES ('FAC2025001','Dr. Ramesh Kumar',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',10,NULL,NULL,NULL,0,NULL,NULL,NULL),('FAC2025002','Dr. Priya Sharma',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',10,NULL,NULL,NULL,0,NULL,NULL,NULL),('FAC2025003','Dr. Arjun Mehta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',10,NULL,NULL,NULL,0,NULL,NULL,NULL),('FAC2025004','Dr. Sunita Rao',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',10,NULL,NULL,NULL,0,NULL,NULL,NULL),('FAC2025005','Dr. Vikram Nair',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',10,NULL,NULL,NULL,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `isr_faculty_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_login_tbl`
--

DROP TABLE IF EXISTS `isr_login_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_login_tbl` (
  `user_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` int NOT NULL DEFAULT '1',
  `user_pk_id` int DEFAULT NULL,
  `user_mobile` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_password` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `centre_location` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `program_name` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batch` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_permission` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `health_id` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_flag` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'Y',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_roll`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_login_tbl`
--

LOCK TABLES `isr_login_tbl` WRITE;
/*!40000 ALTER TABLE `isr_login_tbl` DISABLE KEYS */;
INSERT INTO `isr_login_tbl` VALUES ('FAC2025001','ramesh.kumar@example.com','$2a$10$0/svxglBTNY21FjjS.l69OCR4fEhFh15YrgYutvJ1TcbaG0IYyGYW','FAC',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('FAC2025002','priya.sharma@example.com','$2a$10$gnV0oCDAiGPHVEDOdw/udePgB4IYAqRKa0d8zlBwz4sLBhVBMKluS','FAC',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('FAC2025003','arjun.mehta@example.com','$2a$10$rUyHG.UTpAfGrGl3Ia4V5.uOd32/cYSb..tRK3LmuEFl6Od27HcpG','FAC',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('FAC2025004','sunita.rao@example.com','$2a$10$LzhJRYUONrTUhokXCbFtae0fMDN5IYoxW6iunVEX4//9Sp2V7B3RS','FAC',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('FAC2025005','vikram.nair@example.com','$2a$10$11vYTlp2Maz40wdbYcd7nOobiiHM5vcLrkQbt8mgshVXQ/t5Sgbw2','FAC',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2024001','aditi.sharma@example.com','$2a$10$jOjc294QgNcL63y9y7uBcueATRD6fPAoJiNSxDyQMTcc2Y1LT3kqC','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2024002','kiaan.malhotra@example.com','$2a$10$cCdzS0cQb25Prgy8701H5eyhANxJfe0BANg0.Iu76kmakvnbZ.3ti','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2024003','riya.chatterjee@example.com','$2a$10$toPkfQ927kmCpFCr5sGusO.1HeoXT1IuHN09A7CFMdnY3ZDC0c8Ja','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025001','aarav.singh@example.com','$2a$10$XKJ4B3tsDPwsw/VWDcqBU.x5VTnNQh5oJk3Yd2wqEGZ6U6RNO7rBy','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025002','diya.patel@example.com','$2a$10$ROZ71RIJlJ6rXhKOfKYc2urrKIoyD2EeQ5FIFTE3YRYrxKDhI8SZ6','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025003','kabir.verma@example.com','$2a$10$ZqcnsQFDRhShIdoo4DXODO0k3XzUJcXI0/Xqcbk86hXf9wSzFKCEW','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025004','ananya.reddy@example.com','$2a$10$5J5pUQOwfWxGHOKDmN4TjOsQQL7f395DOOSoXHhsgIleYePwUsMIW','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025005','vihaan.joshi@example.com','$2a$10$SOaSHgLNL1n4nFM9LE30IeKlj5hGpNPC5eB9xLCSAJnIl7nb8NAka','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025006','ishaan.gupta@example.com','$2a$10$zBKsYJVL7KpQ6sttjzYfyuwoqKgfyhenYMdO0TzGbknjOT.E6cVHi','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025007','myra.kapoor@example.com','$2a$10$B0rwAVVpPVsPWqyNEEfSGOdKVarHpyKri8pm3PTaJhbqdvpdVTgFG','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025008','reyansh.iyer@example.com','$2a$10$8zLb6UzSOLi/zmv69BlLMemuL0N4/RW20N.O1VgfWhquxt6OGF0Bi','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025009','saanvi.nair@example.com','$2a$10$ZMYgCk78uKGxM6r0UqZOCOx./HmraSJlQK61oWRKBE9LQUvBd.KGS','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37'),('STU2025010','advait.rao@example.com','$2a$10$ykAYdfDE7kf61q4c1fvbGeRA/ipl7TK6qqsBVJe7/Gq9BE.iW.CQC','STU',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','2026-08-10 08:45:37');
/*!40000 ALTER TABLE `isr_login_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_reg_2024_tbl`
--

DROP TABLE IF EXISTS `isr_reg_2024_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_reg_2024_tbl` (
  `reg_sr` int NOT NULL AUTO_INCREMENT,
  `stu_roll` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_list` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `b1_sem` int DEFAULT NULL,
  `sem` int DEFAULT NULL,
  `grade` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'Y',
  `frozen` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'N',
  `rs_flag` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'N',
  `rs_ref` int DEFAULT '0',
  PRIMARY KEY (`reg_sr`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_reg_2024_tbl`
--

LOCK TABLES `isr_reg_2024_tbl` WRITE;
/*!40000 ALTER TABLE `isr_reg_2024_tbl` DISABLE KEYS */;
INSERT INTO `isr_reg_2024_tbl` VALUES (1,'STU2024001','CS301','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(2,'STU2024002','CS301','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(3,'STU2024001','CS302','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(4,'STU2024003','CS302','C2',NULL,NULL,NULL,NULL,'Y','N','N',0);
/*!40000 ALTER TABLE `isr_reg_2024_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_reg_2025_tbl`
--

DROP TABLE IF EXISTS `isr_reg_2025_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_reg_2025_tbl` (
  `reg_sr` int NOT NULL AUTO_INCREMENT,
  `stu_roll` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_list` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `b1_sem` int DEFAULT NULL,
  `sem` int DEFAULT NULL,
  `grade` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_flag` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'Y',
  `frozen` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'N',
  `rs_flag` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'N',
  `rs_ref` int DEFAULT '0',
  PRIMARY KEY (`reg_sr`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_reg_2025_tbl`
--

LOCK TABLES `isr_reg_2025_tbl` WRITE;
/*!40000 ALTER TABLE `isr_reg_2025_tbl` DISABLE KEYS */;
INSERT INTO `isr_reg_2025_tbl` VALUES (1,'STU2025001','CS201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(2,'STU2025002','CS201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(3,'STU2025003','CS301','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(4,'STU2025004','EC201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(5,'STU2025005','ME201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(6,'STU2025003','CS201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(7,'STU2025001','CS302','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(8,'STU2025002','CS302','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(9,'STU2025006','EC201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(10,'STU2025007','EC201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(11,'STU2025008','ME201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(12,'STU2025009','EE201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0),(13,'STU2025010','EE201','C2',NULL,NULL,NULL,NULL,'Y','N','N',0);
/*!40000 ALTER TABLE `isr_reg_2025_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_stu_data_tbl`
--

DROP TABLE IF EXISTS `isr_stu_data_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_stu_data_tbl` (
  `stu_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stu_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_sr` int DEFAULT NULL,
  `unique_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stu_sr` int DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `joining_year` int DEFAULT NULL,
  `centre_location` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `local_address` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_address` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stu_hindiname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stu_gender` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personal_contactnumber` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_birth` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaar_card` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jac_registration_number` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `channel_admission` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score_card` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `award_letters` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `km` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `religion` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_schoolname` text COLLATE utf8mb4_unicode_ci,
  `school_city` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_pincode` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_state` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_board` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percentagein_twelve` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `house_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_landmark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_area` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_city` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_pincode` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_state` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `home_country` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fathername_hindi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_occupation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_companyname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_contactnumber` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_emailid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_occupation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_companyname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_contactnumber` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_emailid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `annual_familyincome` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_phonenumber` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_name` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_ifsc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_accountnumber` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_update` datetime DEFAULT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci,
  `correspondence_address` text COLLATE utf8mb4_unicode_ci,
  `hostel_address` text COLLATE utf8mb4_unicode_ci,
  `hostel_id` int DEFAULT NULL,
  `room_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bed_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hostel_assign_date` date DEFAULT NULL,
  `hostel_validity_date` date DEFAULT NULL,
  PRIMARY KEY (`stu_roll`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_stu_data_tbl`
--

LOCK TABLES `isr_stu_data_tbl` WRITE;
/*!40000 ALTER TABLE `isr_stu_data_tbl` DISABLE KEYS */;
INSERT INTO `isr_stu_data_tbl` VALUES ('STU2024001','Aditi Sharma',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2024002','Kiaan Malhotra',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2024003','Riya Chatterjee',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025001','Aarav Singh',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025002','Diya Patel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025003','Kabir Verma',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025004','Ananya Reddy',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025005','Vihaan Joshi',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025006','Ishaan Gupta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025007','Myra Kapoor',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025008','Reyansh Iyer',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025009','Saanvi Nair',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('STU2025010','Advait Rao',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `isr_stu_data_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_stu_main_tbl`
--

DROP TABLE IF EXISTS `isr_stu_main_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_stu_main_tbl` (
  `roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `major` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sem_now` int NOT NULL DEFAULT '0',
  `reg_status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attn_ok` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stu_status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sr` int DEFAULT NULL,
  `dob` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phd_category` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fee_OK` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'Y',
  `cgpa_OK` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'Y',
  `hostel_status` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `late_upto` int DEFAULT '0',
  `present_status` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'N',
  `present_remark` text COLLATE utf8mb4_unicode_ci,
  `new_password` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_status` int DEFAULT NULL,
  PRIMARY KEY (`roll`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_stu_main_tbl`
--

LOCK TABLES `isr_stu_main_tbl` WRITE;
/*!40000 ALTER TABLE `isr_stu_main_tbl` DISABLE KEYS */;
INSERT INTO `isr_stu_main_tbl` VALUES ('STU2024001','CSE','Aditi Sharma','2024',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2024002','CSE','Kiaan Malhotra','2024',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2024003','CSE','Riya Chatterjee','2024',5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025001','CSE','Aarav Singh','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025002','CSE','Diya Patel','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025003','CSE','Kabir Verma','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025004','ECE','Ananya Reddy','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025005','ME','Vihaan Joshi','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025006','ECE','Ishaan Gupta','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025007','ECE','Myra Kapoor','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025008','ME','Reyansh Iyer','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025009','EEE','Saanvi Nair','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL),('STU2025010','EEE','Advait Rao','2025',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Y','Y','N',0,'N',NULL,NULL,NULL);
/*!40000 ALTER TABLE `isr_stu_main_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isr_sub_available_tbl`
--

DROP TABLE IF EXISTS `isr_sub_available_tbl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `isr_sub_available_tbl` (
  `avai_sr` int NOT NULL AUTO_INCREMENT,
  `sem` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_list` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fac_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `b1_sem` int DEFAULT NULL,
  `sem_list` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slot` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fac_order` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`avai_sr`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isr_sub_available_tbl`
--

LOCK TABLES `isr_sub_available_tbl` WRITE;
/*!40000 ALTER TABLE `isr_sub_available_tbl` DISABLE KEYS */;
INSERT INTO `isr_sub_available_tbl` VALUES (2,'3','C2','CS201','FAC2025001','CSE',NULL,NULL,NULL,1),(3,'3','C2','CS301','FAC2025002','CSE',NULL,NULL,NULL,1),(4,'3','C2','EC201','FAC2025003','ECE',NULL,NULL,NULL,1),(6,'5','C2','CS302','FAC2025005','CSE',NULL,NULL,NULL,1),(7,'3','C2','EE201','FAC2025004','EEE',NULL,NULL,NULL,1),(8,'3','C2','ME201','FAC2025001','ME',NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `isr_sub_available_tbl` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_formula`
--

DROP TABLE IF EXISTS `question_formula`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_formula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `correct_value` double NOT NULL,
  `tolerance` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `question_formula_question_id_key` (`question_id`),
  CONSTRAINT `question_formula_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_formula`
--

LOCK TABLES `question_formula` WRITE;
/*!40000 ALTER TABLE `question_formula` DISABLE KEYS */;
/*!40000 ALTER TABLE `question_formula` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_options`
--

DROP TABLE IF EXISTS `question_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `question_options_question_id_idx` (`question_id`),
  CONSTRAINT `question_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_options`
--

LOCK TABLES `question_options` WRITE;
/*!40000 ALTER TABLE `question_options` DISABLE KEYS */;
INSERT INTO `question_options` VALUES (1,1,'Stack',0),(2,1,'Queue',1),(3,1,'Graph',0),(4,1,'Tree',0),(5,2,'O(1)',0),(6,2,'O(n)',0),(7,2,'O(log n)',1),(8,2,'O(n^2)',0),(14,6,'Option A',1),(15,6,'Option C',0),(16,6,'Option B',0),(17,7,'Option A',1),(18,7,'Option C',0),(19,7,'Option B',0),(20,8,'Option B',0),(21,8,'Option C',0),(22,8,'Option A',1),(25,10,'Option B',0),(26,10,'Option A',1),(27,11,'Option B',0),(28,11,'Option A',1),(29,12,'Option A',1),(30,12,'Option B',0),(31,13,'Option B',0),(32,13,'Option A',1),(33,14,'Option A',1),(34,14,'Option B',0);
/*!40000 ALTER TABLE `question_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('mcq','formula','subjective') COLLATE utf8mb4_unicode_ci NOT NULL,
  `marks` int NOT NULL,
  `negative_marks` int NOT NULL DEFAULT '0',
  `order_index` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `reference_answer` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `questions_quiz_id_idx` (`quiz_id`),
  CONSTRAINT `questions_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` VALUES (1,1,'Which data structure uses FIFO order?','mcq',10,0,1,'2026-08-05 07:47:48.425','2026-08-05 07:47:48.425',NULL),(2,1,'What is the time complexity of binary search?','mcq',10,0,2,'2026-08-05 07:47:48.474','2026-08-05 07:47:48.474',NULL),(6,5,'Which layer of the OSI model handles routing?','mcq',10,0,1,'2026-08-08 07:15:00.093','2026-08-08 07:15:00.093',NULL),(7,6,'A NAND gate is a universal gate. True or False?','mcq',10,0,1,'2026-08-08 07:15:00.132','2026-08-08 07:15:00.132',NULL),(8,7,'Which normal form eliminates transitive dependency?','mcq',10,0,1,'2026-08-08 07:15:00.180','2026-08-08 07:15:00.180',NULL),(10,9,'Which normal form removes transitive dependency?','mcq',10,0,1,'2026-08-08 08:15:28.942','2026-08-08 08:15:28.942',NULL),(11,10,'Which layer of the OSI model handles routing?','mcq',10,0,1,'2026-08-08 08:15:29.158','2026-08-08 08:15:29.158',NULL),(12,11,'A NAND gate is a universal gate. True or False?','mcq',10,0,1,'2026-08-08 08:15:29.262','2026-08-08 08:15:29.262',NULL),(13,12,'What does a PID controller stand for?','mcq',10,0,1,'2026-08-08 08:15:29.349','2026-08-08 08:15:29.349',NULL),(14,13,'Which law of thermodynamics defines entropy?','mcq',10,0,1,'2026-08-08 08:15:29.438','2026-08-08 08:15:29.438',NULL);
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_allotments`
--

DROP TABLE IF EXISTS `quiz_allotments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_allotments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('allotted','attempted','absent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'allotted',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `is_proxy` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_allotments_quiz_id_student_roll_key` (`quiz_id`,`student_roll`),
  KEY `quiz_allotments_student_roll_idx` (`student_roll`),
  KEY `quiz_allotments_status_idx` (`status`),
  CONSTRAINT `quiz_allotments_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_allotments`
--

LOCK TABLES `quiz_allotments` WRITE;
/*!40000 ALTER TABLE `quiz_allotments` DISABLE KEYS */;
INSERT INTO `quiz_allotments` VALUES (1,1,'STU2025001','attempted','2026-08-05 07:47:48.488','2026-08-05 07:47:48.488',0),(2,1,'STU2025002','attempted','2026-08-05 07:47:48.619','2026-08-05 07:47:48.619',0),(3,1,'STU2025003','absent','2026-08-05 07:47:48.650','2026-08-05 07:47:48.650',0),(10,6,'STU2025004','allotted','2026-08-08 07:15:00.144','2026-08-08 07:15:00.144',0),(11,6,'STU2025006','allotted','2026-08-08 07:15:00.154','2026-08-08 07:15:00.154',0),(12,6,'STU2025007','allotted','2026-08-08 07:15:00.159','2026-08-08 07:15:00.159',0),(13,7,'STU2025003','allotted','2026-08-08 07:15:00.192','2026-08-08 07:15:00.192',0),(14,7,'STU2024001','attempted','2026-08-08 07:15:00.197','2026-08-08 07:15:00.197',0),(15,7,'STU2024002','allotted','2026-08-08 07:15:00.231','2026-08-08 07:15:00.231',0),(19,9,'STU2025003','attempted','2026-08-08 08:15:28.972','2026-08-08 08:15:28.972',0),(20,9,'STU2024001','attempted','2026-08-08 08:15:29.086','2026-08-08 08:15:29.086',0),(21,9,'STU2024002','absent','2026-08-08 08:15:29.132','2026-08-08 08:15:29.132',0),(22,10,'STU2025001','attempted','2026-08-08 08:15:29.171','2026-08-08 08:15:29.171',0),(23,10,'STU2025002','attempted','2026-08-08 08:15:29.214','2026-08-08 08:15:29.214',0),(24,10,'STU2024003','absent','2026-08-08 08:15:29.244','2026-08-08 08:15:29.244',0),(25,11,'STU2025004','attempted','2026-08-08 08:15:29.275','2026-08-08 08:15:29.275',0),(26,11,'STU2025006','attempted','2026-08-08 08:15:29.300','2026-08-08 08:15:29.300',0),(27,11,'STU2025007','absent','2026-08-08 08:15:29.330','2026-08-08 08:15:29.330',0),(28,12,'STU2025009','attempted','2026-08-08 08:15:29.364','2026-08-08 08:15:29.364',0),(29,12,'STU2025010','attempted','2026-08-08 08:15:29.402','2026-08-08 08:15:29.402',0),(30,13,'STU2025005','attempted','2026-08-08 08:15:29.451','2026-08-08 08:15:29.451',0),(31,13,'STU2025008','absent','2026-08-08 08:15:29.485','2026-08-08 08:15:29.485',0);
/*!40000 ALTER TABLE `quiz_allotments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_attempts`
--

DROP TABLE IF EXISTS `quiz_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `end_time` datetime(3) DEFAULT NULL,
  `status` enum('in_progress','submitted','auto_submitted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `auto_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `auto_submit_reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_order` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_attempts_quiz_id_student_roll_key` (`quiz_id`,`student_roll`),
  KEY `quiz_attempts_student_roll_idx` (`student_roll`),
  KEY `quiz_attempts_status_idx` (`status`),
  CONSTRAINT `quiz_attempts_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_attempts`
--

LOCK TABLES `quiz_attempts` WRITE;
/*!40000 ALTER TABLE `quiz_attempts` DISABLE KEYS */;
INSERT INTO `quiz_attempts` VALUES (1,1,'STU2025001','2025-09-15 10:00:00.000','2025-09-15 11:00:00.000','submitted',NULL,NULL,0,NULL,NULL,'2026-08-05 07:47:48.502','2026-08-05 07:47:48.502'),(2,1,'STU2025002','2025-09-15 10:00:00.000','2025-09-15 11:00:00.000','submitted',NULL,NULL,0,NULL,NULL,'2026-08-05 07:47:48.623','2026-08-05 07:47:48.623'),(3,7,'STU2024001','2026-08-08 07:15:00.203','2026-08-08 07:15:00.199','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 07:15:00.203','2026-08-08 07:15:00.203'),(5,9,'STU2025003','2026-08-08 05:15:28.927','2026-08-08 06:00:28.927','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:28.981','2026-08-08 08:15:28.981'),(6,9,'STU2024001','2026-08-08 05:15:28.927','2026-08-08 06:00:28.927','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.094','2026-08-08 08:15:29.094'),(7,10,'STU2025001','2026-08-08 05:15:29.143','2026-08-08 06:00:29.143','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.176','2026-08-08 08:15:29.176'),(8,10,'STU2025002','2026-08-08 05:15:29.143','2026-08-08 06:00:29.143','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.219','2026-08-08 08:15:29.219'),(9,11,'STU2025004','2026-08-08 05:15:29.251','2026-08-08 06:00:29.251','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.280','2026-08-08 08:15:29.280'),(10,11,'STU2025006','2026-08-08 05:15:29.251','2026-08-08 06:00:29.251','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.305','2026-08-08 08:15:29.305'),(11,12,'STU2025009','2026-08-08 05:15:29.339','2026-08-08 06:00:29.339','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.371','2026-08-08 08:15:29.371'),(12,12,'STU2025010','2026-08-08 05:15:29.339','2026-08-08 06:00:29.339','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.409','2026-08-08 08:15:29.409'),(13,13,'STU2025005','2026-08-08 05:15:29.429','2026-08-08 06:00:29.429','submitted',NULL,NULL,0,NULL,NULL,'2026-08-08 08:15:29.460','2026-08-08 08:15:29.460');
/*!40000 ALTER TABLE `quiz_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_sections`
--

DROP TABLE IF EXISTS `quiz_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `section_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `quiz_sections_quiz_id_section_id_key` (`quiz_id`,`section_id`),
  KEY `quiz_sections_section_id_idx` (`section_id`),
  CONSTRAINT `quiz_sections_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `quiz_sections_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_sections`
--

LOCK TABLES `quiz_sections` WRITE;
/*!40000 ALTER TABLE `quiz_sections` DISABLE KEYS */;
INSERT INTO `quiz_sections` VALUES (1,1,1,'2026-08-08 12:07:44.373'),(4,5,7,'2026-08-08 07:15:00.074'),(5,6,4,'2026-08-08 07:15:00.122'),(6,7,3,'2026-08-08 07:15:00.170'),(10,9,3,'2026-08-08 08:15:28.930'),(11,10,7,'2026-08-08 08:15:29.149'),(12,11,4,'2026-08-08 08:15:29.256'),(13,12,8,'2026-08-08 08:15:29.343'),(14,13,5,'2026-08-08 08:15:29.432');
/*!40000 ALTER TABLE `quiz_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quizzes`
--

DROP TABLE IF EXISTS `quizzes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quizzes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` int NOT NULL,
  `faculty_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `building_id` int NOT NULL,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) NOT NULL,
  `duration_minutes` int NOT NULL,
  `total_marks` int NOT NULL,
  `randomize` tinyint(1) NOT NULL DEFAULT '1',
  `negative_marking` tinyint(1) NOT NULL DEFAULT '0',
  `allow_skip_switch` tinyint(1) NOT NULL DEFAULT '1',
  `status` enum('draft','scheduled','live','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `actual_start_time` datetime(3) DEFAULT NULL,
  `actual_stop_time` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `session_id` int DEFAULT NULL,
  `require_location` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quizzes_course_id_idx` (`course_id`),
  KEY `quizzes_faculty_roll_idx` (`faculty_roll`),
  KEY `quizzes_building_id_idx` (`building_id`),
  KEY `quizzes_status_idx` (`status`),
  KEY `quizzes_session_id_idx` (`session_id`),
  CONSTRAINT `quizzes_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `quizzes_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `quizzes_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `academic_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quizzes`
--

LOCK TABLES `quizzes` WRITE;
/*!40000 ALTER TABLE `quizzes` DISABLE KEYS */;
INSERT INTO `quizzes` VALUES (1,'Data Structures Midterm',1,'FAC2025001',1,'2025-09-15 10:00:00.000','2025-09-15 11:00:00.000',60,20,1,0,1,'completed','2025-09-15 10:00:00.000','2025-09-15 11:00:00.000','2026-08-05 07:47:48.416','2026-08-05 07:47:48.416',NULL,1,NULL),(5,'Computer Networks Quiz 1 (Draft)',5,'FAC2025005',2,'2026-08-12 08:54:43.663','2026-08-12 09:39:43.663',45,10,1,0,1,'draft',NULL,NULL,'2026-08-08 07:15:00.074','2026-08-10 09:39:28.662',NULL,1,NULL),(6,'Digital Electronics Pop Quiz (Scheduled)',3,'FAC2025003',1,'2026-08-10 09:54:43.663','2026-08-10 10:24:43.663',30,10,1,0,1,'scheduled',NULL,NULL,'2026-08-08 07:15:00.122','2026-08-10 08:54:43.700',NULL,1,NULL),(7,'Database Systems Live Test',2,'FAC2025002',1,'2026-08-10 08:54:43.663','2026-08-10 09:34:43.663',40,10,1,0,1,'live','2026-08-10 08:54:43.663',NULL,'2026-08-08 07:15:00.170','2026-08-10 08:54:43.713',NULL,1,NULL),(9,'Database Systems Class Test',2,'FAC2025002',1,'2026-08-10 05:54:43.718','2026-08-10 06:39:43.718',45,10,1,0,1,'completed','2026-08-10 05:54:43.718','2026-08-10 06:39:43.718','2026-08-08 08:15:28.930','2026-08-10 08:54:43.727',NULL,1,NULL),(10,'Computer Networks Class Test',5,'FAC2025005',2,'2026-08-10 05:54:43.738','2026-08-10 06:39:43.738',45,10,1,0,1,'completed','2026-08-10 05:54:43.738','2026-08-10 06:39:43.738','2026-08-08 08:15:29.149','2026-08-10 08:54:43.749',NULL,1,NULL),(11,'Digital Electronics Class Test',3,'FAC2025003',1,'2026-08-10 05:54:43.755','2026-08-10 06:39:43.755',45,10,1,0,1,'completed','2026-08-10 05:54:43.755','2026-08-10 06:39:43.755','2026-08-08 08:15:29.256','2026-08-10 08:54:43.765',NULL,1,NULL),(12,'Control Systems Class Test',6,'FAC2025004',2,'2026-08-10 05:54:43.771','2026-08-10 06:39:43.771',45,10,1,0,1,'completed','2026-08-10 05:54:43.771','2026-08-10 06:39:43.771','2026-08-08 08:15:29.343','2026-08-10 08:54:43.779',NULL,1,NULL),(13,'Thermodynamics Class Test',4,'FAC2025001',1,'2026-08-10 05:54:43.785','2026-08-10 06:39:43.785',45,10,1,0,1,'completed','2026-08-10 05:54:43.785','2026-08-10 06:39:43.785','2026-08-08 08:15:29.432','2026-08-10 08:54:43.793',NULL,1,NULL);
/*!40000 ALTER TABLE `quizzes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `results`
--

DROP TABLE IF EXISTS `results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marks_obtained` double NOT NULL DEFAULT '0',
  `percentage` double NOT NULL DEFAULT '0',
  `status` enum('pending','declared','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `declared_at` datetime(3) DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `results_quiz_id_student_roll_key` (`quiz_id`,`student_roll`),
  KEY `results_student_roll_idx` (`student_roll`),
  KEY `results_status_idx` (`status`),
  CONSTRAINT `results_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `results`
--

LOCK TABLES `results` WRITE;
/*!40000 ALTER TABLE `results` DISABLE KEYS */;
INSERT INTO `results` VALUES (1,1,'STU2025001',20,100,'published','2025-09-15 11:00:00.000','2025-09-15 11:00:00.000','2026-08-05 07:47:48.604','2026-08-05 07:47:48.604'),(2,1,'STU2025002',10,50,'published','2025-09-15 11:00:00.000','2025-09-15 11:00:00.000','2026-08-05 07:47:48.645','2026-08-05 07:47:48.645'),(3,9,'STU2025003',10,100,'published','2026-08-08 06:00:28.927','2026-08-08 06:00:28.927','2026-08-08 08:15:29.062','2026-08-08 08:15:29.062'),(4,9,'STU2024001',0,0,'published','2026-08-08 06:00:28.927','2026-08-08 06:00:28.927','2026-08-08 08:15:29.125','2026-08-08 08:15:29.125'),(5,10,'STU2025001',10,100,'published','2026-08-08 06:00:29.143','2026-08-08 06:00:29.143','2026-08-08 08:15:29.189','2026-08-08 08:15:29.189'),(6,10,'STU2025002',10,100,'published','2026-08-08 06:00:29.143','2026-08-08 06:00:29.143','2026-08-08 08:15:29.239','2026-08-08 08:15:29.239'),(7,11,'STU2025004',10,100,'published','2026-08-08 06:00:29.251','2026-08-08 06:00:29.251','2026-08-08 08:15:29.295','2026-08-08 08:15:29.295'),(8,11,'STU2025006',0,0,'published','2026-08-08 06:00:29.251','2026-08-08 06:00:29.251','2026-08-08 08:15:29.324','2026-08-08 08:15:29.324'),(9,12,'STU2025009',10,100,'published','2026-08-08 06:00:29.339','2026-08-08 06:00:29.339','2026-08-08 08:15:29.396','2026-08-08 08:15:29.396'),(10,12,'STU2025010',10,100,'published','2026-08-08 06:00:29.339','2026-08-08 06:00:29.339','2026-08-08 08:15:29.426','2026-08-08 08:15:29.426'),(11,13,'STU2025005',10,100,'published','2026-08-08 06:00:29.429','2026-08-08 06:00:29.429','2026-08-08 08:15:29.480','2026-08-08 08:15:29.480');
/*!40000 ALTER TABLE `results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `section_courses`
--

DROP TABLE IF EXISTS `section_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `course_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `section_courses_section_id_course_id_key` (`section_id`,`course_id`),
  KEY `section_courses_course_id_idx` (`course_id`),
  CONSTRAINT `section_courses_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `section_courses_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `section_courses`
--

LOCK TABLES `section_courses` WRITE;
/*!40000 ALTER TABLE `section_courses` DISABLE KEYS */;
INSERT INTO `section_courses` VALUES (1,1,1,'2026-08-08 12:07:44.369'),(2,2,1,'2026-08-08 12:07:44.369'),(3,3,2,'2026-08-08 12:07:44.369'),(4,4,3,'2026-08-08 12:07:44.369'),(5,5,4,'2026-08-08 12:07:44.369'),(10,7,5,'2026-08-08 07:14:56.757'),(11,8,6,'2026-08-08 07:14:56.772'),(12,9,1,'2026-08-08 07:14:56.781'),(13,9,5,'2026-08-08 07:14:56.781');
/*!40000 ALTER TABLE `section_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `section_faculty`
--

DROP TABLE IF EXISTS `section_faculty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_faculty` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `faculty_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` enum('auto','manual_added','manual_removed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `section_faculty_section_id_faculty_roll_key` (`section_id`,`faculty_roll`),
  KEY `section_faculty_faculty_roll_idx` (`faculty_roll`),
  CONSTRAINT `section_faculty_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `section_faculty`
--

LOCK TABLES `section_faculty` WRITE;
/*!40000 ALTER TABLE `section_faculty` DISABLE KEYS */;
INSERT INTO `section_faculty` VALUES (1,1,'FAC2025001','auto','2026-08-08 06:53:25.599'),(5,3,'FAC2025002','auto','2026-08-08 07:14:59.910'),(6,7,'FAC2025005','auto','2026-08-08 07:14:59.928'),(7,4,'FAC2025003','auto','2026-08-08 07:14:59.965'),(8,8,'FAC2025004','auto','2026-08-08 07:15:00.006'),(9,9,'FAC2025005','auto','2026-08-08 07:15:00.029'),(10,9,'FAC2025001','auto','2026-08-08 07:15:00.029'),(11,5,'FAC2025001','auto','2026-08-08 08:15:28.867'),(12,2,'FAC2025001','auto','2026-08-09 18:00:04.970');
/*!40000 ALTER TABLE `section_faculty` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `section_students`
--

DROP TABLE IF EXISTS `section_students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `student_roll` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` enum('auto','manual_added','manual_removed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `section_students_section_id_student_roll_key` (`section_id`,`student_roll`),
  KEY `section_students_student_roll_idx` (`student_roll`),
  CONSTRAINT `section_students_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `section_students`
--

LOCK TABLES `section_students` WRITE;
/*!40000 ALTER TABLE `section_students` DISABLE KEYS */;
INSERT INTO `section_students` VALUES (1,1,'STU2025002','auto','2026-08-08 06:53:25.599'),(2,1,'STU2025001','auto','2026-08-08 06:53:25.599'),(7,1,'STU2025003','auto','2026-08-08 07:14:59.887'),(8,3,'STU2024001','auto','2026-08-08 07:14:59.906'),(9,3,'STU2024002','auto','2026-08-08 07:14:59.906'),(10,3,'STU2025003','auto','2026-08-08 07:14:59.906'),(11,7,'STU2025002','auto','2026-08-08 07:14:59.941'),(12,7,'STU2024001','auto','2026-08-08 07:14:59.940'),(13,7,'STU2024003','auto','2026-08-08 07:14:59.941'),(14,7,'STU2025001','auto','2026-08-08 07:14:59.941'),(15,4,'STU2025004','auto','2026-08-08 07:14:59.968'),(16,4,'STU2025006','auto','2026-08-08 07:14:59.969'),(17,4,'STU2025007','auto','2026-08-08 07:14:59.969'),(18,5,'STU2025008','auto','2026-08-08 07:14:59.988'),(19,5,'STU2025005','auto','2026-08-08 07:14:59.988'),(20,8,'STU2025010','auto','2026-08-08 07:15:00.012'),(21,8,'STU2025009','auto','2026-08-08 07:15:00.012'),(22,9,'STU2025002','auto','2026-08-08 07:15:00.045'),(23,9,'STU2024001','auto','2026-08-08 07:15:00.045'),(24,9,'STU2025001','auto','2026-08-08 07:15:00.045'),(25,9,'STU2025003','auto','2026-08-08 07:15:00.045'),(26,9,'STU2024003','auto','2026-08-08 07:15:00.045'),(27,2,'STU2025001','auto','2026-08-09 17:28:12.652'),(28,2,'STU2025002','auto','2026-08-09 17:28:12.652'),(29,2,'STU2025003','auto','2026-08-09 17:28:12.652');
/*!40000 ALTER TABLE `section_students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sections`
--

DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sections`
--

LOCK TABLES `sections` WRITE;
/*!40000 ALTER TABLE `sections` DISABLE KEYS */;
INSERT INTO `sections` VALUES (1,'A','2026-08-05 04:43:22.725','2026-08-05 04:43:22.725'),(2,'B','2026-08-05 04:43:22.740','2026-08-05 04:43:22.740'),(3,'A','2026-08-05 04:43:22.755','2026-08-05 04:43:22.755'),(4,'A','2026-08-05 04:43:22.768','2026-08-05 04:43:22.768'),(5,'A','2026-08-05 04:43:22.777','2026-08-05 04:43:22.777'),(7,'A','2026-08-08 07:14:56.757','2026-08-08 07:14:56.757'),(8,'A','2026-08-08 07:14:56.772','2026-08-08 07:14:56.772'),(9,'Combined A (CS201+CS302)','2026-08-08 07:14:56.781','2026-08-08 07:14:56.781');
/*!40000 ALTER TABLE `sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `semester_config`
--

DROP TABLE IF EXISTS `semester_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `semester_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_sub_list` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `semester_config`
--

LOCK TABLES `semester_config` WRITE;
/*!40000 ALTER TABLE `semester_config` DISABLE KEYS */;
INSERT INTO `semester_config` VALUES (1,'C2','2026-08-05 04:43:22.476');
/*!40000 ALTER TABLE `semester_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_answers`
--

DROP TABLE IF EXISTS `student_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attempt_id` int NOT NULL,
  `question_id` int NOT NULL,
  `selected_option_id` int DEFAULT NULL,
  `answer_value` double DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `marks_obtained` double NOT NULL DEFAULT '0',
  `order_index` int NOT NULL,
  `is_skipped` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `written_answer` text COLLATE utf8mb4_unicode_ci,
  `manually_graded` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_answers_attempt_id_question_id_key` (`attempt_id`,`question_id`),
  KEY `student_answers_question_id_idx` (`question_id`),
  KEY `student_answers_selected_option_id_idx` (`selected_option_id`),
  CONSTRAINT `student_answers_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_answers_selected_option_id_fkey` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_answers`
--

LOCK TABLES `student_answers` WRITE;
/*!40000 ALTER TABLE `student_answers` DISABLE KEYS */;
INSERT INTO `student_answers` VALUES (1,1,1,2,NULL,1,10,1,0,'2026-08-05 07:47:48.570','2026-08-05 07:47:48.570',NULL,0),(2,1,2,7,NULL,1,10,2,0,'2026-08-05 07:47:48.585','2026-08-05 07:47:48.585',NULL,0),(3,2,1,2,NULL,1,10,1,0,'2026-08-05 07:47:48.629','2026-08-05 07:47:48.629',NULL,0),(4,2,2,6,NULL,0,0,2,0,'2026-08-05 07:47:48.634','2026-08-05 07:47:48.634',NULL,0),(5,3,8,22,NULL,1,10,1,0,'2026-08-08 07:15:00.218','2026-08-08 07:15:00.218',NULL,0),(6,5,10,26,NULL,1,10,1,0,'2026-08-08 08:15:28.990','2026-08-08 08:15:28.990',NULL,0),(7,6,10,25,NULL,0,0,1,0,'2026-08-08 08:15:29.100','2026-08-08 08:15:29.100',NULL,0),(8,7,11,28,NULL,1,10,1,0,'2026-08-08 08:15:29.180','2026-08-08 08:15:29.180',NULL,0),(9,8,11,28,NULL,1,10,1,0,'2026-08-08 08:15:29.226','2026-08-08 08:15:29.226',NULL,0),(10,9,12,29,NULL,1,10,1,0,'2026-08-08 08:15:29.284','2026-08-08 08:15:29.284',NULL,0),(11,10,12,30,NULL,0,0,1,0,'2026-08-08 08:15:29.311','2026-08-08 08:15:29.311',NULL,0),(12,11,13,32,NULL,1,10,1,0,'2026-08-08 08:15:29.381','2026-08-08 08:15:29.381',NULL,0),(13,12,13,32,NULL,1,10,1,0,'2026-08-08 08:15:29.415','2026-08-08 08:15:29.415',NULL,0),(14,13,14,33,NULL,1,10,1,0,'2026-08-08 08:15:29.466','2026-08-08 08:15:29.466',NULL,0);
/*!40000 ALTER TABLE `student_answers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-10 17:09:26
