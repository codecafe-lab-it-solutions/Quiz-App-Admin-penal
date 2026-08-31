-- Forgot-password OTPs for isr_login_tbl accounts (student or faculty).
CREATE TABLE `password_reset_otps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_roll` VARCHAR(191) NOT NULL,
    `user_type` VARCHAR(191) NOT NULL,
    `otp_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_reset_otps_user_roll_idx`(`user_roll`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
