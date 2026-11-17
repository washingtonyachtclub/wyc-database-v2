CREATE TABLE `keelboat_payments` (
	`id` char(36) PRIMARY KEY,
	`member_id` int NOT NULL,
	`active_member_id` int,
	`reservation_id` int,
	`reservation_input` json NOT NULL,
	`price_snapshot` json NOT NULL,
	`status` enum('processing','paid','completed','failed','reconciliation_required') NOT NULL,
	`square_order_id` varchar(255),
	`square_payment_id` varchar(255),
	`amount_cents` int NOT NULL,
	`currency` char(3) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uq_keelboat_active_payment` UNIQUE INDEX(`active_member_id`),
	CONSTRAINT `uq_keelboat_payment_id` UNIQUE INDEX(`square_payment_id`)
);
--> statement-breakpoint
ALTER TABLE `calendarboats` ADD `engineType` enum('outboard','inboard','both');--> statement-breakpoint
ALTER TABLE `calendartable` ADD `paymentCheckoutId` char(36);--> statement-breakpoint
ALTER TABLE `calendartable` ADD `squareOrderId` varchar(255);--> statement-breakpoint
ALTER TABLE `calendartable` ADD `squarePaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `calendartable` ADD `paidAmountCents` int;--> statement-breakpoint
ALTER TABLE `calendartable` ADD `paidCurrency` char(3);--> statement-breakpoint
ALTER TABLE `calendartable` ADD `pricingTier` enum('student','nonstudent');--> statement-breakpoint
ALTER TABLE `calendartable` ADD `rentalEngine` enum('outboard','inboard');--> statement-breakpoint
ALTER TABLE `calendartable` ADD `deletedAt` datetime;--> statement-breakpoint
ALTER TABLE `calendartable` ADD `deletedByWYCNumber` int;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_calendar_payment_checkout` ON `calendartable` (`paymentCheckoutId`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_calendar_square_payment` ON `calendartable` (`squarePaymentId`);--> statement-breakpoint
CREATE INDEX `idx_keelboat_payments_member` ON `keelboat_payments` (`member_id`);
--> statement-breakpoint
UPDATE `calendarboats` SET `engineType` = 'outboard' WHERE `cBoatId` IN (3, 5);--> statement-breakpoint
UPDATE `calendarboats` SET `engineType` = 'inboard' WHERE `cBoatId` IN (6, 7);--> statement-breakpoint
UPDATE `calendarboats` SET `engineType` = 'both' WHERE `cBoatId` = 8;
