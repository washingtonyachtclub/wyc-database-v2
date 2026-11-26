CREATE TABLE "legacy_lesson_locations" (
	"lesson_id" integer PRIMARY KEY,
	"location" varchar(80),
	"location_url" varchar(255)
);
--> statement-breakpoint
INSERT INTO "legacy_lesson_locations" ("lesson_id", "location", "location_url")
SELECT lesson."_index", lesson."location", lesson."location_url"
FROM "lessons" AS lesson
WHERE (NULLIF(lesson."location", '') IS NOT NULL OR NULLIF(lesson."location_url", '') IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "lesson_sessions" AS session WHERE session."lesson_id" = lesson."_index"
  );
--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "location_url";
