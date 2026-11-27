CREATE TABLE "boat_types" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" TEXT CHECK (length("type") <= 80),
  "description" TEXT NOT NULL CHECK (length("description") <= 500),
  "usefulLink" TEXT NOT NULL CHECK (length("usefulLink") <= 100),
  "fleet" TEXT NOT NULL CHECK (length("fleet") <= 80),
  "numberInFleet" INTEGER NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "calendarboats" (
  "cBoatId" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "engineType" TEXT CHECK ("engineType" IN ('outboard', 'inboard', 'both')),
  "name" TEXT NOT NULL CHECK (length("name") <= 50),
  "Description" TEXT NOT NULL CHECK (length("Description") <= 500)
);

CREATE TABLE "calendarcomment" (
  "id" INTEGER NOT NULL,
  "userwyc" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "comment" TEXT NOT NULL
);

CREATE TABLE "calendartable" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "cBoatId" INTEGER NOT NULL,
  "paymentCheckoutId" TEXT CHECK (length("paymentCheckoutId") <= 36),
  "squareOrderId" TEXT CHECK (length("squareOrderId") <= 255),
  "squarePaymentId" TEXT CHECK (length("squarePaymentId") <= 255),
  "paidAmountCents" INTEGER,
  "paidCurrency" TEXT CHECK (length("paidCurrency") <= 3),
  "pricingTier" TEXT CHECK ("pricingTier" IN ('student', 'nonstudent')),
  "rentalEngine" TEXT CHECK ("rentalEngine" IN ('outboard', 'inboard')),
  "deletedAt" TEXT,
  "deletedByWYCNumber" INTEGER,
  "memberWYCNumber" INTEGER,
  "reservationType" TEXT NOT NULL DEFAULT 'personal' CHECK ("reservationType" IN ('personal', 'admin')),
  "createdByWYCNumber" INTEGER,
  "title" TEXT CHECK (length("title") <= 120),
  "reserveFrom" TEXT NOT NULL,
  "reserveTo" TEXT NOT NULL,
  "destination" TEXT NOT NULL CHECK (length("destination") <= 255),
  "numberOfCrew" INTEGER NOT NULL,
  "comments" TEXT CHECK (length("comments") <= 255),
  "phone" TEXT NOT NULL CHECK (length("phone") <= 45),
  "numFullWD" INTEGER NOT NULL,
  "numHalfWD" INTEGER NOT NULL,
  "numFullWE" INTEGER NOT NULL,
  "numHalfWE" INTEGER NOT NULL,
  CONSTRAINT "uq_calendar_payment_checkout" UNIQUE ("paymentCheckoutId"),
  CONSTRAINT "uq_calendar_square_payment" UNIQUE ("squarePaymentId")
);

CREATE TABLE "checkouts" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "WYCNumber" INTEGER NOT NULL,
  "TimeDeparture" TEXT NOT NULL,
  "Crew" TEXT,
  "Boat" TEXT NOT NULL CHECK (length("Boat") <= 50),
  "Destination" TEXT NOT NULL CHECK (length("Destination") <= 100),
  "TimeReturn" TEXT,
  "ExpectedReturn" TEXT,
  "RelevantRating" INTEGER,
  "ChiefID" INTEGER
);

CREATE TABLE "class_type" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "text" TEXT CHECK (length("text") <= 80)
);

CREATE TABLE "crew" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "checkout_ID" INTEGER NOT NULL,
  "crew_ID" INTEGER NOT NULL,
  CONSTRAINT "fk_crew_checkout" FOREIGN KEY ("checkout_ID") REFERENCES "checkouts" ("_index") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "uq_crew_checkout_member" UNIQUE ("crew_ID", "checkout_ID")
);

CREATE TABLE "door_codes" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "slug" TEXT NOT NULL CHECK (length("slug") <= 32),
  "name" TEXT NOT NULL CHECK (length("name") <= 64),
  "code" TEXT NOT NULL DEFAULT '' CHECK (length("code") <= 32),
  "updated_at" TEXT,
  "updated_by" INTEGER,
  CONSTRAINT "uq_door_codes_slug" UNIQUE ("slug")
);

CREATE TABLE "dues_exemption_requests" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "wyc_number" INTEGER NOT NULL,
  "renewal_id" TEXT CHECK (length("renewal_id") <= 36),
  "requested_expire_qtr" INTEGER NOT NULL,
  "status" TEXT NOT NULL CHECK (length("status") <= 20),
  "payment_id" INTEGER,
  "decided_by" INTEGER,
  "decided_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_dues_exemption_requests_renewal" FOREIGN KEY ("renewal_id") REFERENCES "membership_renewals" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "uq_dues_exemption_requests_renewal" UNIQUE ("renewal_id")
);

CREATE TABLE "guest_waivers" (
  "id" TEXT PRIMARY KEY NOT NULL CHECK (length("id") <= 36),
  "waiver_version" TEXT NOT NULL CHECK (length("waiver_version") <= 50),
  "first_name" TEXT NOT NULL CHECK (length("first_name") <= 60),
  "last_name" TEXT NOT NULL CHECK (length("last_name") <= 60),
  "email" TEXT NOT NULL CHECK (length("email") <= 254),
  "submitted_values" TEXT NOT NULL CHECK ("submitted_values" IS NULL OR json_valid("submitted_values")),
  "signed_at" TEXT NOT NULL,
  "object_key" TEXT NOT NULL CHECK (length("object_key") <= 512),
  "pdf_sha256" TEXT NOT NULL CHECK (length("pdf_sha256") <= 64),
  "pdf_size" INTEGER NOT NULL,
  "pdf_content_type" TEXT NOT NULL CHECK (length("pdf_content_type") <= 100),
  CONSTRAINT "uq_guest_waivers_object_key" UNIQUE ("object_key")
);

CREATE TABLE "guests" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "checkout_ID" INTEGER NOT NULL,
  "name" TEXT CHECK (length("name") <= 100),
  "status" INTEGER NOT NULL,
  "email" TEXT CHECK (length("email") <= 255),
  "phone" TEXT CHECK (length("phone") <= 15),
  CONSTRAINT "fk_guests_checkout" FOREIGN KEY ("checkout_ID") REFERENCES "checkouts" ("_index") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "keelboat_payments" (
  "id" TEXT PRIMARY KEY NOT NULL CHECK (length("id") <= 36),
  "member_id" INTEGER NOT NULL,
  "active_member_id" INTEGER,
  "reservation_id" INTEGER,
  "reservation_input" TEXT NOT NULL CHECK ("reservation_input" IS NULL OR json_valid("reservation_input")),
  "price_snapshot" TEXT NOT NULL CHECK ("price_snapshot" IS NULL OR json_valid("price_snapshot")),
  "status" TEXT NOT NULL CHECK ("status" IN ('processing', 'paid', 'completed', 'failed', 'reconciliation_required')),
  "square_order_id" TEXT CHECK (length("square_order_id") <= 255),
  "square_payment_id" TEXT CHECK (length("square_payment_id") <= 255),
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL CHECK (length("currency") <= 3),
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_keelboat_active_payment" UNIQUE ("active_member_id"),
  CONSTRAINT "uq_keelboat_payment_id" UNIQUE ("square_payment_id")
);

CREATE TABLE "lesson_announcements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "lesson_id" INTEGER NOT NULL,
  "author_wyc_number" INTEGER,
  "subject" TEXT NOT NULL,
  "body_markdown" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "lesson_quarter" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "quarter" INTEGER NOT NULL DEFAULT 0,
  "renewal_quarter" INTEGER NOT NULL,
  CONSTRAINT "lesson_quarter_renewal_quarter_quarters__index_fkey" FOREIGN KEY ("renewal_quarter") REFERENCES "quarters" ("_index") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE "lesson_sessions" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "lesson_id" INTEGER NOT NULL,
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT NOT NULL,
  "all_day" INTEGER NOT NULL DEFAULT 0,
  "location" TEXT CHECK (length("location") <= 80),
  "location_url" TEXT CHECK (length("location_url") <= 255)
);

CREATE TABLE "lessons" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" INTEGER,
  "subtype" TEXT CHECK (length("subtype") <= 80),
  "day" TEXT CHECK (length("day") <= 80),
  "time" TEXT CHECK (length("time") <= 80),
  "dates" TEXT,
  "CalendarDate" TEXT,
  "instructor1" INTEGER,
  "instructor2" INTEGER,
  "comments" TEXT,
  "requirements" TEXT,
  "Description" TEXT NOT NULL,
  "size" INTEGER,
  "expire" INTEGER,
  "display" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "member_email_preferences" (
  "wyc_number" INTEGER PRIMARY KEY NOT NULL,
  "sailing_opportunities" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "member_emergency_contacts" (
  "wyc_number" INTEGER PRIMARY KEY NOT NULL,
  "first_name" TEXT NOT NULL CHECK (length("first_name") <= 60),
  "last_name" TEXT NOT NULL CHECK (length("last_name") <= 60),
  "phone" TEXT NOT NULL CHECK (length("phone") <= 50),
  "relationship" TEXT NOT NULL CHECK (length("relationship") <= 100),
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "member_photo" (
  "wyc_number" INTEGER PRIMARY KEY NOT NULL,
  "version" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', (random() & 3) + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  "source_key" TEXT NOT NULL,
  "avatar_key" TEXT,
  "crop" TEXT CHECK ("crop" IS NULL OR json_valid("crop")),
  CONSTRAINT "member_photo_wyc_number_WYCDatabase_WYCNumber_fkey" FOREIGN KEY ("wyc_number") REFERENCES "WYCDatabase" ("WYCNumber") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE "member_waivers" (
  "id" TEXT PRIMARY KEY NOT NULL CHECK (length("id") <= 36),
  "renewal_id" TEXT CHECK (length("renewal_id") <= 36),
  "application_id" TEXT CHECK (length("application_id") <= 36),
  "waiver_version" TEXT NOT NULL CHECK (length("waiver_version") <= 50),
  "first_name" TEXT NOT NULL CHECK (length("first_name") <= 60),
  "last_name" TEXT NOT NULL CHECK (length("last_name") <= 60),
  "email" TEXT NOT NULL CHECK (length("email") <= 254),
  "submitted_values" TEXT NOT NULL CHECK ("submitted_values" IS NULL OR json_valid("submitted_values")),
  "signed_at" TEXT NOT NULL,
  "object_key" TEXT NOT NULL CHECK (length("object_key") <= 512),
  "pdf_sha256" TEXT NOT NULL CHECK (length("pdf_sha256") <= 64),
  "pdf_size" INTEGER NOT NULL,
  "pdf_content_type" TEXT NOT NULL CHECK (length("pdf_content_type") <= 100),
  CONSTRAINT "fk_member_waivers_renewal" FOREIGN KEY ("renewal_id") REFERENCES "membership_renewals" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fk_member_waivers_application" FOREIGN KEY ("application_id") REFERENCES "membership_applications" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "uq_member_waivers_renewal" UNIQUE ("renewal_id"),
  CONSTRAINT "uq_member_waivers_application" UNIQUE ("application_id"),
  CONSTRAINT "uq_member_waivers_object_key" UNIQUE ("object_key"),
  CONSTRAINT "chk_member_waivers_workflow" CHECK (("renewal_id" is not null) <> ("application_id" is not null))
);

CREATE TABLE "membership_applications" (
  "id" TEXT PRIMARY KEY NOT NULL CHECK (length("id") <= 36),
  "first_name" TEXT NOT NULL CHECK (length("first_name") <= 60),
  "last_name" TEXT NOT NULL CHECK (length("last_name") <= 60),
  "submitted_primary_email" TEXT NOT NULL CHECK (length("submitted_primary_email") <= 254),
  "primary_email" TEXT NOT NULL CHECK (length("primary_email") <= 254),
  "submitted_uw_email" TEXT CHECK (length("submitted_uw_email") <= 254),
  "uw_email" TEXT CHECK (length("uw_email") <= 254),
  "email_edited_by" INTEGER,
  "email_edited_at" TEXT,
  "uw_status" TEXT NOT NULL CHECK (length("uw_status") <= 20),
  "plus_one_response" TEXT NOT NULL CHECK (length("plus_one_response") <= 30),
  "tier" TEXT NOT NULL CHECK (length("tier") <= 20),
  "duration" TEXT NOT NULL CHECK (length("duration") <= 20),
  "target_expire_qtr" INTEGER NOT NULL,
  "payment_status" TEXT NOT NULL DEFAULT 'pending' CHECK (length("payment_status") <= 30),
  "square_order_id" TEXT CHECK (length("square_order_id") <= 255),
  "payment_idempotency_key" TEXT CHECK (length("payment_idempotency_key") <= 45),
  "payment_completed_at" TEXT,
  "address_line_1" TEXT CHECK (length("address_line_1") <= 100),
  "address_line_2" TEXT CHECK (length("address_line_2") <= 100),
  "city" TEXT CHECK (length("city") <= 50),
  "state" TEXT CHECK (length("state") <= 20),
  "zip_code" TEXT CHECK (length("zip_code") <= 10),
  "phone" TEXT CHECK (length("phone") <= 50),
  "discord_username" TEXT CHECK (length("discord_username") <= 32),
  "emergency_first_name" TEXT CHECK (length("emergency_first_name") <= 60),
  "emergency_last_name" TEXT CHECK (length("emergency_last_name") <= 60),
  "emergency_phone" TEXT CHECK (length("emergency_phone") <= 50),
  "emergency_relationship" TEXT CHECK (length("emergency_relationship") <= 100),
  "questionnaire_version" TEXT NOT NULL CHECK (length("questionnaire_version") <= 50),
  "questionnaire_responses" TEXT CHECK ("questionnaire_responses" IS NULL OR json_valid("questionnaire_responses")),
  "requirements_completed_at" TEXT,
  "review_status" TEXT NOT NULL DEFAULT 'not_ready' CHECK (length("review_status") <= 30),
  "resolved_wyc_number" INTEGER,
  "reviewed_by" INTEGER,
  "reviewed_at" TEXT,
  "review_note" TEXT,
  "closed_at" TEXT,
  "recovery_email_sent_at" TEXT,
  "completion_reminder_sent_at" TEXT,
  "welcome_email_sent_at" TEXT,
  "created_ip_hash" TEXT NOT NULL CHECK (length("created_ip_hash") <= 64),
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "membership_discount_code_redemptions" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "discount_code_id" INTEGER NOT NULL,
  "payment_id" INTEGER NOT NULL,
  "code" TEXT NOT NULL CHECK (length("code") <= 50),
  "revision" INTEGER NOT NULL,
  "percentage_off" INTEGER,
  "amount_off_cents" INTEGER,
  "subtotal_cents" INTEGER NOT NULL,
  "discount_cents" INTEGER NOT NULL,
  "final_cents" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_membership_discount_code_redemptions_discount_code" FOREIGN KEY ("discount_code_id") REFERENCES "membership_discount_codes" ("_index") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fk_membership_discount_code_redemptions_payment" FOREIGN KEY ("payment_id") REFERENCES "membership_payments" ("_index") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "uq_membership_discount_code_redemptions_payment" UNIQUE ("payment_id")
);

CREATE TABLE "membership_discount_codes" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT NOT NULL CHECK (length("name") <= 100),
  "code" TEXT NOT NULL CHECK (length("code") <= 50),
  "audience" TEXT NOT NULL CHECK (length("audience") <= 20),
  "percentage_off" INTEGER,
  "amount_off_cents" INTEGER,
  "starts_on" TEXT NOT NULL,
  "ends_on" TEXT NOT NULL,
  "max_redemptions" INTEGER,
  "active" INTEGER NOT NULL DEFAULT 1,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" INTEGER NOT NULL,
  "updated_by" INTEGER,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT,
  CONSTRAINT "uq_membership_discount_codes_code" UNIQUE ("code"),
  CONSTRAINT "chk_membership_discount_codes_discount" CHECK (("percentage_off" is not null) <> ("amount_off_cents" is not null))
);

CREATE TABLE "membership_payments" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "wyc_number" INTEGER,
  "renewal_id" TEXT CHECK (length("renewal_id") <= 36),
  "application_id" TEXT CHECK (length("application_id") <= 36),
  "square_payment_id" TEXT CHECK (length("square_payment_id") <= 255),
  "square_order_id" TEXT CHECK (length("square_order_id") <= 255),
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD' CHECK (length("currency") <= 3),
  "tier" TEXT NOT NULL CHECK (length("tier") <= 20),
  "duration" TEXT NOT NULL CHECK (length("duration") <= 20),
  "prev_expire_qtr" INTEGER NOT NULL,
  "new_expire_qtr" INTEGER NOT NULL,
  "status" TEXT NOT NULL CHECK (length("status") <= 20),
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_membership_payments_renewal" FOREIGN KEY ("renewal_id") REFERENCES "membership_renewals" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fk_membership_payments_application" FOREIGN KEY ("application_id") REFERENCES "membership_applications" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "uq_membership_payments_renewal" UNIQUE ("renewal_id"),
  CONSTRAINT "uq_membership_payments_application" UNIQUE ("application_id"),
  CONSTRAINT "uq_membership_payments_square_payment" UNIQUE ("square_payment_id")
);

CREATE TABLE "membership_renewals" (
  "id" TEXT PRIMARY KEY NOT NULL CHECK (length("id") <= 36),
  "wyc_number" INTEGER NOT NULL,
  "source" TEXT NOT NULL CHECK (length("source") <= 20),
  "tier" TEXT NOT NULL CHECK (length("tier") <= 20),
  "duration" TEXT NOT NULL CHECK (length("duration") <= 20),
  "previous_expire_qtr" INTEGER NOT NULL,
  "target_expire_qtr" INTEGER NOT NULL,
  "completed_at" TEXT,
  "closed_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "memcat" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "text" TEXT CHECK (length("text") <= 50)
);

CREATE TABLE "officers" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "member" INTEGER,
  "position" INTEGER,
  "active" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "member" UNIQUE ("position", "member")
);

CREATE TABLE "otp_codes" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "wyc_number" INTEGER NOT NULL,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('email', 'sms')),
  "purpose" TEXT NOT NULL CHECK (length("purpose") <= 32),
  "destination" TEXT NOT NULL CHECK (length("destination") <= 255),
  "code_hash" TEXT NOT NULL CHECK (length("code_hash") <= 255),
  "expires_at" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "consumed_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "pos_priv_map" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "position" INTEGER,
  "priv" INTEGER
);

CREATE TABLE "pos_type" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "text" TEXT CHECK (length("text") <= 50)
);

CREATE TABLE "positions" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '' CHECK (length("name") <= 50),
  "sortorder" INTEGER,
  "type" INTEGER,
  "bookmark" TEXT CHECK (length("bookmark") <= 50),
  "job_desc" TEXT CHECK (length("job_desc") <= 50),
  "active" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "privs" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT CHECK (length("name") <= 10)
);

CREATE TABLE "qr_login_requests" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "approval_secret_hash" TEXT NOT NULL CHECK (length("approval_secret_hash") <= 64),
  "polling_secret_hash" TEXT NOT NULL CHECK (length("polling_secret_hash") <= 64),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'consumed', 'expired', 'canceled')),
  "approved_by" INTEGER,
  "created_ip_hash" TEXT NOT NULL CHECK (length("created_ip_hash") <= 64),
  "expires_at" TEXT NOT NULL,
  "approved_at" TEXT,
  "consumed_at" TEXT,
  "canceled_at" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "uq_qr_login_approval_secret" UNIQUE ("approval_secret_hash"),
  CONSTRAINT "uq_qr_login_polling_secret" UNIQUE ("polling_secret_hash")
);

CREATE TABLE "quarters" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "text" TEXT CHECK (length("text") <= 50),
  "school" TEXT CHECK (length("school") <= 50),
  "endDate" TEXT
);

CREATE TABLE "ratings" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "text" TEXT CHECK (length("text") <= 50),
  "type" TEXT NOT NULL CHECK (length("type") <= 10),
  "degree" INTEGER NOT NULL,
  "expires" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "renewal_questionnaire" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "wyc_number" INTEGER NOT NULL,
  "renewal_id" TEXT CHECK (length("renewal_id") <= 36),
  "quarter" INTEGER NOT NULL,
  "uw_status" TEXT NOT NULL CHECK (length("uw_status") <= 20),
  "plus_one_response" TEXT NOT NULL CHECK (length("plus_one_response") <= 30),
  "status" TEXT NOT NULL CHECK (length("status") <= 20),
  "source" TEXT NOT NULL CHECK (length("source") <= 20),
  "request_id" INTEGER,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_renewal_questionnaire_renewal" FOREIGN KEY ("renewal_id") REFERENCES "membership_renewals" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "uq_renewal_questionnaire_renewal" UNIQUE ("renewal_id")
);

CREATE TABLE "signups" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "class" INTEGER NOT NULL DEFAULT 0,
  "student" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "uq_class_student" UNIQUE ("class", "student")
);

CREATE TABLE "written_test_attempts" (
  "attempt_id" TEXT PRIMARY KEY NOT NULL CHECK (length("attempt_id") <= 36),
  "member_wyc_number" INTEGER NOT NULL,
  "examiner_wyc_number" INTEGER,
  "test_id" TEXT NOT NULL CHECK (length("test_id") <= 64),
  "mode" TEXT NOT NULL CHECK ("mode" IN ('practice', 'final')),
  "submitted_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correct_count" INTEGER NOT NULL,
  "question_count" INTEGER NOT NULL,
  "earned_points" NUMERIC NOT NULL,
  "possible_points" NUMERIC NOT NULL,
  "passed" INTEGER NOT NULL,
  "snapshot" TEXT NOT NULL CHECK ("snapshot" IS NULL OR json_valid("snapshot"))
);

CREATE TABLE "WYCDatabase" (
  "Last" TEXT CHECK (length("Last") <= 50),
  "First" TEXT CHECK (length("First") <= 50),
  "StreetAddress" TEXT CHECK (length("StreetAddress") <= 100),
  "City" TEXT CHECK (length("City") <= 50),
  "State" TEXT CHECK (length("State") <= 20),
  "ZipCode" TEXT CHECK (length("ZipCode") <= 10),
  "Phone1" TEXT CHECK (length("Phone1") <= 50),
  "Phone2" TEXT CHECK (length("Phone2") <= 50),
  "Email" TEXT CHECK (length("Email") <= 254),
  "uw_email" TEXT CHECK (length("uw_email") <= 254),
  "discord_username" TEXT CHECK (length("discord_username") <= 32),
  "Category" INTEGER,
  "WYCNumber" INTEGER PRIMARY KEY NOT NULL DEFAULT 0,
  "ExpireQtr" INTEGER NOT NULL DEFAULT 0,
  "StudentID" INTEGER,
  "password_argon2" TEXT CHECK (length("password_argon2") <= 255),
  "out_to_sea" INTEGER DEFAULT 0,
  "JoinDate" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IDX_WYCNumber" UNIQUE ("WYCNumber")
);

CREATE TABLE "wyc_ratings" (
  "_index" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "member" INTEGER,
  "rating" INTEGER,
  "date" TEXT,
  "examiner" INTEGER,
  "entered_by" INTEGER,
  "entered_at" TEXT DEFAULT CURRENT_TIMESTAMP,
  "comments" TEXT CHECK (length("comments") <= 255)
);

CREATE INDEX "idx_dues_exemption_requests_wyc" ON "dues_exemption_requests" ("wyc_number");

CREATE INDEX "idx_dues_exemption_requests_status" ON "dues_exemption_requests" ("status");

CREATE INDEX "idx_guest_waivers_email" ON "guest_waivers" ("email");

CREATE INDEX "idx_guest_waivers_name" ON "guest_waivers" ("last_name", "first_name");

CREATE INDEX "idx_guest_waivers_signed_at" ON "guest_waivers" ("signed_at");

CREATE INDEX "idx_keelboat_payments_member" ON "keelboat_payments" ("member_id");

CREATE INDEX "idx_lesson_announcements_lesson_created" ON "lesson_announcements" ("lesson_id", "created_at");

CREATE INDEX "lesson_id_idx" ON "lesson_sessions" ("lesson_id");

CREATE INDEX "idx_member_waivers_email" ON "member_waivers" ("email");

CREATE INDEX "idx_member_waivers_name" ON "member_waivers" ("last_name", "first_name");

CREATE INDEX "idx_member_waivers_signed_at" ON "member_waivers" ("signed_at");

CREATE INDEX "idx_membership_applications_email" ON "membership_applications" ("primary_email");

CREATE INDEX "idx_membership_applications_payment" ON "membership_applications" ("payment_status", "payment_completed_at");

CREATE INDEX "idx_membership_applications_review" ON "membership_applications" ("review_status", "created_at");

CREATE INDEX "idx_membership_applications_reminder" ON "membership_applications" ("payment_status", "requirements_completed_at", "completion_reminder_sent_at");

CREATE INDEX "idx_membership_applications_resolved" ON "membership_applications" ("resolved_wyc_number");

CREATE INDEX "idx_membership_applications_rate_limit" ON "membership_applications" ("created_ip_hash", "created_at");

CREATE INDEX "idx_membership_discount_code_redemptions_discount_code" ON "membership_discount_code_redemptions" ("discount_code_id");

CREATE INDEX "idx_membership_discount_codes_active_dates" ON "membership_discount_codes" ("active", "starts_on", "ends_on");

CREATE INDEX "idx_membership_payments_wyc" ON "membership_payments" ("wyc_number");

CREATE INDEX "idx_membership_renewals_wyc" ON "membership_renewals" ("wyc_number");

CREATE INDEX "idx_membership_renewals_open" ON "membership_renewals" ("wyc_number", "completed_at", "closed_at");

CREATE INDEX "idx_otp_lookup" ON "otp_codes" ("wyc_number", "channel", "purpose", "created_at");

CREATE INDEX "idx_otp_expires" ON "otp_codes" ("expires_at");

CREATE INDEX "idx_qr_login_expires" ON "qr_login_requests" ("expires_at");

CREATE INDEX "idx_qr_login_rate_limit" ON "qr_login_requests" ("created_ip_hash", "created_at");

CREATE INDEX "idx_renewal_questionnaire_wyc" ON "renewal_questionnaire" ("wyc_number");

CREATE INDEX "idx_renewal_questionnaire_status" ON "renewal_questionnaire" ("status");

CREATE INDEX "class" ON "signups" ("class");

CREATE INDEX "written_test_attempt_submitted_at" ON "written_test_attempts" ("submitted_at");
