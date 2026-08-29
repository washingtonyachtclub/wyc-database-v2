CREATE TABLE `guest_waivers` (
	`id` char(36) PRIMARY KEY,
	`waiver_version` varchar(50) NOT NULL,
	`first_name` varchar(60) NOT NULL,
	`last_name` varchar(60) NOT NULL,
	`email` varchar(254) NOT NULL,
	`date_of_birth` date NOT NULL,
	`submitted_values` json NOT NULL,
	`signed_at` timestamp NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`pdf_sha256` char(64) NOT NULL,
	`pdf_size` int NOT NULL,
	`pdf_content_type` varchar(100) NOT NULL,
	CONSTRAINT `uq_guest_waivers_object_key` UNIQUE INDEX(`object_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_guest_waivers_email` ON `guest_waivers` (`email`);--> statement-breakpoint
CREATE INDEX `idx_guest_waivers_name` ON `guest_waivers` (`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `idx_guest_waivers_signed_at` ON `guest_waivers` (`signed_at`);