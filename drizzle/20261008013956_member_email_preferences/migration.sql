CREATE TABLE `member_email_preferences` (
	`wyc_number` int PRIMARY KEY,
	`sailing_opportunities` tinyint(1) NOT NULL DEFAULT 1,
	`updated_at` timestamp NOT NULL DEFAULT (now())
);
