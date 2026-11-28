import type { PhotoCrop } from '@/domains/member-photos/photo'
import type { TestSnapshot } from '@/domains/written-tests/schema'
import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  foreignKey,
  index,
  integer,
  numeric,
  sqliteTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/sqlite-core'

const utcTimestamp = customType<{ data: Date; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) => value.toISOString().replace('T', ' ').replace('Z', ''),
  fromDriver: (value) => new Date(value.replace(' ', 'T') + 'Z'),
})

export const reservationType = ['personal', 'admin'] as const
export const otpChannel = ['email', 'sms'] as const
export const qrLoginStatus = ['pending', 'approved', 'consumed', 'expired', 'canceled'] as const
export const writtenTestMode = ['practice', 'final'] as const

export const calendarEngineType = ['outboard', 'inboard', 'both'] as const
export const calendarPricingTier = ['student', 'nonstudent'] as const
export const calendarRentalEngine = ['outboard', 'inboard'] as const
export const keelboatPaymentStatus = [
  'processing',
  'paid',
  'completed',
  'failed',
  'reconciliation_required',
] as const

export const wycDatabase = sqliteTable(
  'WYCDatabase',
  {
    last: text('Last'),
    first: text('First'),
    streetAddress: text('StreetAddress'),
    city: text('City'),
    state: text('State'),
    zipCode: text('ZipCode'),
    phone1: text('Phone1'),
    phone2: text('Phone2'),
    email: text('Email'),
    uwEmail: text('uw_email'),
    discordUsername: text('discord_username'),
    categoryId: integer('Category'),
    wycNumber: integer('WYCNumber').default(0).notNull(),
    expireQtrIndex: integer('ExpireQtr').default(0).notNull(),
    studentId: integer('StudentID'),
    passwordArgon2: text('password_argon2'),
    outToSea: integer('out_to_sea').default(0),
    joinDate: text('JoinDate')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.wycNumber] }),
    unique('IDX_WYCNumber').on(table.wycNumber),
  ],
)

export const memberPhoto = sqliteTable('member_photo', {
  wycNumber: integer('wyc_number')
    .primaryKey()
    .references(() => wycDatabase.wycNumber),
  version: text()
    .$defaultFn(() => crypto.randomUUID())
    .notNull(),
  sourceKey: text('source_key').notNull(),
  avatarKey: text('avatar_key'),
  crop: text({ mode: 'json' }).$type<PhotoCrop>(),
})

export const boatTypes = sqliteTable('boat_types', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  type: text(),
  description: text().notNull(),
  usefulLink: text().notNull(),
  fleet: text().notNull(),
  numberInFleet: integer().notNull(),
  active: integer().default(1).notNull(),
})

export const calendarboats = sqliteTable('calendarboats', {
  cBoatId: integer().primaryKey({ autoIncrement: true }).notNull(),
  active: integer('active').default(1).notNull(),
  engineType: text('engineType', { enum: calendarEngineType }),
  name: text().notNull(),
  description: text('Description').notNull(),
})

export const calendarcomment = sqliteTable('calendarcomment', {
  id: integer().notNull(),
  userwyc: integer().notNull(),
  date: text().notNull(),
  comment: text().notNull(),
})

export const calendartable = sqliteTable(
  'calendartable',
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    cBoatId: integer().notNull(),
    paymentCheckoutId: text('paymentCheckoutId'),
    squareOrderId: text('squareOrderId'),
    squarePaymentId: text('squarePaymentId'),
    paidAmountCents: integer('paidAmountCents'),
    paidCurrency: text('paidCurrency'),
    pricingTier: text('pricingTier', { enum: calendarPricingTier }),
    rentalEngine: text('rentalEngine', { enum: calendarRentalEngine }),
    deletedAt: text('deletedAt'),
    deletedByWycNumber: integer('deletedByWYCNumber'),
    memberWycNumber: integer('memberWYCNumber'),
    reservationType: text('reservationType', { enum: reservationType })
      .default('personal')
      .notNull(),
    createdByWycNumber: integer('createdByWYCNumber'),
    title: text(),
    reserveFrom: text().notNull(),
    reserveTo: text().notNull(),
    destination: text().notNull(),
    numberOfCrew: integer().notNull(),
    comments: text(),
    phone: text().notNull(),
    numFullWd: integer('numFullWD').notNull(),
    numHalfWd: integer('numHalfWD').notNull(),
    numFullWe: integer('numFullWE').notNull(),
    numHalfWe: integer('numHalfWE').notNull(),
  },
  (table) => [
    unique('uq_calendar_payment_checkout').on(table.paymentCheckoutId),
    unique('uq_calendar_square_payment').on(table.squarePaymentId),
  ],
)

export const keelboatPayments = sqliteTable(
  'keelboat_payments',
  {
    id: text('id').primaryKey(),
    memberId: integer('member_id').notNull(),
    activeMemberId: integer('active_member_id'),
    reservationId: integer('reservation_id'),
    reservationInput: text('reservation_input', { mode: 'json' }).notNull(),
    priceSnapshot: text('price_snapshot', { mode: 'json' }).notNull(),
    status: text('status', { enum: keelboatPaymentStatus }).notNull(),
    squareOrderId: text('square_order_id'),
    squarePaymentId: text('square_payment_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    unique('uq_keelboat_active_payment').on(table.activeMemberId),
    unique('uq_keelboat_payment_id').on(table.squarePaymentId),
    index('idx_keelboat_payments_member').on(table.memberId),
  ],
)

export const checkouts = sqliteTable('checkouts', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  wycNumber: integer('WYCNumber').notNull(),
  timeDeparture: text('TimeDeparture').notNull(),
  crew: text('Crew'),
  boat: text('Boat').notNull(),
  destination: text('Destination').notNull(),
  timeReturn: text('TimeReturn'),
  expectedReturn: text('ExpectedReturn'),
  relevantRating: integer('RelevantRating'),
  chiefId: integer('ChiefID'),
})

export const classType = sqliteTable('class_type', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
})

export const crew = sqliteTable(
  'crew',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    checkoutId: integer('checkout_ID').notNull(),
    crewId: integer('crew_ID').notNull(),
  },
  (table) => [
    unique('uq_crew_checkout_member').on(table.crewId, table.checkoutId),
    foreignKey({
      columns: [table.checkoutId],
      foreignColumns: [checkouts.index],
      name: 'fk_crew_checkout',
    }).onDelete('cascade'),
  ],
)

export const guests = sqliteTable(
  'guests',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    checkoutId: integer('checkout_ID').notNull(),
    name: text(),
    status: integer().notNull(),
    email: text(),
    phone: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.checkoutId],
      foreignColumns: [checkouts.index],
      name: 'fk_guests_checkout',
    }).onDelete('cascade'),
  ],
)

export const lessonQuarter = sqliteTable('lesson_quarter', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  quarter: integer().default(0).notNull(),
  renewalQuarter: integer('renewal_quarter')
    .notNull()
    .references(() => quarters.index),
})

export const lessons = sqliteTable('lessons', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  type: integer(),
  subtype: text(),
  // `lesson_sessions` is the source of truth; these are kept only
  // because they are the last record of the dates for the old lessons.
  day: text(),
  time: text(),
  dates: text(),
  calendarDate: text('CalendarDate'),
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
  display: integer().default(0).notNull(),
})

export const lessonAnnouncements = sqliteTable(
  'lesson_announcements',
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    lessonId: integer('lesson_id').notNull(),
    authorWycNumber: integer('author_wyc_number'),
    subject: text().notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index('idx_lesson_announcements_lesson_created').on(table.lessonId, table.createdAt)],
)

export const lessonSessions = sqliteTable(
  'lesson_sessions',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    lessonId: integer('lesson_id').notNull(),
    startsAt: text('starts_at').notNull(),
    // Inclusive: a Fri–Mon trip ends Mon.
    endsAt: text('ends_at').notNull(),
    // When set, the time components are filler
    allDay: integer('all_day').default(0).notNull(),
    location: text(),
    locationUrl: text('location_url'),
  },
  (table) => [index('lesson_id_idx').on(table.lessonId)],
)

export const memcat = sqliteTable('memcat', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
})

export const officers = sqliteTable(
  'officers',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    member: integer(),
    position: integer(),
    active: integer().default(1).notNull(),
  },
  (table) => [unique('member').on(table.position, table.member)],
)

export const posPrivMap = sqliteTable('pos_priv_map', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  position: integer(),
  priv: integer(),
})

export const posType = sqliteTable('pos_type', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
})

export const positions = sqliteTable('positions', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  name: text().default('').notNull(),
  sortorder: integer(),
  type: integer(),
  bookmark: text(),
  jobDesc: text('job_desc'),
  active: integer().default(0).notNull(),
})

export const privs = sqliteTable('privs', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  name: text(),
})

export const quarters = sqliteTable('quarters', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
  school: text(),
  // you can use { mode: 'date' }, if you want to have Date as type for this column
  endDate: text(),
})

export const ratings = sqliteTable('ratings', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
  type: text().notNull(),
  degree: integer().notNull(),
  expires: integer('expires').default(0).notNull(),
})

export const signups = sqliteTable(
  'signups',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    class: integer().default(0).notNull(),
    student: integer().default(0).notNull(),
  },
  (table) => [unique('uq_class_student').on(table.class, table.student)],
)

export const wycRatings = sqliteTable('wyc_ratings', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  member: integer(),
  rating: integer(),
  // you can use { mode: 'date' }, if you want to have Date as type for this column
  date: text(),
  examiner: integer(),
  enteredBy: integer('entered_by'),
  enteredAt: text('entered_at').default(sql`CURRENT_TIMESTAMP`),
  comments: text(),
})

export const otpCodes = sqliteTable(
  'otp_codes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    wycNumber: integer('wyc_number').notNull(),
    channel: text('channel', { enum: otpChannel }).notNull(),
    purpose: text('purpose').notNull(),
    destination: text('destination').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: utcTimestamp('expires_at').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    consumedAt: utcTimestamp('consumed_at'),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_otp_lookup').on(table.wycNumber, table.channel, table.purpose, table.createdAt),
    index('idx_otp_expires').on(table.expiresAt),
  ],
)

export const qrLoginRequests = sqliteTable(
  'qr_login_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    approvalSecretHash: text('approval_secret_hash').notNull(),
    pollingSecretHash: text('polling_secret_hash').notNull(),
    status: text('status', { enum: qrLoginStatus }).default('pending').notNull(),
    approvedBy: integer('approved_by'),
    createdIpHash: text('created_ip_hash').notNull(),
    expiresAt: utcTimestamp('expires_at').notNull(),
    approvedAt: utcTimestamp('approved_at'),
    consumedAt: utcTimestamp('consumed_at'),
    canceledAt: utcTimestamp('canceled_at'),
    createdAt: utcTimestamp('created_at').notNull(),
  },
  (table) => [
    unique('uq_qr_login_approval_secret').on(table.approvalSecretHash),
    unique('uq_qr_login_polling_secret').on(table.pollingSecretHash),
    index('idx_qr_login_expires').on(table.expiresAt),
    index('idx_qr_login_rate_limit').on(table.createdIpHash, table.createdAt),
  ],
)

export const doorCodes = sqliteTable(
  'door_codes',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    // Joins the row to its eligibility rule in door-codes/rules.ts.
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    code: text('code').default('').notNull(),
    updatedAt: text('updated_at'),
    updatedBy: integer('updated_by'),
  },
  (table) => [unique('uq_door_codes_slug').on(table.slug)],
)

export const membershipDiscountCodes = sqliteTable(
  'membership_discount_codes',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    name: text().notNull(),
    code: text().notNull(),
    audience: text().notNull(),
    percentageOff: integer('percentage_off'),
    amountOffCents: integer('amount_off_cents'),
    startsOn: text('starts_on').notNull(),
    endsOn: text('ends_on').notNull(),
    maxRedemptions: integer('max_redemptions'),
    active: integer('active').default(1).notNull(),
    revision: integer('revision').default(1).notNull(),
    createdBy: integer('created_by').notNull(),
    updatedBy: integer('updated_by'),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: utcTimestamp('updated_at'),
  },
  (table) => [
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

export const membershipApplications = sqliteTable(
  'membership_applications',
  {
    id: text().notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    submittedPrimaryEmail: text('submitted_primary_email').notNull(),
    primaryEmail: text('primary_email').notNull(),
    submittedUwEmail: text('submitted_uw_email'),
    uwEmail: text('uw_email'),
    emailEditedBy: integer('email_edited_by'),
    emailEditedAt: utcTimestamp('email_edited_at'),
    uwStatus: text('uw_status').notNull(),
    plusOneResponse: text('plus_one_response').notNull(),
    tier: text().notNull(),
    duration: text().notNull(),
    targetExpireQtr: integer('target_expire_qtr').notNull(),
    paymentStatus: text('payment_status').default('pending').notNull(),
    squareOrderId: text('square_order_id'),
    paymentIdempotencyKey: text('payment_idempotency_key'),
    paymentCompletedAt: utcTimestamp('payment_completed_at'),
    addressLine1: text('address_line_1'),
    addressLine2: text('address_line_2'),
    city: text(),
    state: text(),
    zipCode: text('zip_code'),
    phone: text(),
    discordUsername: text('discord_username'),
    emergencyFirstName: text('emergency_first_name'),
    emergencyLastName: text('emergency_last_name'),
    emergencyPhone: text('emergency_phone'),
    emergencyRelationship: text('emergency_relationship'),
    questionnaireVersion: text('questionnaire_version').notNull(),
    questionnaireResponses: text('questionnaire_responses', { mode: 'json' }),
    requirementsCompletedAt: utcTimestamp('requirements_completed_at'),
    reviewStatus: text('review_status').default('not_ready').notNull(),
    resolvedWycNumber: integer('resolved_wyc_number'),
    reviewedBy: integer('reviewed_by'),
    reviewedAt: utcTimestamp('reviewed_at'),
    reviewNote: text('review_note'),
    closedAt: utcTimestamp('closed_at'),
    recoveryEmailSentAt: utcTimestamp('recovery_email_sent_at'),
    completionReminderSentAt: utcTimestamp('completion_reminder_sent_at'),
    welcomeEmailSentAt: utcTimestamp('welcome_email_sent_at'),
    createdIpHash: text('created_ip_hash').notNull(),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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

export const memberEmailPreferences = sqliteTable(
  'member_email_preferences',
  {
    wycNumber: integer('wyc_number').notNull(),
    sailingOpportunities: integer('sailing_opportunities').default(1).notNull(),
    updatedAt: text('updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.wycNumber] })],
)

export const memberEmergencyContacts = sqliteTable(
  'member_emergency_contacts',
  {
    wycNumber: integer('wyc_number').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text().notNull(),
    relationship: text().notNull(),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.wycNumber] })],
)

export const membershipRenewals = sqliteTable(
  'membership_renewals',
  {
    id: text().notNull(),
    wycNumber: integer('wyc_number').notNull(),
    source: text().notNull(),
    tier: text().notNull(),
    duration: text().notNull(),
    previousExpireQtr: integer('previous_expire_qtr').notNull(),
    targetExpireQtr: integer('target_expire_qtr').notNull(),
    completedAt: utcTimestamp('completed_at'),
    closedAt: utcTimestamp('closed_at'),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_membership_renewals_wyc').on(table.wycNumber),
    index('idx_membership_renewals_open').on(table.wycNumber, table.completedAt, table.closedAt),
  ],
)

export const membershipPayments = sqliteTable(
  'membership_payments',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    wycNumber: integer('wyc_number'),
    renewalId: text('renewal_id'),
    applicationId: text('application_id'),
    // null for non-payment renewals (e.g. dues-exempt).
    squarePaymentId: text('square_payment_id'),
    squareOrderId: text('square_order_id'),
    amountCents: integer('amount_cents').notNull(), // from the Square order total (audit only)
    currency: text('currency').default('USD').notNull(),
    tier: text('tier').notNull(), // 'student' | 'nonstudent'
    duration: text('duration').notNull(), // 'quarterly' | 'annual'
    prevExpireQtr: integer('prev_expire_qtr').notNull(),
    newExpireQtr: integer('new_expire_qtr').notNull(),
    status: text('status').notNull(), // 'COMPLETED' (later 'EXEMPT')
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
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

export const membershipDiscountCodeRedemptions = sqliteTable(
  'membership_discount_code_redemptions',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    discountCodeId: integer('discount_code_id').notNull(),
    paymentId: integer('payment_id').notNull(),
    code: text().notNull(),
    revision: integer('revision').notNull(),
    percentageOff: integer('percentage_off'),
    amountOffCents: integer('amount_off_cents'),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull(),
    finalCents: integer('final_cents').notNull(),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
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

export const duesExemptionRequests = sqliteTable(
  'dues_exemption_requests',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    wycNumber: integer('wyc_number').notNull(),
    renewalId: text('renewal_id'),
    // Target quarter frozen at request time; the grant is a no-op if already covered by approval.
    requestedExpireQtr: integer('requested_expire_qtr').notNull(),
    status: text('status').notNull(), // 'pending' | 'approved' | 'denied' | 'cancelled'
    // EXEMPT membership_payments row written on approval (null when the grant no-ops or still pending).
    paymentId: integer('payment_id'),
    decidedBy: integer('decided_by'),
    decidedAt: utcTimestamp('decided_at'),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
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

export const renewalQuestionnaire = sqliteTable(
  'renewal_questionnaire',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    wycNumber: integer('wyc_number').notNull(),
    renewalId: text('renewal_id'),
    // Renewal quarter these answers were captured for.
    quarter: integer('quarter').notNull(),
    uwStatus: text('uw_status').notNull(),
    // Self-describing code (sponsor_* / sponsee_*) so a row is interpretable without UW status.
    plusOneResponse: text('plus_one_response').notNull(),
    // 'active' (paid) | 'pending' (exempt, awaiting approval) | 'void' (exempt denied).
    status: text('status').notNull(),
    source: text('source').notNull(), // 'paid' | 'exempt'
    // Links an exempt-path row to its request so approval/denial can flip the status.
    requestId: integer('request_id'),
    createdAt: utcTimestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
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

export const memberWaivers = sqliteTable(
  'member_waivers',
  {
    id: text().notNull(),
    renewalId: text('renewal_id'),
    applicationId: text('application_id'),
    waiverVersion: text('waiver_version').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text().notNull(),
    submittedValues: text('submitted_values', { mode: 'json' }).notNull(),
    signedAt: utcTimestamp('signed_at').notNull(),
    objectKey: text('object_key').notNull(),
    pdfSha256: text('pdf_sha256').notNull(),
    pdfSize: integer('pdf_size').notNull(),
    pdfContentType: text('pdf_content_type').notNull(),
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

export const guestWaivers = sqliteTable(
  'guest_waivers',
  {
    id: text().notNull(),
    waiverVersion: text('waiver_version').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text().notNull(),
    submittedValues: text('submitted_values', { mode: 'json' }).notNull(),
    signedAt: utcTimestamp('signed_at').notNull(),
    objectKey: text('object_key').notNull(),
    pdfSha256: text('pdf_sha256').notNull(),
    pdfSize: integer('pdf_size').notNull(),
    pdfContentType: text('pdf_content_type').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique('uq_guest_waivers_object_key').on(table.objectKey),
    index('idx_guest_waivers_email').on(table.email),
    index('idx_guest_waivers_name').on(table.lastName, table.firstName),
    index('idx_guest_waivers_signed_at').on(table.signedAt),
  ],
)

export const writtenTestAttempts = sqliteTable(
  'written_test_attempts',
  {
    attemptId: text('attempt_id').primaryKey(),
    memberWycNumber: integer('member_wyc_number').notNull(),
    examinerWycNumber: integer('examiner_wyc_number'),
    testId: text('test_id').notNull(),
    mode: text({ enum: writtenTestMode }).notNull(),
    submittedAt: text('submitted_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    correctCount: integer('correct_count').notNull(),
    questionCount: integer('question_count').notNull(),
    earnedPoints: numeric('earned_points', { mode: 'number' }).notNull(),
    possiblePoints: numeric('possible_points', {
      mode: 'number',
    }).notNull(),
    passed: integer().notNull(),
    snapshot: text({ mode: 'json' }).$type<TestSnapshot>().notNull(),
  },
  (table) => [index('written_test_attempt_submitted_at').on(table.submittedAt)],
)
