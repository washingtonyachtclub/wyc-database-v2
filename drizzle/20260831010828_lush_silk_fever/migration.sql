CREATE TABLE `lesson_announcements` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`lesson_id` int NOT NULL,
	`author_wyc_number` int,
	`subject` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`body_markdown` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE INDEX `idx_lesson_announcements_lesson_created` ON `lesson_announcements` (`lesson_id`,`created_at`);
