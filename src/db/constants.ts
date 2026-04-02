/** WYCNumber 1 is a special "TBD" placeholder member */
export const TBD_WYC_NUMBER = 1

/** Ratings marked as "expires" expire after this many months */
export const RATING_EXPIRY_MONTHS = 6

/**
 * Position IDs shown on the Officers & Position Holders page,
 * grouped into display sections. IDs are PKs from the `positions` table.
 */
export const OFFICER_PAGE_SECTIONS = [
  {
    label: 'Officers',
    positions: [
      1000, // Commodore
      1010, // Vice Commodore
      1020, // Rear Commodore
      2161, // Secretary
      2220, // Treasurer
    ],
  },
  {
    label: 'Position Holders',
    positions: [
      2170, // Social Committee Chair
      2141, // Media Curator
      2190, // SNC Chair
      2260, // Webmaster
      2180, // Fundraising
      2181, // Recruitment
      2210, // Quartermaster
    ],
  },
  {
    label: 'Fleet Captains',
    positions: [
      2000, // Head Fleet Captain
      2105, // Bravo Fleet Captain
      2010, // Laser Fleet Captain (Single Hand)
      2030, // Double Handed Fleet Captain
      2040, // Performance Fleet Captain
      2050, // Keelboat Fleet Captain
      2080, // Catamaran Fleet Captain
      2100, // Daysailor Fleet Captain
      2130, // Sail Fleet Captain
      2090, // Sailboard Fleet Captain
      2135, // Whaler Fleet Captain
    ],
  },
] as const

/**
 * Class type IDs grouped into display categories for the public lesson list
 * and the class type dropdown in lesson create/edit forms.
 * IDs are PKs from the `class_type` table.
 */
export const LESSON_CATEGORIES = [
  {
    label: 'Novice Dinghy',
    typeIds: [1, 2], // NOV Dinghy Weekday, NOV Dinghy Weekend
  },
  {
    label: 'Advanced',
    typeIds: [3, 6, 7], // Catamaran, INT Dinghy Weekday, INT Dinghy Weekend
  },
  {
    label: 'Keelboat',
    typeIds: [4],
  },
  {
    label: 'Social Events',
    typeIds: [13],
  },
  {
    label: 'Work Parties',
    typeIds: [9],
  },
  {
    label: 'Specialty',
    typeIds: [5],
  },
  {
    label: 'Dinghy Sailing',
    typeIds: [10],
  },
  {
    label: 'Windsurfing',
    typeIds: [12],
  },
] as const

/** Flat list of all position IDs on the officer page (for queries) */
export const OFFICER_PAGE_POSITIONS = OFFICER_PAGE_SECTIONS.flatMap((s) => s.positions)

/** Position ID for the Webmaster (database administrator) */
export const DATABASE_ADMIN_POSITION_ID = 2260

/** Club webmaster email address */
export const WEBMASTER_EMAIL = 'webmaster@washingtonyachtclub.org'
