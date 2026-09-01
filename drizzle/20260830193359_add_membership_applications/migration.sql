CREATE TABLE `member_emergency_contacts` (
	`wyc_number` int PRIMARY KEY,
	`first_name` varchar(60) NOT NULL,
	`last_name` varchar(60) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`relationship` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `membership_applications` (
	`id` char(36) PRIMARY KEY,
	`first_name` varchar(60) NOT NULL,
	`last_name` varchar(60) NOT NULL,
	`submitted_primary_email` varchar(254) NOT NULL,
	`primary_email` varchar(254) NOT NULL,
	`submitted_uw_email` varchar(254),
	`uw_email` varchar(254),
	`email_edited_by` int,
	`email_edited_at` timestamp,
	`uw_status` varchar(20) NOT NULL,
	`ima_acknowledged` tinyint(1) NOT NULL,
	`plus_one_response` varchar(30) NOT NULL,
	`tier` varchar(20) NOT NULL,
	`duration` varchar(20) NOT NULL,
	`target_expire_qtr` int NOT NULL,
	`payment_status` varchar(30) NOT NULL DEFAULT 'pending',
	`square_order_id` varchar(255),
	`payment_idempotency_key` varchar(45),
	`payment_completed_at` timestamp,
	`address_line_1` varchar(100),
	`address_line_2` varchar(100),
	`city` varchar(50),
	`state` varchar(20),
	`zip_code` varchar(10),
	`phone` varchar(50),
	`emergency_first_name` varchar(60),
	`emergency_last_name` varchar(60),
	`emergency_phone` varchar(50),
	`emergency_relationship` varchar(100),
	`questionnaire_version` varchar(50) NOT NULL,
	`questionnaire_responses` json,
	`requirements_completed_at` timestamp,
	`review_status` varchar(30) NOT NULL DEFAULT 'not_ready',
	`resolved_wyc_number` int,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_note` text,
	`closed_at` timestamp,
	`recovery_email_sent_at` timestamp,
	`completion_reminder_sent_at` timestamp,
	`welcome_email_sent_at` timestamp,
	`created_ip_hash` char(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `membership_payments` MODIFY COLUMN `wyc_number` int;--> statement-breakpoint
ALTER TABLE `WYCDatabase` MODIFY COLUMN `Email` varchar(254) CHARACTER SET latin1 COLLATE latin1_swedish_ci;--> statement-breakpoint
ALTER TABLE `membership_payments` ADD `application_id` char(36);--> statement-breakpoint
ALTER TABLE `WYCDatabase` ADD `uw_email` varchar(254) CHARACTER SET latin1 COLLATE latin1_swedish_ci;--> statement-breakpoint
CREATE INDEX `idx_membership_applications_email` ON `membership_applications` (`primary_email`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_payment` ON `membership_applications` (`payment_status`,`payment_completed_at`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_review` ON `membership_applications` (`review_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_reminder` ON `membership_applications` (`payment_status`,`requirements_completed_at`,`completion_reminder_sent_at`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_resolved` ON `membership_applications` (`resolved_wyc_number`);--> statement-breakpoint
CREATE INDEX `idx_membership_applications_rate_limit` ON `membership_applications` (`created_ip_hash`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_membership_payments_application` ON `membership_payments` (`application_id`);--> statement-breakpoint
ALTER TABLE `member_waivers` ADD CONSTRAINT `fk_member_waivers_application` FOREIGN KEY (`application_id`) REFERENCES `membership_applications`(`id`);--> statement-breakpoint
ALTER TABLE `membership_payments` ADD CONSTRAINT `fk_membership_payments_application` FOREIGN KEY (`application_id`) REFERENCES `membership_applications`(`id`);
