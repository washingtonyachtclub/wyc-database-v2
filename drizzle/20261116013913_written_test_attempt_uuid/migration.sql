ALTER TABLE `written_test_attempts`
  DROP INDEX `written_test_attempt_member_unique`,
  DROP PRIMARY KEY,
  DROP COLUMN `id`,
  ADD PRIMARY KEY (`attempt_id`);
