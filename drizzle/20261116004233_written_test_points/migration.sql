ALTER TABLE `written_test_attempts` ADD `earned_points` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `written_test_attempts` ADD `possible_points` decimal(10,2);
--> statement-breakpoint
UPDATE `written_test_attempts` SET `earned_points` = `correct_count`, `possible_points` = `question_count`;
--> statement-breakpoint
ALTER TABLE `written_test_attempts` MODIFY `earned_points` decimal(10,2) NOT NULL, MODIFY `possible_points` decimal(10,2) NOT NULL;
--> statement-breakpoint
ALTER TABLE `written_test_attempts` DROP COLUMN `percentage`;
