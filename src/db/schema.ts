import {
  char,
  date,
  datetime,
  double,
  float,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

export const wycDatabase = mysqlTable(
  'WYCDatabase',
  {
    last: char('Last', { length: 50 }),
    first: char('First', { length: 50 }),
    streetAddress: char('StreetAddress', { length: 100 }),
    city: char('City', { length: 50 }),
    state: char('State', { length: 20 }),
    zipCode: char('ZipCode', { length: 10 }),
    phone1: char('Phone1', { length: 50 }),
    phone2: char('Phone2', { length: 50 }),
    email: char('Email', { length: 50 }),
    category: int('Category'),
    wycNumber: int('WYCNumber').default(0).notNull(),
    expireQtr: int('ExpireQtr').default(0).notNull(),
    studentId: int('StudentID'),
    password: char({ length: 50 }).default(
      '*5FB1D6D12867BDF49EB3302D5096F1B9030E6264',
    ),
    outToSea: tinyint('out_to_sea').default(0),
    joinDate: timestamp('JoinDate', { mode: 'string' }).defaultNow().notNull(),
    imageName: char('image_name', { length: 50 }),
  },
  (table) => [
    primaryKey({ columns: [table.wycNumber], name: 'WYCDatabase_WYCNumber' }),
    unique('IDX_WYCNumber').on(table.wycNumber),
  ],
)
export type Member = typeof wycDatabase.$inferSelect

export const boatTypes = mysqlTable(
  'boat_types',
  {
    index: int('_index').autoincrement().notNull(),
    type: varchar({ length: 80 }),
    description: varchar({ length: 500 }).notNull(),
    usefulLink: varchar({ length: 100 }).notNull(),
    fleet: varchar({ length: 80 }).notNull(),
    numberInFleet: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'boat_types__index' }),
  ],
)

export const calendaradmin = mysqlTable('calendaradmin', {
  wycnum: int().notNull(),
  description: varchar({ length: 50 }).notNull(),
})

export const calendarboats = mysqlTable(
  'calendarboats',
  {
    cBoatId: int().autoincrement().notNull(),
    name: varchar({ length: 50 }).notNull(),
    description: varchar('Description', { length: 500 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cBoatId], name: 'calendarboats_cBoatId' }),
  ],
)

export const calendarcomment = mysqlTable('calendarcomment', {
  id: int().notNull(),
  userwyc: int().notNull(),
  date: datetime({ mode: 'string' }).notNull(),
  comment: text().notNull(),
})

export const calendarconfig = mysqlTable(
  'calendarconfig',
  {
    wacip: varchar({ length: 15 }).notNull(),
    ipdescription: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.wacip], name: 'calendarconfig_wacip' }),
  ],
)

export const calendartable = mysqlTable(
  'calendartable',
  {
    id: int().autoincrement().notNull(),
    cBoatId: int().notNull(),
    memberWycNumber: int().notNull(),
    reserveFrom: datetime({ mode: 'string' }).notNull(),
    reserveTo: datetime({ mode: 'string' }).notNull(),
    destination: varchar({ length: 255 }).notNull(),
    numberOfCrew: int().notNull(),
    comments: varchar({ length: 255 }),
    phone: varchar({ length: 45 }).notNull(),
    numFullWd: int().notNull(),
    numHalfWd: int().notNull(),
    numFullWe: int().notNull(),
    numHalfWe: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'calendartable_id' })],
)

export const checkouts = mysqlTable(
  'checkouts',
  {
    index: int('_index').autoincrement().notNull(),
    wycNumber: int('WYCNumber').notNull(),
    timeDeparture: datetime('TimeDeparture', { mode: 'string' }).notNull(),
    crew: text('Crew').notNull(),
    boat: varchar('Boat', { length: 50 }).notNull(),
    destination: varchar('Destination', { length: 100 }).notNull(),
    timeReturn: datetime('TimeReturn', { mode: 'string' }),
    expectedReturn: datetime('ExpectedReturn', { mode: 'string' }).notNull(),
    relevantRating: int('RelevantRating'),
    chiefId: int('ChiefID'),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'checkouts__index' })],
)

export const classType = mysqlTable(
  'class_type',
  {
    index: int('_index').autoincrement().notNull(),
    text: varchar({ length: 80 }),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'class_type__index' }),
  ],
)

export const crew = mysqlTable(
  'crew',
  {
    index: int('_index').autoincrement().notNull(),
    checkoutId: int('checkout_ID').notNull(),
    crewId: int('crew_ID').notNull(),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'crew__index' })],
)

export const guests = mysqlTable(
  'guests',
  {
    index: int('_index').autoincrement().notNull(),
    checkoutId: int('checkout_ID').notNull(),
    name: varchar({ length: 20 }),
    status: int().notNull(),
    email: varchar({ length: 20 }),
    phone: varchar({ length: 15 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'guests__index' })],
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
  (table) => [
    primaryKey({ columns: [table.index], name: 'lesson_quarter__index' }),
  ],
)

export const lessons = mysqlTable(
  'lessons',
  {
    index: int('_index').autoincrement().notNull(),
    type: int(),
    subtype: varchar({ length: 80 }),
    day: varchar({ length: 80 }),
    time: varchar({ length: 80 }),
    dates: text(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    calendarDate: date('CalendarDate', { mode: 'string' }).notNull(),
    instructor1: int(),
    instructor2: int(),
    // Warning: Can't parse blob from database
    // blobType: blob("comments"),
    description: text('Description').notNull(),
    size: int(),
    expire: int(),
    display: tinyint().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'lessons__index' })],
)

export const memcat = mysqlTable(
  'memcat',
  {
    index: int('_index').autoincrement().notNull(),
    text: varchar({ length: 50 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'memcat__index' })],
)

export const noyes = mysqlTable(
  'noyes',
  {
    index: tinyint('_index').default(0).notNull(),
    text: char({ length: 10 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'noyes__index' })],
)

export const officers = mysqlTable(
  'officers',
  {
    index: int('_index').autoincrement().notNull(),
    member: int(),
    position: int(),
    active: tinyint().default(1).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'officers__index' }),
    unique('_index').on(table.index),
  ],
)

export const options = mysqlTable(
  'options',
  {
    index: int('_index').autoincrement().notNull(),
    name: varchar({ length: 80 }),
    value: varchar({ length: 250 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'options__index' })],
)

export const posPrivMap = mysqlTable(
  'pos_priv_map',
  {
    index: int('_index').autoincrement().notNull(),
    position: int(),
    priv: int(),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'pos_priv_map__index' }),
  ],
)

export const posType = mysqlTable(
  'pos_type',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'pos_type__index' })],
)

export const positions = mysqlTable(
  'positions',
  {
    index: int('_index').autoincrement().notNull(),
    name: varchar({ length: 50 }).default('').notNull(),
    sortorder: int(),
    isDuesExempt: tinyint('is_dues_exempt').default(0),
    type: int(),
    bookmark: varchar({ length: 50 }),
    jobDesc: varchar('job_desc', { length: 50 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'positions__index' })],
)

export const priorityTypes = mysqlTable(
  'priority_types',
  {
    index: int('_index').autoincrement().notNull(),
    priority: varchar({ length: 25 }).default('').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'priority_types__index' }),
  ],
)

export const privs = mysqlTable(
  'privs',
  {
    index: int('_index').autoincrement().notNull(),
    name: char({ length: 10 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'privs__index' })],
)

export const quarters = mysqlTable(
  'quarters',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }),
    school: char({ length: 50 }),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    endDate: date({ mode: 'string' }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'quarters__index' })],
)

export const ratings = mysqlTable(
  'ratings',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }),
    type: varchar({ length: 10 }).notNull(),
    degree: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'ratings__index' })],
)

export const recip = mysqlTable('recip', {
  clubName: varchar('club_name', { length: 50 }),
  website: varchar({ length: 50 }),
  recipUrl: varchar('recip_url', { length: 75 }),
  location: varchar({ length: 2000 }),
  latLong: varchar('lat_long', { length: 100 }),
  lengthStay: varchar('length_stay', { length: 2000 }),
  procedures: varchar({ length: 2000 }),
  amenities: varchar({ length: 2000 }),
  image: varchar({ length: 100 }),
  imageNext: varchar('image_next', { length: 100 }),
  clubId: varchar('club_id', { length: 2 }),
})

export const sessions = mysqlTable(
  'sessions',
  {
    index: int('_index').autoincrement().notNull(),
    session: varchar({ length: 80 }),
    userid: int(),
    time: varchar({ length: 80 }),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'sessions__index' })],
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
    primaryKey({ columns: [table.index], name: 'signups__index' }),
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
    guest1Name: char('guest1_name', { length: 100 }),
    guest1Dinner: int('guest1_dinner'),
    guest1Lunch1: int('guest1_lunch1'),
    guest1Lunch2: int('guest1_lunch2'),
    guest2Name: char('guest2_name', { length: 100 }),
    guest2Dinner: int('guest2_dinner'),
    guest2Lunch1: int('guest2_lunch1'),
    guest2Lunch2: int('guest2_lunch2'),
    boat1Pref: char({ length: 100 }),
    boat2Pref: char({ length: 100 }),
    ratingSh: int('rating_sh'),
    ratingDh: int('rating_dh'),
    ratingKb: int('rating_kb'),
    isLockVeteran: tinyint('is_lock_veteran'),
    friends: char({ length: 100 }),
    duties: int(),
    guest1Child: tinyint('guest1_child'),
    guest2Child: tinyint('guest2_child'),
    transpt: tinyint().default(0),
    paymentConfirm: int('payment_confirm').notNull(),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'snc__index' })],
)

export const sncFood = mysqlTable(
  'snc_food',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }),
    isAllowed: tinyint('is_allowed'),
    isDinner: tinyint('is_dinner'),
    cost: int().default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'snc_food__index' })],
)

export const sncWork = mysqlTable(
  'snc_work',
  {
    index: int('_index').autoincrement().notNull(),
    text: char({ length: 50 }),
    isAllowed: tinyint('is_allowed'),
  },
  (table) => [primaryKey({ columns: [table.index], name: 'snc_work__index' })],
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
    comments: varchar({ length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.index], name: 'wyc_ratings__index' }),
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
  (table) => [primaryKey({ columns: [table.index], name: 'wyc_wind_index' })],
)
