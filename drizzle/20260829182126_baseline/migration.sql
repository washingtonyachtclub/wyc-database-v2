CREATE TABLE `boat_types` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`type` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`description` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`usefulLink` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`fleet` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`numberInFleet` int NOT NULL,
	`active` tinyint(1) NOT NULL DEFAULT (true)
);
--> statement-breakpoint
CREATE TABLE `calendaradmin` (
	`wycnum` int NOT NULL,
	`description` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendarboats` (
	`cBoatId` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`Description` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendarcomment` (
	`id` int NOT NULL,
	`userwyc` int NOT NULL,
	`date` datetime NOT NULL,
	`comment` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendarconfig` (
	`wacip` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci PRIMARY KEY,
	`ipdescription` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendartable` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`cBoatId` int NOT NULL,
	`memberWYCNumber` int NOT NULL,
	`reserveFrom` datetime NOT NULL,
	`reserveTo` datetime NOT NULL,
	`destination` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`numberOfCrew` int NOT NULL,
	`comments` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`phone` varchar(45) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`numFullWD` int NOT NULL,
	`numHalfWD` int NOT NULL,
	`numFullWE` int NOT NULL,
	`numHalfWE` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checkouts` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`WYCNumber` int NOT NULL,
	`TimeDeparture` datetime NOT NULL,
	`Crew` text,
	`Boat` varchar(50) NOT NULL,
	`Destination` varchar(100) NOT NULL,
	`TimeReturn` datetime,
	`ExpectedReturn` datetime NOT NULL,
	`RelevantRating` int,
	`ChiefID` int
);
--> statement-breakpoint
CREATE TABLE `class_type` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `crew` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`checkout_ID` int NOT NULL,
	`crew_ID` int NOT NULL,
	CONSTRAINT `uq_crew_checkout_member` UNIQUE INDEX(`crew_ID`,`checkout_ID`)
);
--> statement-breakpoint
CREATE TABLE `door_codes` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`slug` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
	`name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
	`code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
	`updated_at` datetime,
	`updated_by` int,
	CONSTRAINT `uq_door_codes_slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dues_exemption_requests` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`wyc_number` int NOT NULL,
	`requested_expire_qtr` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`payment_id` int,
	`decided_by` int,
	`decided_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`checkout_ID` int NOT NULL,
	`name` varchar(100),
	`status` int NOT NULL,
	`email` varchar(255),
	`phone` varchar(15)
);
--> statement-breakpoint
CREATE TABLE `keelboat_pricing` (
	`price` float NOT NULL,
	`weekday` int NOT NULL,
	`fullday` int NOT NULL,
	`student` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_quarter` (
	`_index` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`quarter` int unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `lesson_sessions` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`lesson_id` int NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`all_day` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`type` int,
	`subtype` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`day` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`time` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`dates` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`CalendarDate` date NOT NULL,
	`instructor1` int,
	`instructor2` int,
	`comments` blob,
	`requirements` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`Description` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`location` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`location_url` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`size` int,
	`expire` int,
	`display` tinyint(1) NOT NULL DEFAULT (false)
);
--> statement-breakpoint
CREATE TABLE `membership_payments` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`wyc_number` int NOT NULL,
	`square_payment_id` varchar(255),
	`square_order_id` varchar(255),
	`amount_cents` int NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'USD',
	`tier` varchar(20) NOT NULL,
	`duration` varchar(20) NOT NULL,
	`prev_expire_qtr` int NOT NULL,
	`new_expire_qtr` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `memcat` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `noyes` (
	`_index` tinyint(1) PRIMARY KEY DEFAULT (false),
	`text` char(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `officers` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`member` int,
	`position` int,
	`active` tinyint(1) NOT NULL DEFAULT (true),
	CONSTRAINT `_index` UNIQUE INDEX(`_index`),
	CONSTRAINT `member` UNIQUE INDEX(`position`,`member`)
);
--> statement-breakpoint
CREATE TABLE `options` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`value` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`wyc_number` int NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`consumed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `pos_priv_map` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`position` int,
	`priv` int
);
--> statement-breakpoint
CREATE TABLE `pos_type` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
	`sortorder` int,
	`is_dues_exempt` tinyint(1) DEFAULT (false),
	`type` int,
	`bookmark` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`job_desc` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`active` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `priority_types` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`priority` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `privs` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`name` char(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `processed_form_entries` (
	`entry_id` int PRIMARY KEY,
	`wyc_number` int,
	`processed_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `qr_login_requests` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`approval_secret_hash` char(64) NOT NULL,
	`polling_secret_hash` char(64) NOT NULL,
	`status` enum('pending','approved','consumed','expired','canceled') NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`created_ip_hash` char(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`approved_at` timestamp,
	`consumed_at` timestamp,
	`canceled_at` timestamp,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `uq_qr_login_approval_secret` UNIQUE INDEX(`approval_secret_hash`),
	CONSTRAINT `uq_qr_login_polling_secret` UNIQUE INDEX(`polling_secret_hash`)
);
--> statement-breakpoint
CREATE TABLE `quarters` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`school` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`endDate` date
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`type` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
	`degree` int NOT NULL,
	`expires` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `recip` (
	`club_name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`website` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`recip_url` varchar(75) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`location` varchar(2000) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`lat_long` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`length_stay` varchar(2000) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`procedures` varchar(2000) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`amenities` varchar(2000) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`image` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`image_next` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`club_id` varchar(2) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `renewal_questionnaire` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`wyc_number` int NOT NULL,
	`quarter` int NOT NULL,
	`uw_status` varchar(20) NOT NULL,
	`plus_one_response` varchar(30) NOT NULL,
	`status` varchar(20) NOT NULL,
	`source` varchar(20) NOT NULL,
	`request_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`session` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`userid` int,
	`time` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `signups` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`class` int NOT NULL DEFAULT 0,
	`student` int NOT NULL DEFAULT 0,
	CONSTRAINT `uq_class_student` UNIQUE INDEX(`class`,`student`)
);
--> statement-breakpoint
CREATE TABLE `snc` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`quarter` int,
	`member` int,
	`member_dinner` int,
	`member_lunch1` int,
	`member_lunch2` int,
	`guest1_name` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`guest1_dinner` int,
	`guest1_lunch1` int,
	`guest1_lunch2` int,
	`guest2_name` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`guest2_dinner` int,
	`guest2_lunch1` int,
	`guest2_lunch2` int,
	`boat1pref` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`boat2pref` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`rating_sh` int,
	`rating_dh` int,
	`rating_kb` int,
	`is_lock_veteran` tinyint(1),
	`friends` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`duties` int,
	`guest1_child` tinyint(1),
	`guest2_child` tinyint(1),
	`transpt` tinyint(1) DEFAULT (false),
	`payment_confirm` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snc_food` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`is_allowed` tinyint(1),
	`is_dinner` tinyint(1),
	`cost` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `snc_work` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`text` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`is_allowed` tinyint(1)
);
--> statement-breakpoint
CREATE TABLE `WYCDatabase` (
	`Last` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`First` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`StreetAddress` char(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`City` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`State` char(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`ZipCode` char(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`Phone1` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`Phone2` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`Email` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`Category` int,
	`WYCNumber` int PRIMARY KEY DEFAULT 0,
	`ExpireQtr` int NOT NULL DEFAULT 0,
	`StudentID` int,
	`password` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`password_argon2` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	`out_to_sea` tinyint(1) DEFAULT (false),
	`JoinDate` timestamp NOT NULL DEFAULT (now()),
	`image_name` char(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci,
	CONSTRAINT `IDX_WYCNumber` UNIQUE INDEX(`WYCNumber`)
);
--> statement-breakpoint
CREATE TABLE `wyc_ratings` (
	`_index` int AUTO_INCREMENT PRIMARY KEY,
	`member` int,
	`rating` int,
	`date` date,
	`examiner` int,
	`entered_by` int,
	`entered_at` timestamp DEFAULT (now()),
	`comments` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci
);
--> statement-breakpoint
CREATE TABLE `wyc_wind` (
	`index` int PRIMARY KEY,
	`DateTime` datetime NOT NULL,
	`wind_speed` double NOT NULL,
	`wind_gust` double NOT NULL,
	`wind_direction` varchar(2) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_dues_exemption_requests_wyc` ON `dues_exemption_requests` (`wyc_number`);--> statement-breakpoint
CREATE INDEX `idx_dues_exemption_requests_status` ON `dues_exemption_requests` (`status`);--> statement-breakpoint
CREATE INDEX `lesson_id_idx` ON `lesson_sessions` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_payments_wyc` ON `membership_payments` (`wyc_number`);--> statement-breakpoint
CREATE INDEX `idx_otp_lookup` ON `otp_codes` (`wyc_number`,`channel`,`purpose`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_qr_login_expires` ON `qr_login_requests` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_qr_login_rate_limit` ON `qr_login_requests` (`created_ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_renewal_questionnaire_wyc` ON `renewal_questionnaire` (`wyc_number`);--> statement-breakpoint
CREATE INDEX `idx_renewal_questionnaire_status` ON `renewal_questionnaire` (`status`);--> statement-breakpoint
CREATE INDEX `class` ON `signups` (`class`);--> statement-breakpoint
ALTER TABLE `crew` ADD CONSTRAINT `fk_crew_checkout` FOREIGN KEY (`checkout_ID`) REFERENCES `checkouts`(`_index`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `guests` ADD CONSTRAINT `fk_guests_checkout` FOREIGN KEY (`checkout_ID`) REFERENCES `checkouts`(`_index`) ON DELETE CASCADE;