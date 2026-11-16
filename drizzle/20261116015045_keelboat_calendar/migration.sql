ALTER TABLE `calendartable` MODIFY COLUMN `memberWYCNumber` int;--> statement-breakpoint
ALTER TABLE `calendarboats` ADD `active` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `calendartable` ADD `reservationType` enum('personal','admin') DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE `calendartable` ADD `createdByWYCNumber` int;--> statement-breakpoint
ALTER TABLE `calendartable` ADD `title` varchar(120) CHARACTER SET latin1 COLLATE latin1_swedish_ci;
--> statement-breakpoint
UPDATE `calendarboats` SET `active` = 0 WHERE `cBoatId` IN (4, 7);
