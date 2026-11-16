UPDATE `WYCDatabase`
SET `password` = NULL, `password_argon2` = NULL
WHERE (`WYCNumber` = 3 AND `First` = 'KBCalendar' AND `Last` = 'Admin')
   OR (`WYCNumber` = 4 AND `First` = 'WYC' AND `Last` = 'SnC Admin');
