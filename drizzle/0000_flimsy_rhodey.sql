-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `WYCDatabase` (
	`Last` char(50),
	`First` char(50),
	`StreetAddress` char(100),
	`City` char(50),
	`State` char(20),
	`ZipCode` char(10),
	`Phone1` char(50),
	`Phone2` char(50),
	`Email` char(50),
	`Category` int,
	`WYCNumber` int NOT NULL DEFAULT 0,
	`ExpireQtr` int NOT NULL DEFAULT 0,
	`StudentID` int,
	`password` char(50) DEFAULT '*5FB1D6D12867BDF49EB3302D5096F1B9030E6264',
	`out_to_sea` tinyint(1) DEFAULT 0,
	`JoinDate` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`image_name` char(50),
	CONSTRAINT `WYCDatabase_WYCNumber` PRIMARY KEY(`WYCNumber`),
	CONSTRAINT `IDX_WYCNumber` UNIQUE(`WYCNumber`)
);
--> statement-breakpoint
CREATE TABLE `boat_types` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`type` varchar(80),
	`description` varchar(500) NOT NULL,
	`usefulLink` varchar(100) NOT NULL,
	`fleet` varchar(80) NOT NULL,
	`numberInFleet` int NOT NULL,
	CONSTRAINT `boat_types__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `calendaradmin` (
	`wycnum` int NOT NULL,
	`description` varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendarboats` (
	`cBoatId` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`Description` varchar(500) NOT NULL,
	CONSTRAINT `calendarboats_cBoatId` PRIMARY KEY(`cBoatId`)
);
--> statement-breakpoint
CREATE TABLE `calendarcomment` (
	`id` int NOT NULL,
	`userwyc` int NOT NULL,
	`date` datetime NOT NULL,
	`comment` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendarconfig` (
	`wacip` varchar(15) NOT NULL,
	`ipdescription` varchar(255) NOT NULL,
	CONSTRAINT `calendarconfig_wacip` PRIMARY KEY(`wacip`)
);
--> statement-breakpoint
CREATE TABLE `calendartable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cBoatId` int NOT NULL,
	`memberWYCNumber` int NOT NULL,
	`reserveFrom` datetime NOT NULL,
	`reserveTo` datetime NOT NULL,
	`destination` varchar(255) NOT NULL,
	`numberOfCrew` int NOT NULL,
	`comments` varchar(255),
	`phone` varchar(45) NOT NULL,
	`numFullWD` int NOT NULL,
	`numHalfWD` int NOT NULL,
	`numFullWE` int NOT NULL,
	`numHalfWE` int NOT NULL,
	CONSTRAINT `calendartable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkouts` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`WYCNumber` int NOT NULL,
	`TimeDeparture` datetime NOT NULL,
	`Crew` text NOT NULL,
	`Boat` varchar(50) NOT NULL,
	`Destination` varchar(100) NOT NULL,
	`TimeReturn` datetime,
	`ExpectedReturn` datetime NOT NULL,
	`RelevantRating` int,
	`ChiefID` int,
	CONSTRAINT `checkouts__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `class_type` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` varchar(80),
	CONSTRAINT `class_type__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `crew` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`checkout_ID` int NOT NULL,
	`crew_ID` int NOT NULL,
	CONSTRAINT `crew__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`checkout_ID` int NOT NULL,
	`name` varchar(20),
	`status` int NOT NULL,
	`email` varchar(20),
	`phone` varchar(15),
	CONSTRAINT `guests__index` PRIMARY KEY(`_index`)
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
	`_index` int unsigned AUTO_INCREMENT NOT NULL,
	`quarter` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `lesson_quarter__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`type` int,
	`subtype` varchar(80),
	`day` varchar(80),
	`time` varchar(80),
	`dates` text,
	`CalendarDate` date NOT NULL,
	`instructor1` int,
	`instructor2` int,
	`comments` blob,
	`Description` text NOT NULL,
	`size` int,
	`expire` int,
	`display` tinyint(1) NOT NULL DEFAULT 0,
	CONSTRAINT `lessons__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `memcat` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` varchar(50),
	CONSTRAINT `memcat__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `noyes` (
	`_index` tinyint(1) NOT NULL DEFAULT 0,
	`text` char(10),
	CONSTRAINT `noyes__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `officers` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`member` int,
	`position` int,
	`active` tinyint(1) NOT NULL DEFAULT 1,
	CONSTRAINT `officers__index` PRIMARY KEY(`_index`),
	CONSTRAINT `_index` UNIQUE(`_index`)
);
--> statement-breakpoint
CREATE TABLE `options` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80),
	`value` varchar(250),
	CONSTRAINT `options__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `pos_priv_map` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`position` int,
	`priv` int,
	CONSTRAINT `pos_priv_map__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `pos_type` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` char(50),
	CONSTRAINT `pos_type__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`sortorder` int,
	`is_dues_exempt` tinyint(1) DEFAULT 0,
	`type` int,
	`bookmark` varchar(50),
	`job_desc` varchar(50),
	CONSTRAINT `positions__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `priority_types` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`priority` varchar(25) NOT NULL DEFAULT '',
	CONSTRAINT `priority_types__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `privs` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`name` char(10),
	CONSTRAINT `privs__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `quarters` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` char(50),
	`school` char(50),
	`endDate` date,
	CONSTRAINT `quarters__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` char(50),
	`type` varchar(10) NOT NULL,
	`degree` int NOT NULL,
	CONSTRAINT `ratings__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `recip` (
	`club_name` varchar(50),
	`website` varchar(50),
	`recip_url` varchar(75),
	`location` varchar(2000),
	`lat_long` varchar(100),
	`length_stay` varchar(2000),
	`procedures` varchar(2000),
	`amenities` varchar(2000),
	`image` varchar(100),
	`image_next` varchar(100),
	`club_id` varchar(2)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`session` varchar(80),
	`userid` int,
	`time` varchar(80),
	CONSTRAINT `sessions__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `signups` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`class` int NOT NULL DEFAULT 0,
	`student` int NOT NULL DEFAULT 0,
	CONSTRAINT `signups__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `snc` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`quarter` int,
	`member` int,
	`member_dinner` int,
	`member_lunch1` int,
	`member_lunch2` int,
	`guest1_name` char(100),
	`guest1_dinner` int,
	`guest1_lunch1` int,
	`guest1_lunch2` int,
	`guest2_name` char(100),
	`guest2_dinner` int,
	`guest2_lunch1` int,
	`guest2_lunch2` int,
	`boat1pref` char(100),
	`boat2pref` char(100),
	`rating_sh` int,
	`rating_dh` int,
	`rating_kb` int,
	`is_lock_veteran` tinyint(1),
	`friends` char(100),
	`duties` int,
	`guest1_child` tinyint(1),
	`guest2_child` tinyint(1),
	`transpt` tinyint(1) DEFAULT 0,
	`payment_confirm` int NOT NULL,
	CONSTRAINT `snc__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `snc_food` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` char(50),
	`is_allowed` tinyint(1),
	`is_dinner` tinyint(1),
	`cost` int NOT NULL DEFAULT 0,
	CONSTRAINT `snc_food__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `snc_work` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`text` char(50),
	`is_allowed` tinyint(1),
	CONSTRAINT `snc_work__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `wyc_ratings` (
	`_index` int AUTO_INCREMENT NOT NULL,
	`member` int,
	`rating` int,
	`date` date,
	`examiner` int,
	`comments` varchar(255),
	CONSTRAINT `wyc_ratings__index` PRIMARY KEY(`_index`)
);
--> statement-breakpoint
CREATE TABLE `wyc_wind` (
	`index` int NOT NULL,
	`DateTime` datetime NOT NULL,
	`wind_speed` double NOT NULL,
	`wind_gust` double NOT NULL,
	`wind_direction` varchar(2) NOT NULL,
	CONSTRAINT `wyc_wind_index` PRIMARY KEY(`index`)
);
--> statement-breakpoint
CREATE INDEX `class` ON `signups` (`class`);
*/