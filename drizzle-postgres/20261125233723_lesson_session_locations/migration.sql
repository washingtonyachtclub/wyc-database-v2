ALTER TABLE "lesson_sessions" ADD COLUMN "location" varchar(80);--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD COLUMN "location_url" varchar(255);--> statement-breakpoint
UPDATE "lesson_sessions" AS session
SET "location" = lesson."location", "location_url" = lesson."location_url"
FROM "lessons" AS lesson
WHERE session."lesson_id" = lesson."_index";
