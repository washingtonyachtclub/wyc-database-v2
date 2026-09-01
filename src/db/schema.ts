import { sql } from 'drizzle-orm'
import {
  char,
  check,
  customType,
  date,
  datetime,
  double,
  float,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

const blobAsText = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return 'blob'
  },
  fromDriver(value: Buffer): string {
    return value.toString('utf-8')
  },
  toDriver(value: string): Buffer {
    return Buffer.from(value, 'utf-8')
  },
})

const tinyint1 = customType<{ data: number; driverData: number }>({
  dataType() {
    return 'tinyint(1)'
  },
})

export const wycDatabase = mysqlTable(
  'WYCDatabase',
  {
    last: char('Last', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    first: char('First', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    streetAddress: char('StreetAddress', { length: 100 })
      .charSet('latin1')
      .collate('latin1_swedish_ci'),
    city: char('City', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    state: char('State', { length: 20 }).charSet('latin1').collate('latin1_swedish_ci'),
    zipCode: char('ZipCode', { length: 10 }).charSet('latin1').collate('latin1_swedish_ci'),
    phone1: char('Phone1', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    phone2: char('Phone2', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    email: varchar('Email', { length: 254 }).charSet('latin1').collate('latin1_swedish_ci'),
    uwEmail: varchar('uw_email', { length: 254 }).charSet('latin1').collate('latin1_swedish_ci'),
    categoryId: int('Category'),
    wycNumber: int('WYCNumber').default(0).notNull(),
    expireQtrIndex: int('ExpireQtr').default(0).notNull(),
    studentId: int('StudentID'),
    password: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    passwordArgon2: varchar('password_argon2', { length: 255 })
      .charSet('latin1')
      .collate('latin1_swedish_ci'),
    outToSea: tinyint1('out_to_sea').default(sql`false`),
    joinDate: timestamp('JoinDate', { mode: 'string' }).defaultNow().notNull(),
    imageName: char('image_name', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [
    primaryKey({ columns: [table.wycNumber] }),
    unique('IDX_WYCNumber').on(table.wycNumber),
  ],
)

export const boatTypes = mysqlTable(
  'boat_types',
  {
    index: int('_index').autoincrement().notNull(),
    type: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    description: varchar({ length: 500 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    usefulLink: varchar({ length: 100 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    fleet: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    numberInFleet: int().notNull(),
    active: tinyint1()
      .default(sql`true`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const calendaradmin = mysqlTable('calendaradmin', {
  wycnum: int().notNull(),
  description: varchar({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
})

export const calendarboats = mysqlTable(
  'calendarboats',
  {
    cBoatId: int().autoincrement().notNull(),
    name: varchar({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    description: varchar('Description', { length: 500 })
      .charSet('latin1')
      .collate('latin1_swedish_ci')
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.cBoatId] })],
)

export const calendarcomment = mysqlTable('calendarcomment', {
  id: int().notNull(),
  userwyc: int().notNull(),
  date: datetime({ mode: 'string' }).notNull(),
  comment: text().charSet('latin1').collate('latin1_swedish_ci').notNull(),
})

export const calendarconfig = mysqlTable(
  'calendarconfig',
  {
    wacip: varchar({ length: 15 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    ipdescription: varchar({ length: 255 })
      .charSet('latin1')
      .collate('latin1_swedish_ci')
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.wacip] })],
)

export const calendartable = mysqlTable(
  'calendartable',
  {
    id: int().autoincrement().notNull(),
    cBoatId: int().notNull(),
    memberWycNumber: int('memberWYCNumber').notNull(),
    reserveFrom: datetime({ mode: 'string' }).notNull(),
    reserveTo: datetime({ mode: 'string' }).notNull(),
    destination: varchar({ length: 255 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    numberOfCrew: int().notNull(),
    comments: varchar({ length: 255 }).charSet('latin1').collate('latin1_swedish_ci'),
    phone: varchar({ length: 45 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    numFullWd: int('numFullWD').notNull(),
    numHalfWd: int('numHalfWD').notNull(),
    numFullWe: int('numFullWE').notNull(),
    numHalfWe: int('numHalfWE').notNull(),
  },
  (table) => [primaryKey({ columns: [table.id] })],
)

export const checkouts = mysqlTable(
  'checkouts',
  {
    index: int('_index').autoincrement().notNull(),
    wycNumber: int('WYCNumber').notNull(),
    timeDeparture: datetime('TimeDeparture', { mode: 'string' }).notNull(),
    crew: text('Crew'),
    boat: varchar('Boat', { length: 50 }).notNull(),
    destination: varchar('Destination', { length: 100 }).notNull(),
    timeReturn: datetime('TimeReturn', { mode: 'string' }),
    expectedReturn: datetime('ExpectedReturn', { mode: 'string' }).notNull(),
    relevantRating: int('RelevantRating'),
    chiefId: int('ChiefID'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const classType = mysqlTable(
  'class_type',
  {
    index: int('_index').autoincrement().notNull(),
    text: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const crew = mysqlTable(
  'crew',
  {
    index: int('_index').autoincrement().notNull(),
    checkoutId: int('checkout_ID').notNull(),
    crewId: int('crew_ID').notNull(),
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

export const guests = mysqlTable(
  'guests',
  {
    index: int('_index').autoincrement().notNull(),
    checkoutId: int('checkout_ID').notNull(),
    name: varchar({ length: 100 }),
    status: int().notNull(),
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

export const keelboatPricing = mysqlTable('keelboat_pricing', {
  price: float().notNull(),
  weekday: int().notNull(),
  fullday: int().notNull(),
  student: int().notNull(),
})

export const lessonQuarter = mysqlTable(
  'lesson_quarter',
  {
    index: int('_index', { unsigned: true }).autoincrement().notNull(),
    quarter: int({ unsigned: true }).default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const lessons = mysqlTable(
  'lessons',
  {
    index: int('_index').autoincrement().notNull(),
    type: int(),
    subtype: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    // `lesson_sessions` is the source of truth; these are kept only
    // because they are the last record of the dates for the old lessons.
    day: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    time: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    dates: text().charSet('latin1').collate('latin1_swedish_ci'),
    calendarDate: date('CalendarDate', { mode: 'string' }).notNull(),
    instructor1: int(),
    instructor2: int(),
    comments: blobAsText('comments'),
    requirements: text().charSet('latin1').collate('latin1_swedish_ci'),
    description: text('Description')
      .charSet('latin1')
      .collate('latin1_swedish_ci')
      .notNull()
      .$default(() => ''),
    location: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    locationUrl: varchar('location_url', { length: 255 })
      .charSet('latin1')
      .collate('latin1_swedish_ci'),
    size: int(),
    expire: int(),
    display: tinyint1()
      .default(sql`false`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const lessonSessions = mysqlTable(
  'lesson_sessions',
  {
    index: int('_index').autoincrement().notNull(),
    lessonId: int('lesson_id').notNull(),
    startsAt: datetime('starts_at', { mode: 'string' }).notNull(),
    // Inclusive: a Fri–Mon trip ends Mon.
    endsAt: datetime('ends_at', { mode: 'string' }).notNull(),
    // When set, the time components are filler
    allDay: tinyint('all_day').default(0).notNull(),
  },
  (table) => [index('lesson_id_idx').on(table.lessonId), primaryKey({ columns: [table.index] })],
)

export const memcat = mysqlTable(
  'memcat',
  {
    index: int('_index').autoincrement().notNull(),
    text: varchar({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const noyes = mysqlTable(
  'noyes',
  {
    index: tinyint1('_index')
      .default(sql`false`)
      .notNull(),
    text: char({ length: 10 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const officers = mysqlTable(
  'officers',
  {
    index: int('_index').autoincrement().notNull(),
    member: int(),
    position: int(),
    active: tinyint1()
      .default(sql`true`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index] }),
    unique('_index').on(table.index),
    unique('member').on(table.position, table.member),
  ],
)

export const options = mysqlTable(
  'options',
  {
    index: int('_index').autoincrement().notNull(),
    name: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    value: varchar({ length: 250 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const posPrivMap = mysqlTable(
  'pos_priv_map',
  {
    index: int('_index').autoincrement().notNull(),
    position: int(),
    priv: int(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const posType = mysqlTable(
  'pos_type',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const positions = mysqlTable(
  'positions',
  {
    index: int('_index').autoincrement().notNull(),
    name: varchar({ length: 50 })
      .default('')
      .charSet('latin1')
      .collate('latin1_swedish_ci')
      .notNull(),
    sortorder: int(),
    isDuesExempt: tinyint1('is_dues_exempt').default(sql`false`),
    type: int(),
    bookmark: varchar({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    jobDesc: varchar('job_desc', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    active: tinyint().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const priorityTypes = mysqlTable(
  'priority_types',
  {
    index: int('_index').autoincrement().notNull(),
    priority: varchar({ length: 25 })
      .default('')
      .charSet('latin1')
      .collate('latin1_swedish_ci')
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const privs = mysqlTable(
  'privs',
  {
    index: int('_index').autoincrement().notNull(),
    name: char({ length: 10 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const quarters = mysqlTable(
  'quarters',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    school: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    endDate: date({ mode: 'string' }),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const ratings = mysqlTable(
  'ratings',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    type: varchar({ length: 10 }).charSet('latin1').collate('latin1_swedish_ci').notNull(),
    degree: int().notNull(),
    expires: tinyint('expires').default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const recip = mysqlTable('recip', {
  clubName: varchar('club_name', { length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
  website: varchar({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
  recipUrl: varchar('recip_url', { length: 75 }).charSet('latin1').collate('latin1_swedish_ci'),
  location: varchar({ length: 2000 }).charSet('latin1').collate('latin1_swedish_ci'),
  latLong: varchar('lat_long', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
  lengthStay: varchar('length_stay', { length: 2000 })
    .charSet('latin1')
    .collate('latin1_swedish_ci'),
  procedures: varchar({ length: 2000 }).charSet('latin1').collate('latin1_swedish_ci'),
  amenities: varchar({ length: 2000 }).charSet('latin1').collate('latin1_swedish_ci'),
  image: varchar({ length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
  imageNext: varchar('image_next', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
  clubId: varchar('club_id', { length: 2 }).charSet('latin1').collate('latin1_swedish_ci'),
})

export const sessions = mysqlTable(
  'sessions',
  {
    index: int('_index').autoincrement().notNull(),
    session: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
    userid: int(),
    time: varchar({ length: 80 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const signups = mysqlTable(
  'signups',
  {
    index: int('_index').autoincrement().notNull(),
    class: int().default(0).notNull(),
    student: int().default(0).notNull(),
  },
  (table) => [
    index('class').on(table.class),
    primaryKey({ columns: [table.index] }),
    unique('uq_class_student').on(table.class, table.student),
  ],
)

export const snc = mysqlTable(
  'snc',
  {
    index: int('_index').autoincrement().notNull(),
    quarter: int(),
    member: int(),
    memberDinner: int('member_dinner'),
    memberLunch1: int('member_lunch1'),
    memberLunch2: int('member_lunch2'),
    guest1Name: char('guest1_name', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
    guest1Dinner: int('guest1_dinner'),
    guest1Lunch1: int('guest1_lunch1'),
    guest1Lunch2: int('guest1_lunch2'),
    guest2Name: char('guest2_name', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
    guest2Dinner: int('guest2_dinner'),
    guest2Lunch1: int('guest2_lunch1'),
    guest2Lunch2: int('guest2_lunch2'),
    boat1Pref: char('boat1pref', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
    boat2Pref: char('boat2pref', { length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
    ratingSh: int('rating_sh'),
    ratingDh: int('rating_dh'),
    ratingKb: int('rating_kb'),
    isLockVeteran: tinyint1('is_lock_veteran'),
    friends: char({ length: 100 }).charSet('latin1').collate('latin1_swedish_ci'),
    duties: int(),
    guest1Child: tinyint1('guest1_child'),
    guest2Child: tinyint1('guest2_child'),
    transpt: tinyint1().default(sql`false`),
    paymentConfirm: int('payment_confirm').notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const sncFood = mysqlTable(
  'snc_food',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    isAllowed: tinyint1('is_allowed'),
    isDinner: tinyint1('is_dinner'),
    cost: int().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const sncWork = mysqlTable(
  'snc_work',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }).charSet('latin1').collate('latin1_swedish_ci'),
    isAllowed: tinyint1('is_allowed'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const wycRatings = mysqlTable(
  'wyc_ratings',
  {
    index: int('_index').autoincrement().notNull(),
    member: int(),
    rating: int(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    date: date({ mode: 'string' }),
    examiner: int(),
    enteredBy: int('entered_by'),
    enteredAt: timestamp('entered_at', { mode: 'string' }).defaultNow(),
    comments: varchar({ length: 255 }).charSet('latin1').collate('latin1_swedish_ci'),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)

export const processedFormEntries = mysqlTable('processed_form_entries', {
  entryId: int('entry_id').primaryKey(),
  wycNumber: int('wyc_number'),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
})

export const otpCodes = mysqlTable(
  'otp_codes',
  {
    id: int('id').autoincrement().notNull(),
    wycNumber: int('wyc_number').notNull(),
    channel: mysqlEnum('channel', ['email', 'sms']).notNull(),
    purpose: varchar('purpose', { length: 32 }).notNull(),
    destination: varchar('destination', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    attempts: int('attempts').default(0).notNull(),
    maxAttempts: int('max_attempts').default(5).notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index('idx_otp_lookup').on(table.wycNumber, table.channel, table.purpose, table.createdAt),
    index('idx_otp_expires').on(table.expiresAt),
  ],
)

export const qrLoginRequests = mysqlTable(
  'qr_login_requests',
  {
    id: int('id').autoincrement().notNull(),
    approvalSecretHash: char('approval_secret_hash', { length: 64 }).notNull(),
    pollingSecretHash: char('polling_secret_hash', { length: 64 }).notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'consumed', 'expired', 'canceled'])
      .default('pending')
      .notNull(),
    approvedBy: int('approved_by'),
    createdIpHash: char('created_ip_hash', { length: 64 }).notNull(),
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

export const doorCodes = mysqlTable(
  'door_codes',
  {
    index: int('_index').autoincrement().notNull(),
    // Joins the row to its eligibility rule in door-codes/rules.ts.
    slug: varchar('slug', { length: 32 })
      .charSet('utf8mb4')
      .collate('utf8mb4_0900_ai_ci')
      .notNull(),
    name: varchar('name', { length: 64 })
      .charSet('utf8mb4')
      .collate('utf8mb4_0900_ai_ci')
      .notNull(),
    code: varchar('code', { length: 32 })
      .default('')
      .charSet('utf8mb4')
      .collate('utf8mb4_0900_ai_ci')
      .notNull(),
    updatedAt: datetime('updated_at', { mode: 'string' }),
    updatedBy: int('updated_by'),
  },
  (table) => [primaryKey({ columns: [table.index] }), unique('uq_door_codes_slug').on(table.slug)],
)

export const membershipApplications = mysqlTable(
  'membership_applications',
  {
    id: char({ length: 36 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    submittedPrimaryEmail: varchar('submitted_primary_email', { length: 254 }).notNull(),
    primaryEmail: varchar('primary_email', { length: 254 }).notNull(),
    submittedUwEmail: varchar('submitted_uw_email', { length: 254 }),
    uwEmail: varchar('uw_email', { length: 254 }),
    emailEditedBy: int('email_edited_by'),
    emailEditedAt: timestamp('email_edited_at'),
    uwStatus: varchar('uw_status', { length: 20 }).notNull(),
    imaAcknowledged: tinyint1('ima_acknowledged').notNull(),
    plusOneResponse: varchar('plus_one_response', { length: 30 }).notNull(),
    tier: varchar({ length: 20 }).notNull(),
    duration: varchar({ length: 20 }).notNull(),
    targetExpireQtr: int('target_expire_qtr').notNull(),
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
    emergencyFirstName: varchar('emergency_first_name', { length: 60 }),
    emergencyLastName: varchar('emergency_last_name', { length: 60 }),
    emergencyPhone: varchar('emergency_phone', { length: 50 }),
    emergencyRelationship: varchar('emergency_relationship', { length: 100 }),
    questionnaireVersion: varchar('questionnaire_version', { length: 50 }).notNull(),
    questionnaireResponses: json('questionnaire_responses'),
    requirementsCompletedAt: timestamp('requirements_completed_at'),
    reviewStatus: varchar('review_status', { length: 30 }).default('not_ready').notNull(),
    resolvedWycNumber: int('resolved_wyc_number'),
    reviewedBy: int('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    reviewNote: text('review_note'),
    closedAt: timestamp('closed_at'),
    recoveryEmailSentAt: timestamp('recovery_email_sent_at'),
    completionReminderSentAt: timestamp('completion_reminder_sent_at'),
    welcomeEmailSentAt: timestamp('welcome_email_sent_at'),
    createdIpHash: char('created_ip_hash', { length: 64 }).notNull(),
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

export const memberEmergencyContacts = mysqlTable(
  'member_emergency_contacts',
  {
    wycNumber: int('wyc_number').notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    phone: varchar({ length: 50 }).notNull(),
    relationship: varchar({ length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.wycNumber] })],
)

export const membershipRenewals = mysqlTable(
  'membership_renewals',
  {
    id: char({ length: 36 }).notNull(),
    wycNumber: int('wyc_number').notNull(),
    source: varchar({ length: 20 }).notNull(),
    tier: varchar({ length: 20 }).notNull(),
    duration: varchar({ length: 20 }).notNull(),
    previousExpireQtr: int('previous_expire_qtr').notNull(),
    targetExpireQtr: int('target_expire_qtr').notNull(),
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

export const membershipPayments = mysqlTable(
  'membership_payments',
  {
    index: int('_index').autoincrement().notNull(),
    wycNumber: int('wyc_number'),
    renewalId: char('renewal_id', { length: 36 }),
    applicationId: char('application_id', { length: 36 }),
    // null for non-payment renewals (e.g. dues-exempt).
    squarePaymentId: varchar('square_payment_id', { length: 255 }),
    squareOrderId: varchar('square_order_id', { length: 255 }),
    amountCents: int('amount_cents').notNull(), // from the Square order total (audit only)
    currency: char('currency', { length: 3 }).default('USD').notNull(),
    tier: varchar('tier', { length: 20 }).notNull(), // 'student' | 'nonstudent'
    duration: varchar('duration', { length: 20 }).notNull(), // 'quarterly' | 'annual'
    prevExpireQtr: int('prev_expire_qtr').notNull(),
    newExpireQtr: int('new_expire_qtr').notNull(),
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

export const duesExemptionRequests = mysqlTable(
  'dues_exemption_requests',
  {
    index: int('_index').autoincrement().notNull(),
    wycNumber: int('wyc_number').notNull(),
    renewalId: char('renewal_id', { length: 36 }),
    // Target quarter frozen at request time; the grant is a no-op if already covered by approval.
    requestedExpireQtr: int('requested_expire_qtr').notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'approved' | 'denied' | 'cancelled'
    // EXEMPT membership_payments row written on approval (null when the grant no-ops or still pending).
    paymentId: int('payment_id'),
    decidedBy: int('decided_by'),
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

export const renewalQuestionnaire = mysqlTable(
  'renewal_questionnaire',
  {
    index: int('_index').autoincrement().notNull(),
    wycNumber: int('wyc_number').notNull(),
    renewalId: char('renewal_id', { length: 36 }),
    // Renewal quarter these answers were captured for.
    quarter: int('quarter').notNull(),
    uwStatus: varchar('uw_status', { length: 20 }).notNull(),
    // Self-describing code (sponsor_* / sponsee_*) so a row is interpretable without UW status.
    plusOneResponse: varchar('plus_one_response', { length: 30 }).notNull(),
    // 'active' (paid) | 'pending' (exempt, awaiting approval) | 'void' (exempt denied).
    status: varchar('status', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'paid' | 'exempt'
    // Links an exempt-path row to its request so approval/denial can flip the status.
    requestId: int('request_id'),
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

export const memberWaivers = mysqlTable(
  'member_waivers',
  {
    id: char({ length: 36 }).notNull(),
    renewalId: char('renewal_id', { length: 36 }),
    applicationId: char('application_id', { length: 36 }),
    waiverVersion: varchar('waiver_version', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    submittedValues: json('submitted_values').notNull(),
    signedAt: timestamp('signed_at').notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    pdfSha256: char('pdf_sha256', { length: 64 }).notNull(),
    pdfSize: int('pdf_size').notNull(),
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

export const guestWaivers = mysqlTable(
  'guest_waivers',
  {
    id: char({ length: 36 }).notNull(),
    waiverVersion: varchar('waiver_version', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    submittedValues: json('submitted_values').notNull(),
    signedAt: timestamp('signed_at').notNull(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    pdfSha256: char('pdf_sha256', { length: 64 }).notNull(),
    pdfSize: int('pdf_size').notNull(),
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

export const wycWind = mysqlTable(
  'wyc_wind',
  {
    index: int().notNull(),
    dateTime: datetime('DateTime', { mode: 'string' }).notNull(),
    windSpeed: double('wind_speed').notNull(),
    windGust: double('wind_gust').notNull(),
    windDirection: varchar('wind_direction', { length: 2 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index] })],
)
