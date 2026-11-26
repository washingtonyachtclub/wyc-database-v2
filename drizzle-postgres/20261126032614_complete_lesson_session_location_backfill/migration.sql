UPDATE "lesson_sessions" AS session
SET "location" = CASE WHEN session."location" IS NULL THEN lesson."location" ELSE session."location" END,
    "location_url" = CASE WHEN session."location_url" IS NULL THEN lesson."location_url" ELSE session."location_url" END
FROM "lessons" AS lesson
WHERE session."lesson_id" = lesson."_index"
  AND (
    (session."location" IS NULL AND lesson."location" IS NOT NULL)
    OR (session."location_url" IS NULL AND lesson."location_url" IS NOT NULL)
  );
