-- Migration: create otp_codes table
-- Apply manually. Matches the Drizzle schema added in src/db/schema.ts (otpCodes).

CREATE TABLE `otp_codes` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `wyc_number`   INT          NOT NULL,
  `channel`      ENUM('email','sms') NOT NULL,
  `purpose`      VARCHAR(32)  NOT NULL,
  `destination`  VARCHAR(255) NOT NULL,
  `code_hash`    VARCHAR(255) NOT NULL,
  `expires_at`   TIMESTAMP    NOT NULL,
  `attempts`     INT          NOT NULL DEFAULT 0,
  `max_attempts` INT          NOT NULL DEFAULT 5,
  `consumed_at`  TIMESTAMP    NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_otp_lookup`  (`wyc_number`, `channel`, `purpose`, `created_at`),
  INDEX `idx_otp_expires` (`expires_at`)
);
