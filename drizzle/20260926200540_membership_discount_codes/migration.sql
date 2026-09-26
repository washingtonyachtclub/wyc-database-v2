CREATE TABLE `membership_discount_code_redemptions` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`discount_code_id` int NOT NULL,
	`payment_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`revision` int NOT NULL,
	`percentage_off` int,
	`amount_off_cents` int,
	`subtotal_cents` int NOT NULL,
	`discount_cents` int NOT NULL,
	`final_cents` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uq_membership_discount_code_redemptions_payment` UNIQUE INDEX(`payment_id`)
);
--> statement-breakpoint
CREATE TABLE `membership_discount_codes` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
	`audience` varchar(20) NOT NULL,
	`percentage_off` int,
	`amount_off_cents` int,
	`starts_on` date NOT NULL,
	`ends_on` date NOT NULL,
	`max_redemptions` int,
	`active` tinyint(1) NOT NULL DEFAULT (true),
	`revision` int NOT NULL DEFAULT 1,
	`created_by` int NOT NULL,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp,
	CONSTRAINT `uq_membership_discount_codes_code` UNIQUE INDEX(`code`),
	CONSTRAINT `chk_membership_discount_codes_discount` CHECK((`membership_discount_codes`.`percentage_off` is not null) <> (`membership_discount_codes`.`amount_off_cents` is not null))
);
--> statement-breakpoint
CREATE INDEX `idx_membership_discount_code_redemptions_discount_code` ON `membership_discount_code_redemptions` (`discount_code_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_discount_codes_active_dates` ON `membership_discount_codes` (`active`,`starts_on`,`ends_on`);--> statement-breakpoint
ALTER TABLE `membership_discount_code_redemptions` ADD CONSTRAINT `fk_membership_discount_code_redemptions_discount_code` FOREIGN KEY (`discount_code_id`) REFERENCES `membership_discount_codes`(`_index`);--> statement-breakpoint
ALTER TABLE `membership_discount_code_redemptions` ADD CONSTRAINT `fk_membership_discount_code_redemptions_payment` FOREIGN KEY (`payment_id`) REFERENCES `membership_payments`(`_index`);