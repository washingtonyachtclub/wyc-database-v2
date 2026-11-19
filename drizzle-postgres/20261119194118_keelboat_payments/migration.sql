CREATE TYPE "calendar_engine_type" AS ENUM('outboard', 'inboard', 'both');--> statement-breakpoint
CREATE TYPE "calendar_pricing_tier" AS ENUM('student', 'nonstudent');--> statement-breakpoint
CREATE TYPE "calendar_rental_engine" AS ENUM('outboard', 'inboard');--> statement-breakpoint
CREATE TYPE "keelboat_payment_status" AS ENUM('processing', 'paid', 'completed', 'failed', 'reconciliation_required');--> statement-breakpoint
CREATE TABLE "keelboat_payments" (
	"id" varchar(36) PRIMARY KEY,
	"member_id" integer NOT NULL,
	"active_member_id" integer CONSTRAINT "uq_keelboat_active_payment" UNIQUE,
	"reservation_id" integer,
	"reservation_input" json NOT NULL,
	"price_snapshot" json NOT NULL,
	"status" "keelboat_payment_status" NOT NULL,
	"square_order_id" varchar(255),
	"square_payment_id" varchar(255) CONSTRAINT "uq_keelboat_payment_id" UNIQUE,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendarboats" ADD COLUMN "engineType" "calendar_engine_type";--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "paymentCheckoutId" varchar(36);--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "squareOrderId" varchar(255);--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "squarePaymentId" varchar(255);--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "paidAmountCents" integer;--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "paidCurrency" varchar(3);--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "pricingTier" "calendar_pricing_tier";--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "rentalEngine" "calendar_rental_engine";--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "calendartable" ADD COLUMN "deletedByWYCNumber" integer;--> statement-breakpoint
ALTER TABLE "calendartable" ADD CONSTRAINT "uq_calendar_payment_checkout" UNIQUE("paymentCheckoutId");--> statement-breakpoint
ALTER TABLE "calendartable" ADD CONSTRAINT "uq_calendar_square_payment" UNIQUE("squarePaymentId");--> statement-breakpoint
CREATE INDEX "idx_keelboat_payments_member" ON "keelboat_payments" ("member_id");