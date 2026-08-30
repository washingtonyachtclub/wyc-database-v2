CREATE TABLE `member_waivers` (
	`id` char(36) PRIMARY KEY,
	`renewal_id` char(36),
	`application_id` char(36),
	`waiver_version` varchar(50) NOT NULL,
	`first_name` varchar(60) NOT NULL,
	`last_name` varchar(60) NOT NULL,
	`email` varchar(254) NOT NULL,
	`submitted_values` json NOT NULL,
	`signed_at` timestamp NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`pdf_sha256` char(64) NOT NULL,
	`pdf_size` int NOT NULL,
	`pdf_content_type` varchar(100) NOT NULL,
	CONSTRAINT `uq_member_waivers_renewal` UNIQUE INDEX(`renewal_id`),
	CONSTRAINT `uq_member_waivers_application` UNIQUE INDEX(`application_id`),
	CONSTRAINT `uq_member_waivers_object_key` UNIQUE INDEX(`object_key`),
	CONSTRAINT `chk_member_waivers_workflow` CHECK((`member_waivers`.`renewal_id` is not null) <> (`member_waivers`.`application_id` is not null))
);
--> statement-breakpoint
CREATE TABLE `membership_renewals` (
	`id` char(36) PRIMARY KEY,
	`wyc_number` int NOT NULL,
	`source` varchar(20) NOT NULL,
	`tier` varchar(20) NOT NULL,
	`duration` varchar(20) NOT NULL,
	`previous_expire_qtr` int NOT NULL,
	`target_expire_qtr` int NOT NULL,
	`completed_at` timestamp,
	`closed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `dues_exemption_requests` ADD `renewal_id` char(36);--> statement-breakpoint
ALTER TABLE `membership_payments` ADD `renewal_id` char(36);--> statement-breakpoint
ALTER TABLE `renewal_questionnaire` ADD `renewal_id` char(36);--> statement-breakpoint
INSERT INTO `membership_renewals` (
	`id`,
	`wyc_number`,
	`source`,
	`tier`,
	`duration`,
	`previous_expire_qtr`,
	`target_expire_qtr`,
	`created_at`
)
SELECT
	CONCAT('exempt-', LPAD(CAST(requests.`_index` AS CHAR), 29, '0')),
	requests.`wyc_number`,
	'exempt',
	'exempt',
	'quarterly',
	members.`ExpireQtr`,
	requests.`requested_expire_qtr`,
	requests.`created_at`
FROM `dues_exemption_requests` requests
INNER JOIN `WYCDatabase` members ON members.`WYCNumber` = requests.`wyc_number`
WHERE requests.`status` = 'pending' AND requests.`renewal_id` IS NULL;--> statement-breakpoint
UPDATE `dues_exemption_requests`
SET `renewal_id` = CONCAT('exempt-', LPAD(CAST(`_index` AS CHAR), 29, '0'))
WHERE `status` = 'pending' AND `renewal_id` IS NULL;--> statement-breakpoint
UPDATE `renewal_questionnaire` questionnaire
INNER JOIN `dues_exemption_requests` requests ON requests.`_index` = questionnaire.`request_id`
SET questionnaire.`renewal_id` = requests.`renewal_id`
WHERE requests.`status` = 'pending' AND questionnaire.`renewal_id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_dues_exemption_requests_renewal` ON `dues_exemption_requests` (`renewal_id`);--> statement-breakpoint
CREATE INDEX `idx_member_waivers_email` ON `member_waivers` (`email`);--> statement-breakpoint
CREATE INDEX `idx_member_waivers_name` ON `member_waivers` (`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `idx_member_waivers_signed_at` ON `member_waivers` (`signed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_membership_payments_renewal` ON `membership_payments` (`renewal_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_membership_payments_square_payment` ON `membership_payments` (`square_payment_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_renewals_wyc` ON `membership_renewals` (`wyc_number`);--> statement-breakpoint
CREATE INDEX `idx_membership_renewals_open` ON `membership_renewals` (`wyc_number`,`completed_at`,`closed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_renewal_questionnaire_renewal` ON `renewal_questionnaire` (`renewal_id`);--> statement-breakpoint
ALTER TABLE `dues_exemption_requests` ADD CONSTRAINT `fk_dues_exemption_requests_renewal` FOREIGN KEY (`renewal_id`) REFERENCES `membership_renewals`(`id`);--> statement-breakpoint
ALTER TABLE `member_waivers` ADD CONSTRAINT `fk_member_waivers_renewal` FOREIGN KEY (`renewal_id`) REFERENCES `membership_renewals`(`id`);--> statement-breakpoint
ALTER TABLE `membership_payments` ADD CONSTRAINT `fk_membership_payments_renewal` FOREIGN KEY (`renewal_id`) REFERENCES `membership_renewals`(`id`);--> statement-breakpoint
ALTER TABLE `renewal_questionnaire` ADD CONSTRAINT `fk_renewal_questionnaire_renewal` FOREIGN KEY (`renewal_id`) REFERENCES `membership_renewals`(`id`);--> statement-breakpoint
UPDATE `guest_waivers`
SET `submitted_values` = JSON_REMOVE(`submitted_values`, '$.dateOfBirth', '$.signatureDataUrl');--> statement-breakpoint
ALTER TABLE `guest_waivers` DROP COLUMN `date_of_birth`;
