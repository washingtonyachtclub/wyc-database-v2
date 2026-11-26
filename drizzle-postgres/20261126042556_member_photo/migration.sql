CREATE TABLE "member_photo" (
	"wyc_number" integer PRIMARY KEY,
	"version" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"avatar_key" text,
	"crop" json
);
--> statement-breakpoint
LOCK TABLE "WYCDatabase" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
INSERT INTO "member_photo" ("wyc_number", "source_key")
SELECT "WYCNumber", "image_name" FROM "WYCDatabase" WHERE btrim("image_name") <> '';
--> statement-breakpoint
UPDATE "member_photo" AS photo
SET "crop" = json_build_object(
  'x', 100.0 * frame.left_px / frame.width_px,
  'y', 100.0 * frame.top_px / frame.height_px,
  'width', 100.0 * frame.side_px / frame.width_px,
  'height', 100.0 * frame.side_px / frame.height_px
)
FROM (VALUES
  ('10776.jpg', 1747, 1920, 330, 920, 1000),
  ('12877.jpg', 448, 597, 168, 185, 280),
  ('10836.jpg', 492, 308, 20, 0, 248),
  ('15902.jpg', 1008, 756, 418, 0, 590),
  ('10671.jpg', 600, 400, 58, 60, 320),
  ('12908.jpg', 1512, 2016, 330, 0, 1170)
) AS frame(source_key, width_px, height_px, left_px, top_px, side_px)
WHERE photo.source_key = frame.source_key;
--> statement-breakpoint
ALTER TABLE "WYCDatabase" DROP COLUMN "image_name";--> statement-breakpoint
ALTER TABLE "member_photo" ADD CONSTRAINT "member_photo_wyc_number_WYCDatabase_WYCNumber_fkey" FOREIGN KEY ("wyc_number") REFERENCES "WYCDatabase"("WYCNumber");