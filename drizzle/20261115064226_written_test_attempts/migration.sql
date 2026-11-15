CREATE TABLE `written_test_attempts` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`attempt_id` char(36) NOT NULL,
	`member_wyc_number` int NOT NULL,
	`examiner_wyc_number` int,
	`test_id` varchar(64) NOT NULL,
	`mode` enum('practice','final') NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`correct_count` int NOT NULL,
	`question_count` int NOT NULL,
	`percentage` int NOT NULL,
	`passed` tinyint NOT NULL,
	`snapshot` json NOT NULL,
	CONSTRAINT `written_test_attempt_member_unique` UNIQUE INDEX(`member_wyc_number`,`attempt_id`)
);
--> statement-breakpoint
CREATE INDEX `written_test_attempt_submitted_at` ON `written_test_attempts` (`submitted_at`);