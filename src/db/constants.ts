/** WYCNumber 1 is a special "TBD" placeholder member */
export const TBD_WYC_NUMBER = 1

/** Ratings marked as "expires" expire after this many months */
export const RATING_EXPIRY_MONTHS = 6

/**
 * Position type IDs shown on the Officers & Position Holders page.
 * Maps to pos_type._index values: 1=Officers, 2=Position Holders, 5=Fleet Captains.
 * Order determines display section order on the page.
 */
export const OFFICER_PAGE_TYPES = [1, 2, 5] as const

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

/** Position ID for the Webmaster (database administrator) */
export const DATABASE_ADMIN_POSITION_ID = 2260

/** Club webmaster email address */
export const WEBMASTER_EMAIL = 'webmaster@washingtonyachtclub.org'
