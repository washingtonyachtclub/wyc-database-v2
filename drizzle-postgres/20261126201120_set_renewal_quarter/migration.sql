ALTER TABLE "lesson_quarter" ADD COLUMN "renewal_quarter" integer;--> statement-breakpoint
UPDATE "lesson_quarter" SET "renewal_quarter" = 112;--> statement-breakpoint
ALTER TABLE "lesson_quarter" ALTER COLUMN "renewal_quarter" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_quarter" ADD CONSTRAINT "lesson_quarter_renewal_quarter_quarters__index_fkey" FOREIGN KEY ("renewal_quarter") REFERENCES "quarters"("_index");