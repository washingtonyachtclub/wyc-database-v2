CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`occurred_at` datetime(3) NOT NULL,
	`request_id` char(36) NOT NULL,
	`actor_wyc_number` int,
	`effective_wyc_number` int,
	`source` varchar(32) NOT NULL,
	`action` varchar(160) NOT NULL,
	`transaction_id` char(36),
	`operation` varchar(24) NOT NULL,
	`table_name` varchar(64),
	`outcome` enum('succeeded','failed') NOT NULL,
	`affected_rows` bigint unsigned,
	`insert_id` varchar(32),
	`details` json NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_occurred_at` ON `audit_log` (`occurred_at`);