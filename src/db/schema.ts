import type { TestSnapshot } from '@/domains/written-tests/schema'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

export const reservationType = pgEnum('reservation_type', ['personal', 'admin'])
export const otpChannel = pgEnum('otp_channel', ['email', 'sms'])
export const qrLoginStatus = pgEnum('qr_login_status', [
  'pending',
  'approved',
  'consumed',
  'expired',
  'canceled',
])
export const writtenTestMode = pgEnum('written_test_mode', ['practice', 'final'])

export const calendarEngineType = pgEnum('calendar_engine_type', ['outboard', 'inboard', 'both'])
export const calendarPricingTier = pgEnum('calendar_pricing_tier', ['student', 'nonstudent'])
export const calendarRentalEngine = pgEnum('calendar_rental_engine', ['outboard', 'inboard'])
export const keelboatPaymentStatus = pgEnum('keelboat_payment_status', [
  'processing',
  'paid',
  'completed',
  'failed',
  'reconciliation_required',
])

export const wycDatabase = pgTable(
  'WYCDatabase',
  {
    last: varchar('Last', { length: 50 }),
    first: varchar('First', { length: 50 }),
    streetAddress: varchar('StreetAddress', { length: 100 }),
    city: varchar('City', { length: 50 }),
    state: varchar('State', { length: 20 }),
    zipCode: varchar('ZipCode', { length: 10 }),
    phone1: varchar('Phone1', { length: 50 }),
    phone2: varchar('Phone2', { length: 50 }),
    email: varchar('Email', { length: 254 }),
    uwEmail: varchar('uw_email', { length: 254 }),
    discordUsername: varchar('discord_username', { length: 32 }),
    categoryId: integer('Category'),
    wycNumber: integer('WYCNumber').default(0).notNull(),
    expireQtrIndex: integer('ExpireQtr').default(0).notNull(),
    studentId: integer('StudentID'),
    passwordArgon2: varchar('password_argon2', { length: 255 }),
    outToSea: smallint('out_to_sea').default(0),
    joinDate: timestamp('JoinDate', { mode: 'string' }).defaultNow().notNull(),
    imageName: varchar('image_name', { length: 50 }),
  },
  (table) => [
    primaryKey({ columns: [table.wycNumber] }),
    unique('IDX_WYCNumber').on(table.wycNumber),
  ],
)

export const boatTypes = pgTable(
  'boat_types',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    type: varchar({ length: 80 }),
    description: varchar({ length: 500 }).notNull(),
    usefulLink: varchar({ length: 100 }).notNull(),
    fleet: varchar({ length: 80 }).notNull(),
    numberInFleet: integer().notNull(),
    active: smallint().default(1).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const calendarboats = pgTable(
  'calendarboats',
  {
    cBoatId: integer().generatedByDefaultAsIdentity().notNull(),
    active: smallint('active').default(1).notNull(),
    engineType: calendarEngineType('engineType'),
    name: varchar({ length: 50 }).notNull(),
    description: varchar('Description', { length: 500 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.cBoatId] })],
)

export const calendarcomment = pgTable('calendarcomment', {
  id: integer().notNull(),
  userwyc: integer().notNull(),
  date: timestamp({ mode: 'string' }).notNull(),
  comment: text().notNull(),
})

export const calendartable = pgTable(
  'calendartable',
  {
    id: integer().generatedByDefaultAsIdentity().notNull(),
    cBoatId: integer().notNull(),
    paymentCheckoutId: varchar('paymentCheckoutId', { length: 36 }),
    squareOrderId: varchar('squareOrderId', { length: 255 }),
    squarePaymentId: varchar('squarePaymentId', { length: 255 }),
    paidAmountCents: integer('paidAmountCents'),
    paidCurrency: varchar('paidCurrency', { length: 3 }),
    pricingTier: calendarPricingTier('pricingTier'),
    rentalEngine: calendarRentalEngine('rentalEngine'),
    deletedAt: timestamp('deletedAt', { mode: 'string' }),
    deletedByWycNumber: integer('deletedByWYCNumber'),
    memberWycNumber: integer('memberWYCNumber'),
    reservationType: reservationType('reservationType').default('personal').notNull(),
    createdByWycNumber: integer('createdByWYCNumber'),
    title: varchar({ length: 120 }),
    reserveFrom: timestamp({ mode: 'string' }).notNull(),
    reserveTo: timestamp({ mode: 'string' }).notNull(),
    destination: varchar({ length: 255 }).notNull(),
    numberOfCrew: integer().notNull(),
    comments: varchar({ length: 255 }),
    phone: varchar({ length: 45 }).notNull(),
    numFullWd: integer('numFullWD').notNull(),
    numHalfWd: integer('numHalfWD').notNull(),
    numFullWe: integer('numFullWE').notNull(),
    numHalfWe: integer('numHalfWE').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique('uq_calendar_payment_checkout').on(table.paymentCheckoutId),
    unique('uq_calendar_square_payment').on(table.squarePaymentId),
  ],
)

export const keelboatPayments = pgTable(
  'keelboat_payments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    memberId: integer('member_id').notNull(),
    activeMemberId: integer('active_member_id'),
    reservationId: integer('reservation_id'),
    reservationInput: json('reservation_input').notNull(),
    priceSnapshot: json('price_snapshot').notNull(),
    status: keelboatPaymentStatus('status').notNull(),
    squareOrderId: varchar('square_order_id', { length: 255 }),
    squarePaymentId: varchar('square_payment_id', { length: 255 }),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('uq_keelboat_active_payment').on(table.activeMemberId),
    unique('uq_keelboat_payment_id').on(table.squarePaymentId),
    index('idx_keelboat_payments_member').on(table.memberId),
  ],
)

export const checkouts = pgTable(
  'checkouts',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    wycNumber: integer('WYCNumber').notNull(),
    timeDeparture: timestamp('TimeDeparture', { mode: 'string' }).notNull(),
    crew: text('Crew'),
    boat: varchar('Boat', { length: 50 }).notNull(),
    destination: varchar('Destination', { length: 100 }).notNull(),
    timeReturn: timestamp('TimeReturn', { mode: 'string' }),
    expectedReturn: timestamp('ExpectedReturn', { mode: 'string' }),
    relevantRating: integer('RelevantRating'),
    chiefId: integer('ChiefID'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const classType = pgTable(
  'class_type',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    text: varchar({ length: 80 }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const crew = pgTable(
  'crew',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    checkoutId: integer('checkout_ID').notNull(),
    crewId: integer('crew_ID').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_crew_checkout_member').on(table.crewId, table.checkoutId),
    foreignKey({
      columns: [table.checkoutId],
      foreignColumns: [checkouts.index],
      name: 'fk_crew_checkout',
    }).onDelete('cascade'),
  ],
)

export const guests = pgTable(
  'guests',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    checkoutId: integer('checkout_ID').notNull(),
    name: varchar({ length: 100 }),
    status: integer().notNull(),
    email: varchar({ length: 255 }),
    phone: varchar({ length: 15 }),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    foreignKey({
      columns: [table.checkoutId],
      foreignColumns: [checkouts.index],
      name: 'fk_guests_checkout',
    }).onDelete('cascade'),
  ],
)

export const lessonQuarter = pgTable(
  'lesson_quarter',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    quarter: integer().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const lessons = pgTable(
  'lessons',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    type: integer(),
    subtype: varchar({ length: 80 }),
    // `lesson_sessions` is the source of truth; these are kept only
    // because they are the last record of the dates for the old lessons.
    day: varchar({ length: 80 }),
    time: varchar({ length: 80 }),
    dates: text(),
    calendarDate: date('CalendarDate', { mode: 'string' }),
    instructor1: integer(),
    instructor2: integer(),
    // The legacy schema stores the lesson description in the comments column.
    description: text('comments'),
    requirements: text(),
    legacyDescription: text('Description')
      .notNull()
      .$default(() => ''),
    size: integer(),
    expire: integer(),
    display: smallint().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const lessonAnnouncements = pgTable(
  'lesson_announcements',
  {
    id: integer().generatedByDefaultAsIdentity().notNull(),
    lessonId: integer('lesson_id').notNull(),
    authorWycNumber: integer('author_wyc_number'),
    subject: text().notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_lesson_announcements_lesson_created').on(table.lessonId, table.createdAt),
  ],
)

export const lessonSessions = pgTable(
  'lesson_sessions',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    lessonId: integer('lesson_id').notNull(),
    startsAt: timestamp('starts_at', { mode: 'string' }).notNull(),
    // Inclusive: a Fri–Mon trip ends Mon.
    endsAt: timestamp('ends_at', { mode: 'string' }).notNull(),
    // When set, the time components are filler
    allDay: smallint('all_day').default(0).notNull(),
    location: varchar({ length: 80 }),
    locationUrl: varchar('location_url', { length: 255 }),
  },
  (table) => [index('lesson_id_idx').on(table.lessonId), primaryKey({ columns: [table.index] })],
)

export const memcat = pgTable(
  'memcat',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    text: varchar({ length: 50 }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const officers = pgTable(
  'officers',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    member: integer(),
    position: integer(),
    active: smallint().default(1).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('member').on(table.position, table.member),
  ],
)

export const posPrivMap = pgTable(
  'pos_priv_map',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    position: integer(),
    priv: integer(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const posType = pgTable(
  'pos_type',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    text: varchar({ length: 50 }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const positions = pgTable(
  'positions',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    name: varchar({ length: 50 }).default('').notNull(),
    sortorder: integer(),
    type: integer(),
    bookmark: varchar({ length: 50 }),
    jobDesc: varchar('job_desc', { length: 50 }),
    active: smallint().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const privs = pgTable(
  'privs',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    name: varchar({ length: 10 }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const quarters = pgTable(
  'quarters',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    text: varchar({ length: 50 }),
    school: varchar({ length: 50 }),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    endDate: date({ mode: 'string' }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const ratings = pgTable(
  'ratings',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    text: varchar({ length: 50 }),
    type: varchar({ length: 10 }).notNull(),
    degree: integer().notNull(),
    expires: smallint('expires').default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const signups = pgTable(
  'signups',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    class: integer().default(0).notNull(),
    student: integer().default(0).notNull(),
  },
  (table) => [
    index('class').on(table.class),
    primaryKey({ columns: [table.index] }),
    unique('uq_class_student').on(table.class, table.student),
  ],
)

export const wycRatings = pgTable(
  'wyc_ratings',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    member: integer(),
    rating: integer(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    date: date({ mode: 'string' }),
    examiner: integer(),
    enteredBy: integer('entered_by'),
    enteredAt: timestamp('entered_at', { mode: 'string' }).defaultNow(),
    comments: varchar({ length: 255 }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: integer('id').generatedByDefaultAsIdentity().notNull(),
    wycNumber: integer('wyc_number').notNull(),
    channel: otpChannel('channel').notNull(),
    purpose: varchar('purpose', { length: 32 }).notNull(),
    destination: varchar('destination', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_otp_lookup').on(table.wycNumber, table.channel, table.purpose, table.createdAt),
    index('idx_otp_expires').on(table.expiresAt),
  ],
)

export const qrLoginRequests = pgTable(
  'qr_login_requests',
  {
    id: integer('id').generatedByDefaultAsIdentity().notNull(),
    approvalSecretHash: varchar('approval_secret_hash', { length: 64 }).notNull(),
    pollingSecretHash: varchar('polling_secret_hash', { length: 64 }).notNull(),
    status: qrLoginStatus('status').default('pending').notNull(),
    approvedBy: integer('approved_by'),
    createdIpHash: varchar('created_ip_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    approvedAt: timestamp('approved_at'),
    consumedAt: timestamp('consumed_at'),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique('uq_qr_login_approval_secret').on(table.approvalSecretHash),
    unique('uq_qr_login_polling_secret').on(table.pollingSecretHash),
    index('idx_qr_login_expires').on(table.expiresAt),
    index('idx_qr_login_rate_limit').on(table.createdIpHash, table.createdAt),
  ],
)

export const doorCodes = pgTable(
  'door_codes',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    // Joins the row to its eligibility rule in door-codes/rules.ts.
    slug: varchar('slug', { length: 32 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    code: varchar('code', { length: 32 }).default('').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }),
    updatedBy: integer('updated_by'),
  },
  (table) => [primaryKey({ columns: [table.index] }), unique('uq_door_codes_slug').on(table.slug)],
)

export const membershipDiscountCodes = pgTable(
  'membership_discount_codes',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    name: varchar({ length: 100 }).notNull(),
    code: varchar({ length: 50 }).notNull(),
    audience: varchar({ length: 20 }).notNull(),
    percentageOff: integer('percentage_off'),
    amountOffCents: integer('amount_off_cents'),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }).notNull(),
    maxRedemptions: integer('max_redemptions'),
    active: smallint('active').default(1).notNull(),
    revision: integer('revision').default(1).notNull(),
    createdBy: integer('created_by').notNull(),
    updatedBy: integer('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_membership_discount_codes_code').on(table.code),
    index('idx_membership_discount_codes_active_dates').on(
      table.active,
      table.startsOn,
      table.endsOn,
    ),
    check(
      'chk_membership_discount_codes_discount',
      sql`(${table.percentageOff} is not null) <> (${table.amountOffCents} is not null)`,
    ),
  ],
)

export const membershipApplications = pgTable(
  'membership_applications',
  {
    id: varchar({ length: 36 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    submittedPrimaryEmail: varchar('submitted_primary_email', { length: 254 }).notNull(),
    primaryEmail: varchar('primary_email', { length: 254 }).notNull(),
    submittedUwEmail: varchar('submitted_uw_email', { length: 254 }),
    uwEmail: varchar('uw_email', { length: 254 }),
    emailEditedBy: integer('email_edited_by'),
    emailEditedAt: timestamp('email_edited_at'),
    uwStatus: varchar('uw_status', { length: 20 }).notNull(),
    plusOneResponse: varchar('plus_one_response', { length: 30 }).notNull(),
    tier: varchar({ length: 20 }).notNull(),
    duration: varchar({ length: 20 }).notNull(),
    targetExpireQtr: integer('target_expire_qtr').notNull(),
    paymentStatus: varchar('payment_status', { length: 30 }).default('pending').notNull(),
    squareOrderId: varchar('square_order_id', { length: 255 }),
    paymentIdempotencyKey: varchar('payment_idempotency_key', { length: 45 }),
    paymentCompletedAt: timestamp('payment_completed_at'),
    addressLine1: varchar('address_line_1', { length: 100 }),
    addressLine2: varchar('address_line_2', { length: 100 }),
    city: varchar({ length: 50 }),
    state: varchar({ length: 20 }),
    zipCode: varchar('zip_code', { length: 10 }),
    phone: varchar({ length: 50 }),
    discordUsername: varchar('discord_username', { length: 32 }),
    emergencyFirstName: varchar('emergency_first_name', { length: 60 }),
    emergencyLastName: varchar('emergency_last_name', { length: 60 }),
    emergencyPhone: varchar('emergency_phone', { length: 50 }),
    emergencyRelationship: varchar('emergency_relationship', { length: 100 }),
    questionnaireVersion: varchar('questionnaire_version', { length: 50 }).notNull(),
    questionnaireResponses: json('questionnaire_responses'),
    requirementsCompletedAt: timestamp('requirements_completed_at'),
    reviewStatus: varchar('review_status', { length: 30 }).default('not_ready').notNull(),
    resolvedWycNumber: integer('resolved_wyc_number'),
    reviewedBy: integer('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    reviewNote: text('review_note'),
    closedAt: timestamp('closed_at'),
    recoveryEmailSentAt: timestamp('recovery_email_sent_at'),
    completionReminderSentAt: timestamp('completion_reminder_sent_at'),
    welcomeEmailSentAt: timestamp('welcome_email_sent_at'),
    createdIpHash: varchar('created_ip_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_membership_applications_email').on(table.primaryEmail),
    index('idx_membership_applications_payment').on(table.paymentStatus, table.paymentCompletedAt),
    index('idx_membership_applications_review').on(table.reviewStatus, table.createdAt),
    index('idx_membership_applications_reminder').on(
      table.paymentStatus,
      table.requirementsCompletedAt,
      table.completionReminderSentAt,
    ),
    index('idx_membership_applications_resolved').on(table.resolvedWycNumber),
    index('idx_membership_applications_rate_limit').on(table.createdIpHash, table.createdAt),
  ],
)

export const memberEmailPreferences = pgTable(
  'member_email_preferences',
  {
    wycNumber: integer('wyc_number').notNull(),
    sailingOpportunities: smallint('sailing_opportunities').default(1).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.wycNumber] })],
)

export const memberEmergencyContacts = pgTable(
  'member_emergency_contacts',
  {
    wycNumber: integer('wyc_number').notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    phone: varchar({ length: 50 }).notNull(),
    relationship: varchar({ length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.wycNumber] })],
)

export const membershipRenewals = pgTable(
  'membership_renewals',
  {
    id: varchar({ length: 36 }).notNull(),
    wycNumber: integer('wyc_number').notNull(),
    source: varchar({ length: 20 }).notNull(),
    tier: varchar({ length: 20 }).notNull(),
    duration: varchar({ length: 20 }).notNull(),
    previousExpireQtr: integer('previous_expire_qtr').notNull(),
    targetExpireQtr: integer('target_expire_qtr').notNull(),
    completedAt: timestamp('completed_at'),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_membership_renewals_wyc').on(table.wycNumber),
    index('idx_membership_renewals_open').on(table.wycNumber, table.completedAt, table.closedAt),
  ],
)

export const membershipPayments = pgTable(
  'membership_payments',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    wycNumber: integer('wyc_number'),
    renewalId: varchar('renewal_id', { length: 36 }),
    applicationId: varchar('application_id', { length: 36 }),
    // null for non-payment renewals (e.g. dues-exempt).
    squarePaymentId: varchar('square_payment_id', { length: 255 }),
    squareOrderId: varchar('square_order_id', { length: 255 }),
    amountCents: integer('amount_cents').notNull(), // from the Square order total (audit only)
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    tier: varchar('tier', { length: 20 }).notNull(), // 'student' | 'nonstudent'
    duration: varchar('duration', { length: 20 }).notNull(), // 'quarterly' | 'annual'
    prevExpireQtr: integer('prev_expire_qtr').notNull(),
    newExpireQtr: integer('new_expire_qtr').notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'COMPLETED' (later 'EXEMPT')
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_membership_payments_renewal').on(table.renewalId),
    unique('uq_membership_payments_application').on(table.applicationId),
    unique('uq_membership_payments_square_payment').on(table.squarePaymentId),
    index('idx_membership_payments_wyc').on(table.wycNumber),
    foreignKey({
      columns: [table.renewalId],
      foreignColumns: [membershipRenewals.id],
      name: 'fk_membership_payments_renewal',
    }),
    foreignKey({
      columns: [table.applicationId],
      foreignColumns: [membershipApplications.id],
      name: 'fk_membership_payments_application',
    }),
  ],
)

export const membershipDiscountCodeRedemptions = pgTable(
  'membership_discount_code_redemptions',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    discountCodeId: integer('discount_code_id').notNull(),
    paymentId: integer('payment_id').notNull(),
    code: varchar({ length: 50 }).notNull(),
    revision: integer('revision').notNull(),
    percentageOff: integer('percentage_off'),
    amountOffCents: integer('amount_off_cents'),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull(),
    finalCents: integer('final_cents').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_membership_discount_code_redemptions_payment').on(table.paymentId),
    index('idx_membership_discount_code_redemptions_discount_code').on(table.discountCodeId),
    foreignKey({
      columns: [table.discountCodeId],
      foreignColumns: [membershipDiscountCodes.index],
      name: 'fk_membership_discount_code_redemptions_discount_code',
    }),
    foreignKey({
      columns: [table.paymentId],
      foreignColumns: [membershipPayments.index],
      name: 'fk_membership_discount_code_redemptions_payment',
    }),
  ],
)

export const duesExemptionRequests = pgTable(
  'dues_exemption_requests',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    wycNumber: integer('wyc_number').notNull(),
    renewalId: varchar('renewal_id', { length: 36 }),
    // Target quarter frozen at request time; the grant is a no-op if already covered by approval.
    requestedExpireQtr: integer('requested_expire_qtr').notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'approved' | 'denied' | 'cancelled'
    // EXEMPT membership_payments row written on approval (null when the grant no-ops or still pending).
    paymentId: integer('payment_id'),
    decidedBy: integer('decided_by'),
    decidedAt: timestamp('decided_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_dues_exemption_requests_renewal').on(table.renewalId),
    index('idx_dues_exemption_requests_wyc').on(table.wycNumber),
    index('idx_dues_exemption_requests_status').on(table.status),
    foreignKey({
      columns: [table.renewalId],
      foreignColumns: [membershipRenewals.id],
      name: 'fk_dues_exemption_requests_renewal',
    }),
  ],
)

export const renewalQuestionnaire = pgTable(
  'renewal_questionnaire',
  {
    index: integer('_index').generatedByDefaultAsIdentity().notNull(),
    wycNumber: integer('wyc_number').notNull(),
    renewalId: varchar('renewal_id', { length: 36 }),
    // Renewal quarter these answers were captured for.
    quarter: integer('quarter').notNull(),
    uwStatus: varchar('uw_status', { length: 20 }).notNull(),
    // Self-describing code (sponsor_* / sponsee_*) so a row is interpretable without UW status.
    plusOneResponse: varchar('plus_one_response', { length: 30 }).notNull(),
    // 'active' (paid) | 'pending' (exempt, awaiting approval) | 'void' (exempt denied).
    status: varchar('status', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'paid' | 'exempt'
    // Links an exempt-path row to its request so approval/denial can flip the status.
    requestId: integer('request_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('uq_renewal_questionnaire_renewal').on(table.renewalId),
    index('idx_renewal_questionnaire_wyc').on(table.wycNumber),
    index('idx_renewal_questionnaire_status').on(table.status),
    foreignKey({
      columns: [table.renewalId],
      foreignColumns: [membershipRenewals.id],
      name: 'fk_renewal_questionnaire_renewal',
    }),
  ],
)

export const memberWaivers = pgTable(
  'member_waivers',
  {
    id: varchar({ length: 36 }).notNull(),
    renewalId: varchar('renewal_id', { length: 36 }),
    applicationId: varchar('application_id', { length: 36 }),
    waiverVersion: varchar('waiver_version', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    submittedValues: json('submitted_values').notNull(),
    signedAt: timestamp('signed_at').notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    pdfSha256: varchar('pdf_sha256', { length: 64 }).notNull(),
    pdfSize: integer('pdf_size').notNull(),
    pdfContentType: varchar('pdf_content_type', { length: 100 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique('uq_member_waivers_renewal').on(table.renewalId),
    unique('uq_member_waivers_application').on(table.applicationId),
    unique('uq_member_waivers_object_key').on(table.objectKey),
    index('idx_member_waivers_email').on(table.email),
    index('idx_member_waivers_name').on(table.lastName, table.firstName),
    index('idx_member_waivers_signed_at').on(table.signedAt),
    check(
      'chk_member_waivers_workflow',
      sql`(${table.renewalId} is not null) <> (${table.applicationId} is not null)`,
    ),
    foreignKey({
      columns: [table.renewalId],
      foreignColumns: [membershipRenewals.id],
      name: 'fk_member_waivers_renewal',
    }),
    foreignKey({
      columns: [table.applicationId],
      foreignColumns: [membershipApplications.id],
      name: 'fk_member_waivers_application',
    }),
  ],
)

export const guestWaivers = pgTable(
  'guest_waivers',
  {
    id: varchar({ length: 36 }).notNull(),
    waiverVersion: varchar('waiver_version', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    submittedValues: json('submitted_values').notNull(),
    signedAt: timestamp('signed_at').notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    pdfSha256: varchar('pdf_sha256', { length: 64 }).notNull(),
    pdfSize: integer('pdf_size').notNull(),
    pdfContentType: varchar('pdf_content_type', { length: 100 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique('uq_guest_waivers_object_key').on(table.objectKey),
    index('idx_guest_waivers_email').on(table.email),
    index('idx_guest_waivers_name').on(table.lastName, table.firstName),
    index('idx_guest_waivers_signed_at').on(table.signedAt),
  ],
)

export const writtenTestAttempts = pgTable(
  'written_test_attempts',
  {
    attemptId: varchar('attempt_id', { length: 36 }).primaryKey(),
    memberWycNumber: integer('member_wyc_number').notNull(),
    examinerWycNumber: integer('examiner_wyc_number'),
    testId: varchar('test_id', { length: 64 }).notNull(),
    mode: writtenTestMode().notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string' }).defaultNow().notNull(),
    correctCount: integer('correct_count').notNull(),
    questionCount: integer('question_count').notNull(),
    earnedPoints: numeric('earned_points', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    possiblePoints: numeric('possible_points', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    passed: smallint().notNull(),
    snapshot: json().$type<TestSnapshot>().notNull(),
  },
  (table) => [index('written_test_attempt_submitted_at').on(table.submittedAt)],
)
