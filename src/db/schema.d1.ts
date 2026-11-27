import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'

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
    wycNumber: integer('WYCNumber').primaryKey().default(0).notNull(),
    expireQtrIndex: integer('ExpireQtr').default(0).notNull(),
    studentId: integer('StudentID'),
    passwordArgon2: text('password_argon2'),
    outToSea: integer('out_to_sea').default(0),
    joinDate: text('JoinDate')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('IDX_WYCNumber').on(table.wycNumber)],
)

export const classType = sqliteTable('class_type', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
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

export const signups = sqliteTable(
  'signups',
  {
    index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
    class: integer().default(0).notNull(),
    student: integer().default(0).notNull(),
  },
  (table) => [
    index('class').on(table.class),
    unique('uq_class_student').on(table.class, table.student),
  ],
)

export const quarters = sqliteTable('quarters', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  text: text(),
  school: text(),
  // you can use { mode: 'date' }, if you want to have Date as type for this column
  endDate: text(),
})

export const lessonQuarter = sqliteTable('lesson_quarter', {
  index: integer('_index').primaryKey({ autoIncrement: true }).notNull(),
  quarter: integer().default(0).notNull(),
  renewalQuarter: integer('renewal_quarter')
    .notNull()
    .references(() => quarters.index),
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
